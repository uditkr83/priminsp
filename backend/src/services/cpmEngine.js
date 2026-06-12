const pool = require("../config/db");

async function calculateCPM() {
  const activities = await pool.query(`
    SELECT id, activity_code, duration
    FROM activities
    ORDER BY id
  `);

  const relationships = await pool.query(`
    SELECT predecessor_activity_id,
           successor_activity_id,
           relationship_type,
           lag
    FROM relationships
  `);

  console.log("Activities:", activities.rows);
  console.log("Relationships:", relationships.rows);

  return {
    activities: activities.rows,
    relationships: relationships.rows
  };
}

module.exports = { calculateCPM };
