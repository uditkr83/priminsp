const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =========================================================================
// 1. GET ALL ASSIGNMENTS
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ra.*,
        r.resource_code,
        r.resource_name,
        r.resource_type,
        r.unit_rate,
        a.activity_code,
        a.activity_name
      FROM resource_assignments ra
      JOIN resources r ON ra.resource_id = r.id
      JOIN activities a ON ra.activity_id = a.id
      ORDER BY ra.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================================================================
// RESOURCE HISTOGRAM
// =========================================================================
router.get("/histogram", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT

        r.id,
        r.resource_code,
        r.resource_name,
        r.resource_type,
        r.max_units,

        COUNT(ra.id) AS assignments,

        COALESCE(
          SUM(ra.budgeted_units),
          0
        ) AS total_budgeted,

        COALESCE(
          SUM(ra.actual_units),
          0
        ) AS total_actual,

        COALESCE(
          SUM(ra.remaining_units),
          0
        ) AS total_remaining

      FROM resources r

      LEFT JOIN resource_assignments ra
      ON r.id = ra.resource_id

      GROUP BY
        r.id,
        r.resource_code,
        r.resource_name,
        r.resource_type,
        r.max_units

      ORDER BY
        r.resource_name;
    `);

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});

// =========================================================================
// 2. CREATE ASSIGNMENT (With Strict Primavera-style Validations)
// =========================================================================
router.post("/", async (req, res) => {
  try {
    const {
      activity_id,
      resource_id,
      budgeted_units,
      actual_units,
      remaining_units
    } = req.body;

    // --- Primavera-style Entity Existence Validations ---
    const activityCheck = await pool.query(
      "SELECT id FROM activities WHERE id = $1",
      [activity_id]
    );
    if (activityCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Activity does not exist in the enterprise schedule."
      });
    }

    const resourceCheck = await pool.query(
      "SELECT id FROM resources WHERE id = $1",
      [resource_id]
    );
    if (resourceCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Resource does not exist in the global dictionary pool."
      });
    }

    // --- Duplicate Mapping Guard ---
    const existing = await pool.query(
      `
      SELECT id 
      FROM resource_assignments 
      WHERE activity_id = $1 AND resource_id = $2
      `,
      [activity_id, resource_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Assignment mapping violation: Resource is already assigned to this activity."
      });
    }

    // --- Transaction Execution ---
    const result = await pool.query(
      `
      INSERT INTO resource_assignments
      (
        activity_id,
        resource_id,
        budgeted_units,
        actual_units,
        remaining_units
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        activity_id,
        resource_id,
        budgeted_units || 0,
        actual_units || 0,
        remaining_units || 0
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. UPDATE ASSIGNMENT (Primavera Hours Calibrator Engine)
// =========================================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { budgeted_units, actual_units, remaining_units } = req.body;

    // 1. Check current record status to pull fallbacks if keys are missing
    const currentRecord = await pool.query(
      "SELECT * FROM resource_assignments WHERE id = $1",
      [id]
    );
    
    if (currentRecord.rows.length === 0) {
      return res.status(404).json({
        error: "Assignment not found. Tracking update aborted."
      });
    }

    const current = currentRecord.rows[0];
    
    // 2. Coalesce inputs (keeps existing values if fields aren't supplied)
    const finalBudgeted = budgeted_units !== undefined ? Number(budgeted_units) : Number(current.budgeted_units);
    const finalActual = actual_units !== undefined ? Number(actual_units) : Number(current.actual_units);
    
    // 3. Auto-Calibrate remaining units if not explicitly passed
    let finalRemaining = remaining_units !== undefined 
      ? Number(remaining_units) 
      : (budgeted_units !== undefined || actual_units !== undefined ? Math.max(0, finalBudgeted - finalActual) : Number(current.remaining_units));

    // 4. Safe Query Mutation
    const result = await pool.query(
      `
      UPDATE resource_assignments
      SET
        budgeted_units = $1,
        actual_units = $2,
        remaining_units = $3
      WHERE id = $4
      RETURNING *
      `,
      [finalBudgeted, finalActual, finalRemaining, id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// =========================================================================
// 4. DELETE ASSIGNMENT (With Zero-Row-Affected Guard)
// =========================================================================
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM resource_assignments WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    // Conditional Execution Check
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Assignment tracking record not found. Mutation dropped."
      });
    }

    res.json({
      message: "Assignment decoupled and deleted successfully from tracking matrix."
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;