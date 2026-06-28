const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Primavera Standard Valid Types configuration
const VALID_ACTIVITY_TYPES = [
  "Task",
  "Start Milestone",
  "Finish Milestone"
];

// 📊 1. GET ACTIVITIES DASHBOARD METRICS (GET /stats)
router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::INT as total_activities,
        COUNT(*) FILTER (WHERE status = 'Completed')::INT as completed,
        COUNT(*) FILTER (WHERE status = 'In Progress')::INT as in_progress,
        COUNT(*) FILTER (WHERE status = 'Not Started')::INT as not_started,
        ROUND(COALESCE(AVG(percent_complete), 0), 2)::FLOAT as avg_progress
      FROM activities
    `);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 2. CREATE ACTIVITY (POST /)
router.post("/", async (req, res) => {
  try {
    const {
      wbs_id,
      activity_code,
      activity_name,
      activity_type,
      duration,
      start_date,
      finish_date,
      percent_complete,
      constraint_type,
      constraint_date
    } = req.body;

    // Validation Guard: Restricting Activity Types
    if (activity_type && !VALID_ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({
        error: `Invalid activity type. Allowed values are: ${VALID_ACTIVITY_TYPES.join(", ")}`
      });
    }

    // ⭐ Milestone Logic: Automatically force duration to 0 if activity is not a standard Task
    const currentDuration = activity_type === "Task" ? (parseInt(duration, 10) || 0) : 0;
    
    // 🛡️ Data Guard: Restricting percent_complete between strict 0 and 100 boundaries
    const currentPercent = Math.min(100, Math.max(0, parseFloat(percent_complete) || 0));
    
    // 📊 Remaining Duration Calculation
    const remaining_duration = currentDuration - Math.round((currentDuration * currentPercent) / 100);

    // 🔄 Primavera-Style Status Auto-Derivation
    let derivedStatus = "Not Started";
    if (currentPercent >= 100) {
      derivedStatus = "Completed";
    } else if (currentPercent > 0) {
      derivedStatus = "In Progress";
    }

    const result = await pool.query(
      `INSERT INTO activities
      (
        wbs_id,
        activity_code,
        activity_name,
        activity_type,
        duration,
        start_date,
        finish_date,
        status,
        percent_complete,
        remaining_duration,
        constraint_type,
        constraint_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        wbs_id,
        activity_code,
        activity_name,
        activity_type || "Task",
        currentDuration,
        start_date || null,
        finish_date || null,
        derivedStatus,
        currentPercent,
        remaining_duration,
        constraint_type || null,
        constraint_date || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 3. GET ALL ACTIVITIES WITH WBS METADATA (GET /)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        w.wbs_name,
        w.wbs_code
      FROM activities a
      LEFT JOIN wbs w ON a.wbs_id = w.id
      ORDER BY a.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟡 4. UPDATE ACTIVITY WITH WBS RE-PARENTING SUPPORT (PUT /:id)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wbs_id,
      activity_code,
      activity_name,
      activity_type,
      duration,
      start_date,
      finish_date,
      percent_complete,
      constraint_type,
      constraint_date
    } = req.body;

    // Validation Guard: Restricting Activity Types
    if (activity_type && !VALID_ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({
        error: `Invalid activity type. Allowed values are: ${VALID_ACTIVITY_TYPES.join(", ")}`
      });
    }

    // ⭐ Milestone Logic: Automatically force duration to 0 if activity is not a standard Task
    const currentDuration = activity_type === "Task" ? (parseInt(duration, 10) || 0) : 0;
    
    // 🛡️ Data Guard: Restricting percent_complete between strict 0 and 100 boundaries
    const currentPercent = Math.min(100, Math.max(0, parseFloat(percent_complete) || 0));
    
    // 📊 Remaining Duration Calculation
    const remaining_duration = currentDuration - Math.round((currentDuration * currentPercent) / 100);

    // 🔄 Primavera-Style Status Auto-Derivation
    let derivedStatus = "Not Started";
    if (currentPercent >= 100) {
      derivedStatus = "Completed";
    } else if (currentPercent > 0) {
      derivedStatus = "In Progress";
    }

    const result = await pool.query(
      `UPDATE activities
       SET
        wbs_id = $1,
        activity_code = $2,
        activity_name = $3,
        activity_type = $4,
        duration = $5,
        start_date = $6,
        finish_date = $7,
        status = $8,
        percent_complete = $9,
        remaining_duration = $10,
        constraint_type = $11,
        constraint_date = $12
       WHERE id = $13
       RETURNING *`,
      [
        wbs_id,
        activity_code,
        activity_name,
        activity_type || "Task",
        currentDuration,
        start_date || null,
        finish_date || null,
        derivedStatus,
        currentPercent,
        remaining_duration,
        constraint_type || null,
        constraint_date || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target activity block instance not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔴 5. DELETE ACTIVITY WITH RELATIONSHIP PROTECTION (DELETE /:id)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 Delete Protection Check (Predecessor or Successor Logic Guard)
    const checkRelationships = await pool.query(
      `SELECT COUNT(*) 
       FROM relationships 
       WHERE predecessor_activity_id = $1 
          OR successor_activity_id = $1`,
      [id]
    );

    const hasRelationships = parseInt(checkRelationships.rows[0].count, 10) > 0;

    if (hasRelationships) {
      return res.status(400).json({
        error: "Activity has logic relationships. Please delete linked relationships first."
      });
    }

    const result = await pool.query(
      "DELETE FROM activities WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Target activity block instance not found." });
    }

    res.json({
      message: "Activity Deleted Successfully",
      activity: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;