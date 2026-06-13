const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// 📥 1. CREATE: NEW WBS ELEMENT (With Sorting Sequence Weights)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      project_id,
      parent_wbs_id,
      wbs_code,
      wbs_name,
      sort_order
    } = req.body;

    const validatedParentId = parent_wbs_id ? parseInt(parent_wbs_id, 10) : null;

    const result = await pool.query(
      `
      INSERT INTO wbs
      (project_id, parent_wbs_id, wbs_code, wbs_name, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        project_id,
        validatedParentId,
        wbs_code,
        wbs_name,
        sort_order || 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating WBS Node:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 📤 2. READ: FETCH ALL NODES (Ordered for Primavera Rendering Hierarchy)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    // Primavera UI elements layout expects sequential positional ordering
    const result = await pool.query(
      "SELECT * FROM wbs ORDER BY sort_order ASC, id ASC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching WBS items:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔄 3. UPDATE: EDIT PROPERTIES & DRAG AND DROP (With Circularity Interceptor)
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    project_id,
    parent_wbs_id,
    wbs_code,
    wbs_name,
    sort_order
  } = req.body;

  const targetNodeId = parseInt(id, 10);
  const targetParentId = parent_wbs_id ? parseInt(parent_wbs_id, 10) : null;

  try {
    // 🛡️ Guardrail 1: Self-parenting assignment rejection
    if (targetNodeId === targetParentId) {
      return res.status(400).json({ 
        error: "Circularity Violation: Node cannot become its own parent element." 
      });
    }

    // 🛡️ Guardrail 2: Deep Circular Hierarchy Scan using Recursive CTE
    if (targetParentId !== null) {
      const circularityCheckQuery = `
        WITH RECURSIVE downstream_tree AS (
          SELECT id, parent_wbs_id FROM wbs WHERE id = $1
          UNION ALL
          SELECT w.id, w.parent_wbs_id FROM wbs w
          INNER JOIN downstream_tree dt ON w.parent_wbs_id = dt.id
        )
        SELECT id FROM downstream_tree WHERE id = $2;
      `;
      
      const checkResult = await pool.query(circularityCheckQuery, [targetNodeId, targetParentId]);
      
      if (checkResult.rows.length > 0) {
        return res.status(400).json({
          error: "Circularity Violation: Target destination parent node is a sub-child branch descendant of this element."
        });
      }
    }

    // Process Safe Database Update Operation
    const result = await pool.query(
      `
      UPDATE wbs
      SET
        project_id = COALESCE($1, project_id),
        parent_wbs_id = $2,
        wbs_code = COALESCE($3, wbs_code),
        wbs_name = COALESCE($4, wbs_name),
        sort_order = COALESCE($5, sort_order)
      WHERE id = $6
      RETURNING *
      `,
      [
        project_id,
        targetParentId,
        wbs_code,
        wbs_name,
        sort_order,
        targetNodeId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "WBS node entity target record index key not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Mutation Exception compiling update on target WBS node:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ❌ 4. DELETE: PURGE NODE AND CASCADING DOWNSTREAM SUB-CHILDREN
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const targetNodeId = parseInt(id, 10);

  try {
    // Start atomic transaction process to delete whole sub-tree cleanly
    await pool.query("BEGIN");

    // Fetch and eliminate all descendants recursively to avoid orphan rows
    const purgeSubTreeQuery = `
      WITH RECURSIVE target_wbs_branch AS (
        SELECT id FROM wbs WHERE id = $1
        UNION ALL
        SELECT w.id FROM wbs w
        INNER JOIN target_wbs_branch twb ON w.parent_wbs_id = twb.id
      )
      DELETE FROM wbs WHERE id IN (SELECT id FROM target_wbs_branch);
    `;

    await pool.query(purgeSubTreeQuery, [targetNodeId]);
    await pool.query("COMMIT");

    res.json({
      message: "Success: WBS target node and all downstream cascading child hierarchies purged."
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Critical Failure running cascade extraction logic on sub-tree nodes:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;