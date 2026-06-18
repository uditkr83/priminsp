import { useEffect, useState } from "react";
import API from "../api";
import {
  MdPlayArrow,
  MdSearch,
  MdWarning,
  MdCheckCircle,
  MdDateRange,
  MdErrorOutline,
  MdLayers
} from "react-icons/md";

// 📊 FUTURE-PROOF GRID CONFIGURATION
const TOTAL_COLUMNS = 13;

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const response = await API.get("/schedules");
      setScheduleData(response.data || []);
    } catch (err) {
      console.error("Schedule load failed:", err);
    }
  };

  const runCpmEngine = async () => {
    setLoading(true);
    showToast("Executing forward/backward pass network calculations...", "info");
    try {
      await API.post("/cpm/calculate");
      showToast("Schedule calculation completed successfully.", "success");
      await loadSchedule(); 
    } catch (err) {
      console.error("CPM Calculation Failed:", err);
      showToast(err.response?.data?.error || "CPM engine calculation failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-"; 
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("complete")) {
      return { bg: "rgba(0, 255, 120, 0.15)", color: "#2ecc71", label: "Completed" };
    }
    if (s.includes("progress")) {
      return { bg: "rgba(0, 120, 255, 0.15)", color: "#4da3ff", label: "In Progress" };
    }
    return { bg: "rgba(120, 120, 120, 0.2)", color: "#bdbdbd", label: "Not Started" };
  };

  // --- METRICS METADATA ---
  const totalActivitiesCount = scheduleData.length;
  const criticalCount = scheduleData.filter((x) => x.is_critical).length;
  const nonCriticalCount = totalActivitiesCount - criticalCount;
  
  const criticalExposurePercentage = totalActivitiesCount > 0 
    ? ((criticalCount / totalActivitiesCount) * 100).toFixed(1) 
    : "0.0";

  const totalNetworkFloat = scheduleData.reduce(
    (sum, x) => sum + Number(x.total_float || 0),
    0
  );

  const validDates = scheduleData
    .filter(x => x.early_finish)
    .map(x => new Date(x.early_finish).getTime());

  const projectFinishDate = validDates.length > 0
    ? new Date(Math.max(...validDates))
    : null;

  // --- 🛡️ FIXED BUG: SAFE FILTER PIPE WITH STRING FALLBACKS ---
  const filteredSchedule = scheduleData.filter((row) => {
    const search = searchTerm.toLowerCase();
    
    const matchesSearch =
      (row.activity_code || "").toLowerCase().includes(search) ||
      (row.activity_name || "").toLowerCase().includes(search) ||
      (row.wbs_code || "").toLowerCase().includes(search) ||
      (row.activity_type || "").toLowerCase().includes(search);

    if (filterType === "CRITICAL") return matchesSearch && row.is_critical;
    if (filterType === "NON_CRITICAL") return matchesSearch && !row.is_critical;
    return matchesSearch;
  });

  return (
    <div style={{ padding: "32px 36px", background: "#0d1018", minHeight: "100vh", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", boxSizing: "border-box" }}>
      
      {toast.show && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 2000,
          background: toast.type === "success" ? "#05291e" : toast.type === "info" ? "#0c2a4a" : "#2a0a0a",
          border: `1px solid ${toast.type === "success" ? "#1d9e75" : toast.type === "info" ? "#378add" : "#e24b4a"}`,
          borderRadius: "8px", padding: "14px 20px", fontSize: "13px",
          color: toast.type === "success" ? "#1d9e75" : toast.type === "info" ? "#378add" : "#f87171",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", gap: "10px"
        }}>
          {toast.type === "success" && <MdCheckCircle />}
          {toast.type === "error" && <MdWarning />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
            Project Management Analytical Engine
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>CPM Network Schedule Workspace</h1>
        </div>
        
        <button
          onClick={runCpmEngine}
          disabled={loading}
          style={{
            background: loading ? "#1e2330" : "#1d9e75", color: loading ? "#64748b" : "#f1f5f9",
            border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", minWidth: "140px" 
          }}
        >
          {loading ? "Calculating..." : <><MdPlayArrow style={{ fontSize: "18px" }} /> Run Schedule</>}
        </button>
      </div>

      {/* KPI DASHBOARD */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Activities", count: totalActivitiesCount, color: "#38bdf8", bg: "#141824" },
          { label: "Critical Activities", count: criticalCount, color: "#f87171", bg: "#2a0a0a" },
          { label: "Non-Critical", count: nonCriticalCount, color: "#94a3b8", bg: "#11141d" },
          { label: "Total Float Matrix", count: `${totalNetworkFloat}d`, color: "#1d9e75", bg: "#05291e" },
          { label: "Critical Activity %", count: `${criticalExposurePercentage}%`, color: "#ef9f27", bg: "#2a1f08" },
        ].map((card, idx) => (
          <div key={idx} style={{ background: card.bg, border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{card.label}</span>
            <span style={{ fontSize: "26px", fontWeight: 700, color: card.color, fontFamily: "monospace" }}>{card.count}</span>
          </div>
        ))}
      </div>

      {/* SYSTEM SUMMARY BAR */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "14px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdDateRange style={{ color: "#38bdf8" }} /> Project Finish Date: 
            <span style={{ color: "#f1f5f9", fontWeight: 600, fontFamily: "monospace" }}>{projectFinishDate ? formatDate(projectFinishDate) : "-"}</span>
          </div>
          <div style={{ width: "1px", height: "16px", background: "#1e2330" }}></div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>
            Critical Threads: <span style={{ color: "#f87171", fontWeight: 600 }}>{criticalCount} Tasks Stacked</span>
          </div>
          <div style={{ width: "1px", height: "16px", background: "#1e2330" }}></div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>
            Network Exposure: <span style={{ color: "#ef9f27", fontWeight: 600 }}>{criticalExposurePercentage}%</span>
          </div>
        </div>
      </div>

      {/* FILTER PIPELINE PANEL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
        <div style={{ position: "relative", width: "320px" }}>
          <MdSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "16px" }} />
          <input
            type="text"
            placeholder="Search code, type, WBS or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px 12px 10px 36px", fontSize: "13px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "4px" }}>
          {["ALL", "CRITICAL", "NON_CRITICAL"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? "#141824" : "transparent",
                border: "none", color: filterType === type ? "#f1f5f9" : "#64748b",
                borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 500, cursor: "pointer"
              }}
            >
              {type === "ALL" ? "All Activities" : type === "CRITICAL" ? "Critical Only" : "Non-Critical"}
            </button>
          ))}
        </div>
      </div>

      {/* SPREADSHEET SENSITIVE LAYOUT */}
      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #1e2330", background: "#0f1117", width: "100%" }}>
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#0d1018", borderBottom: "1px solid #1e2330" }}>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", width: "80px" }}>WBS</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", width: "130px" }}>Activity ID</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", width: "220px" }}>Activity Name</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "120px" }}>Status</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", width: "150px" }}>Activity Type</th>
              <th style={{ padding: "14px 12px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "60px" }}>Dur</th>
              <th style={{ padding: "14px 12px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "55px" }}>Pred</th>
              <th style={{ padding: "14px 12px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "55px" }}>Succ</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "100px" }}>ES</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "100px" }}>EF</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "100px" }}>Late Start</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "100px" }}>Late Finish</th>
              <th style={{ padding: "14px 16px", fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase", textAlign: "center", width: "80px" }}>Total Float</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.length > 0 ? (
              filteredSchedule.map((row, index) => {
                const rowBackground = row.is_critical ? "rgba(226, 75, 74, 0.04)" : (index % 2 === 0 ? "transparent" : "#11141d40");
                const totalFloat = Number(row.total_float || 0);
                const isFloatZero = totalFloat <= 0;
                const statusStyle = getStatusBadgeStyle(row.status || row.activity_status);

                const actType = row.activity_type || "Task Dependent";
                const isMilestone = actType.toLowerCase().includes("milestone");

                return (
                  <tr key={row.id || index} style={{ borderBottom: "1px solid #1e2330", background: rowBackground }}>
                    <td style={{ padding: "14px 16px", fontSize: "12px", fontFamily: "monospace", color: "#94a3b8", fontWeight: 600 }}>
                      {row.wbs_code || "CIV"}
                    </td>
                    
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "monospace", color: row.is_critical ? "#f87171" : "#38bdf8" }}>
                          {row.activity_code}
                        </span>
                        {row.is_critical && (
                          <span style={{ background: "#2a0a0a", color: "#E24B4A", border: "1px solid #5a1212", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <MdErrorOutline size={10} /> CRITICAL
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>
                      {row.activity_name || "Baseline Task"}
                    </td>
                    
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "4px", display: "inline-block", minWidth: "90px", textAlign: "center" }}>
                        {statusStyle.label}
                      </span>
                    </td>
                    
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: isMilestone ? "#ef9f27" : "#cbd5e1", fontWeight: isMilestone ? "600" : "400" }}>
                        <MdLayers style={{ color: isMilestone ? "#ef9f27" : "#475569", fontSize: "14px" }} />
                        <span>{actType}</span>
                      </div>
                    </td>
                    
                    <td style={{ padding: "14px 12px", fontSize: "12px", color: isMilestone ? "#64748b" : "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>
                      {isMilestone ? "0d" : `${row.duration ?? 0}d`}
                    </td>
                    
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#f1f5f9", fontFamily: "monospace", textAlign: "center", fontWeight: 600 }}>
                      {row.predecessors_count ?? 0}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#f1f5f9", fontFamily: "monospace", textAlign: "center", fontWeight: 600 }}>
                      {row.successors_count ?? 0}
                    </td>
                    
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>{formatDate(row.early_start)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>{formatDate(row.early_finish)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>{formatDate(row.late_start)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>{formatDate(row.late_finish)}</td>
                    
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ background: isFloatZero ? "#2a0a0a" : "rgba(29, 158, 117, 0.1)", color: isFloatZero ? "#E24B4A" : "#1D9E75", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", fontWeight: 600, border: isFloatZero ? "1px solid #4a1111" : "1px solid rgba(29, 158, 117, 0.2)" }}>
                        {totalFloat}d
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                {/* ⚡ FIXED BUG #2: Scalable Dynamic ColSpan */}
                <td colSpan={TOTAL_COLUMNS} style={{ padding: "48px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  No activities loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}