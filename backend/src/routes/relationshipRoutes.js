const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  try {

    const {
      predecessor_activity_id,
      successor_activity_id,
      relationship_type,
      lag
    } = req.body;

    const result = await pool.query(
      `INSERT INTO relationships
      (
        predecessor_activity_id,
        successor_activity_id,
        relationship_type,
        lag
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        predecessor_activity_id,
        successor_activity_id,
        relationship_type,
        lag || 0
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.get("/", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        r.id,

        p.activity_code AS predecessor_code,
        p.activity_name AS predecessor_name,

        s.activity_code AS successor_code,
        s.activity_name AS successor_name,

        r.relationship_type,
        r.lag

      FROM relationships r

      JOIN activities p
      ON r.predecessor_activity_id = p.id

      JOIN activities s
      ON r.successor_activity_id = s.id

      ORDER BY r.id
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
