const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =========================================================================
// 1. CREATE BASELINE SNAPSHOT (Primavera Equivalent: Maintain Baselines)
// =========================================================================
router.post("/create", async (req, res) => {
  try {
    const { baseline_name } = req.body;

    if (!baseline_name) {
      return res.status(400).json({
        error: "Baseline name is required to lock schedule targets."
      });
    }

    // --- Enterprise Guard: Prevent naming collisions ---
    const nameCheck = await pool.query(
      "SELECT id FROM activity_baselines WHERE baseline_name = $1 LIMIT 1",
      [baseline_name]
    );
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        error: `Baseline variant '${baseline_name}' already exists. Use a unique name.`
      });
    }

    // --- Bulk Transaction: Capturing state from active schedules & activities ---
    await pool.query(
      `
      INSERT INTO activity_baselines
      (
        activity_id,
        baseline_name,
        baseline_start,
        baseline_finish,
        baseline_duration
      )
      SELECT
        s.activity_id,
        $1,
        s.early_start,
        s.early_finish,
        a.duration
      FROM schedules s
      JOIN activities a ON s.activity_id = a.id
      `,
      [baseline_name]
    );

    res.json({
      message: `Baseline snapshot '${baseline_name}' locked and created successfully.`
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. GET ALL BASELINES (Primavera Equivalent: Baseline Visualizer Matrix)
// =========================================================================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ab.*,
        a.activity_code,
        a.activity_name
      FROM activity_baselines ab
      JOIN activities a ON ab.activity_id = a.id
      ORDER BY ab.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. BASELINE VARIANCE ANALYSIS (Primavera Equivalent: Tracking Gantt)
// =========================================================================
router.get("/variance", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.activity_code,
        a.activity_name,
        ab.baseline_name,
        ab.baseline_start,
        s.early_start AS current_start,
        ab.baseline_finish,
        s.early_finish AS current_finish,
        (s.early_start - ab.baseline_start) AS start_variance,
        (s.early_finish - ab.baseline_finish) AS finish_variance
      FROM activity_baselines ab
      JOIN schedules s ON ab.activity_id = s.activity_id
      JOIN activities a ON ab.activity_id = a.id
      ORDER BY a.activity_code
    `);

    // Nesting Bug Fix: Closing the route context safely before opening another
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. BASELINE DASHBOARD METRICS (Primavera Equivalent: Project Statistics Panel)
// =========================================================================
router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE (s.early_finish - ab.baseline_finish) > 0
        ) AS delayed_activities,

        COUNT(*) FILTER (
          WHERE (s.early_finish - ab.baseline_finish) = 0
        ) AS on_schedule,

        COALESCE(
          MAX(s.early_finish - ab.baseline_finish),
          0
        ) AS largest_delay,

        ROUND(
          COALESCE(
            AVG(s.early_finish - ab.baseline_finish),
            0
          ),
          2
        ) AS average_delay

      FROM activity_baselines ab
      JOIN schedules s ON ab.activity_id = s.activity_id
    `);

    // Payload Fix: Unwrapping single object element array container for standard clean JSON data access
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;