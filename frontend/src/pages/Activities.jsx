import { useEffect, useState } from "react";
import API from "../api"; 
import {
  MdEdit,
  MdDelete,
  MdAssignment,
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdSearch,
  MdLayers,
  MdTrendingUp,
  MdCheckCircle,
  MdPlayCircleFilled,
  MdHelpOutline
} from "react-icons/md";

export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // ⚙️ Dashboard Metrics State
  const [stats, setStats] = useState({
    total_activities: 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    avg_progress: 0
  });

  // 📝 Form and Editor States
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [percentComplete, setPercentComplete] = useState(0);
  const [selectedWbs, setSelectedWbs] = useState("");
  const [editingId, setEditingId] = useState(null);

  // 📂 WBS Dropdown Management
  const [wbsItems, setWbsItems] = useState([]);

  // 🚀 Initial Load Pipeline
  useEffect(() => {
    loadDashboardData();
    loadWBS();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 🛠️ Multi-fetch telemetry execution (Activities + Stats)
      const [activitiesRes, statsRes] = await Promise.all([
        API.get("/activities"),
        API.get("/activities/stats")
      ]);
      setActivities(activitiesRes.data || []);
      setStats(statsRes.data || { total_activities: 0, completed: 0, in_progress: 0, not_started: 0, avg_progress: 0 });
    } catch (err) {
      console.error("Error aggregating activities runtime context metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadWBS = async () => {
    try {
      const response = await API.get("/wbs");
      setWbsItems(response.data || []);
    } catch (err) {
      console.error("Error fetching WBS items:", err);
    }
  };

  // 📅 Primavera Date Format Engine (e.g., 20-Jun-2026)
  const formatPrimaveraDate = (dateString) => {
    if (!dateString) return "Not Scheduled";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Not Scheduled";
    
    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const addActivity = async () => {
    if (!activityCode || !activityName || !duration || !selectedWbs) {
      alert("Validation Constraint: Please map all core fields including WBS Assignment node.");
      return;
    }
    try {
      await API.post("/activities", {
        wbs_id: Number(selectedWbs),
        activity_code: activityCode,
        activity_name: activityName,
        duration: Number(duration),
        start_date: startDate || null,
        finish_date: finishDate || null,
        percent_complete: Number(percentComplete)
      });

      resetFormFields();
      loadDashboardData();
    } catch (err) {
      console.error("Error creating activity instance payload execution:", err);
    }
  };

  // 🛠️ UPGRADED SAFE DATE EXTRACTOR BY USER
  const editActivity = (activity) => {
    setEditingId(activity.id);
    setActivityCode(activity.activity_code || "");
    setActivityName(activity.activity_name || "");
    setDuration(activity.duration || "");
    
    // Safety guard using substring to cleanly parse raw database date formats or null states
    setStartDate(activity.start_date?.substring(0, 10) || "");
    setFinishDate(activity.finish_date?.substring(0, 10) || "");
    
    setPercentComplete(activity.percent_complete || 0);
    setSelectedWbs(activity.wbs_id ? String(activity.wbs_id) : "");
  };

  const updateActivity = async () => {
    if (!activityCode || !activityName || !duration || !selectedWbs) {
      alert("Validation Constraint: Core parameters cannot compile with empty values.");
      return;
    }
    try {
      await API.put(`/activities/${editingId}`, {
        wbs_id: Number(selectedWbs),
        activity_code: activityCode,
        activity_name: activityName,
        duration: Number(duration),
        start_date: startDate || null,
        finish_date: finishDate || null,
        percent_complete: Number(percentComplete)
      });

      setEditingId(null);
      resetFormFields();
      loadDashboardData();
    } catch (err) {
      console.error("Mutation aborted on cluster update processing sequence:", err);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this task logic node?")) return;
    try {
      await API.delete(`/activities/${id}`);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Error executing delete lifecycle state transition sequence.");
    }
  };

  const resetFormFields = () => {
    setActivityCode("");
    setActivityName("");
    setDuration("");
    setStartDate("");
    setFinishDate("");
    setPercentComplete(0);
    setSelectedWbs("");
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Completed":
        return { bg: "#042f1a", text: "#34d399", border: "#10b981" };
      case "In Progress":
        return { bg: "#362005", text: "#fbbf24", border: "#f59e0b" };
      case "Not Started":
      default:
        return { bg: "#1e293b", text: "#94a3b8", border: "#475569" };
    }
  };

  const filteredActivities = activities.filter((act) =>
    act.activity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.wbs_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.wbs_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        background: "#0d1018",
        minHeight: "100vh",
        padding: "24px 32px",
        fontFamily: "Inter, -apple-system, sans-serif",
        color: "#e2e8f0",
        boxSizing: "border-box"
      }}
    >
      {/* Header Panel Layout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
            Operational Control Management System
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#f8fafc", margin: "4px 0 0 0", letterSpacing: "-0.5px" }}>
            Project Activities Master Matrix
          </h1>
        </div>

        {/* Search Engine Wrapper */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "8px 16px", width: "320px" }}>
          <MdSearch style={{ color: "#475569", fontSize: "18px" }} />
          <input 
            type="text" 
            placeholder="Search code, description, or WBS..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "13px", width: "100%" }}
          />
        </div>
      </div>

      {/* 📊 Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { title: "Total Activities", value: stats.total_activities, icon: <MdAssignment size={18} color="#3b82f6" />, bg: "#0f162a" },
          { title: "Completed Tasks", value: stats.completed, icon: <MdCheckCircle size={18} color="#10b981" />, bg: "#061c14" },
          { title: "In Progress Logs", value: stats.in_progress, icon: <MdPlayCircleFilled size={18} color="#f59e0b" />, bg: "#1c150c" },
          { title: "Not Started Status", value: stats.not_started, icon: <MdHelpOutline size={18} color="#64748b" />, bg: "#171923" },
          { title: "Average Progress Score", value: `${stats.avg_progress}%`, icon: <MdTrendingUp size={18} color="#a855f7" />, bg: "#1c122c" }
        ].map((card, idx) => (
          <div key={idx} style={{ background: card.bg, border: "1px solid #1e2330", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>{card.title}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>{card.value}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "6px", display: "flex", alignItems: "center" }}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Workspace Main Split Layout Grid Mapping */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>
        
        {/* Left Form Control Panel Layout */}
        <div style={{ background: "#0f1117", border: editingId ? "1px solid #185FA5" : "1px solid #1e2330", borderRadius: "10px", padding: "20px", boxSizing: "border-box" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", paddingBottom: "10px", borderBottom: "1px solid #1e2330", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdAssignment style={{ fontSize: "16px", color: editingId ? "#378ADD" : "#1D9E75" }} /> 
            {editingId ? "Modify Activity Log Node" : "Create Activity Record Instance"}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Activity Code</label>
              <input
                type="text"
                placeholder="e.g., A1000"
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Activity Name Description</label>
              <input
                type="text"
                placeholder="Describe scope element matrix..."
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Duration (d)</label>
                <input
                  type="number"
                  placeholder="Days"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#10b981", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0 - 100"
                  value={percentComplete}
                  onChange={(e) => setPercentComplete(e.target.value)}
                  style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#10b981", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Planned Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Planned Finish Date</label>
              <input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>WBS Hierarchical Assignment</label>
              <select
                value={selectedWbs}
                onChange={(e) => setSelectedWbs(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
              >
                <option value="">-- Associate WBS Hierarchy --</option>
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
                style={{ width: "100%", background: "#185FA5", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <MdCheckCircleOutline style={{ fontSize: "16px" }} /> Save Changes
              </button>
            ) : (
              <button
                onClick={addActivity}
                style={{ width: "100%", background: "#1D9E75", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <MdAddCircleOutline style={{ fontSize: "16px" }} /> Append Activity Node
              </button>
            )}

            {editingId && (
              <button
                onClick={() => { setEditingId(null); resetFormFields(); }}
                style={{ width: "100%", background: "transparent", color: "#64748b", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px", fontSize: "12px", cursor: "pointer" }}
              >
                Abort Refactor Sequence
              </button>
            )}
          </div>
        </div>

        {/* Right Output Table Content Control Flow */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
            Operational Task System Activity Matrix Map ({filteredActivities.length})
          </div>
          
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#0d1018" }}>
                  <th style={{ width: "60px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase" }}>ID</th>
                  <th style={{ width: "160px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase" }}>WBS Element Map</th>
                  <th style={{ width: "110px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase" }}>Activity Code</th>
                  <th style={{ width: "280px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase" }}>Activity Description Scope</th>
                  <th style={{ width: "85px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", textTransform: "uppercase" }}>Original</th>
                  <th style={{ width: "95px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", textTransform: "uppercase" }}>Remaining</th>
                  <th style={{ width: "150px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase" }}>Progress Matrix</th>
                  <th style={{ width: "110px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", textTransform: "uppercase" }}>Status Badge</th>
                  <th style={{ width: "140px", padding: "12px 16px", fontSize: "10px", fontWeight: 700, color: "#475569", textAlign: "center", textTransform: "uppercase" }}>Actions Control</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                      Synchronizing active enterprise activity schedule telemetry...
                    </td>
                  </tr>
                ) : filteredActivities.map((activity, index) => {
                  const badge = getStatusBadgeStyle(activity.status);
                  
                  return (
                    <tr key={activity.id || index} style={{ borderTop: "1px solid #1e2330", background: editingId === activity.id ? "#185fa515" : "transparent" }}>
                      {/* ID */}
                      <td style={{ padding: "14px 16px", fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                        #{activity.id}
                      </td>

                      {/* WBS Block Mapping */}
                      <td style={{ padding: "14px 16px", overflow: "hidden" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <MdLayers style={{ color: "#EF9F27", fontSize: "14px", marginTop: "2px", flexShrink: 0 }} />
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                              {activity.wbs_code || `ID-${activity.wbs_id}`}
                            </span>
                            <span style={{ fontSize: "10px", color: "#475569", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", marginTop: "1px" }}>
                              {activity.wbs_name || "Root Context Node"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Activity Code */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#378ADD", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {activity.activity_code}
                      </td>

                      {/* Activity Name with Dates */}
                      <td style={{ padding: "14px 16px", overflow: "hidden" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {activity.activity_name}
                          </span>
                          <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace", marginTop: "2px" }}>
                            {formatPrimaveraDate(activity.start_date)} → {formatPrimaveraDate(activity.finish_date)}
                          </span>
                        </div>
                      </td>

                      {/* Duration Badge */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ background: "#0c1a16", padding: "4px 8px", borderRadius: "4px", color: "#10b981", fontSize: "12px", fontWeight: 600, border: "1px solid #064e3b" }}>
                          {activity.duration}d
                        </span>
                      </td>

                      {/* Remaining Duration Badge */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ background: "#1c1917", padding: "4px 8px", borderRadius: "4px", color: "#f97316", fontSize: "12px", fontWeight: 600, border: "1px solid #7c2d12" }}>
                          {activity.remaining_duration ?? activity.duration}d
                        </span>
                      </td>

                      {/* Progress Bar Matrix */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "100%", background: "#1e293b", borderRadius: "20px", height: "6px", overflow: "hidden" }}>
                            <div style={{ width: `${activity.percent_complete || 0}%`, background: "#3b82f6", height: "100%", borderRadius: "20px" }} />
                          </div>
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#38bdf8", fontWeight: 600, flexShrink: 0 }}>
                            {Number(activity.percent_complete || 0).toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ 
                          background: badge.bg, 
                          color: badge.text, 
                          border: `1px solid ${badge.border}`, 
                          padding: "3px 8px", 
                          borderRadius: "4px", 
                          fontSize: "11px", 
                          fontWeight: 600,
                          display: "inline-block",
                          whiteSpace: "nowrap"
                        }}>
                          {activity.status || "Not Started"}
                        </span>
                      </td>

                      {/* Actions Control */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => editActivity(activity)}
                            style={{ display: "flex", alignItems: "center", background: "transparent", border: "1px solid #334155", borderRadius: "4px", padding: "4px 8px", color: "#94a3b8", fontSize: "12px", cursor: "pointer" }}
                          >
                            <MdEdit style={{ marginRight: "2px" }} size={12} /> Edit
                          </button>
                          <button
                            onClick={() => deleteActivity(activity.id)}
                            style={{ display: "flex", alignItems: "center", background: "transparent", border: "1px solid #521622", borderRadius: "4px", padding: "4px 8px", color: "#E24B4A", fontSize: "12px", cursor: "pointer" }}
                          >
                            <MdDelete style={{ marginRight: "2px" }} size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                      No matching operational scheduler records in pipeline instances.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}