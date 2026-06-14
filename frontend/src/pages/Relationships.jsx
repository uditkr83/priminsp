import API from "../api";
import { useEffect, useState } from "react";
import {
  MdLink,
  MdDelete,
  MdEdit,
  MdSearch,
  MdAccessTime,
  MdClose
} from "react-icons/md";

export default function RelationshipsDashboard() {
  const [relationships, setRelationships] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ total_relationships: 0, fs_count: 0, ss_count: 0, ff_count: 0, sf_count: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 FEATURE 2: DROPDOWN LIVE FILTER STATES
  const [predSearch, setPredSearch] = useState("");
  const [succSearch, setSuccSearch] = useState("");

  // Form states (Create)
  const [predecessorId, setPredecessorId] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const [relationshipType, setRelationshipType] = useState("FS");
  const [lag, setLag] = useState(0);

  // Edit Modal States
  const [editingRel, setEditingRel] = useState(null);
  const [editType, setEditType] = useState("FS");
  const [editLag, setEditLag] = useState(0);

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
      setRelationships(response.data || []);
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

      setPredecessorId("");
      setSuccessorId("");
      setPredSearch("");
      setSuccSearch("");
      setRelationshipType("FS");
      setLag(0);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error creating relationship path.");
    }
  };

  const deleteRelationship = async (id) => {
    if (!window.confirm("Are you sure you want to delete this CPM network link?")) return;
    try {
      await API.delete(`/relationships/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting relationship.");
    }
  };

  const openEditModal = (rel) => {
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

  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case "FS": return { bg: "#2a0d1a", border: "#4a1329", text: "#D4537E" };
      case "SS": return { bg: "#05291e", border: "#114331", text: "#1D9E75" };
      case "FF": return { bg: "#2a1f08", border: "#4a350f", text: "#EF9F27" };
      case "SF": return { bg: "#0c2a4a", border: "#114375", text: "#378ADD" };
      default:   return { bg: "#1a1f2e", border: "#1e2330", text: "#64748b" };
    }
  };

  // 🔥 FEATURE 1: STATUS DYNAMIC BADGE STYLES
  const getStatusStyles = (status) => {
    const cleanStatus = status?.toLowerCase() || "";
    if (cleanStatus.includes("complete")) return { color: "#1D9E75", bg: "rgba(29, 158, 117, 0.1)" };
    if (cleanStatus.includes("progress")) return { color: "#378ADD", bg: "rgba(55, 138, 221, 0.1)" };
    return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" }; // Not Started
  };

  // 🔥 FEATURE 3: EXPLANATION TOOLTIP TEXT MAPPING
  const getTooltipText = (type) => {
    switch (type) {
      case "FS": return "Finish to Start: Successor begins when Predecessor finishes.";
      case "SS": return "Start to Start: Successor begins when Predecessor begins.";
      case "FF": return "Finish to Finish: Successor finishes when Predecessor finishes.";
      case "SF": return "Start to Finish: Successor finishes when Predecessor begins.";
      default: return "";
    }
  };

  // Filter Search Logic for Matrix Table
  const filteredRelationships = relationships.filter((rel) => {
    const term = searchTerm.toLowerCase();
    return (
      rel.predecessor_code?.toLowerCase().includes(term) ||
      rel.predecessor_name?.toLowerCase().includes(term) ||
      rel.successor_code?.toLowerCase().includes(term) ||
      rel.successor_name?.toLowerCase().includes(term) ||
      rel.relationship_type?.toLowerCase().includes(term)
    );
  });

  // 🔥 FEATURE 2: DROPDOWN DATA FILTERS
  const filteredPredActivities = activities.filter(act => 
    act.activity_code.toLowerCase().includes(predSearch.toLowerCase()) ||
    act.activity_name.toLowerCase().includes(predSearch.toLowerCase())
  );

  const filteredSuccActivities = activities.filter(act => 
    act.activity_code.toLowerCase().includes(succSearch.toLowerCase()) ||
    act.activity_name.toLowerCase().includes(succSearch.toLowerCase())
  );

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", padding: "32px 36px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", color: "#e2e8f0", boxSizing: "border-box" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>Precedence Relationships Engine</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>Manage network dependency paths and lag configuration matrix</p>
        </div>
      </div>

      {/* METRICS TELEMETRY DASHBOARD CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total Links", count: stats.total_relationships, color: "#e2e8f0", bg: "#141824" },
          { label: "Finish to Start (FS)", count: stats.fs_count, color: "#D4537E", bg: "#2a0d1a" },
          { label: "Start to Start (SS)", count: stats.ss_count, color: "#1D9E75", bg: "#05291e" },
          { label: "Finish to Finish (FF)", count: stats.ff_count, color: "#EF9F27", bg: "#2a1f08" },
          { label: "Start to Finish (SF)", count: stats.sf_count, color: "#378ADD", bg: "#0c2a4a" },
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, border: "1px solid #1e2330", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{card.label}</span>
            <span style={{ fontSize: "28px", fontWeight: 700, color: card.color }}>{card.count}</span>
          </div>
        ))}
      </div>

      {/* CORE WORKSPACE GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COMPONENT: CONTROL INPUT PANEL */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", paddingBottom: "10px", borderBottom: "1px solid #1e2330", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdLink style={{ fontSize: "16px", color: "#D4537E" }} /> Create Link Logic
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            
            {/* 🔥 FEATURE 2: SEARCHABLE PREDECESSOR DROPDOWN COMPLEX */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Predecessor (From Activity)</label>
              <div style={{ position: "relative", marginBottom: "6px" }}>
                <MdSearch style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "14px" }} />
                <input type="text" placeholder="Filter From activity..." value={predSearch} onChange={(e) => setPredSearch(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "6px 8px 6px 26px", fontSize: "12px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
              </div>
              <select value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", cursor: "pointer", outline: "none" }}>
                <option value="">Select Activity...</option>
                {filteredPredActivities.map((act) => (
                  <option key={act.id} value={act.id}>[{act.activity_code}] {act.activity_name}</option>
                ))}
              </select>
            </div>

            {/* 🔥 FEATURE 2: SEARCHABLE SUCCESSOR DROPDOWN COMPLEX */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Successor (To Activity)</label>
              <div style={{ position: "relative", marginBottom: "6px" }}>
                <MdSearch style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "14px" }} />
                <input type="text" placeholder="Filter To activity..." value={succSearch} onChange={(e) => setSuccSearch(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "6px 8px 6px 26px", fontSize: "12px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
              </div>
              <select value={successorId} onChange={(e) => setSuccessorId(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", cursor: "pointer", outline: "none" }}>
                <option value="">Select Activity...</option>
                {filteredSuccActivities.map((act) => (
                  <option key={act.id} value={act.id}>[{act.activity_code}] {act.activity_name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Type</label>
                <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}>
                  <option value="FS">FS</option>
                  <option value="SS">SS</option>
                  <option value="FF">FF</option>
                  <option value="SF">SF</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Lag Offset (d)</label>
                <input type="number" value={lag} onChange={(e) => setLag(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>

            <button onClick={addRelationship} style={{ width: "100%", background: "#D4537E", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "12px", fontSize: "13px", fontWeight: 500, cursor: "pointer", marginTop: "6px" }}>
              Connect Path Link
            </button>
          </div>
        </div>

        {/* RIGHT COMPONENT: LIVE SELECTION DATA MATRIX TABLE */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          
          {/* SEARCH TOOLBAR FILTER */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", background: "#11141d" }}>
            <span style={{ fontSize: "13px", fontWeight: 500 }}>Precedence Dependents Layout ({filteredRelationships.length})</span>
            <div style={{ position: "relative", width: "240px" }}>
              <MdSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "16px" }} />
              <input type="text" placeholder="Search activities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "6px 12px 6px 32px", fontSize: "12px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0d1018" }}>
                {["Predecessor Activity Object", "Logic Link Connection", "Successor Activity Object", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "14px 20px", fontSize: "10px", fontWeight: 600, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRelationships.map((rel) => {
                const badge = getTypeBadgeStyles(rel.relationship_type);
                const predStatus = getStatusStyles(rel.predecessor_status);
                const succStatus = getStatusStyles(rel.successor_status);

                return (
                  <tr key={rel.id} style={{ borderTop: "1px solid #1e2330" }}>
                    
                    {/* 🔥 FEATURE 1: PREDECESSOR ACTIVITY CARD (WITH LIVE STATUS FIELD) */}
                    <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748b", marginBottom: "2px" }}>
                        {rel.predecessor_code || "ACT-ERR"}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                        {rel.predecessor_name || "Unknown Block"}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: 500, color: predStatus.color, background: predStatus.bg }}>
                          {rel.predecessor_status || "Not Started"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "2px" }}>
                          <MdAccessTime style={{ fontSize: "12px" }} /> {rel.predecessor_duration ?? 0}d
                        </span>
                      </div>
                    </td>

                    {/* 🔥 FEATURE 3: DYNAMIC LINK WITH HOVER EXPLANATION TOOLTIP TITLE */}
                    <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                      <div 
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "140px", cursor: "help" }}
                        title={getTooltipText(rel.relationship_type)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, background: badge.bg, color: badge.text, padding: "2px 6px", borderRadius: "4px", border: `1px solid ${badge.border}`, fontFamily: "monospace" }}>
                            {rel.relationship_type}
                          </span>
                          <span style={{ color: "#22293a", letterSpacing: "-1px", fontSize: "12px", flexGrow: 1, textAlign: "center" }}>
                            ────────▶
                          </span>
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <span style={{ fontSize: "10px", fontFamily: "monospace", padding: "2px 6px", borderRadius: "4px", background: Number(rel.lag) > 0 ? "#2a1f08" : "#1a1f2e", border: Number(rel.lag) > 0 ? "1px solid #4a350f" : "1px solid #1e2330", color: Number(rel.lag) > 0 ? "#EF9F27" : "#64748b", fontWeight: 600 }}>
                            Lag: {Number(rel.lag) >= 0 ? `+${rel.lag}` : rel.lag}d
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 🔥 FEATURE 1: SUCCESSOR ACTIVITY CARD (WITH LIVE STATUS FIELD) */}
                    <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748b", marginBottom: "2px" }}>
                        {rel.successor_code || "ACT-ERR"}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                        {rel.successor_name || "Unknown Block"}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", fontWeight: 500, color: succStatus.color, background: succStatus.bg }}>
                          {rel.successor_status || "Not Started"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "2px" }}>
                          <MdAccessTime style={{ fontSize: "12px" }} /> {rel.successor_duration ?? 0}d
                        </span>
                      </div>
                    </td>

                    {/* INLINE ACTION MANAGEMENT (EDIT & DELETE) */}
                    <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => openEditModal(rel)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px", padding: 0, display: "flex", alignItems: "center" }} title="Edit Node Layout">
                          <MdEdit style={{ color: "#378ADD" }} />
                        </button>
                        <button onClick={() => deleteRelationship(rel.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px", padding: 0, display: "flex", alignItems: "center" }} title="Delete Link">
                          <MdDelete style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredRelationships.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    No matching network relationships maps resolved in current scope viewport.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DYNAMIC IN-CONTEXT BACKDROP MODAL FOR EDIT PIPELINES */}
      {editingRel && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(5, 7, 12, 0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "12px", width: "400px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #1e2330" }}>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Edit Configuration Mapping</div>
              <MdClose style={{ cursor: "pointer", color: "#64748b" }} onClick={() => setEditingRel(null)} />
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", background: "#0d1018", padding: "10px", borderRadius: "6px", border: "1px solid #1e2330" }}>
              <div style={{ marginBottom: "4px" }}><strong>From:</strong> [{editingRel.predecessor_code}] {editingRel.predecessor_name}</div>
              <div><strong>To:</strong> [{editingRel.successor_code}] {editingRel.successor_name}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Relationship Type</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}>
                  <option value="FS">FS</option>
                  <option value="SS">SS</option>
                  <option value="FF">FF</option>
                  <option value="SF">SF</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Lag Offset (Days)</label>
                <input type="number" value={editLag} onChange={(e) => setEditLag(e.target.value)} style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "10px", color: "#e2e8f0", fontSize: "13px", boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditingRel(null)} style={{ background: "#1e2330", color: "#e2e8f0", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
              <button onClick={updateRelationship} style={{ background: "#D4537E", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Save Mutation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}