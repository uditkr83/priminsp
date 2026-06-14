const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// 📊 GET DASHBOARD STATS
router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::INT AS total_relationships,
        COUNT(*) FILTER (WHERE relationship_type = 'FS')::INT AS fs_count,
        COUNT(*) FILTER (WHERE relationship_type = 'SS')::INT AS ss_count,
        COUNT(*) FILTER (WHERE relationship_type = 'FF')::INT AS ff_count,
        COUNT(*) FILTER (WHERE relationship_type = 'SF')::INT AS sf_count
      FROM relationships;
    `);

    res.json(result.rows[0] || { total_relationships: 0, fs_count: 0, ss_count: 0, ff_count: 0, sf_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 POST: CREATE RELATIONSHIP
router.post("/", async (req, res) => {
  try {
    const { predecessor_activity_id, successor_activity_id, relationship_type, lag } = req.body;

    // 1. Simple Self Relationship Check
    if (Number(predecessor_activity_id) === Number(successor_activity_id)) {
      return res.status(400).json({ error: "Activity cannot be linked to itself" });
    }

    // 2. Simple Type Validation
    const validTypes = ["FS", "SS", "FF", "SF"];
    if (!validTypes.includes(relationship_type)) {
      return res.status(400).json({ error: "Invalid relationship type" });
    }

    // 3. Activity Existence Validation (🔥 Improvement 1)
    const activityCheck = await pool.query(
      `SELECT id FROM activities WHERE id IN ($1, $2)`,
      [predecessor_activity_id, successor_activity_id]
    );
    if (activityCheck.rows.length !== 2) {
      return res.status(400).json({ error: "One or more selected activities do not exist" });
    }

    // 4. Circular Relationship Detection (🔥 Improvement 2)
    const circularCheck = await pool.query(
      `SELECT id FROM relationships 
       WHERE predecessor_activity_id = $1 AND successor_activity_id = $2`,
      [successor_activity_id, predecessor_activity_id]
    );
    if (circularCheck.rows.length > 0) {
      return res.status(400).json({ error: "Circular relationship detected" });
    }

    // 5. Duplicate Relationship Check
    const existing = await pool.query(
      `SELECT id FROM relationships 
       WHERE predecessor_activity_id = $1 AND successor_activity_id = $2 AND relationship_type = $3`,
      [predecessor_activity_id, successor_activity_id, relationship_type]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Relationship already exists" });
    }

    // Insert Execution
    const result = await pool.query(
      `INSERT INTO relationships (predecessor_activity_id, successor_activity_id, relationship_type, lag)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [predecessor_activity_id, successor_activity_id, relationship_type, lag || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔍 GET: FETCH ALL RELATIONSHIPS WITH IMPACT PREVIEW
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.predecessor_activity_id,
        r.successor_activity_id,
        r.relationship_type,
        r.lag,
        p.activity_code AS predecessor_code,
        p.activity_name AS predecessor_name,
        p.status AS predecessor_status,
        p.duration AS predecessor_duration,
        s.activity_code AS successor_code,
        s.activity_name AS successor_name,
        s.status AS successor_status,
        s.duration AS successor_duration
      FROM relationships r
      JOIN activities p ON r.predecessor_activity_id = p.id
      JOIN activities s ON r.successor_activity_id = s.id
      ORDER BY r.id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🛠️ PUT: UPDATE RELATIONSHIP
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { predecessor_activity_id, successor_activity_id, relationship_type, lag } = req.body;

    // 1. Simple Self Relationship Check
    if (Number(predecessor_activity_id) === Number(successor_activity_id)) {
      return res.status(400).json({ error: "Activity cannot be linked to itself" });
    }

    // 2. Simple Type Validation
    const validTypes = ["FS", "SS", "FF", "SF"];
    if (!validTypes.includes(relationship_type)) {
      return res.status(400).json({ error: "Invalid relationship type" });
    }

    // 3. Activity Existence Validation (🔥 Improvement 1)
    const activityCheck = await pool.query(
      `SELECT id FROM activities WHERE id IN ($1, $2)`,
      [predecessor_activity_id, successor_activity_id]
    );
    if (activityCheck.rows.length !== 2) {
      return res.status(400).json({ error: "One or more selected activities do not exist" });
    }

    // 4. Circular Relationship Detection (🔥 Improvement 2)
    const circularCheck = await pool.query(
      `SELECT id FROM relationships 
       WHERE predecessor_activity_id = $1 AND successor_activity_id = $2`,
      [successor_activity_id, predecessor_activity_id]
    );
    if (circularCheck.rows.length > 0) {
      return res.status(400).json({ error: "Circular relationship detected" });
    }

    // 5. Duplicate Relationship Check (Excluding Current ID)
    const existing = await pool.query(
      `SELECT id FROM relationships 
       WHERE predecessor_activity_id = $1 AND successor_activity_id = $2 AND relationship_type = $3 AND id != $4`,
      [predecessor_activity_id, successor_activity_id, relationship_type, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Relationship already exists" });
    }

    // Update Execution
    const result = await pool.query(
      `UPDATE relationships
       SET predecessor_activity_id = $1, successor_activity_id = $2, relationship_type = $3, lag = $4
       WHERE id = $5 RETURNING *`,
      [predecessor_activity_id, successor_activity_id, relationship_type, lag || 0, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Relationship not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ DELETE: REMOVE RELATIONSHIP
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM relationships WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Relationship not found" });
    }

    res.json({ message: "Relationship deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;