const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/workdays/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM calendar_workdays
       WHERE calendar_id=$1
       ORDER BY day_of_week`,
      [req.params.calendarId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/shifts/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM calendar_shifts
       WHERE calendar_id=$1`,
      [req.params.calendarId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/exceptions/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM calendar_exceptions
       WHERE calendar_id=$1`,
      [req.params.calendarId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;