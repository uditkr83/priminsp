const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
    w.id,
    w.parent_wbs_id,
    w.wbs_code,
    w.wbs_name,

    a.id AS activity_id,
    a.activity_code,
    a.activity_name,
    a.duration,

    a.start_date AS early_start,
    a.finish_date AS early_finish,

    a.percent_complete,
    a.status

FROM wbs w
LEFT JOIN activities a
ON w.id = a.wbs_id
ORDER BY w.id;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;