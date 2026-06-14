import { useEffect, useState } from "react";
import API from "../api";
import {
  MdPlayArrow,
  MdSearch,
  MdAccessTime,
  MdWarning,
  MdCheckCircle,
  MdDateRange
} from "react-icons/md";

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, CRITICAL, NON_CRITICAL

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
  try {
    const response = await API.get("/schedules");

    console.log("CPM PAYLOAD");
    console.log(response.data);

    setScheduleData(response.data || []);
  } catch (err) {
    console.error("Schedule load failed:", err);
  }
};

  // CORE ENGINE: RUN CPM CALCULATION
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
    return new Date(date).toLocaleDateString("en-GB");
  };

  // --- TELEMETRY DATA METRICS ---
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

  // Safe Date Resolver with Filter & getTime()
  const validDates = scheduleData
    .filter(x => x.early_finish)
    .map(x => new Date(x.early_finish).getTime());

  const projectFinishDate = validDates.length > 0
    ? new Date(Math.max(...validDates))
    : null;

  // --- CLIENT SIDE FILTERING PIPE ---
  const filteredSchedule = scheduleData.filter((row) => {
    const matchesSearch = 
      row.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.activity_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "CRITICAL") return matchesSearch && row.is_critical;
    if (filterType === "NON_CRITICAL") return matchesSearch && !row.is_critical;
    return matchesSearch;
  });

  return (
    <div style={{ padding: "32px 36px", background: "#0d1018", minHeight: "100vh", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", boxSizing: "border-box" }}>
      
      {/* TOAST NOTIFICATION CONTAINER */}
      {toast.show && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 2000,
          background: toast.type === "success" ? "#05291e" : toast.type === "info" ? "#0c2a4a" : "#2a0a0a",
          border: `1px solid ${toast.type === "success" ? "#1d9e75" : toast.type === "info" ? "#378add" : "#e24b4a"}`,
          borderRadius: "8px",
          padding: "14px 20px",
          fontSize: "13px",
          color: toast.type === "success" ? "#1d9e75" : toast.type === "info" ? "#378add" : "#f87171",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "all 0.3s ease"
        }}>
          {toast.type === "success" && <MdCheckCircle />}
          {toast.type === "error" && <MdWarning />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER CONTROLS SECTION */}
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
            background: loading ? "#1e2330" : "#1d9e75",
            color: loading ? "#64748b" : "#f1f5f9",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "inline-flex", 
            alignItems: "center",
            justifyContent: "center", 
            gap: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
            transition: "background 0.2s",
            minWidth: "140px" 
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px" }}>
              <div style={{
                width: "12px",
                height: "12px",
                border: "2px solid #64748b",
                borderTop: "2px solid #cbd5e1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                boxSizing: "border-box"
              }} />
            </div>
          ) : (
            <MdPlayArrow style={{ fontSize: "18px" }} />
          )}
          {loading ? "Calculating..." : "Run Schedule"}
        </button>
      </div>

      {/* CONTROL DASHBOARD METRICS SYSTEM */}
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

      {/* PROFESSIONAL SUMMARY STRIP */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: scheduleData.length > 0 ? "#1d9e75" : "#e44b4a" }}></span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
            Network Status: {scheduleData.length > 0 ? "Analyzed & Settled" : "No Baseline Logged"}
          </span>
        </div>
      </div>

      {/* TOOLBAR FILTER PIPELINE BLOCK */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
        <div style={{ position: "relative", width: "320px" }}>
          <MdSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "16px" }} />
          <input
            type="text"
            placeholder="Search code or layout name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px 12px 10px 36px", fontSize: "13px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "4px" }}>
          {[
            { id: "ALL", label: "All Activities" },
            { id: "CRITICAL", label: "Critical Only" },
            { id: "NON_CRITICAL", label: "Non-Critical" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              style={{
                background: filterType === btn.id ? "#141824" : "transparent",
                border: "none",
                color: filterType === btn.id ? "#f1f5f9" : "#64748b",
                borderRadius: "4px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLLABLE CONTAINER WITH FIX */}
      <div style={{ 
        overflowX: "auto", 
        overflowY: "hidden", 
        borderRadius: "8px", 
        border: "1px solid #1e2330", 
        background: "#0f1117",
        width: "100%"
      }}>
        {/* 🔥 FIX: Combined width: "max-content" with minWidth to perfectly contain cell paddings */}
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#0d1018", borderBottom: "1px solid #1e2330" }}>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", width: "250px" }}>Activity Schema</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "100px" }}>Duration</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "130px" }}>Early Start</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "130px" }}>Early Finish</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "130px" }}>Late Start</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "130px" }}>Late Finish</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "110px" }}>Total Float</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", width: "140px" }}>Network Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.length > 0 ? (
              filteredSchedule.map((row, index) => {
                const rowGlowColor = row.is_critical ? "inset 4px 0px 0px #E24B4A" : "none";
                const rowBackground = row.is_critical 
                  ? "rgba(226, 75, 74, 0.04)" 
                  : (index % 2 === 0 ? "transparent" : "#11141d40");
                
                const isFloatZero = Number(row.total_float || 0) === 0;
                const floatBg = isFloatZero ? "#2a0a0a" : "rgba(29, 158, 117, 0.1)";
                const floatColor = isFloatZero ? "#E24B4A" : "#1D9E75";
                const floatBorder = isFloatZero ? "1px solid #4a1111" : "1px solid rgba(29, 158, 117, 0.2)";

                return (
                  <tr 
                    key={row.id || index} 
                    style={{ 
                      borderBottom: "1px solid #1e2330",
                      background: rowBackground,
                      boxShadow: rowGlowColor
                    }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: row.is_critical ? "#f87171" : "#e2e8f0" }}>
                        {row.activity_code}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {row.activity_name || "Baseline Task"}
                      </div>
                    </td>

                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                        <MdAccessTime style={{ color: "#475569", fontSize: "12px" }} />
                        {row.duration ?? 0}d
                      </div>
                    </td>
                    
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>
                      {formatDate(row.early_start)}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#cbd5e1", fontFamily: "monospace", textAlign: "center" }}>
                      {formatDate(row.early_finish)}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>
                      {formatDate(row.late_start)}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>
                      {formatDate(row.late_finish)}
                    </td>
                    
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span style={{
                        background: floatBg,
                        color: floatColor,
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        border: floatBorder,
                        display: "inline-block",
                        minWidth: "40px"
                      }}>
                        {row.total_float}d
                      </span>
                    </td>

                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        background: row.is_critical ? "#2a0a0a" : "#05291e",
                        color: row.is_critical ? "#E24B4A" : "#1D9E75",
                        border: `1px solid ${row.is_critical ? "#4a1111" : "#0d4734"}`
                      }}>
                        {row.is_critical ? "Critical" : "Non-Critical"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ padding: "48px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  {scheduleData.length === 0 
                    ? "No CPM schedule calculated yet. Click Run Schedule."
                    : "No activities matched the current analytical search scope viewport."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}