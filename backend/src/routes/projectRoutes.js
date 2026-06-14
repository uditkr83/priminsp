const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  try {
    const {
  project_code,
  project_name,
  start_date,
  finish_date,
  status,
  progress,
  description,
  manager_name,
  baseline_start,
  baseline_finish
} = req.body;

    const result = await pool.query(
`
INSERT INTO projects
(
  project_code,
  project_name,
  start_date,
  finish_date,
  status,
  progress,
  description,
  manager_name,
  baseline_start,
  baseline_finish
)
VALUES
($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
RETURNING *
`,
[
  project_code,
  project_name,
  start_date,
  finish_date,
  status || "Planned",
  progress || 0,
  description,
  manager_name,
  baseline_start,
  baseline_finish
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
    p.*,

    COUNT(DISTINCT w.id) AS wbs_count,

    COUNT(DISTINCT a.id) AS activity_count

FROM projects p

LEFT JOIN wbs w
ON w.project_id = p.id

LEFT JOIN activities a
ON a.wbs_id = w.id

GROUP BY p.id

ORDER BY p.id
`);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.put("/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const {
  project_code,
  project_name,
  start_date,
  finish_date,
  status,
  progress,
  description,
  manager_name,
  baseline_start,
  baseline_finish
} = req.body;

    const result = await pool.query(
      `UPDATE projects
SET
project_code=$1,
project_name=$2,
start_date=$3,
finish_date=$4,
status=$5,
progress=$6,
description=$7,
manager_name=$8,
baseline_start=$9,
baseline_finish=$10
WHERE id=$11
RETURNING *`,
      [
  project_code,
  project_name,
  start_date,
  finish_date,
  status,
  progress,
  description,
  manager_name,
  baseline_start,
  baseline_finish,
  id
]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM projects WHERE id=$1 RETURNING *",
      [id]
    );

    res.json({
      message: "Project Deleted",
      project: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
module.exports = router;
