const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        a.id AS activity_id,
        a.activity_code,
        a.activity_name,
        a.duration,
        s.early_start,
        s.early_finish,
        s.late_start,
        s.late_finish,
        s.total_float,
        s.is_critical,
        
        -- 📉 रियल बेसलाइन वेरिएंस सपोर्ट (अगर टेबल बन गई हो तो s.baseline_start वर्ना early_start)
        s.early_start AS baseline_start,
        a.duration AS baseline_duration,

        -- ↗️ FIX: सक्सेसर एक्टिविटी का कोड भी निकाल रहे हैं ताकि रिएक्ट में ऐरो परफेक्टली मैप हों
        COALESCE(
          json_agg(
            json_build_object(
              'relationship_id', r.id,
              'target_activity_id', r.successor_activity_id,
              'target_code', succ.activity_code, -- 👈 रिएक्ट कोड के साथ डायरेक्ट सिंक
              'relationship_type', r.relationship_type,
              'lag', r.lag
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) AS dependencies

      FROM schedules s

      JOIN activities a
      ON s.activity_id = a.id

      -- 🔄 पहला लेफ्ट जॉइन: रिलेशनशिप टेबल ढूंढने के लिए
      LEFT JOIN relationships r
      ON a.id = r.predecessor_activity_id

      -- 🔄 दूसरा लेफ्ट जॉइन: सक्सेसर का असली एक्टिविटी कोड (A1010, A1020) निकालने के लिए
      LEFT JOIN activities succ
      ON r.successor_activity_id = succ.id

      GROUP BY
  s.id,
  a.id,
  a.activity_code,
  a.activity_name,
  a.duration,
  s.early_start,
  s.early_finish,
  s.late_start,
  s.late_finish,
  s.total_float,
  s.is_critical 

      ORDER BY s.id;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("Database Query Error in /schedules:", err.message);
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;