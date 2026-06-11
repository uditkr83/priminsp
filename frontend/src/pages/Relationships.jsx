import { useEffect, useState } from "react";
import axios from "axios";
import {
  MdLink,
  MdHourglassEmpty,
  MdLayers,
  MdArrowForward
} from "react-icons/md";

export default function RelationshipsDashboard() {
  const [relationships, setRelationships] = useState([]);
  const [activities, setActivities] = useState([]);

  // Form states
  const [predecessorId, setPredecessorId] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const [relationshipType, setRelationshipType] = useState("FS");
  const [lag, setLag] = useState(0);

  useEffect(() => {
    loadRelationships();
    loadActivities();
  }, []);

  const loadRelationships = async () => {
    try {
      const response = await axios.get("http://13.60.26.19:5000/relationships");
      setRelationships(response.data || []);
    } catch (err) {
      console.error("Error fetching relationships:", err);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await axios.get("http://13.60.26.19:5000/activities");
      setActivities(response.data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const addRelationship = async () => {
    if (!predecessorId || !successorId) {
      alert("Please select both a predecessor and a successor task.");
      return;
    }
    if (predecessorId === successorId) {
      alert("Logic Error: Predecessor and Successor cannot be the same activity.");
      return;
    }
    try {
      await axios.post("http://13.60.26.19:5000/relationships", {
        predecessor_activity_id: Number(predecessorId),
        successor_activity_id: Number(successorId),
        relationship_type: relationshipType,
        lag: Number(lag),
      });

      setPredecessorId("");
      setSuccessorId("");
      setRelationshipType("FS");
      setLag(0);

      loadRelationships();
    } catch (err) {
      console.error("Error creating relationship path:", err);
    }
  };

  // Step 4: Relationship Type Dynamic Styling Config Generator
  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case "FS": return { bg: "#2a0d1a", border: "#4a1329", text: "#D4537E" }; // Pink
      case "SS": return { bg: "#05291e", border: "#114331", text: "#1D9E75" }; // Green
      case "FF": return { bg: "#2a1f08", border: "#4a350f", text: "#EF9F27" }; // Orange
      case "SF": return { bg: "#0c2a4a", border: "#114375", text: "#378ADD" }; // Blue
      default:   return { bg: "#1a1f2e", border: "#1e2330", text: "#64748b" };
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
      {/* Step 1 & 2: Deleted Stats Cards & Simplified Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 500, color: "#f1f5f9", margin: 0 }}>
          Relationship Manager
        </h1>
        <button
          style={{
            background: "#185FA5",
            border: "none",
            color: "white",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "13px"
          }}
          onClick={() => alert("Ready to establish new network logic vectors...")}
        >
          + New Link
        </button>
      </div>

      {/* Main Split Grid Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Form Box Panel */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", paddingBottom: "10px", borderBottom: "1px solid #1e2330", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdLink style={{ fontSize: "16px", color: "#D4537E" }} /> Create Link Logic
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Predecessor (From)</label>
              <select
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", cursor: "pointer" }}
              >
                <option value="">Select activity...</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>[{act.activity_code}] {act.activity_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Successor (To)</label>
              <select
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", cursor: "pointer" }}
              >
                <option value="">Select activity...</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>[{act.activity_code}] {act.activity_name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Type</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", cursor: "pointer" }}
                >
                  <option value="FS">FS</option>
                  <option value="SS">SS</option>
                  <option value="FF">FF</option>
                  <option value="SF">SF</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>Lag (Days)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={lag}
                  onChange={(e) => setLag(e.target.value)}
                  style={{ width: "100%", background: "#0d1018", border: "1px solid #1e2330", borderRadius: "6px", padding: "8px 12px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <button
              onClick={addRelationship}
              style={{ width: "100%", background: "#D4537E", color: "#f1f5f9", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
            >
              Add Relationship Link
            </button>
          </div>
        </div>

        {/* Right Output Relationships Table */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
            Network Precedence Dependents ({relationships.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0d1018" }}>
                {/* Step 6: Streamlined Columns (ID Completely Eliminated) */}
                {["Predecessor", "Relationship", "Successor", "Lag Offset"].map((header) => (
                  <th key={header} style={{ padding: "14px 24px", fontSize: "10px", fontWeight: 600, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel, index) => {
                const badge = getTypeBadgeStyles(rel.relationship_type);
                return (
                  <tr key={rel.id || index} style={{ borderTop: "1px solid #1e2330" }}>
                    
                    {/* Column 1: Predecessor Code Block */}
                    <td style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                      <span style={{ color: "#475569", fontFamily: "monospace", fontWeight: "normal", marginRight: "8px" }}>
                        •
                      </span>
                      {rel.predecessor_code || `ACT-${rel.predecessor_activity_id}`}
                    </td>

                    {/* Column 2: Step 3 & 4 Visual Line Linkage + Dynamic Color Map */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ height: "1px", width: "16px", background: "#1e2330" }}></div>
                        <span style={{ 
                          fontSize: "11px", 
                          fontWeight: 700, 
                          background: badge.bg, 
                          color: badge.text, 
                          padding: "3px 8px", 
                          borderRadius: "4px", 
                          border: `1px solid ${badge.border}`,
                          fontFamily: "monospace",
                          letterSpacing: "0.05em"
                        }}>
                          {rel.relationship_type}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", color: "#1e2330", marginLeft: "-4px" }}>
                          ──────▶
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Successor Code Block */}
                    <td style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                      {rel.successor_code || `ACT-${rel.successor_activity_id}`}
                    </td>

                    {/* Column 4: Step 5 Cleaner Lag Prefix Badge */}
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        background: Number(rel.lag) > 0 ? "#2a1f08" : "#1a1f2e",
                        border: Number(rel.lag) > 0 ? "1px solid #4a350f" : "1px solid #1e2330",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: Number(rel.lag) > 0 ? "#EF9F27" : "#64748b"
                      }}>
                        {Number(rel.lag) >= 0 ? `+${rel.lag}` : rel.lag}d
                      </span>
                    </td>

                  </tr>
                );
              })}
              
              {relationships.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    No critical network nodes connected yet. Link entities to form precedence logic charts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}