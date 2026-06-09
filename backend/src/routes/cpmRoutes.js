const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/calculate", async (req, res) => {
  try {

    const activitiesResult = await pool.query(`
      SELECT *
      FROM activities
      ORDER BY id
    `);

    const relationshipsResult = await pool.query(`
      SELECT *
      FROM relationships
      ORDER BY id
    `);

    const activities = activitiesResult.rows;
    const relationships = relationshipsResult.rows;

    const scheduleData = {};

    for (const activity of activities) {

      let ES = 1;

      const predecessorLinks = relationships.filter(
        r => r.successor_activity_id === activity.id
      );

      if (predecessorLinks.length > 0) {

        const predecessorId =
          predecessorLinks[0].predecessor_activity_id;

        const predecessorSchedule =
          scheduleData[predecessorId];

        if (predecessorSchedule) {
          ES = predecessorSchedule.EF + 1;
        }
      }

      const EF = ES + activity.duration - 1;

      scheduleData[activity.id] = {
  ES,
  EF,
  LS: ES,
  LF: EF,
  Float: 0
};
await pool.query(
  `
  INSERT INTO schedules
  (
    activity_id,
    early_start,
    early_finish,
    late_start,
    late_finish,
    total_float,
    is_critical
  )
  VALUES
(
  $1,
  CURRENT_DATE + ($2 - 1),
  CURRENT_DATE + ($3 - 1),
  CURRENT_DATE + ($4 - 1),
  CURRENT_DATE + ($5 - 1),
  $6,
  $7
)
  ON CONFLICT DO NOTHING
  `,
  [
  activity.id,
  ES,
  EF,
  ES,
  EF,
  0,
  true
]
);
    }

    res.json(scheduleData);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
