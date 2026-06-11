import { useState } from "react";
import API from "../api"; // Central API manager integration
import {
  MdCalendarToday,
  MdPlayArrow,
  MdReportProblem,
  MdInfoOutline,
  MdTimeline,
  MdLayers,
  MdCheckCircleOutline
} from "react-icons/md";

export default function CPMScheduleDashboard() {
  const [scheduleData, setScheduleData] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Analytical Metrics Engine State
  const [summary, setSummary] = useState({
    projectDuration: 0,
    criticalCount: 0,
    totalCount: 0
  });

  const calculateSchedule = async () => {
    setIsCalculating(true);
    try {
      const response = await API.post("/cpm/calculate");
      const data = response.data || {};
      setScheduleData(data);

      // Step 2: Deriving Enterprise Summary Panel Metrics dynamically
      const tasks = Object.values(data);
      const total = tasks.length;
      const critical = tasks.filter(t => t.Float === 0).length;
      const maxEF = total > 0 ? Math.max(...tasks.map(t => t.EF || 0)) : 0;

      setSummary({
        projectDuration: maxEF,
        criticalCount: critical,
        totalCount: total
      });
    } catch (err) {
      console.error("CPM Calculation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  };

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
      {/* Header Panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
            Analytical Engine
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Critical Path Method (CPM)</h1>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#1a1f2e", border: "1px solid #1e2330",
            borderRadius: "6px", padding: "8px 14px", fontSize: "12px", color: "#64748b"
          }}>
            <MdCalendarToday style={{ fontSize: "14px" }} />
            Mathematical Pass
          </div>
          
          <button
            onClick={calculateSchedule}
            disabled={isCalculating}
            style={{
              background: isCalculating ? "#1f3a5f" : "#185FA5", 
              borderRadius: "6px",
              border: "none",
              padding: "9px 18px", 
              fontSize: "12px", 
              color: "#e2e8f0", 
              cursor: isCalculating ? "not-allowed" : "pointer", 
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s"
            }}
          >
            <MdPlayArrow style={{ fontSize: "16px" }} />
            {isCalculating ? "Processing Engine..." : "Calculate CPM"}
          </button>
        </div>
      </div>

      {/* Step 2: Project Summary Panel (Rendered post-calculation) */}
      {Object.keys(scheduleData).length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "20px"
        }}>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#0c2a4a", padding: "10px", borderRadius: "6px", color: "#185FA5", display: "flex" }}><MdTimeline style={{ fontSize: "20px" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Project Duration</div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#f1f5f9" }}>{summary.projectDuration} Days</div>
            </div>
          </div>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#2a0a0a", padding: "10px", borderRadius: "6px", color: "#E24B4A", display: "flex" }}><MdReportProblem style={{ fontSize: "20px" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Critical Activities</div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#E24B4A" }}>{summary.criticalCount} Nodes</div>
            </div>
          </div>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#05291e", padding: "10px", borderRadius: "6px", color: "#1D9E75", display: "flex" }}><MdLayers style={{ fontSize: "20px" }} /></div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Total Activities</div>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "#cbd5e1" }}>{summary.totalCount} Tracked</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: CPM Acronym Explanation Card */}
      <div style={{
        background: "#0f1117",
        border: "1px solid #1e2330",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "12px",
        color: "#64748b"
      }}>
        <MdInfoOutline style={{ fontSize: "16px", color: "#185FA5", flexShrink: 0 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <span><strong>ES</strong> = Early Start</span>
          <span><strong>EF</strong> = Early Finish</span>
          <span><strong>LS</strong> = Late Start</span>
          <span><strong>LF</strong> = Late Finish</span>
          <span><strong>Float</strong> = Scheduling Flexibility (Slack)</span>
        </div>
      </div>

      {/* Analytical Output Table Container */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1018" }}>
              {/* Step 5: Professional Short Headers */}
              {["Activity", "ES", "EF", "LS", "LF", "Float", "Status"].map((h) => (
                <th key={h} style={{
                  padding: "14px 20px", fontSize: "11px", fontWeight: 600,
                  color: "#475569", textAlign: "left", letterSpacing: "0.08em"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(scheduleData).map(([id, data], index) => {
              const isCritical = data.Float === 0;
              return (
                <tr 
                  key={id} 
                  style={{ 
                    borderTop: "1px solid #1e2330",
                    // Step 4: High Impact Critical Row Highlight
                    background: isCritical ? "#2e1212" : index % 2 === 0 ? "transparent" : "#11141d40",
                    transition: "background 0.15s"
                  }}
                >
                  {/* Activity */}
                  <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: isCritical ? "#f87171" : "#e2e8f0" }}>
                    {id}
                  </td>
                  
                  {/* Mathematical Passes Blocks */}
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#cbd5e1", fontFamily: "monospace" }}>{data.ES}d</td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#cbd5e1", fontFamily: "monospace" }}>{data.EF}d</td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#64748b", fontFamily: "monospace" }}>{data.LS}d</td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#64748b", fontFamily: "monospace" }}>{data.LF}d</td>
                  
                  {/* Step 3: Refined Float Column Badge */}
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      background: isCritical ? "#4c1d1d" : "#064e3b",
                      color: isCritical ? "#f87171" : "#34d399",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      border: isCritical ? "1px solid #7f1d1d" : "1px solid #065f46"
                    }}>
                      {data.Float}d
                    </span>
                  </td>

                  {/* Status Pill Label */}
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: isCritical ? "#7f1d1d" : "#065f46",
                      color: isCritical ? "#fca5a5" : "#6ee7b7",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      {isCritical ? <MdReportProblem style={{ fontSize: "12px" }} /> : <MdCheckCircleOutline style={{ fontSize: "12px" }} />}
                      {isCritical ? "Critical" : "Non-Critical"}
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {Object.keys(scheduleData).length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                  Analytical math track is clear. Click "Calculate CPM" to execute forward and backward passes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}