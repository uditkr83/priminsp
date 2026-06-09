const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  try {

    const {
      project_id,
      parent_wbs_id,
      wbs_code,
      wbs_name
    } = req.body;

    const result = await pool.query(
      `INSERT INTO wbs
      (project_id, parent_wbs_id, wbs_code, wbs_name)
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        project_id,
        parent_wbs_id,
        wbs_code,
        wbs_name
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
      "SELECT * FROM wbs ORDER BY id"
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
module.exports = router;
