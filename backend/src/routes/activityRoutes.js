const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  try {

    const {
  wbs_id,
  activity_code,
  activity_name,
  duration,
  start_date,
  finish_date,
  status
} = req.body;

    const result = await pool.query(
      `INSERT INTO activities
      (
        wbs_id,
        activity_code,
        activity_name,
        duration,
        start_date,
        finish_date
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        wbs_id,
        activity_code,
        activity_name,
        duration,
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
      "SELECT * FROM activities ORDER BY id"
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
      activity_code,
      activity_name,
      duration,
      start_date,
      finish_date,
      status
    } = req.body;

    const result = await pool.query(
      `UPDATE activities
       SET activity_code=$1,
           activity_name=$2,
           duration=$3,
           start_date=$4,
           finish_date=$5,
           status=$6
       WHERE id=$7
       RETURNING *`,
      [
        activity_code,
        activity_name,
        duration,
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
      "DELETE FROM activities WHERE id=$1 RETURNING *",
      [id]
    );

    res.json({
      message: "Activity Deleted",
      activity: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
