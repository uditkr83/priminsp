const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// VALID CONSTRAINT TYPES FOR BACKEND VALIDATION
const VALID_CONSTRAINTS = new Set([
  "ASAP", "ALAP", "SNET", "SNLT", "FNET", "FNLT", "MSO", "MFO"
]);

/**
 * POST /api/cpm/calculate/:project_id
 * Executes multi-calendar, multi-relationship CPM scheduling for an isolated project.
 */
router.post("/calculate/:project_id", async (req, res) => {
  const { project_id } = req.params;

  try {
    // 1. FETCH PROJECT ROOT ATTRIBUTES & CALENDAR EXCEPTIONS
    const projectResult = await pool.query(
      "SELECT start_date FROM projects WHERE id = $1",
      [project_id]
    );
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found." });
    }
    
    // Anchor everything to the structural Project Start Date
    const projectStartDate = new Date(projectResult.rows[0].start_date);

    // Fetch calendar exceptions
    const workingDays = new Set([1, 2, 3, 4, 5]);
    const holidayResult = await pool.query(`
      SELECT exception_date FROM calendar_exceptions
    `);

    const holidays = new Set(
      holidayResult.rows.map(
        r => new Date(r.exception_date).toISOString().split("T")[0]
      )
    );

    // --- CALENDAR ENGINE MATH CORE ---
    const addDays = (date, days) => {
      let d = new Date(date);
      let count = 0;
      while (count < days) {
        d.setUTCDate(d.getUTCDate() + 1);
        const dStr = d.toISOString().split('T')[0];
        if (workingDays.has(d.getUTCDay()) && !holidays.has(dStr)) {
          count++;
        }
      }
      return d;
    };

    const subtractDays = (date, days) => {
      let d = new Date(date);
      let count = 0;
      while (count < days) {
        d.setUTCDate(d.getUTCDate() - 1);
        const dStr = d.toISOString().split('T')[0];
        if (workingDays.has(d.getUTCDay()) && !holidays.has(dStr)) {
          count++;
        }
      }
      return d;
    };

    const getCalendarNetworkSpan = (start, end) => {
      let s = new Date(start);
      let e = new Date(end);
      let count = 0;
      let invert = false;
      if (s > e) { [s, e] = [e, s]; invert = true; }
      
      let curr = new Date(s);
      while (curr < e) {
        curr.setUTCDate(curr.getUTCDate() + 1);
        const dStr = curr.toISOString().split('T')[0];
        if (workingDays.has(curr.getUTCDay()) && !holidays.has(dStr)) {
          count++;
        }
      }
      return invert ? -count : count;
    };

    // 2. ISOLATED MULTI-PROJECT DATA INGESTION
    const activitiesResult = await pool.query(
      `SELECT id, activity_code, activity_name, duration, constraint_type, constraint_date 
       FROM activities 
       WHERE wbs_id IN (SELECT id FROM wbs WHERE project_id = $1)`,
      [project_id]
    );
    
    const relationshipsResult = await pool.query(
      `SELECT r.predecessor_activity_id, r.successor_activity_id, r.relationship_type, r.lag 
       FROM relationships r
       JOIN activities a ON r.predecessor_activity_id = a.id
       WHERE a.wbs_id IN (SELECT id FROM wbs WHERE project_id = $1)`,
      [project_id]
    );

    const activities = activitiesResult.rows;
    const relationships = relationshipsResult.rows;

    if (activities.length === 0) return res.status(200).json([]);

    const nodes = {};
    const adjList = {};
    const revAdjList = {};

    // IMPROVEMENT 3: Ingestion ke waqt hi strict Backend Validation Layer execute karna
    for (const act of activities) {
      if (act.constraint_type && !VALID_CONSTRAINTS.has(act.constraint_type.toUpperCase())) {
        return res.status(400).json({ 
          error: `Invalid constraint type '${act.constraint_type}' detected on activity code ${act.activity_code}.` 
        });
      }

      nodes[act.id] = {
        id: act.id,
        code: act.activity_code,
        name: act.activity_name,
        duration: parseInt(act.duration, 10),
        constraint_type: act.constraint_type ? act.constraint_type.toUpperCase() : null,
        constraint_date: act.constraint_date,
        es: 0, ef: 0, ls: 0, lf: 0, 
        total_float: 0, free_float: Infinity, is_critical: false
      };
      adjList[act.id] = [];
      revAdjList[act.id] = [];
    }

    relationships.forEach((rel) => {
      const pred = rel.predecessor_activity_id;
      const succ = rel.successor_activity_id;
      if (nodes[pred] && nodes[succ]) {
        adjList[pred].push({ succId: succ, type: rel.relationship_type, lag: parseInt(rel.lag || 0, 10) });
        revAdjList[succ].push({ predId: pred, type: rel.relationship_type, lag: parseInt(rel.lag || 0, 10) });
      }
    });

    // 3. CYCLIC PROTECTION GUARD VIA KAHN'S TOPOLOGICAL ORDERING
    const inDegree = {};
    activities.forEach(act => inDegree[act.id] = 0);
    relationships.forEach(rel => {
      if (inDegree[rel.successor_activity_id] !== undefined) inDegree[rel.successor_activity_id]++;
    });

    const queue = [];
    Object.keys(inDegree).forEach(id => { if (inDegree[id] === 0) queue.push(parseInt(id, 10)); });

    const topoOrder = [];
    while (queue.length > 0) {
      const curr = queue.shift();
      topoOrder.push(curr);
      adjList[curr].forEach(edge => {
        inDegree[edge.succId]--;
        if (inDegree[edge.succId] === 0) queue.push(edge.succId);
      });
    }

    if (topoOrder.length !== activities.length) {
      return res.status(400).json({ error: "Loop detected in network schedule! Dependency loop aborted." });
    }

    // 4. ADVANCED FORWARD PASS (Primavera P6 Multi-Relationship Dependency Matrix)
    topoOrder.forEach((id) => {
      const node = nodes[id];
      const preds = revAdjList[id];

      if (preds.length === 0) {
        node.es = 0; // Baseline zero offset
      } else {
        let maxEs = 0;
        preds.forEach((edge) => {
          const predNode = nodes[edge.predId];
          let potentialEs = 0;

          switch (edge.type) {
            case "SS": potentialEs = predNode.es + edge.lag; break;
            case "FF": potentialEs = (predNode.ef + edge.lag) - node.duration + 1; break;
            case "SF": potentialEs = (predNode.es + edge.lag) - node.duration + 1; break;
            case "FS":
            default: potentialEs = predNode.ef + edge.lag; break;
          }
          if (potentialEs > maxEs) maxEs = potentialEs;
        });
        node.es = maxEs;
      }

      // IMPROVEMENT 4: Clean Architecture Separation for Forward Constraints
      if (node.constraint_type && node.constraint_date) {
        applyForwardConstraints(node, projectStartDate, getCalendarNetworkSpan);
      }

      node.ef = node.es + node.duration - 1;
    });

    // Determine absolute project terminal boundary point
    let projectFinishOffset = 0;
    activities.forEach(act => {
      if (nodes[act.id].ef > projectFinishOffset) projectFinishOffset = nodes[act.id].ef;
    });

    // 5. ADVANCED BACKWARD PASS & DRIVING RELATIONSHIP LOOKUPS
    const drivingRelationships = [];

    for (let i = topoOrder.length - 1; i >= 0; i--) {
      const id = topoOrder[i];
      const node = nodes[id];
      const succs = adjList[id];

      if (succs.length === 0) {
        node.lf = projectFinishOffset;
      } else {
        let minLf = Infinity;
        let structuralDriverEdge = null;

        succs.forEach((edge) => {
          const succNode = nodes[edge.succId];
          let potentialLf = Infinity;

          switch (edge.type) {
            case "SS": potentialLf = (succNode.ls - edge.lag) + node.duration - 1; break;
            case "FF": potentialLf = succNode.lf - edge.lag; break;
            case "SF": potentialLf = (succNode.lf - edge.lag) + node.duration - 1; break;
            case "FS":
            default: potentialLf = succNode.ls - edge.lag; break;
          }
          if (potentialLf < minLf) {
            minLf = potentialLf;
            structuralDriverEdge = edge;
          }
        });
        node.lf = minLf;

        if (structuralDriverEdge) {
          drivingRelationships.push({
            predecessor_id: id,
            successor_id: structuralDriverEdge.succId,
            is_driving: true
          });
        }
      }

      // IMPROVEMENT 4 (Future-proofing): Yahan backward pass constraints execute honge
      if (node.constraint_type && node.constraint_date) {
        applyBackwardConstraints(node, projectStartDate, getCalendarNetworkSpan);
      }

      node.ls = node.lf - node.duration + 1;

      // 6. DUAL-FLOAT METRIC EVALUATIONS
      node.total_float = node.ls - node.es;
      node.is_critical = node.total_float <= 0; 

      // Calculate Free Float
      if (succs.length === 0) {
        node.free_float = projectFinishOffset - node.ef;
      } else {
        let minFreeFloat = Infinity;
        succs.forEach((edge) => {
          const succNode = nodes[edge.succId];
          let currentEdgeFloat = 0;

          switch (edge.type) {
            case "SS": currentEdgeFloat = succNode.es - (node.es + edge.lag); break;
            case "FF": currentEdgeFloat = succNode.ef - (node.ef + edge.lag); break;
            case "SF": currentEdgeFloat = succNode.ef - (node.es + edge.lag); break;
            case "FS":
            default: currentEdgeFloat = succNode.es - (node.ef + edge.lag); break;
          }
          if (currentEdgeFloat < minFreeFloat) minFreeFloat = currentEdgeFloat;
        });
        node.free_float = Math.max(0, minFreeFloat);
      }
    }

    // 7. TRANSACTIONAL DATABASE WRITEBACK LAYER
    await pool.query("BEGIN");

    const upsertScheduleQuery = `
      INSERT INTO schedules (activity_id, early_start, early_finish, late_start, late_finish, total_float, free_float, is_critical)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (activity_id) DO UPDATE SET
        early_start = EXCLUDED.early_start,
        early_finish = EXCLUDED.early_finish,
        late_start = EXCLUDED.late_start,
        late_finish = EXCLUDED.late_finish,
        total_float = EXCLUDED.total_float,
        free_float = EXCLUDED.free_float,
        is_critical = EXCLUDED.is_critical;
    `;

    for (const id of topoOrder) {
      const n = nodes[id];
      
      const realEarlyStart = addDays(projectStartDate, n.es);
      const realEarlyFinish = addDays(projectStartDate, n.ef);
      const realLateStart = addDays(projectStartDate, n.ls);
      const realLateFinish = addDays(projectStartDate, n.lf);

      await pool.query(upsertScheduleQuery, [
        n.id, realEarlyStart, realEarlyFinish, realLateStart, realLateFinish,
        n.total_float, n.free_float, n.is_critical
      ]);
    }

    if (drivingRelationships.length > 0) {
      const updateDrivingQuery = `
        UPDATE relationships 
        SET is_driving = $1 
        WHERE predecessor_activity_id = $2 AND successor_activity_id = $3
      `;
      for (const rel of drivingRelationships) {
        await pool.query(updateDrivingQuery, [rel.is_driving, rel.predecessor_id, rel.successor_id]);
      }
    }

    await pool.query("COMMIT");

    // 8. RESPONSE DELIVERY
    const finalSyncResult = await pool.query(`
      SELECT
        a.id, a.activity_code, a.activity_name, a.duration, a.constraint_type, a.constraint_date,
        s.early_start, s.early_finish, s.late_start, s.late_finish, s.total_float, s.free_float, s.is_critical
      FROM schedules s
      JOIN activities a ON s.activity_id = a.id
      WHERE a.wbs_id IN (SELECT id FROM wbs WHERE project_id = $1)
    `, [project_id]);

    res.status(200).json(finalSyncResult.rows);

  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("PlanMaster CPM Engine Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * IMPROVEMENT 4: Process Forward Pass Constraints (Affects Early Start/Finish)
 */
function applyForwardConstraints(node, projectStartDate, getCalendarNetworkSpan) {
  const constraintDate = new Date(node.constraint_date);
  
  // IMPROVEMENT 2: Guard applied to prevent negative indexes if constraint date is prior to project start
  const constraintDay = Math.max(0, getCalendarNetworkSpan(projectStartDate, constraintDate));

  switch (node.constraint_type) {
    case "SNET": // Start On or After
      if (constraintDay > node.es) {
        node.es = constraintDay;
      }
      break;

    case "MSO": // IMPROVEMENT 1: Hard overwrite for Must Start On logic
      node.es = constraintDay;
      break;
    
    default:
      // Other constraints like ASAP, FNET can be parsed here if mapped to forward passes
      break;
  }
}

/**
 * IMPROVEMENT 4: Process Backward Pass Constraints (Affects Late Start/Finish & Float calculations)
 */
function applyBackwardConstraints(node, projectStartDate, getCalendarNetworkSpan) {
  const constraintDate = new Date(node.constraint_date);
  const constraintDay = Math.max(0, getCalendarNetworkSpan(projectStartDate, constraintDate));

  switch (node.constraint_type) {
    case "FNLT": // Finish On or Before
      // Future calculation mapping: node.lf = Math.min(node.lf, constraintDay)
      break;
    case "ALAP": // As Late As Possible
      // Future calculation mapping: Forces Early Dates to match Late Dates
      break;
    default:
      break;
  }
}

module.exports = router;