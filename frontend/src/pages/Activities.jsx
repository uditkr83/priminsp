import { useEffect, useState } from "react";
import API from "../api"; 
import {
  MdDelete,
  MdSearch,
  MdLayers,
  MdLink,
  MdSettings,
  MdQueryBuilder,
  MdShare
} from "react-icons/md";

export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // 🎯 Track Selected Activity for P6 Tabs Panel
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // 🗂️ Active Tab inside the P6 Details Panel
  const [activeTab, setActiveTab] = useState("Relationships");

  // 🚀 Initial Load Pipeline
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch both endpoints concurrently
      const [activitiesRes, relationshipsRes] = await Promise.all([
        API.get("/activities"),
        API.get("/relationships")
      ]);

      const rawActivities = activitiesRes.data || [];
      const relationships = relationshipsRes.data || [];

      // 🔄 Enrich activities with their dependencies mapped from relationships
      const enrichedActivities = rawActivities.map(activity => {
        const predecessors = relationships
          .filter(r => r.successor_activity_id === activity.id)
          .map(r => ({
            type: "PRED",
            target_code: r.predecessor_code,
            relationship_type: r.relationship_type
          }));

        const successors = relationships
          .filter(r => r.predecessor_activity_id === activity.id)
          .map(r => ({
            type: "SUCC",
            target_code: r.successor_code,
            relationship_type: r.relationship_type
          }));

        return {
          ...activity,
          dependencies: [...predecessors, ...successors]
        };
      });
      console.log("ACTIVITIES", rawActivities);
console.log("RELATIONSHIPS", relationships);
console.log("ENRICHED", enrichedActivities);

      setActivities(enrichedActivities);

      // Keep current selection up to date, or default to the first node
      if (enrichedActivities.length > 0) {
        if (!selectedActivity) {
          setSelectedActivity(enrichedActivities[0]);
        } else {
          const updatedSelection = enrichedActivities.find(a => a.id === selectedActivity.id);
          setSelectedActivity(updatedSelection || enrichedActivities[0]);
        }
      }
    } catch (err) {
      console.error("Error aggregating activities enterprise metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrimaveraDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const deleteActivity = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this task logic node?")) return;
    try {
      await API.delete(`/activities/${id}`);
      if (selectedActivity?.id === id) setSelectedActivity(null);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Error executing delete lifecycle.");
    }
  };

  const filteredActivities = activities.filter((act) =>
    act.activity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.wbs_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        background: "#090b11", 
        minHeight: "100vh",
        padding: "16px 24px",  
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#e2e8f0",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      {/* HEADER PANEL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", background: "#0f121d", padding: "16px 20px", borderBottom: "1px solid #1e2330", margin: "-16px -24px 16px -24px" }}>
        <div>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
            Advanced Planning & Control Matrix
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>
            Project Activities Master Spreadsheet
          </h1>
        </div>

        {/* SEARCH BAR */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "6px 12px", width: "300px" }}>
          <MdSearch style={{ color: "#475569", fontSize: "16px" }} />
          <input 
            type="text" 
            placeholder="Search code, description, or WBS..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", width: "100%" }}
          />
        </div>
      </div>

      {/* WORKSPACE FRAMEWORK SPLIT (65% Table | 35% Details Panel) */}
      <div style={{ display: "grid", gridTemplateColumns: selectedActivity ? "1fr 420px" : "1fr", gap: "16px", height: "calc(100vh - 120px)" }}>
        
        {/* LEFT WORKSPACE: HORIZONTAL & VERTICAL SCROLL SPREADSHEET */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
          
          <div style={{ padding: "8px 16px", background: "#090b11", borderBottom: "1px solid #1e2330", fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Activity Spreadsheet Grid ({filteredActivities.length} Records Mapped)
          </div>
          
          <div style={{ flexGrow: 1, overflowX: "auto", overflowY: "auto", position: "relative" }}>
            <table style={{ width: "100%", minWidth: "1550px", borderCollapse: "collapse", tableLayout: "fixed" }}>
              
              {/* 1. STICKY MULTI-ROW GROUP HEADERS (PRIMAVERA BANDS) */}
              <thead style={{ position: "sticky", top: 0, zIndex: 30, background: "#090b11" }}>
                {/* Layer 1: Category Groups */}
                <tr style={{ borderBottom: "1px solid #1e2330", height: "24px", background: "#0c0f18" }}>
                  <th colSpan="2" style={{ borderRight: "1px solid #1e2330", fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "left", position: "sticky", left: 0, zIndex: 40, background: "#0c0f18" }}>Structure</th>
                  <th colSpan="2" style={{ borderRight: "1px solid #1e2330", fontSize: "9px", color: "#378ADD", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "left", position: "sticky", left: "210px", zIndex: 40, background: "#0c0f18" }}>Activity Definition</th>
                  <th colSpan="2" style={{ borderRight: "1px solid #1e2330", fontSize: "9px", color: "#10b981", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "center" }}>Durations</th>
                  <th colSpan="2" style={{ borderRight: "1px solid #1e2330", fontSize: "9px", color: "#e2e8f0", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "center" }}>Dates</th>
                  <th colSpan="2" style={{ borderRight: "1px solid #1e2330", fontSize: "9px", color: "#fbbf24", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "left" }}>Logic Relations</th>
                  <th colSpan="3" style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: 800, padding: "0 12px", textAlign: "center" }}>Control Status</th>
                </tr>
                {/* Layer 2: Core Data Columns */}
                <tr style={{ borderBottom: "2px solid #1e2330", height: "26px", background: "#090b11" }}>
                  <th style={{ width: "50px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "left", position: "sticky", left: 0, zIndex: 40, background: "#090b11" }}>ID</th>
                  <th style={{ width: "160px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "left", borderRight: "1px solid #1e2330", position: "sticky", left: "50px", zIndex: 40, background: "#090b11" }}>WBS Code</th>
                  
                  {/* 2. FREEZE COLUMNS (Sticky Left Setup) */}
                  <th style={{ width: "110px", padding: "0 12px", fontSize: "9px", color: "#378ADD", textAlign: "left", position: "sticky", left: "210px", zIndex: 40, background: "#090b11" }}>
                    Activity Code <span style={{ float: "right", cursor: "col-resize", color: "#1e2330" }}>|</span>
                  </th>
                  <th style={{ width: "260px", padding: "0 12px", fontSize: "9px", color: "#378ADD", textAlign: "left", borderRight: "1px solid #1e2330", position: "sticky", left: "320px", zIndex: 40, background: "#090b11" }}>
                    Activity Name <span style={{ float: "right", cursor: "col-resize", color: "#1e2330" }}>|</span>
                  </th>

                  <th style={{ width: "70px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center" }}>Original</th>
                  <th style={{ width: "70px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center", borderRight: "1px solid #1e2330" }}>Remaining</th>
                  
                  <th style={{ width: "100px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center" }}>Start</th>
                  <th style={{ width: "100px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center", borderRight: "1px solid #1e2330" }}>Finish</th>
                  
                  <th style={{ width: "110px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "left" }}>Predecessors</th>
                  <th style={{ width: "110px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "left", borderRight: "1px solid #1e2330" }}>Successors</th>
                  
                  <th style={{ width: "130px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "left" }}>Progress %</th>
                  <th style={{ width: "100px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center" }}>Status</th>
                  <th style={{ width: "60px", padding: "0 12px", fontSize: "9px", color: "#475569", textAlign: "center" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="13" style={{ padding: "40px", textAlign: "center", fontSize: "12px", color: "#475569" }}>
                      Executing database query optimizations...
                    </td>
                  </tr>
                ) : filteredActivities.map((activity, index) => {
                  const isCritical = activity.is_critical && (activity.percent_complete || 0) < 100;
                  const isSelected = selectedActivity?.id === activity.id;

                  // Compute Driving Logic Data Dynamically
                  const rawDeps = activity.dependencies || [];
                  const predList = rawDeps.filter(d => d.type === "PRED");
                  const succList = rawDeps.filter(d => d.type === "SUCC");

                  const predStr = predList.map(d => d.target_code).join(", ") || "-";
                  const succStr = succList.map(d => d.target_code).join(", ") || "-";
                  
                  return (
                    <tr 
                      key={activity.id || index} 
                      onClick={() => setSelectedActivity(activity)}
                      style={{ 
                        borderBottom: "1px solid #1e2330", 
                        height: "28px", 
                        cursor: "pointer",
                        background: isSelected ? "rgba(55, 138, 221, 0.12)" : isCritical ? "rgba(226, 75, 74, 0.03)" : "transparent"
                      }}
                    >
                      {/* Frozen Column Components */}
                      <td style={{ padding: "0 12px", fontSize: "11px", color: "#475569", fontFamily: "monospace", position: "sticky", left: 0, background: isSelected ? "#121926" : "#0f1117", zIndex: 10 }}>#{activity.id}</td>
                      <td style={{ padding: "0 12px", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", borderRight: "1px solid #1e2330", position: "sticky", left: "50px", background: isSelected ? "#121926" : "#0f1117", zIndex: 10, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{activity.wbs_code || `WBS-${activity.wbs_id}`}</td>
                      
                      <td style={{ padding: "0 12px", fontSize: "12px", fontWeight: 700, color: isCritical ? "#E24B4A" : "#378ADD", fontFamily: "monospace", position: "sticky", left: "210px", background: isSelected ? "#121926" : "#0f1117", zIndex: 10 }}>
                        {activity.activity_code}
                      </td>
                      <td style={{ padding: "0 12px", fontSize: "12px", fontWeight: 500, color: "#e2e8f0", borderRight: "1px solid #1e2330", position: "sticky", left: "320px", background: isSelected ? "#121926" : "#0f1117", zIndex: 10, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", borderLeft: isSelected ? "3px solid #378ADD" : "3px solid transparent" }}>
                        {activity.activity_name}
                      </td>

                      {/* Regular Scroll Columns */}
                      <td style={{ padding: "0 12px", textAlign: "center", color: "#10b981", fontSize: "11px", fontWeight: 600, fontFamily: "monospace" }}>{activity.duration}d</td>
                      <td style={{ padding: "0 12px", textAlign: "center", color: "#f97316", fontSize: "11px", fontWeight: 600, fontFamily: "monospace", borderRight: "1px solid #1e2330" }}>{activity.remaining_duration ?? activity.duration}d</td>
                      
                      <td style={{ padding: "0 12px", textAlign: "center", fontSize: "11px", fontFamily: "monospace", color: "#cbd5e1" }}>{formatPrimaveraDate(activity.start_date)}</td>
                      <td style={{ padding: "0 12px", textAlign: "center", fontSize: "11px", fontFamily: "monospace", color: "#cbd5e1", borderRight: "1px solid #1e2330" }}>{formatPrimaveraDate(activity.finish_date)}</td>
                      
                      <td style={{ padding: "0 12px", fontSize: "11px", fontFamily: "monospace", color: "#fbbf24", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{predStr}</td>
                      <td style={{ padding: "0 12px", fontSize: "11px", fontFamily: "monospace", color: "#fbbf24", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", borderRight: "1px solid #1e2330" }}>{succStr}</td>

                      <td style={{ padding: "0 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "100%", background: "#1e293b", borderRadius: "10px", height: "4px", overflow: "hidden" }}>
                            <div style={{ width: `${activity.percent_complete || 0}%`, background: "#3b82f6", height: "100%" }} />
                          </div>
                          <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>{Number(activity.percent_complete || 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "0 12px", textAlign: "center" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: activity.status === "Completed" ? "#34d399" : "#fbbf24" }}>{activity.status || "Not Started"}</span>
                      </td>
                      <td style={{ padding: "0 12px", textAlign: "center" }}>
                        <button onClick={(e) => deleteActivity(activity.id, e)} style={{ background: "transparent", border: "none", color: "#E24B4A", cursor: "pointer" }}><MdDelete size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT WORKSPACE: DOCK DETAILS PANEL TRANSFORMED INTO TABS */}
        {selectedActivity && (
          <div style={{ background: "#0f121d", border: "1px solid #1e2330", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            
            {/* Header Identity Meta */}
            <div style={{ padding: "12px 16px", background: "#090b11", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{selectedActivity.activity_code} Details</span>
              <span style={{ fontSize: "10px", background: "#1e293b", padding: "2px 6px", borderRadius: "3px", color: "#94a3b8" }}>#{selectedActivity.id}</span>
            </div>

            {/* 4. PRIMAVERA STYLE NAVIGATION BOTTOM/TOP DETAILS TABS SYSTEM */}
            <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", overflowX: "auto" }}>
              {["General", "Status", "Relationships"].map((tab) => {
                const isCurrent = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: isCurrent ? "#0f121d" : "transparent",
                      border: "none",
                      borderBottom: isCurrent ? "2px solid #378ADD" : "2px solid transparent",
                      color: isCurrent ? "#378ADD" : "#64748b",
                      padding: "8px 16px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TAB INTERACTIVE DISPLAY LAYOUTS */}
            <div style={{ flexGrow: 1, padding: "16px", overflowY: "auto", fontSize: "12px" }}>
              
              {/* TAB 1: GENERAL */}
              {activeTab === "General" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Name Scope</label>
                    <input type="text" readOnly value={selectedActivity.activity_name} style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "6px", color: "#e2e8f0", fontSize: "12px" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>WBS Node</label>
                      <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "6px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}><MdLayers color="#EF9F27" size={12}/> {selectedActivity.wbs_code || "Root WBS"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Type</label>
                      <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "6px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}><MdSettings size={12}/> Task Dependent</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STATUS */}
              {activeTab === "Status" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Start Date</label>
                      <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{formatPrimaveraDate(selectedActivity.start_date)}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Finish Date</label>
                      <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{formatPrimaveraDate(selectedActivity.finish_date)}</span>
                    </div>
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid #1e2330" }} />
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Execution Physical Progress</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <div style={{ flexGrow: 1, background: "#090b11", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${selectedActivity.percent_complete || 0}%`, background: "#3b82f6", height: "100%" }} />
                      </div>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>{selectedActivity.percent_complete}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RELATIONSHIPS */}
              {activeTab === "Relationships" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  {/* Predecessors Sub-Grid Area */}
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MdQueryBuilder color="#10b981" /> Predecessors Mapped Links
                    </div>
                    <div style={{ background: "#090b11", border: "1px solid #1e2330" }}>
                      {(selectedActivity.dependencies || []).filter(d => d.type === "PRED").length > 0 ? (
                        (selectedActivity.dependencies || []).filter(d => d.type === "PRED").map((dep, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #1e2330" }}>
                            <span style={{ fontFamily: "monospace", color: "#378ADD", fontWeight: 700 }}>{dep.target_code}</span>
                            <span style={{ fontSize: "10px", color: "#475569" }}>{dep.relationship_type || "Finish to Start"}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "16px", textAlign: "center", color: "#475569", fontSize: "11px" }}>No driving predecessors tied to logic node.</div>
                      )}
                    </div>
                  </div>

                  {/* Successors Sub-Grid Area */}
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MdShare color="#378ADD" /> Successors Mapped Links
                    </div>
                    <div style={{ background: "#090b11", border: "1px solid #1e2330" }}>
                      {(selectedActivity.dependencies || []).filter(d => d.type === "SUCC").length > 0 ? (
                        (selectedActivity.dependencies || []).filter(d => d.type === "SUCC").map((dep, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #1e2330" }}>
                            <span style={{ fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>{dep.target_code}</span>
                            <span style={{ fontSize: "10px", color: "#475569" }}>{dep.relationship_type || "Finish to Start"}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "16px", textAlign: "center", color: "#475569", fontSize: "11px" }}>No driving successors calculated via schedule.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}