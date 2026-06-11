import { useEffect, useState } from "react";
import axios from "axios";
import {
  MdCalendarToday,
  MdTimeline,
  MdReportProblem,
  MdLayers,
  MdAccessTime
} from "react-icons/md";

// Step 2 & 8: Strategic Layout Configuration
const COLUMN_WIDTH = 32; // Pixel width for each day cell
const LEFT_PANEL_WIDTH = 420; // Expanded to perfectly accommodate Activity details + ES/EF/Float grid
const TOTAL_DAYS = 24; // Timeline width viewport

export default function Dashboard() {
  const [schedules, setSchedules] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await axios.get("http://13.60.26.19:5000/schedules");
      setSchedules(response.data);
    } catch (err) {
      console.error("Failed to load timeline data:", err);
    }
  };

  // Dynamic calculations for the Step 1 Summary Cards
  const totalActivities = schedules.length;
  const criticalActivities = schedules.filter(t => t.is_critical).length;
  const projectDuration = totalActivities > 0 ? Math.max(...schedules.map(t => t.early_finish || 0)) : 0;

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
            Project Management Engine
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Master Gantt Schedule</h1>
          <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 0" }}>
            Last updated: Jun 11, 2026 · 07:50 PM
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#1a1f2e", border: "1px solid #1e2330",
            borderRadius: "6px", padding: "8px 14px", fontSize: "12px", color: "#64748b"
          }}>
            <MdCalendarToday style={{ fontSize: "14px" }} />
            Time-Scaled Logic Diagram
          </div>
        </div>
      </div>

      {/* Step 1: Enterprise Timeline Summary Panel */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#0c2a4a", padding: "10px", borderRadius: "6px", color: "#185FA5", display: "flex" }}><MdTimeline style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Calculated Duration</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#f1f5f9" }}>{projectDuration} Days</div>
          </div>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#2a0a0a", padding: "10px", borderRadius: "6px", color: "#E24B4A", display: "flex" }}><MdReportProblem style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Critical Path Nodes</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#E24B4A" }}>{criticalActivities} Nodes</div>
          </div>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#05291e", padding: "10px", borderRadius: "6px", color: "#1D9E75", display: "flex" }}><MdLayers style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Total Activities</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#cbd5e1" }}>{totalActivities} Loaded</div>
          </div>
        </div>
      </div>

      {/* Gantt Matrix Container */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
        
        {/* Timeline Header Row */}
        <div style={{ display: "flex", background: "#0d1018", borderBottom: "1px solid #1e2330", alignItems: "center" }}>
          {/* Step 8: Combined Left Panel Grid Header */}
          <div style={{ 
            width: `${LEFT_PANEL_WIDTH}px`, 
            padding: "16px 20px", 
            boxSizing: "border-box",
            fontSize: "11px", 
            fontWeight: 600, 
            color: "#475569", 
            textTransform: "uppercase", 
            letterSpacing: "0.06em",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span style={{ width: "180px" }}>Activity Details</span>
            <div style={{ display: "flex", gap: "24px", textAlign: "center", paddingRight: "10px" }}>
              <span style={{ width: "30px" }}>ES</span>
              <span style={{ width: "30px" }}>EF</span>
              <span style={{ width: "30px" }}>TF</span>
            </div>
          </div>
          
          {/* Time Scale Days Header */}
          <div style={{ display: "flex", position: "relative" }}>
            {Array.from({ length: TOTAL_DAYS }, (_, i) => {
              const dayNum = i + 1;
              // Step 4: Weekend Boundary Highlighter Logic
              const isWeekend = dayNum % 7 === 6 || dayNum % 7 === 0;
              return (
                <div
                  key={i}
                  style={{
                    width: `${COLUMN_WIDTH}px`,
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isWeekend ? "#94a3b8" : "#475569",
                    background: isWeekend ? "#151926" : "transparent",
                    borderLeft: "1px solid #1e2330",
                  }}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Data Content Rows */}
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          
          {/* Step 7: Primavera/MS Project Style 'TODAY' Line (Set at Day 9 as an example) */}
          <div style={{
            position: "absolute",
            left: `${LEFT_PANEL_WIDTH + (8 * COLUMN_WIDTH)}px`, // Dynamic mathematical anchor
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#EF9F27",
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 0 8px #EF9F27"
          }}>
            <div style={{
              position: "absolute",
              top: "-2px",
              left: "-14px",
              background: "#EF9F27",
              color: "#0d1018",
              fontSize: "9px",
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: "3px",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}>
              <MdAccessTime /> TODAY
            </div>
          </div>

          {schedules.map((task, idx) => {
            const startDay = task.early_start || 1;
            const leftMargin = (startDay - 1) * COLUMN_WIDTH;
            const barWidth = (task.duration || 1) * COLUMN_WIDTH;

            return (
              <div 
                key={task.id || idx} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  borderBottom: "1px solid #1e2330",
                  background: idx % 2 === 0 ? "transparent" : "#11141d40" 
                }}
              >
                {/* Step 2 & 8: Advanced Left Side Analytical Data Grid */}
                <div style={{ 
                  width: `${LEFT_PANEL_WIDTH}px`, 
                  padding: "12px 20px", 
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ maxWidth: "200px" }}>
                    {/* Step 3: Dual Identity Hierarchy Display */}
                    <div style={{ fontSize: "13px", fontWeight: 600, color: task.is_critical ? "#f87171" : "#e2e8f0" }}>
                      {task.activity_code}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {task.activity_name || "Baseline Implementation Node"}
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      {/* Step 5: Premium Critical Path Badge System */}
                      {task.is_critical ? (
                        <span style={{ background: "#2a0a0a", color: "#E24B4A", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, border: "1px solid #4a1111" }}>
                          Critical
                        </span>
                      ) : (
                        <span style={{ background: "#05291e", color: "#1D9E75", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, border: "1px solid #0d4734" }}>
                          Standard ({task.duration}d)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 8: Inlined Mathematical CPM Columns */}
                  <div style={{ display: "flex", gap: "24px", fontFamily: "monospace", fontSize: "13px", color: "#cbd5e1", textAlign: "center", paddingRight: "10px" }}>
                    <span style={{ width: "30px", color: "#94a3b8" }}>{task.early_start}</span>
                    <span style={{ width: "30px", color: "#94a3b8" }}>{task.early_finish}</span>
                    <span style={{ width: "30px", fontWeight: 600, color: task.is_critical ? "#E24B4A" : "#1D9E75" }}>
                      {task.total_float || 0}d
                    </span>
                  </div>
                </div>

                {/* Right Side Time-Scaled Bar Track */}
                <div style={{ display: "flex", flexGrow: 1, height: "68px", alignItems: "center", position: "relative" }}>
                  
                  {/* Background Grid Lines with Weekend Shades */}
                  {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                    const dayNum = i + 1;
                    const isWeekend = dayNum % 7 === 6 || dayNum % 7 === 0;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${i * COLUMN_WIDTH}px`,
                          top: 0,
                          bottom: 0,
                          width: `${COLUMN_WIDTH}px`,
                          background: isWeekend ? "#15192620" : "transparent",
                          borderRight: "1px solid #1e233015",
                          pointerEvents: "none"
                        }}
                      />
                    );
                  })}

                  {/* Calculated Gantt Activity Progress Bar */}
                  <div
                    onMouseEnter={() => setHoveredBar(task.id || idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{
                      marginLeft: `${leftMargin}px`,
                      width: `${barWidth}px`,
                      height: "26px",
                      borderRadius: "5px",
                      position: "relative",
                      zIndex: 2,
                      cursor: "pointer",
                      // Background execution setups
                      background: task.is_critical
                        ? "linear-gradient(90deg, #E24B4A, #b32b2a)"
                        : "linear-gradient(90deg, #185FA5, #114375)",
                      boxShadow: task.is_critical 
                        ? "0 0 14px rgba(226, 75, 74, 0.3)" 
                        : "0 0 10px rgba(24, 95, 165, 0.15)",
                      
                      // Step 6: Dynamic Micro-Interactivity Engine
                      transform: hoveredBar === (task.id || idx) ? "scaleY(1.2) scaleX(1.01)" : "scale(1)",
                      transformOrigin: "left center",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    title={`${task.activity_code}: Day ${startDay} to Day ${task.early_finish}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}