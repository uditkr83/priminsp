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
    const activityMap = {};

    for (const activity of activities) {

      let ES = 1;

const predecessorLinks = relationships.filter(
  r => r.successor_activity_id === activity.id
);

if (predecessorLinks.length > 0) {

  let maxEF = 0;

  for (const link of predecessorLinks) {

    const predecessorSchedule =
      scheduleData[link.predecessor_activity_id];

    if (
      predecessorSchedule &&
      predecessorSchedule.EF > maxEF
    ) {
      maxEF = predecessorSchedule.EF;
    }
  }

  ES = maxEF + 1;
}

      const EF = ES + activity.duration - 1;

      scheduleData[activity.id] = {
  ES,
  EF
};

activityMap[activity.id] = activity;

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
  ON CONFLICT (activity_id)
  DO UPDATE SET
    early_start = EXCLUDED.early_start,
    early_finish = EXCLUDED.early_finish,
    late_start = EXCLUDED.late_start,
    late_finish = EXCLUDED.late_finish,
    total_float = EXCLUDED.total_float,
    is_critical = EXCLUDED.is_critical
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

const activityIds = Object.keys(scheduleData).map(Number);

const lastActivityId =
  activityIds[activityIds.length - 1];

scheduleData[lastActivityId].LF =
  scheduleData[lastActivityId].EF;

scheduleData[lastActivityId].LS =
  scheduleData[lastActivityId].LF -
  activityMap[lastActivityId].duration + 1;

scheduleData[lastActivityId].Float =
  scheduleData[lastActivityId].LS -
  scheduleData[lastActivityId].ES;

scheduleData[lastActivityId].Critical =
  scheduleData[lastActivityId].Float === 0;

for (
  let i = activityIds.length - 2;
  i >= 0;
  i--
) {

  const currentId = activityIds[i];
  const nextId = activityIds[i + 1];

  scheduleData[currentId].LF =
    scheduleData[nextId].LS - 1;

  scheduleData[currentId].LS =
    scheduleData[currentId].LF -
    activityMap[currentId].duration + 2;

  scheduleData[currentId].Float =
    scheduleData[currentId].LS -
    scheduleData[currentId].ES;

scheduleData[currentId].Critical =
  scheduleData[currentId].Float === 0;
}

    res.json(scheduleData);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
