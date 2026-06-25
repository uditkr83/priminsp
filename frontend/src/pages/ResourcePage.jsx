import { useState, useEffect } from "react";
import axios from "axios";
import {
  MdOutlineFolder,
  MdOutlineFolderOpen,
  MdPerson,
  MdConstruction,
  MdLayers,
  MdSearch,
  MdAssignment,
  MdBarChart,
  MdClose,
  MdInfoOutline,
  MdTrendingUp
} from "react-icons/md";

const COLOR_RULES = {
  Labor: { text: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", border: "#1d4ed8" },
  Equipment: { text: "#f97316", bg: "rgba(249, 115, 22, 0.12)", border: "#c2410c" },
  Material: { text: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "#047857" }
};

export default function ResourcePage() {
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedResId, setSelectedResId] = useState("");
  const [selectedAsgId, setSelectedAsgId] = useState("");
  const [currentTab, setCurrentTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [treeExpanded, setTreeExpanded] = useState({ Labor: true, Equipment: true, Material: true });
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ actId: "ACT-205", actName: "Structural Grid Verification", resId: "", budgeted: 8 });

  // DB Sync Trigger
  useEffect(() => {
    fetchResources();
    fetchAssignments();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await axios.get("http://localhost:5000/resources");
      const formatted = res.data.map(r => ({
        id: r.id.toString(),
        name: r.resource_name,
        type: r.resource_type,
        maxUnits: Number(r.max_units),
        basePrice: Number(r.unit_rate),
        code: r.resource_code,
        location: "",
        discipline: "",
        dept: ""
      }));

      setResources(formatted);

      if (formatted.length > 0) {
        setSelectedResId(prev => prev || formatted[0].id);
      }
    } catch (err) {
      console.error("Resource pipeline down:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/resource-assignments");
      const formatted = res.data.map(a => ({
        id: a.id.toString(),
        actId: a.activity_code,
        actName: a.activity_name,
        resId: a.resource_id.toString(),
        resName: a.resource_name,
        resType: a.resource_type,
        budgeted: Number(a.budgeted_units),
        remaining: Number(a.remaining_units),
        actual: Number(a.actual_units),
        cost: Number(a.budgeted_units) * 120, 
        weekData: [Number(a.budgeted_units), Number(a.budgeted_units) * 0.8, 0, 0] 
      }));

      setAssignments(formatted);

      if (formatted.length > 0) {
        setSelectedAsgId(prev => prev || formatted[0].id);
      }
    } catch (err) {
      console.error("Assignment pipeline down:", err);
    }
  };

  // Safe Data Selectors
  const activeResource = resources.find(r => r.id === selectedResId) || resources[0] || null;
  const activeAssignment = assignments.find(a => a.id === selectedAsgId) || assignments[0] || null;

  // Independent Loading Engine
  const getResourceLoading = (resId, maxCapacity) => {
    const resAsgs = assignments.filter(a => a.resId === resId);
    if (resAsgs.length === 0) return { totalLoad: 0, loadingPercentage: 0, isOver: false, count: 0 };
    
    const weeklyTotals = [0, 0, 0, 0];
    resAsgs.forEach(asg => {
      for (let i = 0; i < 4; i++) { weeklyTotals[i] += asg.weekData[i] || 0; }
    });
    const peakAllocated = Math.max(...weeklyTotals);
    const loadingPercentage = Math.round((peakAllocated / maxCapacity) * 100);
    
    const resource = resources.find(r => r.id === resId);
    return { 
      totalLoad: peakAllocated, 
      loadingPercentage, 
      isOver: resource?.type === "Labor" ? loadingPercentage > 100 : false,
      count: resAsgs.length
    };
  };

  const activeResLoading = activeResource
    ? getResourceLoading(activeResource.id, activeResource.maxUnits)
    : { totalLoad: 0, loadingPercentage: 0, isOver: false, count: 0 };

  const filteredAssignments = assignments.filter(asg => 
    asg.actId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    asg.actName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asg.resName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // REAL INTEGRATION FIX: Sends data to PostgreSQL and updates state using the database-generated ID
  const handleCreateAssignment = async () => {
    const targetRes = resources.find(r => r.id === assignForm.resId);
    if (!targetRes) return;

    const payload = {
      activity_code: assignForm.actId,
      activity_name: assignForm.actName,
      resource_id: parseInt(targetRes.id, 10),
      resource_name: targetRes.name,
      resource_type: targetRes.type,
      budgeted_units: Number(assignForm.budgeted),
      remaining_units: Number(assignForm.budgeted),
      actual_units: 0
    };

    try {
      const response = await axios.post("http://localhost:5000/resource-assignments", payload);
      
      // Map returned DB row to UI state schema
      const dbData = response.data;
      const newAsg = {
        id: (dbData.id || `AS-${Math.floor(100 + Math.random() * 900)}`).toString(),
        actId: dbData.activity_code || payload.activity_code,
        actName: dbData.activity_name || payload.activity_name,
        resId: (dbData.resource_id || payload.resource_id).toString(),
        resName: dbData.resource_name || payload.resource_name,
        resType: dbData.resource_type || payload.resource_type,
        budgeted: Number(dbData.budgeted_units || payload.budgeted_units),
        remaining: Number(dbData.remaining_units || payload.remaining_units),
        actual: Number(dbData.actual_units || payload.actual_units),
        cost: Number(dbData.budgeted_units || payload.budgeted_units) * targetRes.basePrice,
        weekData: [Number(dbData.budgeted_units || payload.budgeted_units), Number(dbData.budgeted_units || payload.budgeted_units) * 0.8, 0, 0]
      };

      setAssignments(prevAssignments => [...prevAssignments, newAsg]);
      setSelectedAsgId(newAsg.id);
      setIsAssignModalOpen(false);
    } catch (err) {
      console.error("Failed to commit assignment row to DB:", err);
    }
  };

  return (
    <div style={{ background: "#0d1018", minHeight: "100vh", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column", fontSize: "12px", overflow: "hidden" }}>
      
      {/* Top Header Controls bar */}
      <div style={{ height: "40px", background: "#0f1117", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontWeight: 700, color: "#378add", fontSize: "11px", textTransform: "uppercase", marginRight: "16px", borderRight: "1px solid #1e2330", paddingRight: "16px" }}>
            PlanMaster P6 // Enterprise Resource Engine
          </span>
          <button onClick={() => setIsAssignModalOpen(true)} style={styles.toolbarBtn}><MdAssignment /> New Assignment</button>
        </div>
        <div style={{ position: "relative", width: "240px" }}>
          <MdSearch style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
          <input type="text" placeholder="Search Matrix Context..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {/* Main Grid split setup */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 340px", height: "calc(100vh - 40px)", overflow: "hidden" }}>
        
        {/* Left Dictionary Navigation panel */}
        <div style={{ background: "#0f1117", borderRight: "1px solid #1e2330", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "6px 12px", background: "#141822", borderBottom: "1px solid #1e2330", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, color: "#64748b" }}>
            Resource Dictionary Index
          </div>
          <div style={{ padding: "6px" }}>
            {["Labor", "Equipment", "Material"].map(type => (
              <div key={type} style={{ marginTop: type !== "Labor" ? "6px" : "0" }}>
                <div style={styles.treeFolderRow} onClick={() => setTreeExpanded({ ...treeExpanded, [type]: !treeExpanded[type] })}>
                  {treeExpanded[type] ? <MdOutlineFolderOpen color="#fbbf24" size={13} /> : <MdOutlineFolder color="#fbbf24" size={13} />}
                  <span style={styles.treeFolderLabel}>{type} {type === "Material" ? "Stock" : type === "Labor" ? "Pool" : "Fleet"}</span>
                </div>
                {treeExpanded[type] && resources.filter(r => r.type === type).map(res => {
                  const loadingInfo = getResourceLoading(res.id, res.maxUnits);
                  return (
                    <div key={res.id} onClick={() => setSelectedResId(res.id)} style={{ ...styles.treeItemRow, background: selectedResId === res.id ? "rgba(55,138,221,0.12)" : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <div style={{ marginTop: "2px" }}>
                          {type === "Labor" ? <MdPerson size={13} color={COLOR_RULES.Labor.text} /> : type === "Equipment" ? <MdConstruction size={13} color={COLOR_RULES.Equipment.text} /> : <MdLayers size={13} color={COLOR_RULES.Material.text} />}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 500, color: "#e2e8f0" }}>{res.name}</span>
                          <span style={{ fontSize: "9px", marginTop: "2px", fontWeight: "700", color: loadingInfo.isOver ? "#ef4444" : "#10b981" }}>
                            {loadingInfo.isOver ? "● OVERALLOCATED" : "● NORMAL"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Center Spreadsheet Allocation Panel & Diagram Metrics */}
        <div style={{ background: "#0d1018", display: "flex", flexDirection: "column", borderRight: "1px solid #1e2330", overflow: "hidden" }}>
          <div style={{ flex: 3, overflow: "auto", borderBottom: "4px solid #1e2330" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#141822", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 #1e2330" }}>
                  {["Activity ID", "Activity Name", "Resource ID", "Resource Name", "Budgeted Units", "Remaining Units", "Actual Units", "Total Cost", "Loading Matrix"].map(h => (
                    <th key={h} style={styles.tableHeaderCell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((asg, idx) => {
                  const isSelected = asg.id === selectedAsgId;
                  const resMaster = resources.find(r => r.id === asg.resId) || { maxUnits: 8 };
                  const loading = getResourceLoading(asg.resId, resMaster.maxUnits);
                  return (
                    <tr key={asg.id} onClick={() => { setSelectedAsgId(asg.id); setSelectedResId(asg.resId); }} style={{ background: isSelected ? "rgba(55, 138, 221, 0.2)" : idx % 2 === 0 ? "#0f1117" : "#0d1018", borderBottom: "1px solid #161b26", cursor: "pointer" }}>
                      <td style={{ ...styles.tableBodyCell, color: "#f97316", fontWeight: 700 }}>{asg.actId}</td>
                      <td style={{ ...styles.tableBodyCell, color: "#f1f5f9" }}>{asg.actName}</td>
                      <td style={{ ...styles.tableBodyCell, color: COLOR_RULES[asg.resType]?.text }}>{asg.resId}</td>
                      <td style={{ ...styles.tableBodyCell, color: "#94a3b8" }}>{asg.resName}</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right" }}>{asg.budgeted}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#ef4444" }}>{asg.remaining}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#10b981" }}>{asg.actual}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#cbd5e1" }}>₹{asg.cost.toLocaleString()}</td>
                      <td style={styles.tableBodyCell}>
                        {asg.resType === "Labor" && loading.isOver ? (
                          <span style={styles.badgeOver}>{loading.loadingPercentage}% OVERALLOCATED</span>
                        ) : <span style={{ color: "#64748b", fontSize: "10px" }}>Normal Load</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Timephased Profile Chart */}
          <div style={{ flex: 1.8, background: "#0f1117", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "#141822", padding: "6px 12px", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}><MdBarChart /> Resource Usage Profile</span>
              <span style={{ color: "#378add", fontSize: "10px", fontWeight: "600" }}>Focus Context: {activeResource?.name}</span>
            </div>
            
            <div style={{ flex: 1, padding: "20px 24px 10px 24px", display: "flex", gap: "28px", alignItems: "flex-end", background: "#0d1018", position: "relative" }}>
              
              {activeResource?.type === "Labor" && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(activeResource.maxUnits / 20) * 100}%`, borderTop: "2px dashed #f59e0b", zIndex: 5, pointerEvents: "none" }}>
                  <span style={{ position: "absolute", right: "12px", top: "-14px", background: "#f59e0b", color: "#000", padding: "1px 5px", borderRadius: "2px", fontSize: "8px", fontWeight: "bold" }}>
                    LIMIT THRESHOLD ({activeResource.maxUnits}h/d)
                  </span>
                </div>
              )}

              {["Wk 1", "Wk 2", "Wk 3", "Wk 4"].map((week, index) => {
                const weeklyLoad = assignments.filter(a => a.resId === activeResource?.id).reduce((sum, c) => sum + (c.weekData[index] || 0), 0);
                const isOverLimit = activeResource?.type === "Labor" && weeklyLoad > activeResource.maxUnits;
                return (
                  <div key={week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 2 }}>
                    <div style={{ width: "100%", height: "70px", background: "#111520", position: "relative", border: "1px solid #1e2330", borderRadius: "2px 2px 0 0" }}>
                      <div style={{ 
                        position: "absolute", bottom: 0, left: 0, right: 0, 
                        height: `${Math.min(100, (weeklyLoad / 20) * 100)}%`, 
                        background: isOverLimit ? "#ef4444" : COLOR_RULES[activeResource?.type]?.text || "#378add",
                        transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }} />
                      <span style={{ position: "absolute", top: "-15px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", color: isOverLimit ? "#ef4444" : "#cbd5e1", fontWeight: 700 }}>
                        {weeklyLoad}h/d
                      </span>
                    </div>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "600" }}>{week}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Details Config Dock panel */}
        <div style={{ background: "#0f1117", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          <div style={{ padding: "12px" }}>
            <div style={{ background: "linear-gradient(135deg, #141a29 0%, #0e121d 100%)", border: `1px solid ${activeResLoading.isOver ? "rgba(239, 68, 68, 0.25)" : "#1e2433"}`, borderRadius: "6px", padding: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Resource Summary</span>
                <MdTrendingUp size={14} color={activeResLoading.isOver ? "#ef4444" : "#3b82f6"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ color: "#475569", fontSize: "9px", fontWeight: "700" }}>RESOURCE ID</div>
                  <div style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "13px" }}>{activeResource?.id}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontSize: "9px", fontWeight: "700" }}>TYPE POOL</div>
                  <div style={{ color: COLOR_RULES[activeResource?.type]?.text || "#fff", fontWeight: "700" }}>{activeResource?.type}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontSize: "9px", fontWeight: "700" }}>ASSIGNMENTS</div>
                  <div style={{ color: "#f1f5f9", fontWeight: "600" }}>{activeResLoading.count} Items</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontSize: "9px", fontWeight: "700" }}>PEAK LOAD RATE</div>
                  <div style={{ color: activeResLoading.isOver ? "#ef4444" : "#10b981", fontWeight: "700" }}>{activeResLoading.loadingPercentage}%</div>
                </div>
              </div>
              <div style={{ marginTop: "10px", borderTop: "1px solid #1e2433", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#475569", fontSize: "9px", fontWeight: "700" }}>CURRENT META STATUS</span>
                <span style={{ background: activeResLoading.isOver ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)", color: activeResLoading.isOver ? "#ef4444" : "#10b981", border: `1px solid ${activeResLoading.isOver ? "#ef4444" : "#10b981"}`, padding: "2px 6px", borderRadius: "3px", fontSize: "9px", fontWeight: "700" }}>
                  {activeResLoading.isOver ? "OVERALLOCATED" : "OPTIMAL LOAD"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderBottom: "2px solid #1e2330" }}>
            <div style={{ display: "flex", background: "#141822" }}>
              {["General", "Resource Codes"].map(tab => (
                <button key={tab} onClick={() => setCurrentTab(tab)} style={{ ...styles.tabBtn, color: currentTab === tab ? "#378add" : "#64748b", borderBottom: currentTab === tab ? "2px solid #378add" : "2px solid transparent" }}>{tab}</button>
              ))}
            </div>
            <div style={{ padding: "10px" }}>
              {currentTab === "General" ? (
                <div>
                  <div style={styles.formGroup}><label style={styles.fieldLabel}>Resource ID</label><input type="text" readOnly value={activeResource?.id || ""} style={styles.fieldInputReadOnly} /></div>
                  <div style={styles.formGroup}><label style={styles.fieldLabel}>Resource Name</label><input type="text" readOnly value={activeResource?.name || ""} style={styles.fieldInputReadOnly} /></div>
                </div>
              ) : (
                <div>
                  <div style={styles.formGroup}><label style={styles.fieldLabel}>Code</label><input type="text" readOnly value={activeResource?.code || ""} style={styles.fieldInputReadOnly} /></div>
                  <div style={styles.formGroup}><label style={styles.fieldLabel}>Dept</label><input type="text" readOnly value={activeResource?.dept || ""} style={styles.fieldInputReadOnly} /></div>
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", background: "#11141c" }}>
            <div style={{ background: "#141822", padding: "6px 12px", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", gap: "6px" }}>
              <MdInfoOutline color="#fbbf24" size={14} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" }}>Assignment Details Dock</span>
            </div>
            {activeAssignment && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><span style={styles.fieldLabel}>Activity</span><div style={{ color: "#f97316", fontWeight: 700 }}>{activeAssignment.actId}</div></div>
                  <div><span style={styles.fieldLabel}>Resource</span><div style={{ color: "#3b82f6", fontWeight: 700 }}>{activeAssignment.resName}</div></div>
                </div>
                <div style={{ background: "#0d1018", border: "1px solid #1e2330", padding: "8px", borderRadius: "3px" }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: "6px" }}>{activeAssignment.actName}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div><span style={{ color: "#475569" }}>Budgeted:</span> {activeAssignment.budgeted}h</div>
                    <div><span style={{ color: "#475569" }}>Actual:</span> {activeAssignment.actual}h</div>
                    <div><span style={{ color: "#475569" }}>Remaining:</span> {activeAssignment.remaining}h</div>
                    <div><span style={{ color: "#475569" }}>Cost:</span> ₹{activeAssignment.cost}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Popup overlay for creating Link mapping */}
      {isAssignModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWrapper}>
            <div style={styles.modalHeader}><span>Link Resource</span><MdClose style={{ cursor: "pointer" }} onClick={() => setIsAssignModalOpen(false)} /></div>
            <div style={{ padding: "14px" }}>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Activity ID</label><input type="text" value={assignForm.actId} onChange={(e) => setAssignForm({ ...assignForm, actId: e.target.value })} style={styles.fieldInputEditable} /></div>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Name</label><input type="text" value={assignForm.actName} onChange={(e) => setAssignForm({ ...assignForm, actName: e.target.value })} style={styles.fieldInputEditable} /></div>
              <div style={styles.formGroup}>
                <label style={styles.fieldLabel}>Resource</label>
                <select value={assignForm.resId} onChange={(e) => setAssignForm({ ...assignForm, resId: e.target.value })} style={styles.fieldInputEditable}>
                  {resources.map(r => <option key={r.id} value={r.id}>[{r.id}] {r.name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Budgeted</label><input type="number" value={assignForm.budgeted} onChange={(e) => setAssignForm({ ...assignForm, budgeted: e.target.value })} style={styles.fieldInputEditable} /></div>
            </div>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setIsAssignModalOpen(false)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={handleCreateAssignment} style={styles.btnPrimary}>Commit Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  toolbarBtn: { background: "rgba(55,138,221,0.12)", color: "#509deb", border: "1px solid rgba(55,138,221,0.3)", fontSize: "11px", padding: "3px 8px", borderRadius: "3px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" },
  searchInput: { width: "100%", background: "#0d1018", border: "1px solid #1e2330", color: "#e2e8f0", padding: "3px 8px 3px 22px", borderRadius: "3px", fontSize: "11px", height: "24px", outline: "none" },
  treeFolderRow: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", cursor: "pointer" },
  treeFolderLabel: { fontSize: "11px", fontWeight: 600, color: "#94a3b8" },
  treeItemRow: { display: "flex", flexDirection: "column", gap: "2px", padding: "6px 8px 6px 20px", cursor: "pointer", borderBottom: "1px solid #141822" },
  tableHeaderCell: { padding: "6px 10px", color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", borderRight: "1px solid #1e2330", borderBottom: "1px solid #1e2330", textAlign: "left" },
  tableBodyCell: { padding: "6px 10px", borderRight: "1px solid #161b26", whiteSpace: "nowrap" },
  badgeOver: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid #ef4444", padding: "1px 4px", borderRadius: "2px", fontSize: "9px", fontWeight: 700 },
  tabBtn: { flex: 1, background: "transparent", border: "none", padding: "6px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  formGroup: { display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" },
  fieldLabel: { fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase" },
  fieldInputReadOnly: { background: "#0d1018", border: "1px solid #1a202c", borderRadius: "2px", padding: "4px 8px", color: "#94a3b8", fontSize: "11px", width: "100%", boxSizing: "border-box", outline: "none" },
  fieldInputEditable: { background: "#0d1018", border: "1px solid #2d3748", borderRadius: "3px", padding: "5px 8px", color: "#fff", fontSize: "11px", width: "100%", boxSizing: "border-box", outline: "none" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(5,7,12,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modalWrapper: { background: "#0f1117", border: "1px solid #2d3748", borderRadius: "4px", width: "400px" },
  modalHeader: { padding: "10px 14px", background: "#141822", borderBottom: "1px solid #2d3748", display: "flex", alignItems: "center", justifyContent: "space-between" },
  btnPrimary: { background: "#378add", color: "#fff", border: "none", padding: "5px 14px", borderRadius: "3px", cursor: "pointer", fontWeight: 600 },
  btnSecondary: { background: "#1e2330", color: "#cbd5e1", border: "1px solid #334155", padding: "4px 12px", borderRadius: "3px", cursor: "pointer" }
};