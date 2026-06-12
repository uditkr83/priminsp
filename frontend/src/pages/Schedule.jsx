import { useEffect, useState } from "react";
import API from "../api";

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState([]);

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

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const totalActivitiesCount = scheduleData.length;
  const criticalCount = scheduleData.filter((x) => x.is_critical).length;
  
  const totalNetworkFloat = scheduleData.reduce(
    (sum, x) => sum + Number(x.total_float || 0),
    0
  );

  return (
    <div style={{ padding: "32px 36px", background: "#0d1018", minHeight: "100vh", color: "#e2e8f0" }}>
      
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
          Project Management Engine
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>CPM Network Schedule</h1>
      </div>

      {/* CPM Summary Strip */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", color: "#94a3b8" }}>
          Total Activities: <strong style={{ color: "#38bdf8", fontFamily: "monospace", marginLeft: "6px", fontSize: "14px" }}>{totalActivitiesCount}</strong>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", color: "#94a3b8" }}>
          Critical Activities: <strong style={{ color: "#f87171", fontFamily: "monospace", marginLeft: "6px", fontSize: "14px" }}>{criticalCount}</strong>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", color: "#94a3b8" }}>
          Total Float: <strong style={{ color: "#1d9e75", fontFamily: "monospace", marginLeft: "6px", fontSize: "14px" }}>{totalNetworkFloat}d</strong>
        </div>
      </div>

      {/* Main CPM Data Grid */}
      <div style={{ padding: "10px 0" }}>
        <table 
          style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            textAlign: "left",
            background: "#0f1117",
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #1e2330"
          }}
        >
          <thead>
            <tr style={{ background: "#0d1018", borderBottom: "1px solid #1e2330" }}>
              {/* ✅ Left aligned for Activity details, and Centered for all math columns */}
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>Activity</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>ES</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>EF</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>LS</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>LF</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>Float</th>
              <th style={{ padding: "14px 20px", fontSize: "11px", fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {scheduleData && scheduleData.length > 0 ? (
              scheduleData.map((row, index) => {
                const rowColor = row.is_critical ? "#f87171" : "#e2e8f0";
                const statusBg = row.is_critical ? "#2a0a0a" : "#05291e";
                const statusColor = row.is_critical ? "#E24B4A" : "#1D9E75";
                const statusText = row.is_critical ? "Critical" : "Normal";

                // ✅ Float Badge Styling based on criticality
                const floatBg = row.is_critical ? "#2a0a0a" : "#05291e20";
                const floatColor = row.is_critical ? "#E24B4A" : "#1D9E75";
                const floatBorder = row.is_critical ? "1px solid #4a1111" : "1px solid #0d473440";

                return (
                  <tr 
                    key={row.id || index} 
                    style={{ 
                      borderBottom: "1px solid #1e2330",
                      // ✅ Cosmetic Fix 3: Subtle Row Glow on Critical Paths, alternating rows for standard ones
                      background: row.is_critical 
                        ? "#2a0a0a20" 
                        : (index % 2 === 0 ? "transparent" : "#11141d40"),
                      boxShadow: row.is_critical ? "inset 3px 0px 0px #E24B4A" : "none" // Adds an enterprise edge indicator line
                    }}
                  >
                    {/* Activity Code & Name (Left Aligned) */}
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: rowColor }}>
                        {row.activity_code}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {row.activity_name || "Baseline Task"}
                      </div>
                    </td>
                    
                    {/* ✅ Cosmetic Fix 1: Center Aligned Date Parameters */}
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
                    
                    {/* ✅ Cosmetic Fix 2: Dynamically Tailored Float Badges (Center Aligned) */}
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span
                        style={{
                          background: floatBg,
                          color: floatColor,
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: 600,
                          border: floatBorder,
                          display: "inline-block",
                          minWidth: "32px"
                        }}
                      >
                        {row.total_float}d
                      </span>
                    </td>

                    {/* Status Badges (Center Aligned) */}
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "4px", background: statusBg, color: statusColor, border: `1px solid ${row.is_critical ? "#4a1111" : "#0d4734"}` }}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  Analytical math track is calculating or no remote nodes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}