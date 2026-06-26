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
  MdDateRange
} from "react-icons/md";

const statusColors = {
  "Critical": { color: "#E24B4A", bg: "#2a0a0a" },
  "Standard": { color: "#1D9E75", bg: "#05291e" },
};

export default function Dashboard() {
  const [hovered, setHovered] = useState(null);
  
  // Counters for Top Stats Cards
  const [projectCount, setProjectCount] = useState(0);
  const [wbsCount, setWbsCount] = useState(0);
  const [relationshipCount, setRelationshipCount] = useState(0);
  
  // Step 1: Baseline Stats Engine State Initialization
  const [baselineStats, setBaselineStats] = useState({
    delayed_activities: 0,
    on_schedule: 0,
    largest_delay: 0,
    average_delay: 0
  });
  
  // Centralized Schedule Data State
  const [scheduleData, setScheduleData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Step 2: API Request Synchronization via Promise.all
      const [
        projectsRes, 
        wbsRes, 
        relationshipsRes,
        scheduleRes,
        baselineRes // <-- Hit your new Express baseline stats optimizer
      ] = await Promise.all([
        API.get("/projects"),
        API.get("/wbs"),
        API.get("/relationships"),
        API.get("/schedules"),
        API.get("/baselines/stats") // <-- Appends baseline metrics pipeline
      ]);

      setProjectCount(projectsRes.data ? projectsRes.data.length : 0);
      setWbsCount(wbsRes.data ? wbsRes.data.length : 0);
      setRelationshipCount(relationshipsRes.data ? relationshipsRes.data.length : 0);
      setScheduleData(scheduleRes.data || []);
      
      // Setting real aggregate analytics dataset safely
      if (baselineRes.data) {
        setBaselineStats(baselineRes.data);
      }
    } catch (err) {
      console.error("Dashboard calculation engine synchronization failed:", err);
    }
  };

  // --- Analytical Computations ---
  const totalDuration = Math.max(...scheduleData.map(x => x.early_finish), 0);
  const criticalCount = scheduleData.filter(x => x.is_critical).length;
  const projectStart = scheduleData.length ? Math.min(...scheduleData.map(x => x.early_start)) : 0;
  const projectFinish = Math.max(...scheduleData.map(x => x.early_finish), 0);
  const recentActivities = scheduleData.slice(0, 5);

  const processedActivities = scheduleData.map(x => ({
    ...x,
    progress: x.is_critical ? 40 : 100 
  }));
  
  const overallCompletion = scheduleData.length > 0 
    ? Math.round(processedActivities.reduce((acc, curr) => acc + curr.progress, 0) / scheduleData.length)
    : 0;

  const stats = [
    { label: "Projects", value: projectCount, icon: MdAccountTree, color: "#185FA5", bg: "#0c2a4a" },
    { label: "Activities", value: scheduleData.length, icon: MdCheckBox, color: "#1D9E75", bg: "#05291e" },
    { label: "WBS Items", value: wbsCount, icon: MdLayersClear, color: "#EF9F27", bg: "#2a1f08" },
    { label: "Relationships", value: relationshipCount, icon: MdCallSplit, color: "#D4537E", bg: "#2a0d1a" },
  ];

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", padding: "32px 36px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0" }}>
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Project Management Control Desk</div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Enterprise Dashboard</h1>
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

      {/* Step 3: Baseline Statistics Matrix Cards Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginBottom: "6px" }}>Delayed Activities</div>
          <div style={{ fontSize: "28px", color: "#ef4444", fontWeight: "600" }}>{baselineStats.delayed_activities}</div>
        </div>

        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginBottom: "6px" }}>Largest Delay</div>
          <div style={{ fontSize: "28px", color: "#f97316", fontWeight: "600" }}>{baselineStats.largest_delay} Days</div>
        </div>

        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginBottom: "6px" }}>Average Delay</div>
          <div style={{ fontSize: "28px", color: "#eab308", fontWeight: "600" }}>{baselineStats.average_delay} Days</div>
        </div>

        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginBottom: "6px" }}>On Schedule</div>
          <div style={{ fontSize: "28px", color: "#22c55e", fontWeight: "600" }}>{baselineStats.on_schedule}</div>
        </div>
      </div>

      {/* Primavera P6 Style Timeline Meta Strip */}
      <div style={{ background: "#111524", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
          <MdDateRange style={{ color: "#378ADD", fontSize: "16px" }} />
          <span>Project Start: <strong style={{ color: "#f1f5f9" }}>Day {projectStart}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
          <MdDateRange style={{ color: "#E24B4A", fontSize: "16px" }} />
          <span>Project Finish: <strong style={{ color: "#f1f5f9" }}>Day {projectFinish}</strong></span>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Total Duration: <strong style={{ color: "#3b82f6", background: "#1d4ed820", padding: "3px 8px", borderRadius: "4px" }}>{totalDuration} Days</strong>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          Critical Path: <strong style={{ color: "#ef4444", background: "#7f1d1d30", padding: "3px 8px", borderRadius: "4px" }}>{criticalCount} Activities</strong>
        </div>
      </div>

      {/* Bottom Layout Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
        
        {/* Recent Activities Table */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e2330" }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>Recent Activities</span>
            <span style={{ fontSize: "11px", color: "#378ADD", cursor: "pointer" }}>Network View</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0d1018" }}>
                {["Activity", "ES", "EF", "Progress", "Status"].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", fontSize: "10px", fontWeight: 500, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((a, i) => {
                const currentStatus = a.is_critical ? "Critical" : "Standard";
                const sc = statusColors[currentStatus];
                const displayProgress = a.is_critical ? 40 : 100;

                return (
                  <tr key={a.id || i} style={{ borderTop: "1px solid #1e2330" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: a.is_critical ? "#f87171" : "#e2e8f0" }}>{a.activity_code}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{a.activity_name}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>{a.early_start}</td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>{a.early_finish}</td>
                    <td style={{ padding: "14px 20px", minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "4px", background: "#1e2330", borderRadius: "2px" }}>
                          <div style={{ width: `${displayProgress}%`, height: "100%", background: a.is_critical ? "#E24B4A" : "#1D9E75", borderRadius: "2px" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", minWidth: "30px" }}>{displayProgress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 8px", borderRadius: "4px", background: sc.bg, color: sc.color }}>{currentStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Earned Value & Health Side Panel */}
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
            { label: "Standard", count: scheduleData.filter(x => !x.is_critical).length, color: "#1D9E75", icon: MdCheckCircleOutline },
            { label: "Critical Path", count: criticalCount, color: "#E24B4A", icon: MdTrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #1e2330" }}>
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