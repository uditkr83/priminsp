const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET ALL ASSIGNMENTS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ra.*,
        r.resource_code,
        r.resource_name,
        r.resource_type,
        a.activity_code,
        a.activity_name
      FROM resource_assignments ra
      JOIN resources r
        ON ra.resource_id = r.id
      JOIN activities a
        ON ra.activity_id = a.id
      ORDER BY ra.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE ASSIGNMENT
router.post("/", async (req, res) => {
  try {
    const {
      activity_id,
      resource_id,
      budgeted_units,
      actual_units,
      remaining_units
    } = req.body;

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
      VALUES ($1,$2,$3,$4,$5)
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

// DELETE ASSIGNMENT
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM resource_assignments WHERE id=$1",
      [req.params.id]
    );

    res.json({
      message: "Assignment deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;