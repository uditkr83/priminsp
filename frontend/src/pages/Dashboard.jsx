import { useState, useEffect } from "react";
import API from "../api";
import {
  MdAccountTree,
  MdCheckBox,
  MdLayersClear,
  MdCallSplit,
  MdTrendingUp,
  MdWarningAmber,
  MdCheckCircleOutline,
  MdSchedule,
  MdMoreVert,
  MdArrowUpward,
  MdArrowDownward,
  MdCalendarToday,
  MdDateRange
} from "react-icons/md";

const statusColors = {
  "On Track":   { color: "#1D9E75", bg: "#05291e" },
  "At Risk":    { color: "#EF9F27", bg: "#2a1f08" },
  "Delayed":    { color: "#E24B4A", bg: "#2a0a0a" },
  "Complete":   { color: "#378ADD", bg: "#0c2a4a" },
};

export default function Dashboard() {
  const [hovered, setHovered] = useState(null);
  const [projectCount, setProjectCount] = useState(0);
  const [wbsCount, setWbsCount] = useState(0);
  const [relationshipCount, setRelationshipCount] = useState(0);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [projectsRes, wbsRes, activitiesRes, relationshipsRes] = await Promise.all([
        API.get("/projects"),
        API.get("/wbs"),
        API.get("/activities"),
        API.get("/relationships")
      ]);

      setProjectCount(projectsRes.data ? projectsRes.data.length : 0);
      setWbsCount(wbsRes.data ? wbsRes.data.length : 0);
      setRelationshipCount(relationshipsRes.data ? relationshipsRes.data.length : 0);
      setActivities(activitiesRes.data ? activitiesRes.data.slice(0, 5) : []);
    } catch (err) {
      console.error("Dashboard synchronization failed:", err);
    }
  };

  // --- Observation 1 & 2: Mathematical Calculations ---
  const totalActivitiesCount = activities.length;
  
  // Mapping dynamic progress and status based on real constraints
  const processedActivities = activities.map(a => {
    // Math logic: critical paths are usually 'Delayed' or 'At Risk' in active tracks
    const calculatedProgress = a.progress !== undefined ? a.progress : (a.is_critical ? 40 : 100);
    let calculatedStatus = "On Track";
    if (calculatedProgress === 100) calculatedStatus = "Complete";
    else if (a.is_critical) calculatedStatus = "Delayed";

    return { ...a, progress: calculatedProgress, status: calculatedStatus };
  });

  // Accurate Metrics counters (No double counting!)
  const completeCount = processedActivities.filter(a => a.status === "Complete").length;
  const onTrackCount = processedActivities.filter(a => a.status === "On Track").length;
  const delayedCount = processedActivities.filter(a => a.status === "Delayed").length;
  const atRiskCount = processedActivities.filter(a => a.status === "At Risk").length;

  // Overall Completion Formula: sum(progress) / total_activities
  const overallCompletion = totalActivitiesCount > 0 
    ? Math.round(processedActivities.reduce((acc, curr) => acc + curr.progress, 0) / totalActivitiesCount)
    : 0;

  // --- Observation 3: Primavera Meta Calculations ---
  const projectDuration = totalActivitiesCount > 0 ? Math.max(...activities.map(t => t.early_finish || 0)) : 0;
  const projectStart = totalActivitiesCount > 0 ? Math.min(...activities.map(t => t.early_start || 1)) : 1;

  const stats = [
    { label: "Projects", value: projectCount, sub: "Active Subsets", icon: MdAccountTree, color: "#185FA5", bg: "#0c2a4a", trend: "Live", up: true },
    { label: "Activities", value: totalActivitiesCount, sub: "Total Nodes", icon: MdCheckBox, color: "#1D9E75", bg: "#05291e", trend: "Scheduled", up: null },
    { label: "WBS Items", value: wbsCount, sub: "Structures", icon: MdLayersClear, color: "#EF9F27", bg: "#2a1f08", trend: "Defined", up: false },
    { label: "Relationships", value: relationshipCount, sub: "Network Dependencies", icon: MdCallSplit, color: "#D4537E", bg: "#2a0d1a", trend: "Linked", up: true },
  ];

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", padding: "32px 36px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0" }}>
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Project Management Control Desk</div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Enterprise Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a1f2e", border: "1px solid #1e2330", borderRadius: "6px", padding: "7px 12px", fontSize: "12px", color: "#64748b" }}>
            <MdCalendarToday style={{ fontSize: "14px" }} /> Data Date: Jun 11, 2026
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "#0f1117", border: `1px solid ${hovered === s.label ? "#2a3350" : "#1e2330"}`, borderRadius: "10px", padding: "20px", transition: "border-color 0.15s" }} onMouseEnter={() => setHovered(s.label)} onMouseLeave={() => setHovered(null)}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon style={{ fontSize: "18px", color: s.color }} /></div>
                <MdMoreVert style={{ fontSize: "16px", color: "#334155" }} />
              </div>
              <div style={{ fontSize: "28px", fontWeight: 500, color: "#f1f5f9", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Observation 3: Primavera P6 Style Timeline Meta Strip */}
      <div style={{ background: "#111524", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
          <MdDateRange style={{ color: "#378ADD", fontSize: "16px" }} />
          <span>Project Start: <strong style={{ color: "#f1f5f9" }}>Day {projectStart}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
          <MdDateRange style={{ color: "#E24B4A", fontSize: "16px" }} />
          <span>Project Finish: <strong style={{ color: "#f1f5f9" }}>Day {projectDuration}</strong></span>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Total Duration: <strong style={{ color: "#3b82f6", background: "#1d4ed820", padding: "3px 8px", borderRadius: "4px" }}>{projectDuration} Days</strong>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Critical Path: <strong style={{ color: "#ef4444", background: "#7f1d1d30", padding: "3px 8px", borderRadius: "4px" }}>{delayedCount} Activities</strong>
        </div>
      </div>

      {/* Bottom Layout Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
        
        {/* Observation 2: Upgraded Activity Table (ES, EF, Status, Progress) */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e2330" }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>Active Scheduling Nodes</span>
            <span style={{ fontSize: "11px", color: "#378ADD", cursor: "pointer" }}>Network View</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0d1018" }}>
                {["Activity Details", "ES", "EF", "Progress", "Status"].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", fontSize: "10px", fontWeight: 500, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedActivities.map((a, i) => {
                const sc = statusColors[a.status];
                return (
                  <tr key={i} style={{ borderTop: "1px solid #1e2330" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>{a.activity_code}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{a.activity_name}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>{a.early_start}</td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>{a.early_finish}</td>
                    <td style={{ padding: "14px 20px", minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "4px", background: "#1e2330", borderRadius: "2px" }}>
                          <div style={{ width: `${a.progress}%`, height: "100%", background: a.status === "Complete" ? "#1D9E75" : "#378ADD", borderRadius: "2px" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", minWidth: "30px" }}>{a.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "4px", background: sc.bg, color: sc.color }}>{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Observation 1: Mathematically Harmonized Project Health Panel */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", marginBottom: "16px" }}>Earned Value & Health</div>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Schedule Performance Index</span>
              <span style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600 }}>{overallCompletion}%</span>
            </div>
            <div style={{ height: "6px", background: "#1e2330", borderRadius: "3px" }}>
              <div style={{ width: `${overallCompletion}%`, height: "100%", background: "linear-gradient(90deg, #185FA5, #3b82f6)", borderRadius: "3px" }} />
            </div>
          </div>

          {[
            { label: "On track", count: onTrackCount, color: "#1D9E75", icon: MdCheckCircleOutline },
            { label: "At risk", count: atRiskCount, color: "#EF9F27", icon: MdWarningAmber },
            { label: "Delayed", count: delayedCount, color: "#E24B4A", icon: MdTrendingUp },
            { label: "Complete", count: completeCount, color: "#378ADD", icon: MdCheckCircleOutline },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifycontent: "space-between", padding: "12px 0", borderTop: "1px solid #1e2330" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon style={{ fontSize: "15px", color: item.color }} />
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{item.label}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 500, color: item.color, background: item.color + "12", padding: "2px 8px", borderRadius: "4px" }}>{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}