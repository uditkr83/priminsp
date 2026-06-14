const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
s.id,
a.activity_code,
a.activity_name,
a.duration,
s.early_start,
s.early_finish,
s.late_start,
s.late_finish,
s.total_float,
s.is_critical
FROM schedules s
JOIN activities a
ON s.activity_id = a.id
ORDER BY s.id;
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
