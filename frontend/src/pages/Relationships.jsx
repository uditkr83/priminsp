import API from "../api";
import { useEffect, useState, useRef } from "react";
import {
  MdLink,
  MdDelete,
  MdEdit,
  MdSearch,
  MdAccessTime,
  MdClose,
  MdAssignmentInd,
  MdInfoOutline,
  MdFastForward,
  MdFlag,
  MdSubdirectoryArrowLeft,
  MdFilterList,
  MdDashboard,
  MdGridOn,
  MdAccountTree,
  MdZoomIn,
  MdZoomOut,
  MdCropFree,
  MdLayers
} from "react-icons/md";

const TOTAL_COLUMNS = 5; 

export default function RelationshipsDashboard() {
  const [relationships, setRelationships] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ total_relationships: 0, fs_count: 0, ss_count: 0, ff_count: 0, sf_count: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedRel, setSelectedRel] = useState(null);
  const [predSearch, setPredSearch] = useState("");
  const [succSearch, setSuccSearch] = useState("");

  const [predecessorId, setPredecessorId] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const [relationshipType, setRelationshipType] = useState("FS");
  const [lag, setLag] = useState(0);

  const [editingRel, setEditingRel] = useState(null);
  const [editType, setEditType] = useState("FS");
  const [editLag, setEditLag] = useState(0);

  const [viewMode, setViewMode] = useState("Table"); 
  const [activeRelationTab, setActiveRelationTab] = useState("Predecessors"); 
  const [advancedFilter, setAdvancedFilter] = useState("All"); 

  const [detailsTab, setDetailsTab] = useState("General"); 
  const [traceType, setTraceType] = useState("Full"); 
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);

  // ==========================================
  // 🚀 ADVANCED PRIMAVERA P6 LEVEL NEW STATES
  // ==========================================
  const [zoomScale, setZoomScale] = useState(1);
  const [matrixTooltip, setMatrixTooltip] = useState(null); // { x, y, rel }
  const [networkDiagramHeight, setNetworkDiagramHeight] = useState(240);
  const isResizingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    loadRelationships();
    loadActivities();
    loadStats();
  };

  const loadRelationships = async () => {
    try {
      const response = await API.get("/relationships");
      const data = response.data || [];
      setRelationships(data);
      if (data.length > 0 && !selectedRel) {
        setSelectedRel(data[0]);
      }
    } catch (err) {
      console.error("Error fetching relationships:", err);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await API.get("/activities");
      setActivities(response.data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await API.get("/relationships/stats");
      setStats(response.data || { total_relationships: 0, fs_count: 0, ss_count: 0, ff_count: 0, sf_count: 0 });
    } catch (err) {
      console.error("Error fetching telemetry stats:", err);
    }
  };

  const addRelationship = async () => {
    if (!predecessorId || !successorId) {
      alert("Please select both a predecessor and a successor activity.");
      return;
    }
    try {
      await API.post("/relationships", {
        predecessor_activity_id: Number(predecessorId),
        successor_activity_id: Number(successorId),
        relationship_type: relationshipType,
        lag: Number(lag),
      });
      setPredecessorId(""); setSuccessorId(""); setPredSearch(""); setSuccSearch("");
      setRelationshipType("FS"); setLag(0);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error creating relationship path.");
    }
  };

  const deleteRelationship = async (id, e) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this CPM network link?")) return;
    try {
      await API.delete(`/relationships/${id}`);
      if (selectedRel?.id === id) setSelectedRel(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting relationship.");
    }
  };

  const openEditModal = (rel, e) => {
    e.stopPropagation();
    setEditingRel(rel);
    setEditType(rel.relationship_type);
    setEditLag(rel.lag);
  };

  const updateRelationship = async () => {
    try {
      await API.put(`/relationships/${editingRel.id}`, {
        predecessor_activity_id: editingRel.predecessor_activity_id,
        successor_activity_id: editingRel.successor_activity_id,
        relationship_type: editType,
        lag: Number(editLag),
      });
      setEditingRel(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating relationship layout.");
    }
  };

  const isDrivingRelationship = (rel) => {
    return (
      (Number(rel.lag) >= 0 && (rel.predecessor_status || "").toLowerCase().includes("progress")) ||
      Number(rel.lag) === 0
    );
  };

  const isCriticalPathLink = (rel) => {
    const pStatus = (rel.predecessor_status || "").toLowerCase();
    const sStatus = (rel.successor_status || "").toLowerCase();
    return pStatus.includes("progress") && sStatus.includes("progress");
  };

  const computedHealthStats = () => {
    let driving = 0, nonDriving = 0, criticalLinks = 0, totalLag = 0;
    const activityWithPreds = new Set();
    const activityWithSuccs = new Set();

    relationships.forEach(r => {
      if (isDrivingRelationship(r)) driving++; else nonDriving++;
      if (isCriticalPathLink(r)) criticalLinks++;
      totalLag += Number(r.lag || 0);
      if (r.predecessor_activity_id) activityWithSuccs.add(r.predecessor_activity_id);
      if (r.successor_activity_id) activityWithPreds.add(r.successor_activity_id);
    });

    const openEndDetails = [];
    activities.forEach(a => {
      const hasPred = activityWithPreds.has(a.id);
      const hasSucc = activityWithSuccs.has(a.id);
      if (!hasPred && !hasSucc) {
        openEndDetails.push({ code: a.activity_code, name: a.activity_name, issue: "Missing Predecessor & Successor", severity: "red" });
      } else if (!hasPred) {
        openEndDetails.push({ code: a.activity_code, name: a.activity_name, issue: "Missing Predecessor", severity: "orange" });
      } else if (!hasSucc) {
        openEndDetails.push({ code: a.activity_code, name: a.activity_name, issue: "Missing Successor", severity: "yellow" });
      }
    });

    const totalRels = relationships.length || 1;
    const totalActs = activities.length || 1;

    return { 
      driving, nonDriving, criticalLinks, openEnds: openEndDetails.length, openEndDetails,
      drivingPct: ((driving / totalRels) * 100).toFixed(1),
      criticalPct: ((criticalLinks / totalRels) * 100).toFixed(1),
      logicDensity: (totalRels / totalActs).toFixed(2),
      avgLag: (totalLag / totalRels).toFixed(1)
    };
  };

  const health = computedHealthStats();

  const getTraceChain = () => {
    if (!selectedRel) return { upstream: [], downstream: [], wbsPath: [] };
    const upstream = [];
    let currentPredId = selectedRel.predecessor_activity_id;
    const visitedUp = new Set();
    while (currentPredId && !visitedUp.has(currentPredId)) {
      visitedUp.add(currentPredId);
      const parentRel = relationships.find(r => r.successor_activity_id === currentPredId);
      if (parentRel) {
        upstream.unshift({ code: parentRel.predecessor_code, wbs: parentRel.predecessor_wbs_name || "Root" });
        currentPredId = parentRel.predecessor_activity_id;
      } else break;
    }

    const downstream = [];
    let currentSuccId = selectedRel.successor_activity_id;
    const visitedDown = new Set();
    while (currentSuccId && !visitedDown.has(currentSuccId)) {
      visitedDown.add(currentSuccId);
      const childRel = relationships.find(r => r.predecessor_activity_id === currentSuccId);
      if (childRel) {
        downstream.push({ code: childRel.successor_code, wbs: childRel.successor_wbs_name || "Leaf" });
        currentSuccId = childRel.successor_activity_id;
      } else break;
    }

    const wbsPath = [
      selectedRel.predecessor_wbs_name || "Site Prep",
      selectedRel.successor_wbs_name || "Construction Operations"
    ];

    return { upstream, downstream, wbsPath };
  };

  const traceChain = getTraceChain();

  // ==========================================
  // 🌿 FEATURE 1: ADVANCED MULTI-NODE COMPLEX COMPUTE ARCHITECTURE
  // ==========================================
  const generateNetworkNodesAndLinks = () => {
    if (!selectedRel) return { nodes: [], links: [] };
    
    const coreTargetId = selectedRel.successor_activity_id;
    const allPredRels = relationships.filter(r => r.successor_activity_id === coreTargetId);
    const allSuccRels = relationships.filter(r => r.predecessor_activity_id === coreTargetId);

    const nodeMap = new Map();
    const links = [];

    // Core Center Node Layout Allocation
    const centerNode = {
      id: coreTargetId,
      code: selectedRel.successor_code,
      name: selectedRel.successor_name,
      wbs: selectedRel.successor_wbs_code ? `${selectedRel.successor_wbs_code} ${selectedRel.successor_wbs_name}` : "N/A",
      duration: selectedRel.successor_duration ?? 0,
      status: selectedRel.successor_status || "Not Started",
      x: 230, y: 90
    };
    nodeMap.set(centerNode.id, centerNode);

    // Predecessors Column (Left Array Stack)
    allPredRels.forEach((rel, index) => {
      const yPos = allPredRels.length === 1 ? 90 : 25 + index * 110;
      if (!nodeMap.has(rel.predecessor_activity_id)) {
        nodeMap.set(rel.predecessor_activity_id, {
          id: rel.predecessor_activity_id,
          code: rel.predecessor_code,
          name: rel.predecessor_name,
          wbs: rel.predecessor_wbs_code ? `${rel.predecessor_wbs_code} ${rel.predecessor_wbs_name}` : "N/A",
          duration: rel.predecessor_duration ?? 0,
          status: rel.predecessor_status || "Not Started",
          x: 20, y: yPos
        });
      }
      links.push({
        from: rel.predecessor_activity_id, to: centerNode.id,
        type: rel.relationship_type, lag: rel.lag, relRef: rel
      });
    });

    // Successors Column (Right Array Stack)
    allSuccRels.forEach((rel, index) => {
      const yPos = allSuccRels.length === 1 ? 90 : 25 + index * 110;
      if (!nodeMap.has(rel.successor_activity_id)) {
        nodeMap.set(rel.successor_activity_id, {
          id: rel.successor_activity_id,
          code: rel.successor_code,
          name: rel.successor_name,
          wbs: rel.successor_wbs_code ? `${rel.successor_wbs_code} ${rel.successor_wbs_name}` : "N/A",
          duration: rel.successor_duration ?? 0,
          status: rel.successor_status || "Not Started",
          x: 450, y: yPos
        });
      }
      links.push({
        from: centerNode.id, to: rel.successor_activity_id,
        type: rel.relationship_type, lag: rel.lag, relRef: rel
      });
    });

    return { nodes: Array.from(nodeMap.values()), links };
  };

  const networkLayout = generateNetworkNodesAndLinks();

  const getNodeColor = (status, isCritical) => {
    if (isCritical) return "#ef4444";
    const clean = (status || "").toLowerCase();
    if (clean.includes("complete")) return "#10b981";
    if (clean.includes("progress")) return "#378ADD";
    return "#475569";
  };

  const getLinkColor = (rel) => {
    if (isCriticalPathLink(rel)) return "#ef4444";
    if (isDrivingRelationship(rel)) return "#10b981";
    return "#64748b";
  };

  // RESIZABLE LOGIC ENGINE FOR THE PORT WINDOW
  const startResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener("mousemove", resizeViewport);
    document.addEventListener("mouseup", stopResize);
  };

  const resizeViewport = (e) => {
    if (!isResizingRef.current) return;
    const nextHeight = Math.max(180, Math.min(600, e.clientY - 300));
    setNetworkDiagramHeight(nextHeight);
  };

  const stopResize = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", resizeViewport);
    document.removeEventListener("mouseup", stopResize);
  };

  const filteredRelationships = relationships.filter((rel) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (rel.predecessor_code || "").toLowerCase().includes(term) ||
      (rel.predecessor_name || "").toLowerCase().includes(term) ||
      (rel.successor_code || "").toLowerCase().includes(term) ||
      (rel.successor_name || "").toLowerCase().includes(term)
    );
    if (!matchesSearch) return false;
    if (advancedFilter === "FS") return rel.relationship_type === "FS";
    if (advancedFilter === "SS") return rel.relationship_type === "SS";
    if (advancedFilter === "FF") return rel.relationship_type === "FF";
    if (advancedFilter === "SF") return rel.relationship_type === "SF";
    if (advancedFilter === "Driving") return isDrivingRelationship(rel);
    if (advancedFilter === "Critical") return isCriticalPathLink(rel);
    if (advancedFilter === "OpenEnds") return !rel.predecessor_activity_id || !rel.successor_activity_id;
    return true;
  }).filter(rel => {
    if (!selectedRel) return true;
    return activeRelationTab === "Predecessors" 
      ? rel.successor_activity_id === selectedRel.successor_activity_id
      : rel.predecessor_activity_id === selectedRel.predecessor_activity_id;
  });

  const getRelationBadgeData = (type) => {
    switch (type) {
      case "FS": return { bg: "#2a0d1a", border: "#4a1329", text: "#D4537E", textLabel: "FS" };
      case "SS": return { bg: "#05291e", border: "#114331", text: "#1D9E75", textLabel: "SS" };
      case "FF": return { bg: "#2a1f08", border: "#4a350f", text: "#EF9F27", textLabel: "FF" };
      case "SF": return { bg: "#0c2a4a", border: "#114375", text: "#378ADD", textLabel: "SF" };
      default: return { bg: "#1a1f2e", border: "#1e2330", text: "#64748b", textLabel: type };
    }
  };

  const getStatusStyles = (status) => {
    const cleanStatus = (status || "").toLowerCase();
    if (cleanStatus.includes("complete")) return { color: "#1D9E75", bg: "rgba(29, 158, 117, 0.1)" };
    if (cleanStatus.includes("progress")) return { color: "#378ADD", bg: "rgba(55, 138, 221, 0.1)" };
    return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" };
  };

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", padding: "20px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", color: "#e2e8f0", boxSizing: "border-box" }}>
      
      {/* HEADER CONTROLS VIEWPORT */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Precedence Relationships Engine</h1>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>Enterprise Primavera P6 Professional Logic Network</p>
        </div>
        
        <div style={{ display: "flex", background: "#141824", padding: "2px", borderRadius: "4px", border: "1px solid #1e2330" }}>
          <button onClick={() => setViewMode("Table")} style={{ background: viewMode === "Table" ? "#378ADD" : "transparent", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, borderRadius: "3px", cursor: "pointer" }}>
            <MdDashboard size={12} /> Table Grid
          </button>
          <button onClick={() => setViewMode("Matrix")} style={{ background: viewMode === "Matrix" ? "#378ADD" : "transparent", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, borderRadius: "3px", cursor: "pointer" }}>
            <MdGridOn size={12} /> Matrix Grid
          </button>
        </div>
      </div>

      {/* EXTENDED CARDS METRIC DOCK */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "10px" }}>
        {[
          { label: "Total Links Included", count: stats.total_relationships, color: "#e2e8f0", bg: "#141824" },
          { label: "Driving Path %", count: `${health.driving} (${health.drivingPct}%)`, color: "#10b981", bg: "rgba(16,185,129,0.08)" },
          { label: "Critical Links %", count: `${health.criticalLinks} (${health.criticalPct}%)`, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
          { label: "Density & Average Lag", count: `Density: ${health.logicDensity} | Lag: ${health.avgLag}d`, color: "#378ADD", bg: "rgba(55,138,221,0.08)" }
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, border: "1px solid #1e2330", borderRadius: "4px", padding: "10px 14px" }}>
            <span style={{ display: "block", fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{card.label}</span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: card.color }}>{card.count}</span>
          </div>
        ))}
      </div>

      {/* QUICK FILTERS CONTROL PANEL */}
      <div style={{ display: "flex", gap: "6px", background: "#0f1117", border: "1px solid #1e2330", padding: "6px 12px", borderRadius: "4px", marginBottom: "16px", alignItems: "center" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase" }}><MdFilterList /> Filters:</span>
        {["All", "FS", "SS", "FF", "SF", "Driving", "Critical", "OpenEnds"].map(f => (
          <button key={f} onClick={() => setAdvancedFilter(f)} style={{ background: advancedFilter === f ? "#378ADD" : "#141824", color: advancedFilter === f ? "#fff" : "#94a3b8", border: "1px solid #1e2330", padding: "3px 10px", fontSize: "10px", borderRadius: "3px", cursor: "pointer" }}>{f}</button>
        ))}
      </div>

      {/* CORE WORKSPACE GRID PANEL */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "16px", alignItems: "start" }}>
        
        {/* LEFT LINK BUILDER FORM */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", padding: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", paddingBottom: "8px", borderBottom: "1px solid #1e2330", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase" }}><MdLink color="#D4537E"/> Path Connector</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Predecessor Node</label>
              <select value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "3px", padding: "6px", color: "#e2e8f0", fontSize: "11px" }}>
                <option value="">Select Predecessor...</option>
                {activities.map(a => <option key={a.id} value={a.id}>[{a.activity_code}] {a.activity_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Successor Node</label>
              <select value={successorId} onChange={(e) => setSuccessorId(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "3px", padding: "6px", color: "#e2e8f0", fontSize: "11px" }}>
                <option value="">Select Successor...</option>
                {activities.map(a => <option key={a.id} value={a.id}>[{a.activity_code}] {a.activity_name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} style={{ background: "#0d1018", border: "1px solid #1e2330", color: "#e2e8f0", fontSize: "11px", padding: "6px" }}>
                <option value="FS">FS</option><option value="SS">SS</option><option value="FF">FF</option><option value="SF">SF</option>
              </select>
              <input type="number" value={lag} onChange={(e) => setLag(e.target.value)} style={{ background: "#0d1018", border: "1px solid #1e2330", color: "#e2e8f0", fontSize: "11px", padding: "6px" }} placeholder="Lag"/>
            </div>
            <button onClick={addRelationship} style={{ background: "#D4537E", color: "#fff", border: "none", padding: "8px", fontWeight: 700, fontSize: "11px", borderRadius: "3px", cursor: "pointer" }}>COMMIT NETWORK LINK</button>
          </div>
        </div>

        {/* RIGHT WORKSPACE LAYER AREA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          <div style={{ display: "flex", borderBottom: "1px solid #1e2330", gap: "4px" }}>
            {["Predecessors", "Successors"].map(t => (
              <button key={t} onClick={() => setActiveRelationTab(t)} style={{ background: activeRelationTab === t ? "#0f1117" : "transparent", color: activeRelationTab === t ? "#378ADD" : "#64748b", border: "1px solid #1e2330", borderBottom: activeRelationTab === t ? "1px solid #0f1117" : "1px solid #1e2330", padding: "6px 16px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{t} Node View</button>
            ))}
          </div>

          {/* TABLE VIEW SYSTEM INTRODUCING WBS DATA LAYERS */}
          {viewMode === "Table" ? (
            <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", background: "#11141d", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Precedence Dependents Matrix ({filteredRelationships.length})</span>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: "#0d1018", border: "1px solid #1e2330", color: "#e2e8f0", padding: "4px 8px", fontSize: "11px", borderRadius: "3px" }}/>
              </div>
              <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#0d1018", zIndex: 10 }}>
                    <tr style={{ borderBottom: "1px solid #1e2330" }}>
                      {["Predecessor Logic / WBS Lineage", "Connection Node", "Successor Logic / WBS Lineage", "Impact", "Actions"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", fontSize: "9px", color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRelationships.map((rel, index) => {
                      const badge = getRelationBadgeData(rel.relationship_type);
                      const isSelected = selectedRel?.id === rel.id;
                      return (
                        <tr key={rel.id} onClick={() => { setSelectedRel(rel); setFocusedRowIndex(index); }} style={{ borderBottom: "1px solid #1e2330", background: isSelected ? "rgba(55,138,221,0.12)" : "transparent", cursor: "pointer" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#378ADD", fontWeight: 700 }}>{rel.predecessor_code}</div>
                            <div style={{ fontSize: "11px", fontWeight: 600 }}>{rel.predecessor_name}</div>
                            {/* 🌿 FEATURE 3: WBS Lineage display under activity code */}
                            <div style={{ fontSize: "9px", color: "#8492a6", marginTop: "2px" }}>WBS: {rel.predecessor_wbs_code ? `${rel.predecessor_wbs_code} ${rel.predecessor_wbs_name}` : "Global Network Root"}</div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: badge.bg, color: badge.text, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>{badge.textLabel} (+{rel.lag}d)</span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>{rel.successor_code}</div>
                            <div style={{ fontSize: "11px", fontWeight: 600 }}>{rel.successor_name}</div>
                            {/* 🌿 FEATURE 3: WBS Lineage display under activity code */}
                            <div style={{ fontSize: "9px", color: "#8492a6", marginTop: "2px" }}>WBS: {rel.successor_wbs_code ? `${rel.successor_wbs_code} ${rel.successor_wbs_name}` : "Global Project Node"}</div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {isDrivingRelationship(rel) ? <span style={{ color: "#10b981", fontSize: "10px" }}>🟢 Driving</span> : <span style={{ color: "#64748b", fontSize: "10px" }}>⚪ Non-Driving</span>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <button onClick={(e) => openEditModal(rel, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#378ADD" }}><MdEdit /></button>
                            <button onClick={(e) => deleteRelationship(rel.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", marginLeft: "6px" }}><MdDelete /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            
            /* INTERACTIVE MATRIX VIEW IMPLEMENTING HOVER ENGINE TOALETIPS (FEATURE 2) */
            <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", padding: "12px", overflowX: "auto", position: "relative" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #1e2330", padding: "6px", background: "#0d1018", fontSize: "9px" }}>Act Target</th>
                    {uniqueMatrixActivities.map(a => <th key={a.id} style={{ border: "1px solid #1e2330", padding: "6px", background: "#0d1018", fontSize: "9px" }}>{a.code}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {uniqueMatrixActivities.map(rowAct => (
                    <tr key={rowAct.id}>
                      <td style={{ border: "1px solid #1e2330", padding: "6px", background: "#0d1018", fontSize: "9px", fontWeight: "bold" }}>{rowAct.code}</td>
                      {uniqueMatrixActivities.map(colAct => {
                        const cellMatch = relationships.find(r => r.predecessor_activity_id === rowAct.id && r.successor_activity_id === colAct.id);
                        if (!cellMatch) return <td key={colAct.id} style={{ border: "1px solid #1e2330" }} />;
                        
                        return (
                          <td 
                            key={colAct.id} 
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMatrixTooltip({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15, rel: cellMatch });
                            }}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMatrixTooltip({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15, rel: cellMatch });
                            }}
                            onMouseLeave={() => setMatrixTooltip(null)}
                            style={{ border: "1px solid #1e2330", background: "#D4537E", textAlign: "center", fontSize: "10px", fontWeight: 700, padding: "6px", cursor: "crosshair", color: "#fff" }}
                          >
                            {cellMatch.relationship_type}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 🌿 FEATURE 2: ENTERPRISE INTERACTIVE TOOLTIP POPUP OVERLAY */}
              {matrixTooltip && (
                <div style={{ position: "absolute", left: matrixTooltip.x, top: matrixTooltip.y, background: "#11141d", border: "1px solid #378ADD", borderRadius: "4px", padding: "10px", width: "240px", boxDarkShadow: "0 4px 14px rgba(0,0,0,0.5)", zIndex: 9999, pointerEvents: "none" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", borderBottom: "1px solid #1e2330", paddingBottom: "4px", color: "#378ADD" }}>Relationship Config Type: {matrixTooltip.rel.relationship_type}</div>
                  <div style={{ fontSize: "10px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div><strong>Lag Structure:</strong> {matrixTooltip.rel.lag} Days</div>
                    <div><strong>Impact Metric:</strong> {isDrivingRelationship(matrixTooltip.rel) ? "🟢 DRIVING PATH" : "⚪ NON-DRIVING"}</div>
                    <div><strong>Criticality:</strong> {isCriticalPathLink(matrixTooltip.rel) ? "🔴 CRITICAL LINK" : "⚪ STANDARD LINK"}</div>
                    <div style={{ borderTop: "1px dashed #1e2330", paddingTop: "4px", marginTop: "2px", color: "#94a3b8" }}>
                      <div><strong>Pred Activity:</strong> {matrixTooltip.rel.predecessor_code}</div>
                      <div><strong>Succ Activity:</strong> {matrixTooltip.rel.successor_code}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              🌿 FEATURE 1: ADVANCED MULTI-NODE BRAND NEW NETWORK VIEWPORT
             ======================================================== */}
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", background: "#11141d", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#cbd5e1" }}>CPM NETWORK LOGIC DIAGRAM (PRIMAVERA NETWORK ARCHITECTURE)</span>
              
              {/* ZOOM & ACTIONS TOOLBAR SYSTEM */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setZoomScale(z => Math.min(2, z + 0.1))} style={{ background: "#141824", border: "1px solid #1e2330", color: "#fff", padding: "2px 6px", cursor: "pointer", borderRadius: "2px" }}><MdZoomIn size={12}/></button>
                <button onClick={() => setZoomScale(z => Math.max(0.5, z - 0.1))} style={{ background: "#141824", border: "1px solid #1e2330", color: "#fff", padding: "2px 6px", cursor: "pointer", borderRadius: "2px" }}><MdZoomOut size={12}/></button>
                <button onClick={() => setZoomScale(1)} style={{ background: "#141824", border: "1px solid #1e2330", color: "#fff", padding: "2px 6px", cursor: "pointer", borderRadius: "2px", fontSize: "9px" }}>Fit Active</button>
              </div>
            </div>

            {/* LIVE GRAPH SCROLL CONTAINER WITH ZOOM MODULATION LAYERS */}
            <div style={{ height: `${networkDiagramHeight}px`, overflow: "auto", background: "#07090e", position: "relative", padding: "10px" }}>
              <svg width="600" height="340" style={{ transform: `scale(${zoomScale})`, transformOrigin: "top left", transition: "transform 0.1s ease" }}>
                
                {/* CONNECTIONS VECTOR ROUTING MARKS */}
                {networkLayout.links.map((link, idx) => {
                  const src = networkLayout.nodes.find(n => n.id === link.from);
                  const dest = networkLayout.nodes.find(n => n.id === link.to);
                  if (!src || !dest) return null;

                  const startX = src.x + 130;
                  const startY = src.y + 40;
                  const endX = dest.x;
                  const endY = dest.y + 40;
                  const isLinkSelected = selectedRel?.id === link.relRef.id;

                  return (
                    <g key={idx}>
                      <path 
                        d={`M ${startX} ${startY} C ${(startX + endX)/2} ${startY}, ${(startX + endX)/2} ${endY}, ${endX} ${endY}`} 
                        stroke={getLinkColor(link.relRef)} 
                        strokeWidth={isLinkSelected ? "3" : "1.5"} 
                        fill="none"
                        style={{ filter: isLinkSelected ? "drop-shadow(0px 0px 4px #378ADD)" : "none" }}
                      />
                      <polygon points={`${endX},${endY} ${endX-6},${endY-4} ${endX-6},${endY+4}`} fill={getLinkColor(link.relRef)} />
                      <text x={(startX + endX)/2} y={(startY + endY)/2 - 4} fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle">{link.type} +{link.lag}d</text>
                    </g>
                  );
                })}

                {/* ACTIVITY NODE BOXES GENERATOR LAYER */}
                {networkLayout.nodes.map((node) => {
                  const nodeCrit = relationships.some(r => (r.predecessor_activity_id === node.id || r.successor_activity_id === node.id) && isCriticalPathLink(r));
                  const headerBg = getNodeColor(node.status, nodeCrit);

                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      {/* Box Base Boundary */}
                      <rect width="130" height="75" rx="3" fill="#141824" stroke="#1e2330" strokeWidth="1" />
                      {/* Node Header Block */}
                      <rect width="130" height="20" rx="2" fill={headerBg} />
                      <text x="6" y="14" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">{node.code}</text>
                      
                      {/* Node Structural Data Fields */}
                      <text x="6" y="32" fill="#e2e8f0" fontSize="8" fontWeight="bold">{node.name?.substring(0, 24)}</text>
                      <text x="6" y="45" fill="#94a3b8" fontSize="8">WBS: {node.wbs?.substring(0, 20)}..</text>
                      <text x="6" y="57" fill="#64748b" fontSize="8">Dur: {node.duration}d</text>
                      <text x="6" y="68" fill="#1D9E75" fontSize="8">Stat: {node.status}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* RESIZABLE DRAG SEPARATOR LINE HANDLE BAR */}
            <div onMouseDown={startResize} style={{ height: "4px", background: "#1e2330", cursor: "ns-resize", width: "100%" }} />

            {/* LEGEND BAR METADATA */}
            <div style={{ padding: "6px 12px", background: "#0d1018", borderTop: "1px solid #1e2330", display: "flex", gap: "14px", fontSize: "9px" }}>
              <span style={{ color: "#ef4444" }}>🟥 Critical Path Node / Link</span>
              <span style={{ color: "#10b981" }}>🟩 Driving Link Connection</span>
              <span style={{ color: "#378ADD" }}>🟦 In Progress Block</span>
              <span style={{ color: "#64748b" }}>⬜ Standard Setup Lineage</span>
            </div>
          </div>

          {/* ========================================================
              📌 ENHANCED DETAILED TABS WINDOWS MAP (FEATURES 3 & 4)
             ======================================================== */}
          {selectedRel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "14px" }}>
              
              <div style={{ background: "#0f121d", border: "1px solid #1e2330", borderRadius: "4px" }}>
                <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330" }}>
                  {["General", "Relationship", "Trace", "Audit"].map(t => (
                    <button key={t} onClick={() => setDetailsTab(t)} style={{ background: detailsTab === t ? "#0f121d" : "transparent", color: detailsTab === t ? "#378ADD" : "#64748b", border: "none", padding: "6px 14px", fontSize: "10px", fontWeight: 700, cursor: "pointer", borderRight: "1px solid #1e2330" }}>{t.toUpperCase()}</button>
                  ))}
                </div>

                <div style={{ padding: "12px", minHeight: "110px" }}>
                  {detailsTab === "General" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                      <div><strong>Predecessor:</strong> {selectedRel.predecessor_code}</div>
                      <div><strong>Successor:</strong> {selectedRel.successor_code}</div>
                      <div><strong>Pred WBS Component:</strong> <span style={{color:"#8492a6"}}>{selectedRel.predecessor_wbs_name || "N/A"}</span></div>
                      <div><strong>Succ WBS Component:</strong> <span style={{color:"#8492a6"}}>{selectedRel.successor_wbs_name || "N/A"}</span></div>
                    </div>
                  )}

                  {detailsTab === "Relationship" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                      <div><strong>Type Array Link:</strong> {selectedRel.relationship_type}</div>
                      <div><strong>Lag Offset Value:</strong> {selectedRel.lag}d</div>
                      <div><strong>Pred WBS Anchor:</strong> {selectedRel.predecessor_wbs_code || "Root"}</div>
                      <div><strong>Succ WBS Anchor:</strong> {selectedRel.successor_wbs_code || "Root"}</div>
                    </div>
                  )}

                  {detailsTab === "Trace" && (
                    <div style={{ fontSize: "11px" }}>
                      <div style={{ fontWeight: "bold", color: "#378ADD", marginBottom: "4px" }}>🌿 WBS TRACE SEQUENCE LINEAGE:</div>
                      <div style={{ background: "#07090e", padding: "6px", borderRadius: "3px", fontFamily: "monospace" }}>
                        {traceChain.wbsPath.join(" ➔ ")}
                      </div>
                    </div>
                  )}

                  {detailsTab === "Audit" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
                      <div><strong>Created Date:</strong> 12-JUN-2026</div>
                      <div><strong>Modified Frame:</strong> 18-JUN-2026</div>
                      <div><strong>EPC Verification:</strong> Certified Level 9 Planner</div>
                    </div>
                  )}
                </div>
              </div>

              {/* OPEN END DIAGNOSTICS ANALYZER INTEGRITY TABLE */}
              <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", padding: "10px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid #1e2330", paddingBottom: "4px", marginBottom: "6px" }}>⚠️ OPEN END ANALYZER OUTLIERS ({health.openEnds})</div>
                <div style={{ maxHeight: "95px", overflowY: "auto", fontSize: "10px" }}>
                  {health.openEndDetails.map((act, idx) => (
                    <div key={idx} style={{ padding: "3px 0", color: act.severity === "red" ? "#ef4444" : "#f97316", borderBottom: "1px dashed #141824" }}>
                      <strong>{act.code}:</strong> {act.issue}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* EDIT MODAL STRUCT DIALOG */}
      {editingRel && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(5,7,12,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999 }}>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", width: "340px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700 }}>EDIT CONFIG LINK</span>
              <MdClose onClick={() => setEditingRel(null)} style={{ cursor: "pointer" }}/>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <select value={editType} onChange={(e) => setEditType(e.target.value)} style={{ background: "#0d1018", color: "#fff", padding: "6px", border: "1px solid #1e2330" }}>
                <option value="FS">FS</option><option value="SS">SS</option><option value="FF">FF</option><option value="SF">SF</option>
              </select>
              <input type="number" value={editLag} onChange={(e) => setEditLag(e.target.value)} style={{ background: "#0d1018", color: "#fff", padding: "6px", border: "1px solid #1e2330" }}/>
              <button onClick={updateRelationship} style={{ background: "#D4537E", border: "none", color: "#fff", padding: "8px", fontWeight: "bold" }}>SAVE NETWORK MUTATION</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}