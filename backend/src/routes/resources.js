const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET ALL RESOURCES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM resources
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE RESOURCE
router.post("/", async (req, res) => {
  try {
    const {
      resource_code,
      resource_name,
      resource_type,
      max_units,
      unit_rate
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO resources
      (
        resource_code,
        resource_name,
        resource_type,
        max_units,
        unit_rate
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        resource_code,
        resource_name,
        resource_type,
        max_units,
        unit_rate
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE RESOURCE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      resource_code,
      resource_name,
      resource_type,
      max_units,
      unit_rate
    } = req.body;

    const result = await pool.query(
      `
      UPDATE resources
      SET
        resource_code = $1,
        resource_name = $2,
        resource_type = $3,
        max_units = $4,
        unit_rate = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        resource_code,
        resource_name,
        resource_type,
        max_units,
        unit_rate,
        id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE RESOURCE
router.delete("/:id", async (req, res) => {
  try {

    await pool.query(
      "DELETE FROM resources WHERE id = $1",
      [req.params.id]
    );

    res.json({
      message: "Resource deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;