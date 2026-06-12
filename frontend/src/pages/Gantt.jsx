import { useEffect, useState } from "react";
import API from "../api"; 
import {
  MdCalendarToday,
  MdTimeline,
  MdLayers,
  MdAccessTime,
  MdDataUsage
} from "react-icons/md";

export default function GanttDashboard() {
  const [scheduleData, setScheduleData] = useState([]);

  useEffect(() => {
    loadGantt();
  }, []);

  const loadGantt = async () => {
    try {
      const response = await API.get("/schedules");
      const sortedData = (response.data || []).sort(
        (a, b) => new Date(a.early_start) - new Date(b.early_start)
      );
      setScheduleData(sortedData);
    } catch (err) {
      console.error("Gantt load failed:", err);
    }
  };

  const DAY_WIDTH = 35; // 1 Day = 35px

  // --- GANTT MATHEMATICAL ENGINE ---
  const projectStart = scheduleData.length > 0 ? new Date(scheduleData[0].early_start) : null;
  let totalProjectDays = 20; 
  const timelineDays = [];

  if (scheduleData.length > 0 && projectStart) {
    const allFinishes = scheduleData.map((x) => new Date(x.early_finish).getTime());
    const projectEnd = new Date(Math.max(...allFinishes));
    const diffTime = Math.abs(projectEnd - projectStart);
    totalProjectDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 4; 

    for (let i = 0; i < totalProjectDays; i++) {
      const nextDay = new Date(projectStart);
      nextDay.setDate(projectStart.getDate() + i);
      timelineDays.push(nextDay);
    }
  }

  // Today Line Calculation
  const today = new Date();
  let todayOffset = 0;
  let showTodayLine = false;

  if (projectStart) {
    const timeDiffFromStart = today - projectStart;
    todayOffset = timeDiffFromStart / (1000 * 60 * 60 * 24);
    if (todayOffset >= 0 && todayOffset <= totalProjectDays) {
      showTodayLine = true;
    }
  }

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", padding: "32px 36px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0", boxSizing: "border-box" }}>
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Project Management Engine</div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Enterprise Gantt Engine</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>Time-Scaled Logic Network (Current Simulation Year: 2026)</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a1f2e", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", color: "#64748b" }}>
          <MdDataUsage style={{ fontSize: "14px", color: "#10b981" }} />
          Phase 4: Progress Shading Active
        </div>
      </div>

      {/* Analytics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#0c2a4a", padding: "10px", borderRadius: "6px", color: "#378ADD", display: "flex" }}><MdTimeline style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Network Traversal</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#f1f5f9" }}>{scheduleData.length} Loaded</div>
          </div>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#2a0a0a", padding: "10px", borderRadius: "6px", color: "#E24B4A", display: "flex" }}><MdLayers style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Critical Critical Paths</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#E24B4A" }}>{scheduleData.filter(x => x.is_critical).length} Nodes</div>
          </div>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#13251d", padding: "10px", borderRadius: "6px", color: "#1D9E75", display: "flex" }}><MdCalendarToday style={{ fontSize: "20px" }} /></div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Average Progress</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#1D9E75" }}>
              {scheduleData.length > 0 
                ? Math.round(scheduleData.reduce((sum, x) => sum + (x.progress || 0), 0) / scheduleData.length) 
                : 0}% Overall
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Split Frame */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden", display: "flex" }}>
        
        {/* LEFT PANEL: DATA KEYS */}
        <div style={{ width: "400px", flexShrink: 0, borderRight: "2px solid #1e2330", background: "#0f1117", zIndex: 5 }}>
          <div style={{ display: "flex", background: "#0d1018", borderBottom: "1px solid #1e2330", height: "45px", alignItems: "center", fontWeight: 600, fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ flex: 2, paddingLeft: "20px" }}>Activity Hierarchy</div>
            <div style={{ flex: 1, textAlign: "center" }}>Start</div>
            <div style={{ flex: 1, textAlign: "center", paddingRight: "10px" }}>Finish</div>
          </div>

          {scheduleData.map((row, idx) => (
            <div key={row.id || idx} style={{ display: "flex", height: "55px", alignItems: "center", borderBottom: "1px solid #1e2330", background: row.is_critical ? "#2a0a0a10" : "transparent" }}>
              <div style={{ flex: 2, paddingLeft: "20px", overflow: "hidden" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: row.is_critical ? "#E24B4A" : "#cbd5e1" }}>{row.activity_code}</div>
                <div style={{ fontSize: "11px", color: "#566579", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{row.activity_name}</div>
              </div>
              <div style={{ flex: 1, fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>
                {row.early_start ? new Date(row.early_start).toLocaleDateString("en-GB", {day: '2-digit', month: '2-digit'}) : "-"}
              </div>
              <div style={{ flex: 1, fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center", paddingRight: "10px" }}>
                {row.early_finish ? new Date(row.early_finish).toLocaleDateString("en-GB", {day: '2-digit', month: '2-digit'}) : "-"}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL: VISUAL TIME-SCALE */}
        <div style={{ flexGrow: 1, overflowX: "auto", position: "relative" }}>
          
          {/* Timeline Header Row */}
          <div style={{ display: "flex", background: "#0d1018", borderBottom: "1px solid #1e2330", height: "45px", width: `${totalProjectDays * DAY_WIDTH}px` }}>
            {timelineDays.map((day, index) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div key={index} style={{ width: `${DAY_WIDTH}px`, flexShrink: 0, textAlign: "center", fontSize: "11px", fontWeight: 600, color: isWeekend ? "#94a3b8" : "#475569", background: isWeekend ? "#141824" : "transparent", lineHeight: "45px", borderRight: "1px solid #1e233020" }}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {/* Core Tracks Area */}
          <div style={{ width: `${totalProjectDays * DAY_WIDTH}px`, position: "relative" }}>
            
            {/* Live Today Line */}
            {showTodayLine && (
              <div style={{ position: "absolute", left: `${todayOffset * DAY_WIDTH}px`, top: 0, bottom: 0, width: "2px", background: "#facc15", zIndex: 10, pointerEvents: "none", boxShadow: "0 0 8px #facc15" }}>
                <div style={{ position: "absolute", top: "2px", left: "-16px", background: "#facc15", color: "#0d1018", fontSize: "8px", fontWeight: 800, padding: "1px 4px", borderRadius: "3px", display: "flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
                  <MdAccessTime /> TODAY
                </div>
              </div>
            )}

            {/* Bars Loop */}
            {scheduleData.map((row, idx) => {
              const start = new Date(row.early_start);
              const finish = new Date(row.early_finish);
              
              const duration = Math.max(1, (finish - start) / (1000 * 60 * 60 * 24));
              const offset = projectStart ? (start - projectStart) / (1000 * 60 * 60 * 24) : 0;

              const barWidth = duration * DAY_WIDTH;
              const barLeftMargin = offset * DAY_WIDTH;
              
              // ✅ Phase 4 dynamic progress values
              const progressPercent = row.progress || 0; 

              return (
                <div key={row.id || idx} style={{ height: "55px", display: "flex", alignItems: "center", borderBottom: "1px solid #1e2330", position: "relative" }}>
                  
                  {/* Weekend Background Grid Lines */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                    {timelineDays.map((day, i) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid #1e233010", background: isWeekend ? "#14182430" : "transparent", flexShrink: 0 }} />
                      );
                    })}
                  </div>

                  {/* 📊 THE UPGRADED PROGRESS-SHADED GANTT BAR CONTAINER */}
                  <div
                    style={{
                      marginLeft: `${barLeftMargin}px`,
                      width: `${barWidth}px`,
                      height: "22px",
                      borderRadius: "4px",
                      background: "#1e293b", // 💡 Base Dark background for incomplete work
                      border: `1px solid ${row.is_critical ? "#4a1111" : "#1e293b"}`,
                      zIndex: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      position: "relative",
                      overflow: "hidden" // Keeps child progress inside rounded edges
                    }}
                    title={`${row.activity_name}: ${duration}d | Progress: ${progressPercent}%`}
                  >
                    {/* 🟩 🔴 ACTIVE PROGRESS FILL OVERLAY */}
                    <div 
                      style={{
                        width: `${progressPercent}%`,
                        height: "100%",
                        background: row.is_critical 
                          ? "linear-gradient(90deg, #E24B4A, #b32b2a)" // Critical Progress
                          : "linear-gradient(90deg, #378ADD, #1c5b96)", // Standard Progress
                        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "absolute",
                        left: 0,
                        top: 0,
                        zIndex: 1
                      }}
                    />

                    {/* 📝 DYNAMIC TEXT LABEL LAYER */}
                    <div style={{ 
                      position: "absolute", 
                      width: "100%", 
                      textAlign: "center", 
                      zIndex: 3, 
                      fontSize: "10px", 
                      fontWeight: 700, 
                      color: "#ffffff", 
                      fontFamily: "monospace",
                      textShadow: "0px 1px 2px rgba(0,0,0,0.8)" // Ensures legibility on all backgrounds
                    }}>
                      {progressPercent > 0 ? `${duration}d | ${progressPercent}%` : `${duration}d`}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}