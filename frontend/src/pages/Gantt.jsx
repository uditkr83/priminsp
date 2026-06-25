import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import API from "../api"; 
import { MdZoomIn, MdKeyboardArrowDown, MdKeyboardArrowRight, MdFilterList } from "react-icons/md";

// Core Tree Builder Engine
const buildWBSTree = (rows) => {
  const wbsMap = {};
  const roots = [];

  rows.forEach((row) => {
    if (!wbsMap[row.id]) {
      wbsMap[row.id] = {
        id: row.id, parent_wbs_id: row.parent_wbs_id, wbs_code: row.wbs_code, wbs_name: row.wbs_name, children: [], activities: []
      };
    }

    if (row.activity_id) {
      const alreadyExists = wbsMap[row.id].activities.some(act => act.id === row.activity_id);
      if (!alreadyExists) {
        wbsMap[row.id].activities.push({
          id: row.activity_id,
          activity_code: row.activity_code,
          activity_name: row.activity_name,
          duration: Number(row.duration || 0),
          early_start: row.early_start,
          early_finish: row.early_finish,
          late_start: row.late_start,
          late_finish: row.late_finish,
          baseline_start: row.baseline_start || row.early_start, // Fallback protection
          baseline_duration: Number(row.baseline_duration || row.duration || 1),
          total_float: Number(row.total_float || 0),
          is_critical: row.is_critical,
          percent_complete: Number(row.percent_complete || 0),
          dependencies: Array.isArray(row.dependencies) ? row.dependencies : []
        });
      }
    }
  });

  Object.values(wbsMap).forEach((node) => {
    node.activities.sort((a, b) => (a.activity_code || "").localeCompare(b.activity_code || ""));
    if (node.parent_wbs_id) {
      const parent = wbsMap[node.parent_wbs_id];
      if (parent) parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

// Bottom-Up Date Rollup Engine
function calculateWbsDates(node) {
  let minStartTs = null; let maxFinishTs = null;

  node.activities?.forEach((act) => {
    if (!act.early_start || !act.early_finish) return;
    const startTs = new Date(act.early_start).getTime();
    const finishTs = new Date(act.early_finish).getTime();
    if (!isNaN(startTs) && (minStartTs === null || startTs < minStartTs)) minStartTs = startTs;
    if (!isNaN(finishTs) && (maxFinishTs === null || finishTs > maxFinishTs)) maxFinishTs = finishTs;
  });

  node.children?.forEach((child) => {
    calculateWbsDates(child);
    if (child.summaryStart !== null && (minStartTs === null || child.summaryStart < minStartTs)) minStartTs = child.summaryStart;
    if (child.summaryFinish !== null && (maxFinishTs === null || child.summaryFinish > maxFinishTs)) maxFinishTs = child.summaryFinish;
  });

  node.summaryStart = minStartTs;
  node.summaryFinish = maxFinishTs;
}

export default function PrimaveraEngineDashboard() {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [zoomLevel, setZoomLevel] = useState("day"); 
  const [expanded, setExpanded] = useState({}); 
  
  // 3. FIX: Multi-State Criticality Filter ('ALL', 'CRITICAL', 'NEAR_CRITICAL')
  const [criticalFilterMode, setCriticalFilterMode] = useState("ALL");
  
  // DOM Sync Refs
  const leftTableContainerRef = useRef(null);
  const rightGanttContainerRef = useRef(null);
  const isScrollingRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await API.get("/api/gantt-hierarchy");
        setHierarchyData(res.data || []);
      } catch (err) { console.error(err); }
    };
    loadData();
  }, []);

  // 4. FIX: High-Performance Cross-Pane Bidirectional Scroll Sync Engine
  const handleScrollSync = useCallback((source, target) => {
    return () => {
      if (isScrollingRef.current && isScrollingRef.current !== source) return;
      isScrollingRef.current = source;
      if (target.current && source.current) {
        target.current.scrollTop = source.current.scrollTop;
      }
      // Reset locker state asynchronously
      clearTimeout(window.scrollSyncTimeout);
      window.scrollSyncTimeout = setTimeout(() => { isScrollingRef.current = null; }, 50);
    };
  }, []);

  const treeData = useMemo(() => {
    const tree = buildWBSTree(hierarchyData);
    tree.forEach(calculateWbsDates);
    return tree;
  }, [hierarchyData]);

  const toggleWBS = (wbsId) => {
    setExpanded(prev => ({ ...prev, [wbsId]: prev[wbsId] === false }));
  };

  const displayRows = useMemo(() => {
    let rows = [];
    const flatten = (nodes, level = 0, isVisible = true) => {
      nodes.forEach(node => {
        const wbsKey = `wbs-${node.id}`;
        const isExp = expanded[wbsKey] !== false;
        
        if (isVisible) {
          rows.push({ type: "wbs", level, id: wbsKey, ...node, isExpanded: isExp });
          
          if (isExp) {
            node.activities.forEach(act => {
              if (criticalFilterMode === "CRITICAL" && !act.is_critical) return;
              if (criticalFilterMode === "NEAR_CRITICAL" && (act.total_float > 5 || act.is_critical)) return;
              rows.push({ type: "activity", level: level + 1, ...act });
            });
          }
        }
        if (node.children.length > 0) flatten(node.children, level + 1, isVisible && isExp);
      });
    };
    flatten(treeData);
    return rows;
  }, [treeData, expanded, criticalFilterMode]);

  const rowLookupMap = useMemo(() => {
    const map = {};
    displayRows.forEach((row, idx) => {
      if (row.type === "activity") map[row.activity_code] = idx;
    });
    return map;
  }, [displayRows]);

  const DAY_WIDTH = zoomLevel === "month" ? 6 : zoomLevel === "week" ? 14 : 32;

  const projectBounds = useMemo(() => {
    let timestamps = [];
    displayRows.forEach(row => {
      if (row.type === "activity" && row.early_start) {
        timestamps.push(new Date(row.early_start).getTime(), new Date(row.early_finish).getTime());
      }
    });
    const valid = timestamps.filter(t => !isNaN(t) && t > 0);
    const minStart = valid.length ? new Date(Math.min(...valid)) : new Date();
    const maxFinish = valid.length ? new Date(Math.max(...valid)) : new Date();
    
    const start = new Date(minStart); start.setDate(start.getDate() - 7);
    const totalDays = Math.max(90, Math.ceil((maxFinish - start) / 86400000) + 30);
    return { start, totalDays };
  }, [displayRows]);

  const { start: projectStart, totalDays: totalProjectDays } = projectBounds;

  const timelineMetrics = useMemo(() => {
    const days = []; const months = [];
    if (!projectStart) return { days, months };
    for (let i = 0; i < totalProjectDays; i++) {
      const d = new Date(projectStart); d.setDate(projectStart.getDate() + i); days.push(d);
      const mKey = `${d.getMonth()}-${d.getFullYear()}`;
      if (months.length === 0 || months[months.length - 1].key !== mKey) {
        months.push({ key: mKey, label: d.toLocaleDateString('default', { month: 'long', year: 'numeric' }), count: 1 });
      } else { months[months.length - 1].count++; }
    }
    return { days, months };
  }, [projectStart, totalProjectDays]);

  return (
    <div style={{ background: "#090b11", width: "100%", height: "100vh", display: "flex", flexDirection: "column", color: "#e2e8f0", overflow: "hidden", fontFamily: "sans-serif" }}>
      
      {/* COMMAND CONTROL HEAD */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#0f121d", borderBottom: "1px solid #1e2330", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Primavera P6 Core <span style={{ color: "#64748b", fontWeight: 400 }}>| Advanced Planning Matrix</span></h1>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          {/* 3. FIX: Cycle Filters UI Button */}
          <div style={{ display: "flex", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "2px" }}>
            {["ALL", "CRITICAL", "NEAR_CRITICAL"].map(mode => (
              <button 
                key={mode} 
                onClick={() => setCriticalFilterMode(mode)}
                style={{
                  background: criticalFilterMode === mode ? (mode === "CRITICAL" ? "#E24B4A" : mode === "NEAR_CRITICAL" ? "#ef4444" : "#334155") : "transparent",
                  border: "none", color: "white", padding: "4px 10px", fontSize: "10px", fontWeight: 600, cursor: "pointer", borderRadius: "2px"
                }}
              >
                {mode.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "2px" }}>
            {["day", "week", "month"].map(z => (
              <button key={z} onClick={() => setZoomLevel(z)} style={{ background: zoomLevel === z ? "#334155" : "transparent", border: "none", color: "white", padding: "4px 8px", fontSize: "10px", cursor: "pointer" }}>{z.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CORE SPREADSHEET MATRIX LAYER */}
      <div style={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        
        {/* SYNCHRONIZED SIDE TABLE LIST */}
        <div 
          ref={leftTableContainerRef}
          onScroll={handleScrollSync(leftTableContainerRef, rightGanttContainerRef)}
          style={{ width: "450px", borderRight: "2px solid #1c202e", overflowY: "auto", flexShrink: 0, scrollbarWidth: "none" }}
        >
          <div style={{ height: "48px", background: "#090b11", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", fontSize: "10px", fontWeight: 700, color: "#475569", padding: "0 10px", position: "sticky", top: 0, zIndex: 110 }}>
            <div style={{ width: "110px" }}>WBS / ACT ID</div>
            <div style={{ flexGrow: 1 }}>ACTIVITY NAME</div>
            <div style={{ width: "45px", textAlign: "right" }}>TF (D)</div>
          </div>
          {displayRows.map((row, i) => (
            <div key={i} style={{ height: "34px", display: "flex", alignItems: "center", borderBottom: "1px solid #1e2330", background: row.type === "wbs" ? "#131b2d" : "transparent", fontSize: "11px", padding: "0 10px", boxSizing: "border-box" }}>
               {row.type === "wbs" ? (
                 <div style={{ display: "flex", alignItems: "center", marginLeft: row.level * 12, cursor: "pointer" }} onClick={() => toggleWBS(row.id)}>
                   {row.isExpanded ? <MdKeyboardArrowDown style={{color: "#64748b"}} /> : <MdKeyboardArrowRight style={{color: "#64748b"}} />}
                   <b style={{ color: "#cbd5e1", marginLeft: 4, fontFamily: "monospace" }}>{row.wbs_code}</b>
                   <span style={{ marginLeft: 8, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>{row.wbs_name}</span>
                 </div>
               ) : (
                 <div style={{ display: "flex", width: "100%", marginLeft: row.level * 12 }}>
                    <span style={{ width: "90px", color: row.is_critical ? "#E24B4A" : row.total_float <= 5 ? "#ef4444" : "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>{row.activity_code}</span>
                    <span style={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#94a3b8" }}>{row.activity_name}</span>
                    <span style={{ width: "35px", textAlign: "right", color: row.total_float === 0 ? "#E24B4A" : row.total_float <= 5 ? "#ef4444" : "#64748b", fontWeight: 600 }}>{row.total_float}</span>
                 </div>
               )}
            </div>
          ))}
        </div>

        {/* TIME GRAPH CANVASES */}
        <div 
          ref={rightGanttContainerRef} 
          onScroll={handleScrollSync(rightGanttContainerRef, leftTableContainerRef)}
          style={{ flexGrow: 1, overflow: "auto", position: "relative", background: "#0b0d16" }}
        >
          
          {/* TIMESCALE ROWS */}
          <div style={{ position: "sticky", top: 0, zIndex: 100, height: "48px", width: `${timelineMetrics.days.length * DAY_WIDTH}px`, flexShrink: 0 }}>
             <div style={{ display: "flex", height: "24px", background: "#090b11", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
               {timelineMetrics.months.map((m, idx) => (
                 <div key={idx} style={{ width: m.count * DAY_WIDTH, borderRight: "1px solid #1e2330", fontSize: "10px", textAlign: "center", lineHeight: "24px", color: "#f1f5f9", fontWeight: 600 }}>{m.label}</div>
               ))}
             </div>
             <div style={{ display: "flex", height: "24px", background: "#0f121d", borderBottom: "1px solid #1e2330" }}>
               {timelineMetrics.days.map((d, i) => (
                 <div key={i} style={{ width: DAY_WIDTH, borderRight: "1px solid #1e2330", fontSize: "9px", textAlign: "center", lineHeight: "24px", color: (d.getDay() === 0 || d.getDay() === 6) ? "#475569" : "#64748b" }}>{d.getDate()}</div>
               ))}
             </div>
          </div>

          <div style={{ position: "relative", width: `${timelineMetrics.days.length * DAY_WIDTH}px`, height: `${displayRows.length * 34}px` }}>
            
            {/* VECTOR GRAPHICS DEPENDENCY MAP GRAPH LAYER */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 50 }}>
              {/* 1. FIX: Integrated Hardware Marker Matrix Definitions for Dynamic Pathing Arrowheads */}
              <defs>
                <marker id="arrow-standard" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L8,5 L0,9 z" fill="#3b82f6"/></marker>
                <marker id="arrow-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L8,5 L0,9 z" fill="#E24B4A"/></marker>
                <marker id="arrow-ss" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L8,5 L0,9 z" fill="#1D9E75"/></marker>
                <marker id="arrow-ff" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L8,5 L0,9 z" fill="#fbbf24"/></marker>
              </defs>

              {displayRows.map((row, i) => {
                if (row.type !== "activity") return null;
                return (row.dependencies || []).map((dep, di) => {
                  const targetIdx = rowLookupMap[dep.target_code];
                  if (targetIdx === undefined) return null;

                  const targetRow = displayRows[targetIdx];
                  const relType = dep.relationship_type || "FS";
                  const lag = Number(dep.lag || 0);

                  const pStart = ((new Date(row.early_start) - projectStart) / 86400000) * DAY_WIDTH;
                  const pFinish = ((new Date(row.early_finish) - projectStart) / 86400000) * DAY_WIDTH;
                  const sStart = ((new Date(targetRow.early_start) - projectStart) / 86400000) * DAY_WIDTH;
                  const sFinish = ((new Date(targetRow.early_finish) - projectStart) / 86400000) * DAY_WIDTH;

                  const pY = i * 34 + 13; // Middle tracking line
                  const sY = targetIdx * 34 + 13;

                  let fromX = pFinish; let toX = sStart;
                  if (relType === "SS") { fromX = pStart; toX = sStart; }
                  else if (relType === "FF") { fromX = pFinish; toX = sFinish; }
                  else if (relType === "SF") { fromX = pStart; toX = sFinish; }

                  const isCriticalLink = row.is_critical && targetRow.is_critical;
                  const strokeColor = isCriticalLink ? "#E24B4A" : relType === "SS" ? "#1D9E75" : relType === "FF" ? "#fbbf24" : "#3b82f6";
                  const markerUrl = isCriticalLink ? "url(#arrow-critical)" : relType === "SS" ? "url(#arrow-ss)" : relType === "FF" ? "url(#arrow-ff)" : "url(#arrow-standard)";

                  const midX = fromX + (toX - fromX) / 2;
                  const pathD = `M ${fromX} ${pY} L ${midX} ${pY} L ${midX} ${sY} L ${toX} ${sY}`;

                  // 5. FIX: Micro-Text Annotation Injection Directly Onto Spatial Paths
                  const textX = midX + 4;
                  const textY = pY + (sY - pY) * 0.25 + 3;
                  const labelString = `${relType}${lag >= 0 ? "+" : ""}${lag}`;

                  return (
                    <g key={`${i}-${di}`}>
                      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={isCriticalLink ? 1.6 : 1.2} strokeOpacity={0.7} markerEnd={markerUrl} />
                      <text x={textX} y={textY} fill="#64748b" fontSize="8px" fontWeight="700" fontFamily="monospace" style={{ background: "#0b0d16" }}>{labelString}</text>
                    </g>
                  );
                });
              })}
            </svg>

            {/* TRACK PATTERN DOM ARRAY */}
            {displayRows.map((row, i) => {
              const isWBS = row.type === "wbs";
              
              if (isWBS) {
                if (!row.summaryStart || !row.summaryFinish) return <div key={i} style={{ height: "34px", background: "#131b2d", borderBottom: "1px solid #1e2330" }} />;
                const wbsLeft = ((row.summaryStart - projectStart.getTime()) / 86400000) * DAY_WIDTH;
                const wbsWidth = ((row.summaryFinish - row.summaryStart) / 86400000) * DAY_WIDTH;

                return (
                  <div key={i} style={{ height: "34px", borderBottom: "1px solid #1e2330", position: "relative", background: "#131b2d" }}>
                    <div style={{ position: "absolute", left: wbsLeft, width: Math.max(4, wbsWidth), height: "6px", top: "14px", background: "#cbd5e1" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderTop: "6px solid #cbd5e1", borderRight: "4px solid transparent" }} />
                      <div style={{ position: "absolute", right: 0, top: 0, width: 0, height: 0, borderTop: "6px solid #cbd5e1", borderLeft: "4px solid transparent" }} />
                    </div>
                  </div>
                );
              }

              // Activity Dimensions Calculations
              const startOffset = ((new Date(row.early_start) - projectStart) / 86400000) * DAY_WIDTH;
              const width = (row.duration || 1) * DAY_WIDTH;
              const floatWidth = (row.total_float || 0) * DAY_WIDTH;

              // 2. FIX: Multi-Tier Spatial Baseline Matrix Mapping Calculations
              const baselineOffset = ((new Date(row.baseline_start) - projectStart) / 86400000) * DAY_WIDTH;
              const baselineWidth = (row.baseline_duration || 1) * DAY_WIDTH;

              return (
                <div key={i} style={{ height: "34px", borderBottom: "1px solid #1e2330", position: "relative", boxSizing: "border-box" }}>
                  {/* Total Float Trail Tail */}
                  {floatWidth > 0 && (
                    <div style={{ position: "absolute", left: startOffset + width, width: floatWidth, height: "2px", top: "11px", borderBottom: "2px dotted #fbbf24", opacity: 0.6 }} />
                  )}
                  
                  {/* 2. FIX: Primary Early Schedule Bar Layer */}
                  <div style={{ 
                    position: "absolute", left: startOffset, width: width, height: "10px", top: "6px", 
                    background: row.percent_complete === 100 ? "#1D9E75" : row.is_critical ? "#E24B4A" : row.total_float <= 5 ? "#ef4444" : "#3b82f6",
                    borderRadius: "1px", zIndex: 10
                  }}>
                    <div style={{ width: `${row.percent_complete}%`, height: "100%", background: "rgba(0,0,0,0.3)" }} />
                  </div>

                  {/* 2. FIX: Secondary Static Target Baseline Shadow Bar Layer Below */}
                  <div style={{
                    position: "absolute", left: baselineOffset, width: baselineWidth, height: "4px", top: "19px",
                    background: "#475569", opacity: 0.45, borderRadius: "1px", zIndex: 5
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}