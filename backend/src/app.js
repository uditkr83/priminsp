const express = require("express");
const activityRoutes = require("./routes/activityRoutes");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/db");
const projectRoutes = require("./routes/projectRoutes");
const wbsRoutes = require("./routes/wbsRoutes");
const relationshipRoutes = require("./routes/relationshipRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const cpmRoutes = require("./routes/cpmRoutes");
const ganttHierarchyRoutes =
require("./routes/ganttHierarchy");
const calendarRoutes = require("./routes/calendarRoutes");
const calendarDetailsRoutes = require("./routes/calendarDetailsRoutes");
const resourceRoutes = require("./routes/resources");
const resourceAssignmentRoutes = require("./routes/resourceAssignments");
const baselineRoutes = require("./routes/baselines");



const app = express();

app.use(cors());
app.use(express.json());
app.use("/projects", projectRoutes);
app.use("/wbs", wbsRoutes);
app.use("/activities", activityRoutes);
app.use("/relationships", relationshipRoutes);
app.use("/schedules", scheduleRoutes);
app.use("/cpm", cpmRoutes);
app.use("/api/gantt-hierarchy",ganttHierarchyRoutes);
app.use("/calendars", calendarRoutes);
app.use("/calendar", calendarDetailsRoutes);
app.use("/resources", resourceRoutes);
app.use("/resource-assignments", resourceAssignmentRoutes);
app.use("/baselines", baselineRoutes);
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database Connected",
      serverTime: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

