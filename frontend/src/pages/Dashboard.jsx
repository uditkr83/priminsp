import { useState, useEffect, useMemo } from "react";
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
  MdDateRange,
  MdErrorOutline,
  MdAssessment
} from "react-icons/md";

// ==========================================
// CENTRALIZED PRODUCTION STYLES (PURE CSS SYNTAX)
// ==========================================
const styles = {
  container: { background: "#0d1018", minHeight: "100vh", padding: "28px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0", boxSizing: "border-box" },
  headerMeta: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" },
  subTitle: { fontSize: "10px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" },
  mainTitle: { fontSize: "22px", fontWeight: 600, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" },
  dbStatus: { fontSize: "11px", background: "#1e293b", padding: "6px 12px", borderRadius: "4px", border: "1px solid #334155", color: "#94a3b8", fontFamily: "monospace" },
  grid4x: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" },
  timelineStrip: { background: "#111524", border: "1px solid #1e293b", borderLeft: "4px solid #378ADD", borderRadius: "6px", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" },
  stripItem: { display: "flex", alignItems: "center", gap: "10px" },
  stripTextSub: { fontSize: "9px", color: "#475569", textTransform: "uppercase", fontWeight: 700 },
  stripTextMain: { fontSize: "12px", color: "#f1f5f9", fontWeight: 600, fontFamily: "monospace" },
  mainLayout: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" },
  tableCard: { background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  tableHeader: { display: "flex", alignItems: "center", justifyContext: "space-between", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1e2330", background: "#0b0d14" },
  dataTable: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { padding: "10px 16px", fontSize: "9px", fontWeight: 700, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", background: "#07090e", borderBottom: "2px solid #1e2330" },
  td: { padding: "12px 16px", fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" },
  progressBarBg: { flex: 1, height: "6px", background: "#1e2330", borderRadius: "3px", overflow: "hidden" },
  sidePanel: { background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  aggregateBlock: { marginBottom: "18px", background: "#07090e", padding: "12px", borderRadius: "6px", border: "1px solid #1e2330" },
  errorWrapper: { minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }
};

// HELPER: P6 Standard Date Parser
const formatP6Date = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// ==========================================
// SUB-ARCHITECTURE MODULAR CHILD COMPONENTS
// ==========================================

function KPIGrid({ projectCount, totalActivities, wbsCount, relationshipCount, overallCompletion, hoveredCard, setHoveredCard }) {
  const decks = [
    { label: "Projects", value: projectCount, icon: MdAccountTree, color: "#3b82f6", bg: "#0c2a4a", metric: "Active Sync" },
    { label: "Activities", value: totalActivities, icon: MdCheckBox, color: "#10b981", bg: "#05291e", metric: `${overallCompletion}% Mean Progress` },
    { label: "WBS Items", value: wbsCount, icon: MdLayersClear, color: "#f59e0b", bg: "#2a1f08", metric: "Allocated Nodes" },
    { label: "Relationships", value: relationshipCount, icon: MdCallSplit, color: "#ec4899", bg: "#2a0d1a", metric: "Network Links" },
  ];

  return (
    <div style={styles.grid4x}>
      {decks.map((s) => {
        const Icon = s.icon;
        const isHovered = hoveredCard === s.label;
        return (
          <div 
            key={s.label} 
            onMouseEnter={() => setHoveredCard(s.label)} 
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              borderColor: isHovered ? s.color : "#1e2330",
              transform: isHovered ? "translateY(-2px)" : "none",
              boxShadow: isHovered ? `0 10px 25px -5px rgba(0, 0, 0, 0.4), inset 0 0 12px 0 ${s.color}15` : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon style={{ fontSize: "18px", color: s.color }} /></div>
              <MdMoreVert style={{ fontSize: "16px", color: "#475569" }} />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 600, color: "#f1f5f9", fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: "10px", color: "#64748b", background: "#1e2330", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>{s.metric}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BaselineGrid({ baselineStats }) {
  const decks = [
    { label: "Delayed Activities", value: baselineStats.delayed_activities, unit: "Nodes", color: "#ef4444", icon: MdWarningAmber },
    { label: "Largest Delay", value: baselineStats.largest_delay, unit: "Days", color: "#f97316", icon: MdSchedule },
    { label: "Average Delay", value: Number(baselineStats.average_delay || 0).toFixed(1), unit: "Days", color: "#eab308", icon: MdAssessment },
    { label: "On Schedule", value: baselineStats.on_schedule, unit: "Tracks", color: "#22c55e", icon: MdCheckCircleOutline }
  ];

  return (
    <div style={styles.grid4x}>
      {decks.map((b) => {
        const Icon = b.icon;
        return (
          <div key={b.label} style={{ background: "#0f1117", border: "1px solid #1e2330", borderLeft: `4px solid ${b.color}`, borderRadius: "8px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "4px" }}>{b.label}</div>
              <div style={{ fontSize: "22px", color: "#f1f5f9", fontWeight: "700", fontFamily: "monospace", display: "flex", alignItems: "baseline", gap: "4px" }}>
                {b.value} <span style={{ fontSize: "11px", color: "#475569" }}>{b.unit}</span>
              </div>
            </div>
            <div style={{ background: `${b.color}10`, padding: "8px", borderRadius: "5px" }}><Icon style={{ color: b.color, fontSize: "18px" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineStrip({ start, finish, duration, criticalCount }) {
  return (
    <div style={styles.timelineStrip}>
      <div style={styles.stripItem}>
        <div style={{ background: "#1d4ed815", padding: "6px", borderRadius: "4px" }}><MdDateRange style={{ color: "#378ADD", fontSize: "16px" }} /></div>
        <div>
          <div style={styles.stripTextSub}>Project Start</div>
          <div style={styles.stripTextMain}>{start}</div>
        </div>
      </div>
      <div style={styles.stripItem}>
        <div style={{ background: "#7f1d1d15", padding: "6px", borderRadius: "4px" }}><MdDateRange style={{ color: "#E24B4A", fontSize: "16px" }} /></div>
        <div>
          <div style={styles.stripTextSub}>Project Finish</div>
          <div style={styles.stripTextMain}>{finish}</div>
        </div>
      </div>
      <div style={styles.stripItem}>
        <div style={{ background: "#064e3b15", padding: "6px", borderRadius: "4px" }}><MdSchedule style={{ color: "#10b981", fontSize: "16px" }} /></div>
        <div>
          <div style={styles.stripTextSub}>Total Duration</div>
          <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700, fontFamily: "monospace" }}>{duration} Days</span>
        </div>
      </div>
      <div style={styles.stripItem}>
        <div style={{ background: "#7f1d1d20", padding: "6px", borderRadius: "4px" }}><MdTrendingUp style={{ color: "#ef4444", fontSize: "16px" }} /></div>
        <div>
          <div style={styles.stripTextSub}>Critical Path</div>
          <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700, fontFamily: "monospace" }}>{criticalCount} Activities</span>
        </div>
      </div>
    </div>
  );
}

function RecentActivitiesTable({ activities }) {
  const headers = ["Activity Node", "Original Duration", "Remaining Duration", "Total Float", "Early Start", "Early Finish", "Progress Profile", "Status Flag"];
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div style={styles.tableCard}>
      <div style={styles.tableHeader}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>Prioritized Operational Nodes (Critical / Upcoming First)</span>
        <span style={{ fontSize: "11px", color: "#378ADD", fontWeight: 500 }}>Logic Network Analysis</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.dataTable}>
          <thead>
            <tr>{headers.map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {activities.map((a, i) => {
              const statusColorsMap = a.is_critical ? { color: "#F87171", bg: "#2a0a0a", border: "#7f1d1d" } : { color: "#34D399", bg: "#05291e", border: "#064e3b" };
              const isRowHovered = hoveredRow === i;
              
              let origDuration = a.duration || a.original_duration || 0;
              let remDuration = a.remaining_duration !== undefined ? a.remaining_duration : origDuration;
              let totalFloat = a.total_float !== undefined ? a.total_float : (a.is_critical ? 0 : 1);
              let displayProgress = !isNaN(Number(a.percent_complete || a.progress)) ? Number(a.percent_complete || a.progress) : (a.is_critical ? 40 : 100);

              return (
                <tr 
                  key={a.id || i}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ 
                    background: isRowHovered ? "#181c27" : (i % 2 === 0 ? "#0f1117" : "#13161f"),
                    borderBottom: "1px solid rgba(30,35,48,0.5)",
                    transition: "background 0.12s ease"
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: a.is_critical ? "#F87171" : "#378ADD", fontFamily: "monospace" }}>{a.activity_code}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.activity_name}</div>
                  </td>
                  <td style={styles.td}>{origDuration}d</td>
                  <td style={styles.td}>{remDuration}d</td>
                  <td style={{ ...styles.td, color: totalFloat === 0 ? "#ef4444" : "#cbd5e1", fontWeight: totalFloat === 0 ? 700 : 400 }}>{totalFloat}</td>
                  <td style={styles.td}>{formatP6Date(a.early_start || a.start_date)}</td>
                  <td style={styles.td}>{formatP6Date(a.early_finish || a.finish_date)}</td>
                  <td style={{ padding: "12px 16px", minWidth: "110px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={styles.progressBarBg}>
                        <div style={{ width: `${displayProgress}%`, height: "100%", background: a.is_critical ? "linear-gradient(90deg, #dc2626, #ef4444)" : "linear-gradient(90deg, #059669, #10b981)", borderRadius: "3px" }} />
                      </div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace", minWidth: "26px", textAlign: "right" }}>{displayProgress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: statusColorsMap.bg, color: statusColorsMap.color, border: `1px solid ${statusColorsMap.border}`, textTransform: "uppercase", letterSpacing: "0.02em", fontFamily: "monospace" }}>{a.is_critical ? "Critical" : "Standard"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformancePanel({ overallCompletion, criticalPercentage, standardPercentage }) {
  const metrics = [
    { label: "Schedule Performance Index (SPI)", count: `${(overallCompletion / 100 || 0).toFixed(2)}`, barVal: overallCompletion, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
    { label: "Critical Path Ratio", count: `${criticalPercentage}%`, barVal: criticalPercentage, color: "#E24B4A", bg: "rgba(226, 75, 74, 0.08)" },
    { label: "Standard Schedule Margin", count: `${standardPercentage}%`, barVal: standardPercentage, color: "#1D9E75", bg: "rgba(29, 158, 117, 0.08)" },
  ];

  return (
    <div style={styles.sidePanel}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
        <MdAssessment style={{ color: "#378ADD" }} />
        <span>Earned Value Matrix Performance</span>
      </div>

      <div style={styles.aggregateBlock}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Overall Completion</span>
          <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>{overallCompletion}%</span>
        </div>
        <div style={{ height: "6px", background: "#1e2330", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ width: `${overallCompletion}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #06b6d4)" }} />
        </div>
      </div>

      {metrics.map((item) => (
        <div key={item.label} style={{ padding: "12px 0", borderTop: "1px solid #1e2330" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.label}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: item.color, background: item.bg, padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>{item.count}</span>
          </div>
          <div style={{ height: "4px", background: "#1e2330", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(item.barVal, 100)}%`, height: "100%", background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT MODULE EXPORT
// ==========================================
export default function Dashboard() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [projectCount, setProjectCount] = useState(0);
  const [wbsCount, setWbsCount] = useState(0);
  const [relationshipCount, setRelationshipCount] = useState(0);
  const [baselineStats, setBaselineStats] = useState({ delayed_activities: 0, on_schedule: 0, largest_delay: 0, average_delay: 0 });
  const [scheduleData, setScheduleData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const [projectsRes, wbsRes, relationshipsRes, scheduleRes, baselineRes] = await Promise.all([
        API.get("/projects").catch(() => ({ data: [] })),
        API.get("/wbs").catch(() => ({ data: [] })),
        API.get("/relationships").catch(() => ({ data: [] })),
        API.get("/schedules").catch(() => ({ data: [] })),
        API.get("/baselines/stats").catch(() => ({ data: null }))
      ]);

      setProjectCount(projectsRes.data ? projectsRes.data.length : 0);
      setWbsCount(wbsRes.data ? wbsRes.data.length : 0);
      setRelationshipCount(relationshipsRes.data ? relationshipsRes.data.length : 0);
      setScheduleData(scheduleRes.data || []);
      
      if (baselineRes.data) setBaselineStats(baselineRes.data);
    } catch (err) {
      console.error("Dashboard engine synchronization failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // --- MEMOIZED ANALYTICAL COMPLEX COMPUTATIONS ---
  const computations = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) {
      return { projectStartStr: "-", projectFinishStr: "-", totalDurationDays: 0, criticalCount: 0, prioritizedActivities: [], overallCompletion: 0, criticalPercentage: 0, standardPercentage: 0 };
    }

    const startTimestamps = scheduleData.map(x => new Date(x.early_start || x.start_date).getTime()).filter(t => !isNaN(t));
    const finishTimestamps = scheduleData.map(x => new Date(x.early_finish || x.finish_date).getTime()).filter(t => !isNaN(t));

    // FIXED: Correct Math static declarations without prototype instantiation
    const minStart = startTimestamps.length ? Math.min(...startTimestamps) : null;
    const maxFinish = finishTimestamps.length ? Math.max(...finishTimestamps) : null;

    let totalDurationDays = minStart && maxFinish ? Math.ceil((maxFinish - minStart) / (1000 * 60 * 60 * 24)) : 0;
    if (totalDurationDays < 0 || isNaN(totalDurationDays)) totalDurationDays = 0;

    const criticalCount = scheduleData.filter(x => x.is_critical).length;

    // TASK 7: Sorting matrix ensuring critical components prioritize upper layout tracking
    const prioritizedActivities = [...scheduleData]
      .sort((a, b) => {
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        return new Date(a.early_start).getTime() - new Date(b.early_start).getTime();
      })
      .slice(0, 5);

    const overallCompletion = Math.round(
      scheduleData.reduce((acc, curr) => {
        let p = Number(curr.percent_complete || curr.progress);
        return acc + (!isNaN(p) ? p : (curr.is_critical ? 40 : 100));
      }, 0) / scheduleData.length
    ) || 0;

    const criticalPercentage = Math.round((criticalCount / scheduleData.length) * 100) || 0;
    const standardPercentage = 100 - criticalPercentage;

    return {
      projectStartStr: minStart ? formatP6Date(new Date(minStart)) : "-",
      projectFinishStr: maxFinish ? formatP6Date(new Date(maxFinish)) : "-",
      totalDurationDays, criticalCount, prioritizedActivities, overallCompletion, criticalPercentage, standardPercentage
    };
  }, [scheduleData]);

  // --- RENDERING CONDITIONALS ---
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ height: "40px", background: "#1e2330", width: "240px", borderRadius: "4px", marginBottom: "32px", opacity: 0.4 }} />
        <div style={styles.grid4x}>{[1, 2, 3, 4].map(i => <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", height: "110px", opacity: 0.3 }} />)}</div>
        <div style={{ height: "50px", background: "#111524", border: "1px solid #1e293b", borderRadius: "8px", marginBottom: "28px", opacity: 0.4 }} />
        <div style={{ height: "300px", background: "#0f1117", borderRadius: "10px", border: "1px solid #1e2330", opacity: 0.3 }} />
      </div>
    );
  }

  if (error || (!scheduleData.length && !projectCount)) {
    return (
      <div style={styles.container}>
        <div style={styles.errorWrapper}>
          <MdErrorOutline style={{ fontSize: "48px", color: "#f87171", marginBottom: "16px" }} />
          <h2 style={{ color: "#f1f5f9", margin: "0 0 8px 0", fontSize: "18px", fontWeight: 500 }}>No data available</h2>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>Failed to sync live operational schema values from the system.</p>
          <button onClick={loadDashboard} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "8px 26px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
            Retry Synchronization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER SECTION */}
      <div style={styles.headerMeta}>
        <div>
          <div style={styles.subTitle}>Project Management Control Desk</div>
          <h1 style={styles.mainTitle}>Enterprise Operations Center</h1>
        </div>
        <div style={styles.dbStatus}>COMPUTE ENGINE: STATUS_OK</div>
      </div>

      {/* SEGMENT MODULES EXECUTION */}
      <KPIGrid 
        projectCount={projectCount} 
        totalActivities={scheduleData.length} 
        wbsCount={wbsCount} 
        relationshipCount={relationshipCount} 
        overallCompletion={computations.overallCompletion}
        hoveredCard={hoveredCard}
        setHoveredCard={setHoveredCard}
      />

      <BaselineGrid baselineStats={baselineStats} />

      <TimelineStrip 
        start={computations.projectStartStr} 
        finish={computations.projectFinishStr} 
        duration={computations.totalDurationDays} 
        criticalCount={computations.criticalCount} 
      />

      {/* DUAL WORKSPACE ROW MAPPING */}
      <div style={styles.mainLayout}>
        <RecentActivitiesTable activities={computations.prioritizedActivities} />
        <PerformancePanel 
          overallCompletion={computations.overallCompletion} 
          criticalPercentage={computations.criticalPercentage} 
          standardPercentage={computations.standardPercentage} 
        />
      </div>
    </div>
  );
}