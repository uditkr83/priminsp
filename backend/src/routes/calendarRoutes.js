const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// ==========================================
// GET ROUTES
// ==========================================

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
    res.status(500).json({ error: err.message });
  }
});

// Dynamic Shift Fetch Route: Get shifts by calendar ID
router.get("/shifts/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM calendar_shifts
      WHERE calendar_id=$1
      ORDER BY start_hour
      `,
      [req.params.calendarId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get exceptions by calendar ID
router.get("/exceptions/:calendarId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM calendar_exceptions
      WHERE calendar_id = $1
      ORDER BY exception_date
      `,
      [req.params.calendarId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

// ==========================================
// POST ROUTES
// ==========================================

// Create calendar
router.post("/", async (req, res) => {
  try {
    const {
      calendar_code,
      calendar_name,
      calendar_type,
      hours_per_day,
      hours_per_week
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO calendars
      (
        calendar_code,
        calendar_name,
        calendar_type,
        hours_per_day,
        hours_per_week
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        calendar_code,
        calendar_name,
        calendar_type,
        hours_per_day,
        hours_per_week
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- PHASE 6: DEEP COPY CALENDAR ENGINE ---
router.post("/:id/copy", async (req, res) => {
  try {
    const sourceId = req.params.id;

    // 1. Fetch Source Base Node
    const source = await pool.query(
      `SELECT * FROM calendars WHERE id=$1`,
      [sourceId]
    );

    if (source.rows.length === 0) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const cal = source.rows[0];

    // 2. Clone Parent Node Record
    const newCal = await pool.query(
      `
      INSERT INTO calendars
      (
        calendar_code,
        calendar_name,
        calendar_type,
        hours_per_day,
        hours_per_week
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        cal.calendar_code + "_COPY",
        cal.calendar_name + " Copy",
        cal.calendar_type,
        cal.hours_per_day,
        cal.hours_per_week
      ]
    );

    const newId = newCal.rows[0].id;

    // 3. Duplicate Workday Matrix
    await pool.query(
      `
      INSERT INTO calendar_workdays (calendar_id, day_of_week)
      SELECT $1, day_of_week
      FROM calendar_workdays
      WHERE calendar_id = $2
      `,
      [newId, sourceId]
    );

    // 4. Duplicate Shift Timelines
    await pool.query(
      `
      INSERT INTO calendar_shifts (calendar_id, shift_name, start_hour, end_hour)
      SELECT $1, shift_name, start_hour, end_hour
      FROM calendar_shifts
      WHERE calendar_id = $2
      `,
      [newId, sourceId]
    );

    // 5. Duplicate Target Exceptions
    await pool.query(
      `
      INSERT INTO calendar_exceptions (calendar_id, exception_date, exception_name, exception_type, is_recurring)
      SELECT $1, exception_date, exception_name, exception_type, is_recurring
      FROM calendar_exceptions
      WHERE calendar_id = $2
      `,
      [newId, sourceId]
    );

    res.status(201).json(newCal.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- PHASE 5: CREATE EXCEPTION ---
router.post("/exceptions", async (req, res) => {
  try {
    const {
      calendar_id,
      exception_date,
      exception_name,
      exception_type,
      is_recurring
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO calendar_exceptions
      (
        calendar_id,
        exception_date,
        exception_name,
        exception_type,
        is_recurring
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        calendar_id,
        exception_date,
        exception_name,
        exception_type,
        is_recurring
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUT / TOGGLE ROUTES
// ==========================================

// --- PHASE-2: TOGGLE WORKDAY ---
router.put("/workdays/:id", async (req, res) => {
  try {
    const { day_of_week } = req.body;

    const exists = await pool.query(
      `SELECT * FROM calendar_workdays
       WHERE calendar_id=$1 AND day_of_week=$2`,
      [req.params.id, day_of_week]
    );

    if (exists.rows.length > 0) {
      await pool.query(
        `DELETE FROM calendar_workdays
         WHERE calendar_id=$1 AND day_of_week=$2`,
        [req.params.id, day_of_week]
      );
      return res.json({ working: false });
    }

    await pool.query(
      `INSERT INTO calendar_workdays
       (calendar_id, day_of_week)
       VALUES ($1,$2)`,
      [req.params.id, day_of_week]
    );

    res.json({ working: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;