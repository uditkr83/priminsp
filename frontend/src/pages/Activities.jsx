import { useEffect, useState } from "react";
import axios from "axios";

function Activities() {
  const [activities, setActivities] = useState([]);
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [duration, setDuration] = useState("");
   const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/activities"
      );

      setActivities(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addActivity = async () => {
    try {
      await axios.post(
        "http://13.60.26.19:5000/activities",
        {
          wbs_id: 2,
          activity_code: activityCode,
          activity_name: activityName,
          duration: Number(duration),
          start_date: "2026-06-20",
          finish_date: "2026-06-25"
        }
      );

      setActivityCode("");
      setActivityName("");
      setDuration("");

      loadActivities();

    } catch (err) {
      console.error(err);
    }
  };

  const editActivity = (activity) => {
  setEditingId(activity.id);

  setActivityCode(activity.activity_code);
  setActivityName(activity.activity_name);
  setDuration(activity.duration);
};
const updateActivity = async () => {
  try {

    await axios.put(
      `http://13.60.26.19:5000/activities/${editingId}`,
      {
        activity_code: activityCode,
        activity_name: activityName,
        duration: Number(duration)
      }
    );

    setEditingId(null);

    setActivityCode("");
    setActivityName("");
    setDuration("");

    loadActivities();

  } catch (err) {
    console.error(err);
  }
};

  const deleteActivity = async (id) => {
  try {

    await axios.delete(
      `http://13.60.26.19:5000/activities/${id}`
    );

    loadActivities();

  } catch (err) {
    console.error(err);
  }
};

  return (
    <div>
      <h1>📋 Activities</h1>

      <div style={{ marginBottom: "20px" }}>

        <input
          placeholder="Activity Code"
          value={activityCode}
          onChange={(e) => setActivityCode(e.target.value)}
        />

        <input
          placeholder="Activity Name"
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          style={{ marginLeft: "10px" }}
        />

        <input
          placeholder="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          style={{ marginLeft: "10px" }}
        />

        {editingId ? (
  <button
    onClick={updateActivity}
    style={{ marginLeft: "10px" }}
  >
    Update Activity
  </button>
) : (
  <button
    onClick={addActivity}
    style={{ marginLeft: "10px" }}
  >
    Add Activity
  </button>
)}

      </div>

      <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    background: "#1f2937",
    borderRadius: "12px",
    overflow: "hidden"
  }}
>
        <thead>
          <tr>
            <th style={headerStyle}>ID</th>
            <th style={headerStyle}>Code</th>
            <th style={headerStyle}>Name</th>
            <th style={headerStyle}>Duration</th>
            <th style={headerStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td style={cellStyle}>{activity.id}</td>
              <td style={cellStyle}>{activity.activity_code}</td>
              <td style={cellStyle}>{activity.activity_name}</td>
              <td style={cellStyle}>{activity.duration}</td>

  <td>

  <button
  onClick={() => editActivity(activity)}
  style={{
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer"
  }}
>
  Edit
</button>

  <button
  onClick={() =>
    deleteActivity(activity.id)
  }
  style={{
    marginLeft: "5px",
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer"
  }}
>
  Delete
</button>

</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const headerStyle = {
  padding: "15px",
  background: "#111827",
  color: "white"
};
const cellStyle = {
  padding: "15px",
  textAlign: "center",
  borderBottom: "1px solid #374151"
};

export default Activities;