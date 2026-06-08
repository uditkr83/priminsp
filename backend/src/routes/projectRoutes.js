const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  try {
    const {
      project_code,
      project_name,
      start_date,
      finish_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO projects
      (project_code, project_name, start_date, finish_date)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        project_code,
        project_name,
        start_date,
        finish_date
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

    const result = await pool.query(
      "SELECT * FROM projects ORDER BY id"
    );

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
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE projects
       SET project_code=$1,
           project_name=$2,
           start_date=$3,
           finish_date=$4,
           status=$5
       WHERE id=$6
       RETURNING *`,
      [
        project_code,
        project_name,
        start_date,
        finish_date,
        status,
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
