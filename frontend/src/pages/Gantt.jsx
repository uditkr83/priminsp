import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import API from "../api"; 
import { MdZoomIn, MdKeyboardArrowDown, MdKeyboardArrowRight } from "react-icons/md";

// SQL Left-Join डेटा को क्लीन प्राइमावेरा ट्री में बदलने का लॉजिक
const buildWBSTree = (rows) => {
  const wbsMap = {};
  const roots = [];

  rows.forEach((row) => {
    if (!wbsMap[row.id]) {
      wbsMap[row.id] = {
        id: row.id,
        parent_wbs_id: row.parent_wbs_id,
        wbs_code: row.wbs_code,
        wbs_name: row.wbs_name,
        children: [],       
        activities: [],     
      };
    }

    if (row.activity_id) {
      const alreadyExists = wbsMap[row.id].activities.some(act => act.id === row.activity_id);
      if (!alreadyExists) {
        wbsMap[row.id].activities.push({
          id: row.activity_id,
          activity_code: row.activity_code,
          activity_name: row.activity_name,
          duration: row.duration,
          early_start: row.early_start,
          early_finish: row.early_finish,
          is_critical: row.is_critical,
          percent_complete: row.percent_complete,
          baseline_start: row.baseline_start,
          baseline_duration: row.baseline_duration,
          dependencies: row.dependencies || []
        });
      }
    }
  });

  Object.values(wbsMap).forEach((node) => {
    node.activities.sort((a, b) => {
      if (!a.activity_code || !b.activity_code) return 0;
      return a.activity_code.localeCompare(b.activity_code);
    });

    if (node.parent_wbs_id) {
      const parent = wbsMap[node.parent_wbs_id];
      if (parent) {
        const childExists = parent.children.some(child => child.id === node.id);
        if (!childExists) {
          parent.children.push(node);
        }
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// बॉटम-अप रिकर्सिव रोलअप इंजन (सभी पैरेंट WBS की डेट्स कैलकुलेट करने के लिए)
function calculateWbsDates(node) {
  let minStartTs = null;
  let maxFinishTs = null;

  node.activities?.forEach((act) => {
    if (!act.early_start || !act.early_finish) return;

    const startTs = new Date(act.early_start).getTime();
    const finishTs = new Date(act.early_finish).getTime();

    if (!isNaN(startTs)) {
      if (minStartTs === null || startTs < minStartTs) minStartTs = startTs;
    }
    if (!isNaN(finishTs)) {
      if (maxFinishTs === null || finishTs > maxFinishTs) maxFinishTs = finishTs;
    }
  });

  node.children?.forEach((child) => {
    calculateWbsDates(child);

    if (child.summaryStart !== null) {
      if (minStartTs === null || child.summaryStart < minStartTs) {
        minStartTs = child.summaryStart;
      }
    }
    if (child.summaryFinish !== null) {
      if (maxFinishTs === null || child.summaryFinish > maxFinishTs) {
        maxFinishTs = child.summaryFinish;
      }
    }
  });

  node.summaryStart = minStartTs;
  node.summaryFinish = maxFinishTs;
}

export default function GanttDashboard() {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [zoomLevel, setZoomLevel] = useState("day"); 
  const [expanded, setExpanded] = useState({}); 
  
  const containerRef = useRef(null);
  const [, forceUpdate] = useState({});

  const handleScroll = useCallback(() => { forceUpdate({}); }, []);

  useEffect(() => {
    loadGantt();
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    try {
      const response = await API.get("/api/gantt-hierarchy");
      setHierarchyData(response.data || []);
    } catch (err) {
      console.error("WBS Hierarchy load failed:", err);
    }
  };

  const treeData = useMemo(() => {
    const tree = buildWBSTree(hierarchyData);
    tree.forEach(calculateWbsDates);
    return tree;
  }, [hierarchyData]);

  // WBS Band Contrast Dark Style (#131b2d)
  const getWBSBandStyle = () => "#131b2d"; 

  const flattenTree = useCallback((nodes, level = 0, isVisible = true) => {
    let rows = [];

    nodes.forEach((node) => {
      const wbsKey = `wbs-${node.id}`;
      const isNodeExpanded = expanded[wbsKey] !== false; 

      if (isVisible) {
        rows.push({
          type: "wbs",
          level,
          id: wbsKey,
          wbs_code: node.wbs_code,
          wbs_name: node.wbs_name,
          wbs_start: node.summaryStart,  
          wbs_finish: node.summaryFinish, 
          isExpanded: isNodeExpanded
        });

        if (isNodeExpanded) {
          node.activities.forEach((activity) => {
            rows.push({
              type: "activity",
              level: level + 1,
              ...activity
            });
          });
        }
      }

      if (node.children.length > 0) {
        rows.push(...flattenTree(node.children, level + 1, isVisible && isNodeExpanded));
      }
    });

    return rows;
  }, [expanded]);

  const displayRows = useMemo(() => flattenTree(treeData), [treeData, flattenTree]);

  const toggleWBS = (wbsId) => {
    setExpanded(prev => ({
      ...prev,
      [wbsId]: prev[wbsId] === false ? true : false
    }));
  };

  const loadGantt = async () => {
    try {
      const response = await API.get("/schedules");
      const rawData = response.data || [];
      
      const upgradedData = rawData.map((item) => {
        const realOrFallbackDeps = Array.isArray(item.dependencies) ? item.dependencies : [];
        const bStart = item.baseline_start || item.early_start;
        const bDuration = item.baseline_duration || item.duration || 1;

        return {
          ...item,
          dependencies: realOrFallbackDeps,
          baseline_start: bStart,
          baseline_duration: bDuration
        };
      });

      setScheduleData(upgradedData);
    } catch (err) {
      console.error("Gantt load failed:", err);
    }
  };

  const DAY_WIDTH = useMemo(() => {
    if (zoomLevel === "month") return 8;   
    if (zoomLevel === "week") return 16;   
    return 32;                               
  }, [zoomLevel]);

  const projectBounds = useMemo(() => {
    let datesToParse = [];
    
    if (scheduleData.length > 0) {
      datesToParse = scheduleData.flatMap(x => [new Date(x.early_start).getTime(), new Date(x.early_finish).getTime()]);
    } else if (hierarchyData.length > 0) {
      datesToParse = hierarchyData.flatMap(x => [new Date(x.early_start).getTime(), new Date(x.early_finish).getTime()]);
    }

    const validTimestamps = datesToParse.filter(t => !isNaN(t) && t > 0);
    
    const minStart = validTimestamps.length ? new Date(Math.min(...validTimestamps)) : new Date();
    const maxFinish = validTimestamps.length ? new Date(Math.max(...validTimestamps)) : new Date();
    
    const start = new Date(minStart);
    start.setDate(start.getDate() - 7); 

    const diffTime = Math.abs(maxFinish - start);
    const totalDays = Math.max(90, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 45);

    const timelineDays = [];
    for (let i = 0; i < totalDays; i++) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      timelineDays.push(nextDay);
    }
    return { start, totalDays, timelineDays };
  }, [scheduleData, hierarchyData]);

  const { start: projectStart, totalDays: totalProjectDays, timelineDays } = projectBounds;

  const todayMetrics = useMemo(() => {
    if (!projectStart) return { show: false, offset: 0 };
    const today = new Date();
    const timeDiffFromStart = today - projectStart;
    const offset = timeDiffFromStart / (1000 * 60 * 60 * 24);
    return {
      show: offset >= 0 && offset <= totalProjectDays,
      offset: offset * DAY_WIDTH
    };
  }, [projectStart, totalProjectDays, DAY_WIDTH]);

  // Primavera Cloud-Style Activity Bar
  const getBarStyles = useCallback((row) => {
    const percent = row.percent_complete || 0;
    if (percent >= 100) {
      return {
        background: "#1D9E75",
        border: "1px solid #34d399",
        boxShadow: "0 0 4px rgba(29,158,117,.35)"
      };
    }
    if (row.is_critical) {
      return {
        background: "#E24B4A",
        border: "1px solid #f87171",
        boxShadow: "0 0 4px rgba(226,75,74,.35)"
      };
    }
    return {
      background: "#60a5fa",
      border: "1px solid #93c5fd",
      boxShadow: "0 0 4px rgba(91,157,249,.35)"
    };
  }, []);

  const getRelationColor = useCallback((type, isCriticalChain) => {
    if (isCriticalChain) return "#E24B4A"; 
    if (type === "SS") return "#1D9E75";   
    if (type === "FF") return "#ef9f27";   
    if (type === "SF") return "#a855f7";   
    return "#4A90E2";                      
  }, []);

  const projectStartTs = projectStart ? projectStart.getTime() : null;

  return (
    <div style={{ background: "#090b11", width: "100%", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0", boxSizing: "border-box", overflow: "hidden" }}>
      
      {/* HIGH-LEVEL CLEAN EXPANDED HEADER PANEL */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#0f121d", borderBottom: "1px solid #1e2330", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Advanced Planning & Control</div>
          <h1 style={{ fontSize: "32px", fontWeight: 600, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em", lineHeight: "1.1" }}>Primavera P6 Logic Network Engine</h1>
        </div>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "2px" }}>
            <MdZoomIn style={{ color: "#64748b", margin: "0 4px", fontSize: "12px", alignSelf: "center" }} />
            {["day", "week", "month"].map((level) => (
              <button key={level} onClick={() => setZoomLevel(level)} style={{ background: zoomLevel === level ? "#1e293b" : "transparent", border: "none", color: zoomLevel === level ? "#f1f5f9" : "#64748b", borderRadius: "3px", padding: "2px 6px", fontSize: "9px", fontWeight: 600, textTransform: "uppercase", cursor: "pointer" }}>{level}</button>
            ))}
          </div>
        </div>
      </div>

      {/* SPREADSHEET FRAMEWORK */}
      <div style={{ background: "#0f121d", flexGrow: 1, overflow: "hidden", display: "flex", width: "100%" }}>
        
        {/* EXTENDED LEFT PANEL */}
        <div style={{ width: "520px", flexShrink: 0, borderRight: "2px solid #1c202e", background: "#0f121d", zIndex: 15, overflowX: "hidden" }}>
          <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", height: "24px", width: "100%", alignItems: "center", fontWeight: 700, fontSize: "9px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ width: "110px", paddingLeft: "10px" }}>WBS / ACT ID</div>
            <div style={{ width: "280px" }}>NAME</div> 
            <div style={{ width: "35px", textAlign: "center" }}>DUR</div>
            <div style={{ width: "45px", textAlign: "center" }}>START</div>
            <div style={{ width: "50px", textAlign: "center" }}>FINISH</div>
          </div>

          <div style={{ overflowY: "hidden" }}>
            {displayRows.map((row, idx) => {
              const isWBS = row.type === "wbs";

              return (
                <div 
                  key={row.id || idx} 
                  style={{ 
                    display: "flex", 
                    height: "24px", 
                    alignItems: "center", 
                    borderBottom: "1px solid #1e2330", 
                    background: isWBS ? getWBSBandStyle() : (row.is_critical && (row.percent_complete || 0) < 100 ? "rgba(226, 75, 74, 0.02)" : "transparent"),
                    fontWeight: isWBS ? 600 : 400
                  }}
                >
                  {isWBS ? (
                    <div style={{ display: "flex", width: "100%", alignItems: "center", paddingLeft: `${row.level * 12 + 4}px`, fontSize: "10px" }}>
                      <div onClick={() => toggleWBS(row.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: "4px" }}>
                        {row.isExpanded ? (
                          <MdKeyboardArrowDown style={{ color: "#94a3b8", fontSize: "13px" }} />
                        ) : (
                          <MdKeyboardArrowRight style={{ color: "#94a3b8", fontSize: "13px" }} />
                        )}
                      </div>
                      <span style={{ color: "#cbd5e1", marginRight: "6px", fontFamily: "monospace", fontWeight: 700 }}>{row.wbs_code}</span>
                      <span style={{ color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.wbs_name}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: "110px", paddingLeft: `${row.level * 12 + 8}px`, fontSize: "10px", fontWeight: 700, color: row.is_critical && (row.percent_complete || 0) < 100 ? "#E24B4A" : "#cbd5e1", fontFamily: "monospace" }}>
                        {row.activity_code}
                      </div>
                      <div style={{ width: "280px", fontSize: "10px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>
                        {row.activity_name}
                      </div>
                      <div style={{ width: "35px", textAlign: "center", fontSize: "10px", color: "#e2e8f0", fontWeight: 600 }}>
                        {row.duration}d
                      </div>
                      <div style={{ width: "45px", textAlign: "center", fontSize: "9px", color: "#cbd5e1", fontFamily: "monospace" }}>
                        {row.early_start ? new Date(row.early_start).toLocaleDateString("en-GB", {day: '2-digit', month: '2-digit'}) : "-"}
                      </div>
                      <div style={{ width: "50px", textAlign: "center", fontSize: "9px", color: "#cbd5e1", fontFamily: "monospace" }}>
                        {row.early_finish ? new Date(row.early_finish).toLocaleDateString("en-GB", {day: '2-digit', month: '2-digit'}) : "-"}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: TIMELINE GRAPH */}
        <div ref={containerRef} onScroll={handleScroll} style={{ flexGrow: 1, overflowX: "auto", overflowY: "auto", position: "relative", background: "#0b0d16" }}>
          
          {/* Header Blocks */}
          <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", height: "24px", width: `${totalProjectDays * DAY_WIDTH}px`, position: "sticky", top: 0, zIndex: 30 }}>
            {timelineDays.map((day, index) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              let headerText = zoomLevel === "day" ? day.getDate() : zoomLevel === "week" ? (day.getDay() === 1 ? `W${day.getDate()}` : "") : (day.getDate() === 1 || index === 0 ? day.toLocaleString('default', { month: 'short' }) : "");

              return (
                <div key={index} style={{ width: `${DAY_WIDTH}px`, flexShrink: 0, textAlign: "center", fontSize: "9px", fontWeight: 700, color: isWeekend ? "#475569" : "#64748b", background: isWeekend ? "rgba(20, 24, 36, 0.4)" : "transparent", lineHeight: "24px", borderRight: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  {headerText}
                </div>
              );
            })}
          </div>

          {/* Logic Chart Workspace */}
          <div style={{ width: `${totalProjectDays * DAY_WIDTH}px`, position: "relative", height: `${displayRows.length * 24}px` }}>
            
            {todayMetrics.show && (
              <div style={{ position: "absolute", left: `${todayMetrics.offset}px`, top: 0, bottom: 0, width: "1px", background: "#facc15", zIndex: 12, pointerEvents: "none" }} />
            )}

            {/* SVG LINKS ENGINE */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: `${totalProjectDays * DAY_WIDTH}px`, height: `${displayRows.length * 24}px`, pointerEvents: "none", zIndex: 25 }}>
              <defs>
                <marker id="arr-standard" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4A90E2"/></marker>
                <marker id="arr-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#E24B4A"/></marker>
                <marker id="arr-ss" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1D9E75"/></marker>
              </defs>
              
              {displayRows.flatMap((row, currentIdx) => {
                if (row.type === "wbs" || !row.dependencies || !projectStart || !row.early_start) return [];
                
                return row.dependencies.map((dep, dIdx) => {
                  const targetIdx = displayRows.findIndex(x => x.type === "activity" && x.activity_code === dep.target_code);
                  if (targetIdx === -1 || !displayRows[targetIdx].early_start) return null;

                  const depType = dep.relationship_type || dep.type || "FS";
                  const durationCurrent = Number(row.duration || 1);
                  
                  const currentStartOffset = (new Date(row.early_start) - projectStart) / (1000 * 60 * 60 * 24);
                  const targetStartOffset = (new Date(displayRows[targetIdx].early_start) - projectStart) / (1000 * 60 * 60 * 24);
                  
                  const currentXStart = currentStartOffset * DAY_WIDTH;
                  const currentXEnd = currentXStart + (durationCurrent * DAY_WIDTH);
                  const targetXStart = targetStartOffset * DAY_WIDTH;

                  const currentY = (currentIdx * 24) + 12; 
                  const targetY = (targetIdx * 24) + 12;

                  const isCriticalChain = row.is_critical && displayRows[targetIdx].is_critical;
                  const strokeColor = getRelationColor(depType, isCriticalChain);
                  const markerId = isCriticalChain ? "url(#arr-critical)" : depType === "SS" ? "url(#arr-ss)" : "url(#arr-standard)";

                  let pathD = "";
                  if (depType === "SS") {
                    const linkX = Math.min(currentXStart, targetXStart) - 8;
                    pathD = `M ${currentXStart} ${currentY} L ${linkX} ${currentY} L ${linkX} ${targetY} L ${targetXStart} ${targetY}`;
                  } else if (depType === "FF") {
                    const currentXEndReal = currentXStart + (durationCurrent * DAY_WIDTH);
                    const targetXEndReal = targetStartOffset * DAY_WIDTH + (Number(displayRows[targetIdx].duration || 1) * DAY_WIDTH);
                    const linkX = Math.max(currentXEndReal, targetXEndReal) + 8;
                    pathD = `M ${currentXEndReal} ${currentY} L ${linkX} ${currentY} L ${linkX} ${targetY} L ${targetXEndReal} ${targetY}`;
                  } else {
                    const midX = currentXEnd + (targetXStart - currentXEnd) / 2;
                    pathD = `M ${currentXEnd} ${currentY} L ${midX} ${currentY} L ${midX} ${targetY} L ${targetXStart} ${targetY}`;
                  }

                  return (
                    <g key={`dep-${row.id}-${targetIdx}-${dIdx}`}>
                      <path 
                        d={pathD} 
                        fill="none" stroke={strokeColor} strokeWidth={1.2} strokeOpacity={0.85} 
                        markerEnd={markerId} 
                      />
                    </g>
                  );
                });
              })}
            </svg>

            {/* TIMELINE TRACK PLOTS */}
            {displayRows.map((row, idx) => {
              const isWBS = row.type === "wbs";

              if (isWBS) {
                let summaryBarLeft = 0;
                let summaryBarWidth = 0;
                const hasDates = row.wbs_start !== null && row.wbs_finish !== null && projectStartTs !== null;

                if (hasDates) {
                  const startOffset = (row.wbs_start - projectStartTs) / (1000 * 60 * 60 * 24);
                  const endOffset = (row.wbs_finish - projectStartTs) / (1000 * 60 * 60 * 24);
                  
                  summaryBarLeft = startOffset * DAY_WIDTH;
                  summaryBarWidth = (endOffset - startOffset + 1) * DAY_WIDTH;
                }

                return (
                  <div key={`wbs-track-${idx}`} style={{ height: "24px", width: "100%", background: getWBSBandStyle(), borderBottom: "1px solid #1e2330", position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                      {timelineDays.map((_, i) => (
                        <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid rgba(255,255,255,0.02)" }} />
                      ))}
                    </div>

                    {/* ✅ FIXED: INTERNAL-BOUNDING SOFTER SOILD PRIMAVERA SUMMARY BAR */}
                    {hasDates && summaryBarWidth > 0 && (
                      <div 
                        style={{
                          position: "absolute",
                          left: `${summaryBarLeft}px`,
                          width: `${summaryBarWidth}px`,
                          height: "8px",             // Sharp 8px thickness
                          top: "8px",                // Centered perfectly inside 24px track
                          display: "flex",           // Flexbox Container inside bounds
                          justifyContent: "space-between",
                          alignItems: "stretch",
                          zIndex: 20
                        }}
                      >
                        {/* Left Inward Chevron (Kept strictly inside width bounds) */}
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: "4px solid transparent",   
                            borderBottom: "4px solid transparent",
                            borderLeft: "10px solid #c7ced8", // Softer Primavera Gray
                            transform: "scaleX(-1)",           // Flip horizontally inward
                            flexShrink: 0
                          }}
                        />

                        {/* Middle Connecting Bar */}
                        <div 
                          style={{
                            flexGrow: 1,
                            background: "#c7ced8", // Softer Primavera Gray
                            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                          }}
                        />

                        {/* Right Inward Chevron (Kept strictly inside width bounds) */}
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: "4px solid transparent",   
                            borderBottom: "4px solid transparent",
                            borderLeft: "10px solid #c7ced8", // Softer Primavera Gray
                            flexShrink: 0
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              // एक्टिविटी बार रेंडरिंग
              if (!projectStart || !row.early_start) {
                return (
                  <div key={`act-track-${row.id || idx}`} style={{ height: "24px", display: "flex", alignItems: "center", borderBottom: "1px solid #1e2330", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                      {timelineDays.map((_, i) => (
                        <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid rgba(255, 255, 255, 0.04)" }} />
                      ))}
                    </div>
                  </div>
                );
              }
              
              const start = new Date(row.early_start);
              const bStart = new Date(row.baseline_start || row.early_start);
              
              const offset = (start - projectStart) / (1000 * 60 * 60 * 24);
              const bOffset = (bStart - projectStart) / (1000 * 60 * 60 * 24);

              const duration = Number(row.duration || 1);
              const bDuration = Number(row.baseline_duration || duration);

              const barWidth = duration * DAY_WIDTH;
              const barLeftMargin = offset * DAY_WIDTH;
              
              const bBarWidth = bDuration * DAY_WIDTH;
              const bBarLeftMargin = bOffset * DAY_WIDTH;

              const progressPercent = row.percent_complete || 0; 
              const barStyleMeta = getBarStyles(row);

              return (
                <div key={`act-track-${row.id || idx}`} style={{ height: "24px", display: "flex", alignItems: "center", borderBottom: "1px solid #1e2330", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                    {timelineDays.map((_, i) => (
                      <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid rgba(255, 255, 255, 0.04)" }} />
                    ))}
                  </div>

                  <div style={{ position: "absolute", left: 0, right: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ marginLeft: `${bBarLeftMargin}px`, width: `${bBarWidth}px`, height: "2px", background: "#475569", borderRadius: "1px", opacity: 0.3, marginBottom: "1px", zIndex: 11 }} />
                    
                    <div 
                      style={{
                        marginLeft: `${barLeftMargin}px`,
                        width: `${barWidth}px`,
                        height: "12px",
                        borderRadius: "2px",
                        background: barStyleMeta.background,
                        border: barStyleMeta.border,
                        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.25), ${barStyleMeta.boxShadow}`,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        zIndex: 11
                      }}
                    >
                      <div style={{ width: `${progressPercent}%`, height: "100%", background: "rgba(0, 0, 0, 0.15)", position: "absolute", left: 0, top: 0, zIndex: 1 }} />
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