const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Get all calendars
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM calendars
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Phase 3 - Step 1: Get workdays by calendar ID
router.get("/workdays/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM calendar_workdays
      WHERE calendar_id = $1
      ORDER BY day_of_week
      `,
      [req.params.calendarId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

// Get single calendar
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM calendars
      WHERE id=$1
    `,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create calendar
router.post("/", async (req, res) => {
  try {
    const {
      calendar_code,
      calendar_name,
      calendar_type
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO calendars
      (
        calendar_code,
        calendar_name,
        calendar_type
      )
      VALUES ($1,$2,$3)
      RETURNING *
    `,
      [
        calendar_code,
        calendar_name,
        calendar_type
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;