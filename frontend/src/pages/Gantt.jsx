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
    // एक्टिविटीज़ को पुश करने से पहले कोड के हिसाब से सॉर्ट करें
    node.activities.sort((a, b) => a.activity_code.localeCompare(b.activity_code));

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

export default function GanttDashboard() {
  const [scheduleData, setScheduleData] = useState([]);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [zoomLevel, setZoomLevel] = useState("day"); 
  
  // WBS Expand / Collapse स्टेट मैनेजमेंट
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

  // ट्री डेटा मेमोइज़ेशन
  const treeData = useMemo(() => {
    return buildWBSTree(hierarchyData);
  }, [hierarchyData]);

  // प्राइमावेरा क्लीन फिक्स्ड WBS रो स्टाइल
  const getWBSBandStyle = () => {
    return "rgba(30, 41, 59, 0.45)"; 
  };

  // रिकर्सिव फ्लैटनर जो सिर्फ एक्सपेंडेड नोड्स का डेटा ही रेंडर लिस्ट में डालेगा
  const flattenTree = useCallback((nodes, level = 0, isVisible = true) => {
    let rows = [];

    nodes.forEach((node) => {
      const wbsKey = `wbs-${node.id}`;
      const isNodeExpanded = expanded[wbsKey] !== false; 

      if (isVisible) {
        let wbsStart = null;
        let wbsFinish = null;

        const collectDates = (n) => {
          n.activities.forEach(a => {
            if (a.early_start) {
              const sTs = new Date(a.early_start).getTime();
              if (!wbsStart || sTs < wbsStart) wbsStart = sTs;
            }
            if (a.early_finish) {
              const fTs = new Date(a.early_finish).getTime();
              if (!wbsFinish || fTs > wbsFinish) wbsFinish = fTs;
            }
          });
          n.children.forEach(collectDates);
        };
        collectDates(node);

        // WBS रो पुश करें
        rows.push({
          type: "wbs",
          level,
          id: wbsKey,
          wbs_code: node.wbs_code,
          wbs_name: node.wbs_name,
          wbs_start: wbsStart ? new Date(wbsStart) : null,
          wbs_finish: wbsFinish ? new Date(wbsFinish) : null,
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

  // डिस्प्ले होने वाली फाइनल कस्टमाइज्ड रोज़
  const displayRows = useMemo(() => {
    return flattenTree(treeData);
  }, [treeData, flattenTree]);

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
    if (scheduleData.length === 0) return { start: null, totalDays: 60, timelineDays: [] };
    const allStarts = scheduleData.map(x => new Date(x.early_start).getTime());
    const allFinishes = scheduleData.map(x => new Date(x.early_finish).getTime());
    
    const minStart = new Date(Math.min(...allStarts));
    const maxFinish = new Date(Math.max(...allFinishes));
    
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
  }, [scheduleData]);

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

  const getBarColor = useCallback((row) => {
    const percent = row.percent_complete || 0;
    if (percent >= 100) return "#1D9E75"; 
    if (row.is_critical) return "#E24B4A"; 
    return "#378ADD"; 
  }, []);

  // ✅ री-डिफाइन्ड रिलेशन कलर्स हेल्पर (जो मिसिंग था)
  const getRelationColor = useCallback((type, isCriticalChain) => {
    if (isCriticalChain) return "#E24B4A"; 
    if (type === "SS") return "#1D9E75";   
    if (type === "FF") return "#ef9f27";   
    if (type === "SF") return "#a855f7";   
    return "#378ADD";                      
  }, []);

  return (
    <div style={{ background: "#090b11", width: "100%", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0", boxSizing: "border-box", overflow: "hidden" }}>
      
      {/* HEADER MATRIX CONTROLS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#0f121d", borderBottom: "1px solid #1e2330", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Advanced Planning & Control</div>
          <h1 style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Primavera P6 Logic Network Engine</h1>
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

      {/* MAIN SPREADSHEET FRAMEWORK */}
      <div style={{ background: "#0f121d", flexGrow: 1, overflow: "hidden", display: "flex", width: "100%" }}>
        
        {/* LEFT PANEL: GRID */}
        <div style={{ width: "370px", flexShrink: 0, borderRight: "2px solid #1c202e", background: "#0f121d", zIndex: 15, overflowX: "hidden" }}>
          <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", height: "24px", width: "100%", alignItems: "center", fontWeight: 700, fontSize: "9px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ width: "95px", paddingLeft: "10px" }}>WBS / Act ID</div>
            <div style={{ width: "165px" }}>Name</div>
            <div style={{ width: "30px", textAlign: "center" }}>Dur</div>
            <div style={{ width: "40px", textAlign: "center" }}>Start</div>
            <div style={{ width: "40px", textAlign: "center" }}>Fin</div>
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
                    <div style={{ display: "flex", width: "100%", alignItems: "center", paddingLeft: `${row.level * 10 + 4}px`, fontSize: "10px" }}>
                      <div onClick={() => toggleWBS(row.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: "2px" }}>
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
                      <div style={{ width: "95px", paddingLeft: `${row.level * 10 + 12}px`, fontSize: "10px", fontWeight: 700, color: row.is_critical && (row.percent_complete || 0) < 100 ? "#E24B4A" : "#cbd5e1", fontFamily: "monospace" }}>
                        {row.activity_code}
                      </div>
                      <div style={{ width: "165px", fontSize: "10px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "5px" }}>
                        {row.activity_name}
                      </div>
                      <div style={{ width: "30px", textAlign: "center", fontSize: "10px", color: "#e2e8f0", fontWeight: 600 }}>
                        {row.duration}d
                      </div>
                      <div style={{ width: "40px", textAlign: "center", fontSize: "9px", color: "#64748b", fontFamily: "monospace" }}>
                        {row.early_start ? new Date(row.early_start).toLocaleDateString("en-GB", {day: '2-digit', month: '2-digit'}) : "-"}
                      </div>
                      <div style={{ width: "40px", textAlign: "center", fontSize: "9px", color: "#64748b", fontFamily: "monospace" }}>
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
          
          {/* Timeline Date Header Blocks */}
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

          {/* Logic Chart Workspace - FIXED HEIGHT SYNTAX */}
          <div style={{ width: `${totalProjectDays * DAY_WIDTH}px`, position: "relative", height: `${displayRows.length * 24}px` }}>
            
            {todayMetrics.show && (
              <div style={{ position: "absolute", left: `${todayMetrics.offset}px`, top: 0, bottom: 0, width: "1px", background: "#facc15", zIndex: 12, pointerEvents: "none" }} />
            )}

            {/* SVG RELATIONSHIP PATH LINES */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: `${totalProjectDays * DAY_WIDTH}px`, height: `${displayRows.length * 24}px`, pointerEvents: "none", zIndex: 25 }}>
              <defs>
                <marker id="arr-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#378ADD"/></marker>
                <marker id="arr-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#E24B4A"/></marker>
              </defs>
              
              {displayRows.flatMap((row, currentIdx) => {
                if (row.type === "wbs" || !row.dependencies || !projectStart) return [];
                
                return row.dependencies.map((dep, dIdx) => {
                  const targetIdx = displayRows.findIndex(x => x.type === "activity" && x.activity_code === dep.target_code);
                  if (targetIdx === -1) return null;

                  const depType = dep.relationship_type || dep.type || "FS";
                  const durationCurrent = Number(row.duration || 1);
                  const currentOffset = (new Date(row.early_start) - projectStart) / (1000 * 60 * 60 * 24);
                  const targetOffset = (new Date(displayRows[targetIdx].early_start) - projectStart) / (1000 * 60 * 60 * 24);

                  const currentXStart = currentOffset * DAY_WIDTH;
                  const currentXEnd = currentXStart + (durationCurrent * DAY_WIDTH);
                  const targetXStart = targetOffset * DAY_WIDTH;

                  const currentY = (currentIdx * 24) + 12; 
                  const targetY = (targetIdx * 24) + 12;

                  const isCriticalChain = row.is_critical && displayRows[targetIdx].is_critical;
                  const color = getRelationColor(depType, isCriticalChain);
                  const midX = currentXEnd + (targetXStart - currentXEnd) / 2;

                  return (
                    <g key={`dep-${row.id}-${targetIdx}-${dIdx}`}>
                      <path 
                        d={`M ${currentXEnd} ${currentY} L ${midX} ${currentY} L ${midX} ${targetY} L ${targetXStart} ${targetY}`} 
                        fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.8} 
                        markerEnd={isCriticalChain ? "url(#arr-critical)" : "url(#arr-blue)"} 
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
                const hasDates = row.wbs_start && row.wbs_finish && projectStart;

                if (hasDates) {
                  const startOffset = (row.wbs_start - projectStart) / (1000 * 60 * 60 * 24);
                  const endOffset = (row.wbs_finish - projectStart) / (1000 * 60 * 60 * 24);
                  summaryBarLeft = startOffset * DAY_WIDTH;
                  summaryBarWidth = Math.max(4, (endOffset - startOffset) * DAY_WIDTH);
                }

                return (
                  <div key={`wbs-track-${idx}`} style={{ height: "24px", width: "100%", background: getWBSBandStyle(), borderBottom: "1px solid #1e2330", position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                      {timelineDays.map((_, i) => (
                        <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid rgba(255,255,255,0.02)" }} />
                      ))}
                    </div>

                    {hasDates && (
                      <div 
                        style={{
                          position: "absolute",
                          left: `${summaryBarLeft}px`,
                          width: `${summaryBarWidth}px`,
                          height: "6px",
                          background: "#000000",
                          border: "1px solid #475569",
                          borderRadius: "1px",
                          zIndex: 11
                        }}
                      />
                    )}
                  </div>
                );
              }

              if (!projectStart) return null;
              
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
              const barColor = getBarColor(row);

              return (
                <div key={`act-track-${row.id || idx}`} style={{ height: "24px", display: "flex", alignItems: "center", borderBottom: "1px solid #1e2330", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex" }}>
                    {timelineDays.map((_, i) => (
                      <div key={i} style={{ width: `${DAY_WIDTH}px`, height: "100%", borderRight: "1px solid rgba(255, 255, 255, 0.04)" }} />
                    ))}
                  </div>

                  <div style={{ position: "absolute", left: 0, right: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ marginLeft: `${bBarLeftMargin}px`, width: `${bBarWidth}px`, height: "2px", background: "#475569", borderRadius: "1px", opacity: 0.4, marginBottom: "1px", zIndex: 11 }} />
                    <div style={{ marginLeft: `${barLeftMargin}px`, width: `${barWidth}px`, height: "11px", borderRadius: "1px", background: "#131722", border: `1px solid ${row.is_critical && progressPercent < 100 ? "rgba(226, 75, 74, 0.4)" : "rgba(255,255,255,0.04)"}`, cursor: "pointer", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", zIndex: 11 }}>
                      <div style={{ width: `${progressPercent}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}, rgba(0,0,0,0.2))`, position: "absolute", left: 0, top: 0, zIndex: 1 }} />
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