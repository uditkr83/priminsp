const express = require("express");
const router = express.Router();

// ✅ Change #1: Using your exact established central DB config path
const pool = require("../config/db"); 

/**
 * POST /api/cpm/calculate
 * Triggers full Project CPM Network Analysis (Forward & Backward Pass)
 * Automatically converts CPM Integer offsets into real PostgreSQL DATE types.
 */
router.post("/calculate", async (req, res) => {
  try {
    // 1. FETCH ALL DATA FROM POSTGRESQL
    const activitiesResult = await pool.query(
      "SELECT id, activity_code, activity_name, duration FROM activities"
    );
    const relationshipsResult = await pool.query(
      "SELECT predecessor_activity_id, successor_activity_id, relationship_type, lag FROM relationships"
    );

    const activities = activitiesResult.rows;
    const relationships = relationshipsResult.rows;

    if (activities.length === 0) {
      return res.status(200).json([]);
    }

    // 2. BUILD GRAPH STRUCTURES FOR TRAVERSAL
    const nodes = {};
    const adjList = {};      // Predecessor -> Successors
    const revAdjList = {};   // Successor -> Predecessors

    activities.forEach((act) => {
      nodes[act.id] = {
        id: act.id,
        activity_code: act.activity_code,
        activity_name: act.activity_name,
        duration: parseInt(act.duration, 10),
        es: 0, ef: 0, ls: 0, lf: 0, total_float: 0, is_critical: false
      };
      adjList[act.id] = [];
      revAdjList[act.id] = [];
    });

    relationships.forEach((rel) => {
      const pred = rel.predecessor_activity_id;
      const succ = rel.successor_activity_id;
      const lag = parseInt(rel.lag || 0, 10);

      if (nodes[pred] && nodes[succ]) {
        adjList[pred].push({ succId: succ, lag });
        revAdjList[succ].push({ predId: pred, lag });
      }
    });

    // 3. TOPOLOGICAL SORT (Kahn's Algorithm to prevent cycles)
    const inDegree = {};
    activities.forEach((act) => {
      inDegree[act.id] = 0;
    });

    relationships.forEach((rel) => {
      if (inDegree[rel.successor_activity_id] !== undefined) {
        inDegree[rel.successor_activity_id]++;
      }
    });

    const queue = [];
    Object.keys(inDegree).forEach((id) => {
      if (inDegree[id] === 0) queue.push(parseInt(id, 10));
    });

    const topoOrder = [];
    while (queue.length > 0) {
      const curr = queue.shift();
      topoOrder.push(curr);

      adjList[curr].forEach((edge) => {
        inDegree[edge.succId]--;
        if (inDegree[edge.succId] === 0) {
          queue.push(edge.succId);
        }
      });
    }

    // Circular Dependency Guard
    if (topoOrder.length !== activities.length) {
      return res.status(400).json({ 
        error: "Loop detected in network schedule! Circular dependencies are not allowed in CPM." 
      });
    }

    // 4. FORWARD PASS (Early Dates Calculation)
    topoOrder.forEach((id) => {
      const node = nodes[id];
      const preds = revAdjList[id];

      if (preds.length === 0) {
        node.es = 1; // Root Starts on Day 1
      } else {
        let maxPredEf = 0;
        preds.forEach((edge) => {
          const predNode = nodes[edge.predId];
          const potentialStart = predNode.ef + edge.lag;
          if (potentialStart > maxPredEf) {
            maxPredEf = potentialStart;
          }
        });
        node.es = maxPredEf + 1;
      }
      node.ef = node.es + node.duration - 1;
    });

    // Determine Project Finish Baseline Day
    let projectFinish = 1;
    activities.forEach((act) => {
      if (nodes[act.id].ef > projectFinish) {
        projectFinish = nodes[act.id].ef;
      }
    });

    // 5. BACKWARD PASS (Late Dates Calculation)
    for (let i = topoOrder.length - 1; i >= 0; i--) {
      const id = topoOrder[i];
      const node = nodes[id];
      const succs = adjList[id];

      if (succs.length === 0) {
        node.lf = projectFinish;
      } else {
        let minSuccLs = Infinity;
        succs.forEach((edge) => {
          const succNode = nodes[edge.succId];
          const potentialFinish = succNode.ls - edge.lag;
          if (potentialFinish < minSuccLs) {
            minSuccLs = potentialFinish;
          }
        });
        node.lf = minSuccLs - 1;
      }
      node.ls = node.lf - node.duration + 1;

      // 6. FLOAT & CRITICAL PATH SELECTION
      node.total_float = node.ls - node.es;
      node.is_critical = node.total_float === 0;
    }

    // 7. TRANSACTIONAL BULK UPSERT WITH real-time DATE CONVERSION
    await pool.query("BEGIN");
    
    // ✅ Change #2 (FIXED): Mapping integers safely to real database DATE objects using CURRENT_DATE + Interval
    const upsertQuery = `
      INSERT INTO schedules (activity_id, early_start, early_finish, late_start, late_finish, total_float, is_critical)
      VALUES (
        $1, 
        CURRENT_DATE + ($2 - 1), 
        CURRENT_DATE + ($3 - 1), 
        CURRENT_DATE + ($4 - 1), 
        CURRENT_DATE + ($5 - 1), 
        $6, 
        $7
      )
      ON CONFLICT (activity_id) 
      DO UPDATE SET 
        early_start = EXCLUDED.early_start,
        early_finish = EXCLUDED.early_finish,
        late_start = EXCLUDED.late_start,
        late_finish = EXCLUDED.late_finish,
        total_float = EXCLUDED.total_float,
        is_critical = EXCLUDED.is_critical;
    `;

    for (const id of topoOrder) {
      const n = nodes[id];
      await pool.query(upsertQuery, [
        n.id,
        n.es, // Passed cleanly as standard integers, math resolved on SQL-compile level
        n.ef,
        n.ls,
        n.lf,
        n.total_float,
        n.is_critical
      ]);
    }

    await pool.query("COMMIT");

    // 8. FETCH RE-CALCULATED DATES FROM DATABASE TO RETURN SYNCED STRINGS TO FRONTEND
    // ताकी फ़्रंटएंड को वही रियल DATE फॉर्मेट मिले जो डेटाबेस में स्टोर हुआ है।
    const finalSyncResult = await pool.query(`
      SELECT 
        s.activity_id,
        a.activity_code,
        a.activity_name,
        a.duration,
        s.early_start,
        s.early_finish,
        s.late_start,
        s.late_finish,
        s.total_float,
        s.is_critical
      FROM schedules s
      JOIN activities a ON s.activity_id = a.id
    `);

    res.status(200).json(finalSyncResult.rows);

  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {}); 
    console.error("PlanMaster CPM Engine Error:", error);
    res.status(500).json({ error: "Internal scheduling network compute breakdown." });
  }
});

module.exports = router;