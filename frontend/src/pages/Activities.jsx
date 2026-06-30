import { useEffect, useState, useRef } from "react";
import API from "../api"; 
import {
  MdDelete,
  MdSearch,
  MdAddCircle,
  MdEdit,
  MdLock,
  MdFilterList
} from "react-icons/md";

// MASTER SCHEMA CONFIGURATION (Single Source of Truth)
const BASE_COLUMNS_CONFIG = [
  { id: "id", label: "ID", defaultWidth: 60, frozen: true, group: "Structure", align: "left", required: true, sortable: true },
  { id: "wbs_code", label: "WBS Code", defaultWidth: 160, frozen: true, group: "Structure", align: "left", required: true, sortable: true },
  { id: "activity_code", label: "Activity Code", defaultWidth: 120, frozen: true, group: "Activity Definition & Logic", align: "left", required: true, sortable: true },
  { id: "constraint", label: "Constraint", defaultWidth: 100, frozen: true, group: "Activity Definition & Logic", align: "left", sortable: true, sortKey: "constraint_type" },
  { id: "activity_name", label: "Activity Name", defaultWidth: 240, frozen: true, group: "Activity Definition & Logic", align: "left", required: true, borderRight: "1px solid #1e2330", sortable: true },
  { id: "duration", label: "Original", defaultWidth: 80, frozen: false, group: "Durations", align: "center", sortable: true },
  { id: "remaining_duration", label: "Remain", defaultWidth: 80, frozen: false, group: "Durations", align: "center", borderRight: "1px solid #1e2330", sortable: true },
  { id: "start_date", label: "Start", defaultWidth: 110, frozen: false, group: "Dates", align: "center", sortable: true },
  { id: "finish_date", label: "Finish", defaultWidth: 110, frozen: false, group: "Dates", align: "center", borderRight: "1px solid #1e2330", sortable: true },
  { id: "predecessors", label: "Predecessors", defaultWidth: 130, frozen: false, group: "Logic Relations", align: "left" },
  { id: "successors", label: "Successors", defaultWidth: 130, frozen: false, group: "Logic Relations", align: "left", borderRight: "1px solid #1e2330" },
  { id: "progress", label: "Progress %", defaultWidth: 150, frozen: false, group: "Control Status", align: "left", sortable: true, sortKey: "percent_complete" },
  { id: "status", label: "Status", defaultWidth: 110, frozen: false, group: "Control Status", align: "center", sortable: true },
  { id: "action", label: "Action", defaultWidth: 90, frozen: false, group: "Control Status", align: "center" }
];

export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("ALL");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeTab, setActiveTab] = useState("General");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [lastTaskDuration, setLastTaskDuration] = useState("5");

  // 1. SPLITTER LAYOUT PERSISTENCE ENGINE
  const [gridWidthPercent, setGridWidthPercent] = useState(() => {
    const saved = localStorage.getItem("activity-grid-width");
    return saved ? parseFloat(saved) : 68;
  });
  const isResizingRef = useRef(false);
  const workspaceRef = useRef(null);
  const tableRef = useRef(null); 
  
  // 3. SORTING ALGORITHM STATES
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const [form, setForm] = useState({
    wbs_id: "", activity_code: "", activity_name: "", activity_type: "Task", duration: "5",
    status: "Not Started", percent_complete: "0", start_date: "", finish_date: "",
    constraint_type: "", constraint_date: ""
  });

  // INITIALIZE COLUMN WIDTHS ENGINE
  const [columnsWidths, setColumnsWidths] = useState(() => {
    const saved = localStorage.getItem("activity-column-widths");
    if (saved) return JSON.parse(saved);
    const initial = {};
    BASE_COLUMNS_CONFIG.forEach(col => { initial[col.id] = col.defaultWidth; });
    return initial;
  });

  // INITIALIZE PERSISTENT COLUMN VISIBILITY
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("activity-visible-columns");
    if (saved) {
      const parsed = JSON.parse(saved);
      BASE_COLUMNS_CONFIG.forEach(col => { if (col.required) parsed[col.id] = true; });
      return parsed;
    }
    const initial = {};
    BASE_COLUMNS_CONFIG.forEach(col => { initial[col.id] = true; });
    return initial;
  });

  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("activity-column-widths", JSON.stringify(columnsWidths));
  }, [columnsWidths]);

  useEffect(() => {
    localStorage.setItem("activity-visible-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // PERSIST SPLITTER LAYOUT CHANGES DYNAMICALLY
  useEffect(() => {
    localStorage.setItem("activity-grid-width", gridWidthPercent);
  }, [gridWidthPercent]);

  const columnsConfig = BASE_COLUMNS_CONFIG.filter(col => visibleColumns[col.id]);

  let currentOffset = 0;
  const columns = columnsConfig.map((col) => {
    const calculatedLeft = col.frozen ? currentOffset : undefined;
    const runtimeWidth = columnsWidths[col.id] || col.defaultWidth;
    if (col.frozen) {
      currentOffset += runtimeWidth;
    }
    return { ...col, width: runtimeWidth, leftOffset: calculatedLeft };
  });

  const groupHeaders = [];
  columns.forEach((col) => {
    const lastGroup = groupHeaders[groupHeaders.length - 1];
    if (lastGroup && lastGroup.name === col.group) {
      lastGroup.colSpan += 1;
    } else {
      groupHeaders.push({
        name: col.group,
        colSpan: 1,
        color: col.group === "Structure" ? "#64748b" : col.group === "Activity Definition & Logic" ? "#378ADD" : col.group === "Durations" ? "#10b981" : col.group === "Dates" ? "#e2e8f0" : col.group === "Logic Relations" ? "#fbbf24" : "#64748b"
      });
    }
  });

  // CORE SORTING PIPELINE TRIGGER
  const handleSort = (col) => {
    if (!col.sortable) return;
    const targetKey = col.sortKey || col.id;
    
    setSortConfig((prev) => {
      if (prev.key === targetKey && prev.direction === "ASC") {
        return { key: targetKey, direction: "DESC" };
      }
      if (prev.key === targetKey && prev.direction === "DESC") {
        return { key: null, direction: null };
      }
      return { key: targetKey, direction: "ASC" };
    });
  };

  // ZERO-LAG HIGH-PERFORMANCE COL RESIZER
  const handleResizeStart = (id, targetIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tableRef.current) return;
    
    const startX = e.clientX;
    const startWidth = columnsWidths[id];
    let sessionWidth = startWidth;

    const colGroupElements = tableRef.current.querySelectorAll("colgroup col");
    const headerThElements = tableRef.current.querySelectorAll("thead tr:nth-child(2) th");
    const targetColGroup = colGroupElements[targetIndex];
    const targetTh = headerThElements[targetIndex];

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      sessionWidth = Math.max(60, startWidth + deltaX);
      if (targetColGroup) targetColGroup.style.width = `${sessionWidth}px`;
      if (targetTh) {
        targetTh.style.width = `${sessionWidth}px`;
        targetTh.style.minWidth = `${sessionWidth}px`;
        targetTh.style.maxWidth = `${sessionWidth}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "unset";
      setColumnsWidths(prev => ({ ...prev, [id]: sessionWidth }));
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // P6 WORKSPACE SPLITTER EVENT CONTROLLERS
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const workspaceRect = workspaceRef.current.getBoundingClientRect();
      const currentXInsideWorkspace = e.clientX - workspaceRect.left;
      let newPercent = (currentXInsideWorkspace / workspaceRect.width) * 100;
      if (newPercent < 25) newPercent = 25;
      if (newPercent > 85) newPercent = 85;
      setGridWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.userSelect = "unset";
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [activitiesRes, relationshipsRes] = await Promise.all([
        API.get("/activities"),
        API.get("/relationships")
      ]);

      const rawActivities = activitiesRes.data || [];
      const relationships = relationshipsRes.data || [];

      const enrichedActivities = rawActivities.map(activity => {
        const predecessors = relationships
          .filter(r => r.successor_activity_id === activity.id)
          .map(r => ({ type: "PRED", target_code: r.predecessor_code, relationship_type: r.relationship_type }));

        const successors = relationships
          .filter(r => r.predecessor_activity_id === activity.id)
          .map(r => ({ type: "SUCC", target_code: r.successor_code, relationship_type: r.relationship_type }));

        return { ...activity, dependencies: [...predecessors, ...successors] };
      });

      setActivities(enrichedActivities);
      if (enrichedActivities.length > 0) {
        if (!selectedActivity) {
          setSelectedActivity(enrichedActivities[0]);
        } else {
          const updatedSelection = enrichedActivities.find(a => a.id === selectedActivity.id);
          setSelectedActivity(updatedSelection || enrichedActivities[0]);
        }
      }
    } catch (err) {
      console.error("Error matrix layout loading exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrimaveraDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const openEditModal = (activity, e) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(activity.id);
    const targetDuration = activity.duration ?? "5";
    if (activity.activity_type === "Task" || !activity.activity_type) {
      setLastTaskDuration(String(targetDuration));
    }

    setForm({
      wbs_id: activity.wbs_id || "", activity_code: activity.activity_code || "", activity_name: activity.activity_name || "",
      activity_type: activity.activity_type || "Task", duration: String(targetDuration), status: activity.status || "Not Started",
      percent_complete: activity.percent_complete || "0", start_date: activity.start_date ? activity.start_date.split("T")[0] : "",
      finish_date: activity.finish_date ? activity.finish_date.split("T")[0] : "", constraint_type: activity.constraint_type || "",
      constraint_date: activity.constraint_date ? activity.constraint_date.split("T")[0] : ""
    });
    setIsModalOpen(true);
  };

  const deleteActivity = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this task logic node?")) return;
    try {
      await API.delete(`/activities/${id}`);
      if (selectedActivity?.id === id) setSelectedActivity(null);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Error executing delete lifecycle.");
    }
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    const requiresDate = ["SNET", "SNLT", "FNET", "FNLT", "MSO", "MFO"].includes(form.constraint_type);
    if (requiresDate && !form.constraint_date) {
      alert(`Validation Error: Constraint '${form.constraint_type}' requires a hard Constraint Date.`);
      return;
    }

    try {
      if (isEditMode) {
        await API.put(`/activities/${editingId}`, form);
      } else {
        await API.post("/activities", form);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setForm({
        wbs_id: "", activity_code: "", activity_name: "", activity_type: "Task", duration: "5",
        status: "Not Started", percent_complete: "0", start_date: "", finish_date: "",
        constraint_type: "", constraint_date: ""
      });
      setLastTaskDuration("5");
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || "Error compiling database payload.");
    }
  };

  const renderConstraintBadge = (type) => {
    if (!type || type === "ASAP") return <span style={{ color: "#475569", fontSize: "11px" }}>None</span>;
    const isHard = ["MSO", "MFO"].includes(type);
    const bg = isHard ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)";
    const color = isHard ? "#ef4444" : "#f59e0b";
    return (
      <span style={{ background: bg, color: color, padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: `1px solid ${color}30`, fontFamily: "monospace" }}>
        {isHard ? "🔵 " : "🟡 "}{type}
      </span>
    );
  };

  // DATA PROCESSING: 1st RUNWAY (FILTERING ENGINE)
  const filteredActivities = activities.filter((act) => {
    const matchesSearch = 
      act.activity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.wbs_code?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === "CONSTRAINED") return act.constraint_type && act.constraint_type !== "ASAP";
    if (filterMode === "CRITICAL") return act.is_critical && (act.percent_complete || 0) < 100;
    return true;
  });

  // DATA PROCESSING: 2nd RUNWAY (ADVANCED SORTING ALGORITHM)
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    // Numeric Sorting Criteria Check
    if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && valA !== "" && valB !== "") {
      return sortConfig.direction === "ASC" 
        ? Number(valA) - Number(valB) 
        : Number(valB) - Number(valA);
    }

    // Alpha-Numeric Comparison Fallback
    return sortConfig.direction === "ASC"
      ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
      : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div style={{ background: "#090b11", minHeight: "100vh", padding: "16px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#e2e8f0", boxSizing: "border-box", overflow: "hidden" }}>
      
      {/* HEADER CONTROLS INTERFACE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", background: "#0f121d", padding: "16px 20px", borderBottom: "1px solid #1e2330", margin: "-16px -24px 16px -24px" }}>
        <div>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Advanced Planning & Control Matrix</div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>Project Activities Master Spreadsheet</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", padding: "0 8px", height: "32px" }}>
            <MdFilterList style={{ color: "#64748b" }} />
            <select 
              value={filterMode} 
              onChange={(e) => setFilterMode(e.target.value)}
              style={{ background: "transparent", border: "none", color: "#cbd5e1", fontSize: "12px", outline: "none", cursor: "pointer", fontWeight: 500 }}
            >
              <option value="ALL" style={{ background: "#0f121d" }}>Show: All Activities</option>
              <option value="CONSTRAINED" style={{ background: "#0f121d" }}>Show: Only Constrained</option>
              <option value="CRITICAL" style={{ background: "#0f121d" }}>Show: Only Critical</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "6px 12px", width: "240px" }}>
            <MdSearch style={{ color: "#475569", fontSize: "16px" }} />
            <input type="text" placeholder="Search code, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", width: "100%" }} />
          </div>

          {/* DYNAMIC POPUP COLUMNS CONFIGURATOR */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setIsColMenuOpen(!isColMenuOpen)} 
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0f1117", border: "1px solid #1e2330", color: "#cbd5e1", padding: "0 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", height: "32px" }}
            >
              Columns
            </button>
            {isColMenuOpen && (
              <>
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setIsColMenuOpen(false)} />
                <div style={{ position: "absolute", right: 0, top: "38px", background: "#0f121d", border: "1px solid #1e2330", borderRadius: "4px", padding: "12px", width: "230px", zIndex: 1000, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", borderBottom: "1px solid #1e2330", paddingBottom: "4px" }}>
                    Visible Columns
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "280px", overflowY: "auto" }}>
                    {BASE_COLUMNS_CONFIG.map((c) => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: c.required ? "#475569" : "#cbd5e1", cursor: c.required ? "not-allowed" : "pointer", userSelect: "none" }}>
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[c.id]} 
                          disabled={c.required} 
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, [c.id]: e.target.checked }))}
                          style={{ accentColor: "#378ADD", cursor: c.required ? "not-allowed" : "pointer" }}
                        />
                        {c.label} {c.required && <span style={{ fontSize: "9px", color: "#475569" }}>(Locked)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button onClick={() => { 
            setForm({
              wbs_id: "", activity_code: "", activity_name: "", activity_type: "Task", duration: "5",
              status: "Not Started", percent_complete: "0", start_date: "", finish_date: "",
              constraint_type: "", constraint_date: ""
            });
            setLastTaskDuration("5");
            setIsEditMode(false); 
            setIsModalOpen(true); 
          }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#378ADD", border: "none", color: "white", padding: "8px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            <MdAddCircle size={16} /> Add Activity
          </button>
        </div>
      </div>

      {/* WORKSPACE FLEX DATA SPREADSHEET MATRIX */}
      <div 
        ref={workspaceRef}
        style={{ display: "flex", flexDirection: "row", width: "100%", height: "calc(100vh - 120px)", overflow: "hidden", position: "relative" }}
      >
        <div style={{ width: selectedActivity ? `${gridWidthPercent}%` : "100%", minWidth: "20%", background: "#0f1117", border: "1px solid #1e2330", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
          <div style={{ padding: "8px 16px", background: "#090b11", borderBottom: "1px solid #1e2330", fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", flexShrink: 0 }}>
            Spreadsheet Grid ({sortedActivities.length} Records Mapped)
          </div>
          
          <div style={{ flexGrow: 1, overflowX: "auto", overflowY: "auto", position: "relative", width: "100%", height: "100%" }}>
            <table ref={tableRef} style={{ width: "max-content", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                {columns.map((col) => (
                  <col key={col.id} style={{ width: `${col.width}px` }} />
                ))}
              </colgroup>
              
              <thead style={{ position: "sticky", top: 0, zIndex: 150, background: "#090b11" }}>
                <tr style={{ borderBottom: "1px solid #1e2330", height: "24px", background: "#0c0f18" }}>
                  {groupHeaders.map((group, idx) => (
                    <th key={idx} colSpan={group.colSpan} style={{ background: "#0c0f18", borderRight: "1px solid #1e2330", fontSize: "9px", color: group.color, textTransform: "uppercase", padding: "0 12px", textAlign: "left" }}>
                      {group.name}
                    </th>
                  ))}
                </tr>

                <tr style={{ borderBottom: "2px solid #1e2330", height: "28px", background: "#090b11" }}>
                  {columns.map((col, idx) => {
                    const currentTargetKey = col.sortKey || col.id;
                    const isSortedThis = sortConfig.key === currentTargetKey;
                    
                    return (
                      <th 
                        key={col.id}
                        onClick={() => handleSort(col)}
                        style={{ 
                          padding: "0 12px", fontSize: "9px", 
                          color: col.frozen ? (col.id === "id" || col.id === "wbs_code" ? "#475569" : "#378ADD") : "#475569", 
                          textAlign: col.align, borderRight: col.borderRight,
                          position: col.frozen ? "sticky" : "relative", 
                          left: col.frozen ? `${col.leftOffset}px` : undefined, 
                          zIndex: col.frozen ? 120 : "auto", background: "#090b11",
                          width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`,
                          cursor: col.sortable ? "pointer" : "default",
                          userSelect: "none"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: col.align === "center" ? "center" : "flex-start", gap: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "4px" }}>
                          <span>{col.label}</span>
                          {col.sortable && (
                            <span style={{ fontSize: "8px", color: isSortedThis ? "#378ADD" : "#334155" }}>
                              {isSortedThis ? (sortConfig.direction === "ASC" ? "▲" : "▼") : "▲"}
                            </span>
                          )}
                        </div>
                        <div
                          onMouseDown={(e) => handleResizeStart(col.id, idx, e)}
                          onClick={(e) => e.stopPropagation()} // Stop sort triggers on border resize clicks
                          style={{ position: "absolute", top: 0, right: 0, width: "5px", height: "100%", cursor: "col-resize", zIndex: 160, background: "transparent" }}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {sortedActivities.map((activity, index) => {
                  const isCritical = activity.is_critical && (activity.percent_complete || 0) < 100;
                  const isSelected = selectedActivity?.id === activity.id;
                  const isConstrained = activity.constraint_type && activity.constraint_type !== "ASAP";
                  const rawDeps = activity.dependencies || [];
                  const predStr = rawDeps.filter(d => d.type === "PRED").map(d => d.target_code).join(", ") || "-";
                  const succStr = rawDeps.filter(d => d.type === "SUCC").map(d => d.target_code).join(", ") || "-";
                  
                  return (
                    <tr 
                      key={activity.id || index} 
                      onClick={() => setSelectedActivity(activity)}
                      style={{ borderBottom: "1px solid #1e2330", height: "30px", cursor: "pointer", background: isSelected ? "rgba(55, 138, 221, 0.12)" : isCritical ? "rgba(226, 75, 74, 0.03)" : "transparent" }}
                    >
                      {columns.map((col) => {
                        const cellStyle = {
                          padding: "0 12px", fontSize: "11px", textAlign: col.align, borderRight: col.borderRight,
                          position: col.frozen ? "sticky" : "static", left: col.frozen ? `${col.leftOffset}px` : undefined,
                          background: isSelected ? "#121926" : "#0f1117", zIndex: col.frozen ? 10 : "auto",
                          width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`
                        };

                        if (col.id === "id") return <td key={col.id} style={{ ...cellStyle, color: "#475569", fontFamily: "monospace" }}>#{activity.id}</td>;
                        if (col.id === "wbs_code") return <td key={col.id} style={{ ...cellStyle, fontWeight: 700, color: "#cbd5e1" }}>{activity.wbs_code || `WBS-${activity.wbs_id}`}</td>;
                        if (col.id === "activity_code") return <td key={col.id} style={{ ...cellStyle, fontSize: "12px", fontWeight: 700, color: isCritical ? "#E24B4A" : "#378ADD", fontFamily: "monospace" }}>{activity.activity_code}</td>;
                        if (col.id === "constraint") return <td key={col.id} style={cellStyle}>{renderConstraintBadge(activity.constraint_type)}</td>;
                        if (col.id === "activity_name") {
                          return (
                            <td key={col.id} style={{ ...cellStyle, fontSize: "12px", fontWeight: 500, color: "#e2e8f0", overflow: "visible", boxShadow: isSelected ? "inset 4px 0 0 #378ADD" : "none" }}>
                              {isConstrained && <MdLock style={{ color: "#fbbf24", marginRight: "4px", verticalAlign: "middle" }} title={`Constrained via ${activity.constraint_type}`} />}
                              <span style={{ verticalAlign: "middle" }}>{activity.activity_name}</span>
                              {activity.activity_type && activity.activity_type !== "Task" && (
                                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, background: activity.activity_type === "Start Milestone" ? "#2563eb" : "#9333ea", color: "#fff", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                  <span>◆</span> {activity.activity_type === "Start Milestone" ? "SM" : "FM"}
                                </span>
                              )}
                            </td>
                          );
                        }
                        if (col.id === "duration") return <td key={col.id} style={{ ...cellStyle, color: "#10b981", fontFamily: "monospace" }}>{activity.duration}d</td>;
                        if (col.id === "remaining_duration") return <td key={col.id} style={{ ...cellStyle, color: "#f97316", fontFamily: "monospace" }}>{activity.remaining_duration ?? activity.duration}d</td>;
                        if (col.id === "start_date") return <td key={col.id} style={{ ...cellStyle, fontFamily: "monospace" }}>{formatPrimaveraDate(activity.start_date)}</td>;
                        if (col.id === "finish_date") return <td key={col.id} style={{ ...cellStyle, fontFamily: "monospace" }}>{formatPrimaveraDate(activity.finish_date)}</td>;
                        if (col.id === "predecessors") return <td key={col.id} style={{ ...cellStyle, color: "#fbbf24" }}>{predStr}</td>;
                        if (col.id === "successors") return <td key={col.id} style={{ ...cellStyle, color: "#fbbf24" }}>{succStr}</td>;
                        if (col.id === "progress") {
                          return (
                            <td key={col.id} style={cellStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ width: "100px", minWidth: "60px", background: "#1e293b", height: "4px", overflow: "hidden" }}>
                                  <div style={{ width: `${activity.percent_complete || 0}%`, background: "#3b82f6", height: "100%" }} />
                                </div>
                                <span style={{ fontSize: "10px", color: "#38bdf8", fontFamily: "monospace" }}>{Number(activity.percent_complete || 0).toFixed(0)}%</span>
                              </div>
                            </td>
                          );
                        }
                        if (col.id === "status") return <td key={col.id} style={cellStyle}><span style={{ fontSize: "10px", fontWeight: 600, color: activity.status === "Completed" ? "#34d399" : "#fbbf24" }}>{activity.status || "Not Started"}</span></td>;
                        if (col.id === "action") {
                          return (
                            <td key={col.id} style={cellStyle}>
                              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                                <button onClick={(e) => openEditModal(activity, e)} style={{ background: "transparent", border: "none", color: "#378ADD", cursor: "pointer" }}><MdEdit size={12} /></button>
                                <button onClick={(e) => deleteActivity(activity.id, e)} style={{ background: "transparent", border: "none", color: "#E24B4A", cursor: "pointer" }}><MdDelete size={12} /></button>
                              </div>
                            </td>
                          );
                        }
                        return null;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AXIS INTERACTIVE DRAG HANDLE */}
        {selectedActivity && (
          <div 
            onMouseDown={() => { isResizingRef.current = true; document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }}
            style={{ width: "6px", cursor: "col-resize", background: "#1e2330", transition: "background 0.2s", position: "relative", zIndex: 200 }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#378ADD"}
            onMouseLeave={(e) => { if(!isResizingRef.current) e.currentTarget.style.background = "#1e2330"; }}
          />
        )}

        {/* SIDE DETAILS COMPARTMENT MODULE */}
        {selectedActivity && (
          <div style={{ width: `${100 - gridWidthPercent}%`, minWidth: "15%", background: "#0f121d", border: "1px solid #1e2330", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", boxSizing: "border-box" }}>
            <div style={{ padding: "12px 16px", background: "#090b11", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{selectedActivity.activity_code} Details</span>
              <button onClick={(e) => openEditModal(selectedActivity, e)} style={{ background: "#1e293b", border: "none", color: "#e2e8f0", padding: "4px 8px", borderRadius: "3px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}><MdEdit size={12} /> Edit</button>
            </div>

            <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", flexShrink: 0 }}>
              {["General", "Status"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#0f121d" : "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #378ADD" : "2px solid transparent", color: activeTab === tab ? "#378ADD" : "#64748b", padding: "8px 16px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}>{tab}</button>
              ))}
            </div>

            <div style={{ flexGrow: 1, padding: "16px", overflowY: "auto", fontSize: "12px" }}>
              {activeTab === "General" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Name Scope</label>
                    <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#e2e8f0", wordBreak: "break-all" }}>{selectedActivity.activity_name}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Type</label>
                    <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#cbd5e1", fontWeight: 700 }}>{selectedActivity.activity_type || "Task"}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Constraint Configuration</label>
                    <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#fbbf24", fontFamily: "monospace" }}>
                      Type: {selectedActivity.constraint_type || "None (ASAP)"} <br />
                      Date: {selectedActivity.constraint_date ? formatPrimaveraDate(selectedActivity.constraint_date) : "-"}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "Status" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Project Dates</label>
                    <div style={{ color: "#cbd5e1" }}>Start: {formatPrimaveraDate(selectedActivity.start_date)}</div>
                    <div style={{ color: "#cbd5e1" }}>Finish: {formatPrimaveraDate(selectedActivity.finish_date)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* INTEGRATED CRITICAL MODAL OVERLAY OVERRIDE */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(5, 6, 10, 0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 500 }}>
          <div style={{ background: "#0f121d", border: "1px solid #1e2330", borderRadius: "6px", width: "460px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#f1f5f9" }}>{isEditMode ? `Edit Node: ${form.activity_code}` : "Create Logic Activity Node"}</h3>
            
            <form onSubmit={handleSaveActivity} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Name</label>
                <input required type="text" value={form.activity_name} onChange={(e) => setForm({ ...form, activity_name: e.target.value })} style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "6px 10px", color: "#e2e8f0", fontSize: "12px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#378ADD", textTransform: "uppercase", display: "block", marginBottom: "4px", fontWeight: 600 }}>Activity Type</label>
                <select
                  value={form.activity_type}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => {
                      if (value === "Task") {
                        return { ...prev, activity_type: value, duration: lastTaskDuration === "0" ? "1" : lastTaskDuration };
                      } else {
                        if (prev.activity_type === "Task") setLastTaskDuration(prev.duration);
                        return { ...prev, activity_type: value, duration: "0" };
                      }
                    });
                  }}
                  style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "6px 10px", color: "#e2e8f0", fontSize: "12px", boxSizing: "border-box", cursor: "pointer" }}
                >
                  <option value="Task">Task</option>
                  <option value="Start Milestone">Start Milestone</option>
                  <option value="Finish Milestone">Finish Milestone</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "10px", color: form.activity_type !== "Task" ? "#475569" : "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Original Duration</label>
                  <input 
                    required 
                    type="number" 
                    value={form.duration} 
                    disabled={form.activity_type !== "Task"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, duration: val }));
                      setLastTaskDuration(val);
                    }} 
                    style={{ 
                      width: "100%", 
                      background: form.activity_type !== "Task" ? "#161b26" : "#090b11", 
                      border: "1px solid #1e2330", 
                      padding: "6px 10px", 
                      color: form.activity_type !== "Task" ? "#64748b" : "#e2e8f0", 
                      fontSize: "12px", 
                      boxSizing: "border-box",
                      cursor: form.activity_type !== "Task" ? "not-allowed" : "text"
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>WBS ID</label>
                  <input required type="number" value={form.wbs_id} onChange={(e) => setForm({ ...form, wbs_id: e.target.value })} style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "6px 10px", color: "#e2e8f0", fontSize: "12px", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ borderTop: "1px solid #1e2330", paddingTop: "12px", marginTop: "4px" }}>
                <label style={{ fontSize: "10px", color: "#fbbf24", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Constraint Type</label>
                <select
                  value={form.constraint_type}
                  onChange={(e) => setForm({ ...form, constraint_type: e.target.value })}
                  style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "6px 10px", color: "#e2e8f0", fontSize: "12px", boxSizing: "border-box", cursor: "pointer" }}
                >
                  <option value="">None (As Soon As Possible)</option>
                  <option value="ASAP">ASAP</option>
                  <option value="ALAP">ALAP</option>
                  <option value="SNET">Start No Earlier Than (SNET)</option>
                  <option value="SNLT">Start No Later Than (SNLT)</option>
                  <option value="FNET">Finish No Earlier Than (FNET)</option>
                  <option value="FNLT">Finish No Later Than (FNLT)</option>
                  <option value="MSO">Must Start On (MSO)</option>
                  <option value="MFO">Must Finish On (MFO)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Constraint Date</label>
                <input
                  type="date"
                  value={form.constraint_date}
                  onChange={(e) => setForm({ ...form, constraint_date: e.target.value })}
                  style={{ width: "100%", background: "#090b11", border: "1px solid #1e2330", padding: "5px 10px", color: "#e2e8f0", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "1px solid #1e2330", color: "#64748b", padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ background: "#378ADD", border: "none", color: "white", padding: "6px 16px", fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}