import { useEffect, useState } from "react";
import axios from "axios";
import {
  MdEdit,
  MdDelete,
  MdAssignment,
  MdCallSplit,
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdSearch,
  MdLayers
} from "react-icons/md";

export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Form and Editor States
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [duration, setDuration] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Step 1: WBS States for dropdown management
  const [wbsItems, setWbsItems] = useState([]);
  const [selectedWbs, setSelectedWbs] = useState("");

  // Step 3: Trigger both activities and WBS fetching on mount
  useEffect(() => {
    loadActivities();
    loadWBS();
  }, []);

  // Step 2: WBS load function to fetch data from API
  const loadWBS = async () => {
    try {
      const response = await axios.get("http://13.61.24.144:5000/wbs");
      setWbsItems(response.data || []);
    } catch (err) {
      console.error("Error fetching WBS items:", err);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://13.61.24.144:5000/activities");
      setActivities(response.data || []);
    } catch (err) {
      console.error("Error fetching activities repository:", err);
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async () => {
    // Step 5: Updated validation to enforce WBS selection
    if (!activityCode || !activityName || !duration || !selectedWbs) {
      alert("Please fill in all input fields, including WBS Assignment, before adding an activity.");
      return;
    }
    try {
      await axios.post("http://13.61.24.144:5000/activities", {
        wbs_id: Number(selectedWbs), // Step 6: Dynamic selection instead of hardcoded id 2
        activity_code: activityCode,
        activity_name: activityName,
        duration: Number(duration),
        start_date: "2026-06-20",
        finish_date: "2026-06-25"
      });

      setActivityCode("");
      setActivityName("");
      setDuration("");
      setSelectedWbs(""); // Step 7: Clear WBS selection after successful creation
      loadActivities();
    } catch (err) {
      console.error("Error creating activity entry:", err);
    }
  };

  const editActivity = (activity) => {
    setEditingId(activity.id);
    setActivityCode(activity.activity_code);
    setActivityName(activity.activity_name);
    setDuration(activity.duration);
    setSelectedWbs(activity.wbs_id ? String(activity.wbs_id) : ""); // Map existing WBS on edit
  };

  const updateActivity = async () => {
    if (!activityCode || !activityName || !duration || !selectedWbs) {
      alert("Please fill in all fields before updating.");
      return;
    }
    try {
      await axios.put(`http://13.61.24.144:5000/activities/${editingId}`, {
        wbs_id: Number(selectedWbs),
        activity_code: activityCode,
        activity_name: activityName,
        duration: Number(duration)
      });

      setEditingId(null);
      setActivityCode("");
      setActivityName("");
      setDuration("");
      setSelectedWbs("");
      loadActivities();
    } catch (err) {
      console.error("Error updating activity record:", err);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this task entry?")) return;
    try {
      await axios.delete(`http://13.61.24.144:5000/activities/${id}`);
      loadActivities();
    } catch (err) {
      console.error("Error removing row element:", err);
    }
  };

  const filteredActivities = activities.filter((act) =>
    act.activity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(act.wbs_id || "").includes(searchTerm)
  );

  return (
    <div
      style={{
        background: "#0d1018",
        minHeight: "100vh",
        padding: "32px 36px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#e2e8f0",
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
            Operational Control
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Project Activities Directory</h1>
        </div>

        {/* Search Bar */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px", 
          background: "#0f1117", 
          border: "1px solid #1e2330", 
          borderRadius: "8px", 
          padding: "8px 16px", 
          maxWidth: "400px" 
        }}>
          <MdSearch style={{ color: "#475569", fontSize: "18px" }} />
          <input 
            type="text" 
            placeholder="Search activity code, description, or WBS map..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "13px", width: "100%" }}
          />
        </div>
      </div>

      {/* Main Split Grid Workspaces Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
        
        {/* Left Form Panel */}
        <div style={{ 
          background: "#0f1117", 
          border: editingId ? "1px solid #185FA5" : "1px solid #1e2330", 
          borderRadius: "10px", 
          padding: "20px",
          boxSizing: "border-box"
        }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", paddingBottom: "10px", borderBottom: "1px solid #1e2330", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdAssignment style={{ fontSize: "16px", color: editingId ? "#378ADD" : "#1D9E75" }} /> 
            Activity Editor
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Code</label>
              <input
                type="text"
                placeholder="e.g., A1000"
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Name</label>
              <input
                type="text"
                placeholder="Describe scope item..."
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Duration</label>
              <input
                type="number"
                placeholder="Days"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Step 4: Integrated WBS Dropdown below Duration Field */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>
                WBS Assignment
              </label>
              <select
                value={selectedWbs}
                onChange={(e) => setSelectedWbs(e.target.value)}
                style={{ 
                  width: "100%", 
                  background: "#0d1018", 
                  border: "1px solid #1e2330", 
                  borderRadius: "6px", 
                  padding: "8px 12px", 
                  color: "#e2e8f0", 
                  fontSize: "13px", 
                  outline: "none", 
                  boxSizing: "border-box" 
                }}
              >
                <option value="">Select WBS</option>
                {wbsItems.map((wbs) => (
                  <option key={wbs.id} value={wbs.id}>
                    {wbs.wbs_code} - {wbs.wbs_name}
                  </option>
                ))}
              </select>
            </div>

            {editingId ? (
              <button
                onClick={updateActivity}
                style={{ width: "100%", background: "#185FA5", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <img />
                <MdCheckCircleOutline style={{ fontSize: "16px" }} /> Update Activity
              </button>
            ) : (
              <button
                onClick={addActivity}
                style={{ width: "100%", background: "#1D9E75", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <MdAddCircleOutline style={{ fontSize: "16px" }} /> Add Activity
              </button>
            )}

            {editingId && (
              <button
                onClick={() => { setEditingId(null); setActivityCode(""); setActivityName(""); setDuration(""); setSelectedWbs(""); }}
                style={{ width: "100%", background: "transparent", color: "#64748b", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px", fontSize: "12px", cursor: "pointer" }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Right Output Activities Table */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
            Operational Task Inventory Matrix ({filteredActivities.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0d1018" }}>
                {["ID", "WBS", "Activity Code", "Activity Description Name", "Duration", "Scheduling Links", "Actions"].map((header) => (
                  <th key={header} style={{ padding: "12px 20px", fontSize: "10px", fontWeight: 600, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    Loading active enterprise activity pipelines...
                  </td>
                </tr>
              ) : filteredActivities.map((activity, index) => (
                <tr key={activity.id || index} style={{ borderTop: "1px solid #1e2330", background: editingId === activity.id ? "#185fa515" : "transparent" }}>
                  {/* ID */}
                  <td style={{ padding: "14px 20px", fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                    #{activity.id}
                  </td>

                  {/* Dynamic WBS Tracker (reflects backend response) */}
                  <td style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MdLayers style={{ color: "#EF9F27", fontSize: "14px" }} />
                      WBS-{activity.wbs_id}
                    </div>
                  </td>

                  {/* Activity Code */}
                  <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#378ADD" }}>
                    {activity.activity_code}
                  </td>

                  {/* Activity Name */}
                  <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                    {activity.activity_name}
                  </td>

                  {/* Duration Badge */}
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      background: "#1a1f2e",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      color: "#1D9E75",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #114331"
                    }}>
                      {activity.duration}d
                    </span>
                  </td>

                  {/* Links Counter */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1a0d1a", border: "1px solid #4a1327", color: "#D4537E", fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "4px" }}>
                      <MdCallSplit size={12} />
                      <span>{(activity.id % 3) + 1} Links</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => editActivity(activity)}
                        style={{ display: "flex", alignItems: "center", background: "transparent", border: "1px solid #334155", borderRadius: "4px", padding: "4px 8px", color: "#94a3b8", fontSize: "12px", cursor: "pointer" }}
                      >
                        <MdEdit style={{ marginRight: "4px" }} size={12} /> Edit
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        style={{ display: "flex", alignItems: "center", background: "transparent", border: "1px solid #521622", borderRadius: "4px", padding: "4px 8px", color: "#E24B4A", fontSize: "12px", cursor: "pointer" }}
                      >
                        <MdDelete style={{ marginRight: "4px" }} size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {!loading && filteredActivities.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    No matching activity context instances found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}