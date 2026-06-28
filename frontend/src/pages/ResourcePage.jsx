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
  const [activities, setActivities] = useState([]);
  const [selectedResId, setSelectedResId] = useState("");
  const [selectedAsgId, setSelectedAsgId] = useState("");
  const [currentTab, setCurrentTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [treeExpanded, setTreeExpanded] = useState({ Labor: true, Equipment: true, Material: true });
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  const [assignForm, setAssignForm] = useState({ activityId: "", resId: "", budgeted: 8 });
  const [histogram, setHistogram] = useState([]);

  useEffect(() => {
    fetchResources();
    fetchAssignments();
    fetchActivities();
    fetchHistogramData();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await axios.get("http://localhost:5000/activities");
      setActivities(res.data);
    } catch (err) {
      console.error("Activity fetch failure:", err);
    }
  };

  // FIX 1: Corrected API mapping to native assignment histogram controller
  const fetchHistogramData = async () => {
    try {
      const res = await axios.get("http://localhost:5000/resource-assignments/histogram");
      setHistogram(res.data);
    } catch (err) {
      console.error("Histogram analytical fetch failure:", err);
    }
  };

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
        dept: r.department || "Engineering"
      }));
      setResources(formatted);
      if (formatted.length > 0) {
        setSelectedResId(prev => prev || formatted[0].id);
      }
    } catch (err) {
      console.error("Resource fetch failure:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/resource-assignments");
      const formatted = res.data.map(a => ({
        id: a.id.toString(),
        actId: a.activity_code || "",
        actName: a.activity_name || "",
        resId: a.resource_id.toString(),
        resName: a.resource_name,
        resType: a.resource_type,
        budgeted: Number(a.budgeted_units),
        remaining: Number(a.remaining_units),
        actual: Number(a.actual_units),
        // FIX 6: Strict binding to dynamic backend resource rates without manual 120 fallback
        cost: Number(a.budgeted_units) * Number(a.unit_rate), 
        // FIX 3: Structured mock schema matching state design pattern for later timeline hydration
        weekData: [Number(a.budgeted_units), Number(a.budgeted_units) * 0.8, 0, 0] 
      }));
      setAssignments(formatted);
      if (formatted.length > 0) {
        setSelectedAsgId(prev => prev || formatted[0].id);
      }
    } catch (err) {
      console.error("Assignment fetch failure:", err);
    }
  };

  const activeResource = resources.find(r => r.id === selectedResId) || resources[0] || null;
  const activeAssignment = assignments.find(a => a.id === selectedAsgId) || assignments[0] || null;

  // BIGGEST MISSING FEATURE: Direct focus contextual node extractor for the resource histogram module
  const activeHistogramMetrics = histogram.find(h => h.id?.toString() === activeResource?.id?.toString()) || null;

  const getResourceLoading = (resId, maxCapacity) => {
    const resAsgs = assignments.filter(a => a.resId === resId);
    if (resAsgs.length === 0) return { totalLoad: 0, loadingPercentage: 0, isOver: false, count: 0 };
    const weeklyTotals = [0, 0, 0, 0];
    resAsgs.forEach(asg => {
      for (let i = 0; i < 4; i++) { weeklyTotals[i] += asg.weekData[i] || 0; }
    });
    const peakAllocated = Math.max(...weeklyTotals);
    const loadingPercentage = Math.round((peakAllocated / (maxCapacity || 1)) * 100);
    
    // FIX 7: Universal overloading evaluation independent of specific dictionary typing rules
    return { 
      totalLoad: peakAllocated, 
      loadingPercentage, 
      isOver: loadingPercentage > 100,
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

  const handleCreateAssignment = async () => {
    const targetRes = resources.find(r => r.id === assignForm.resId);
    if (!targetRes || !assignForm.activityId) return;

    const payload = {
      activity_id: Number(assignForm.activityId),
      resource_id: Number(targetRes.id),
      budgeted_units: Number(assignForm.budgeted),
      remaining_units: Number(assignForm.budgeted),
      actual_units: 0
    };

    try {
      await axios.post("http://localhost:5000/resource-assignments", payload);
      await fetchAssignments();
      setAssignForm({ activityId: "", resId: "", budgeted: 8 });
      setIsAssignModalOpen(false);
      fetchHistogramData(); 
    } catch (err) {
      console.error("Database commit failure:", err);
    }
  };

  return (
    <div style={styles.container}>
      {/* GLOBAL APPLICATION MAIN TOPBAR CONTAINER */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={styles.logo}>PlanMaster P6 // Enterprise Resource Engine</span>
          <button onClick={() => setIsAssignModalOpen(true)} style={styles.toolbarBtn}><MdAssignment /> New Assignment</button>
        </div>
        <div style={{ position: "relative", width: "240px" }}>
          <MdSearch style={styles.searchIcon} />
          <input type="text" placeholder="Search Matrix Context..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {/* CORE WORKSPACE INTERACTIVE MULTI-SPLIT ARCHITECTURE */}
      <div style={styles.mainGrid}>
        {/* SIDEBAR DOCK: Resource breakdown nodes lookup hierarchy */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>Resource Dictionary Index</div>
          <div style={{ padding: "6px" }}>
            {["Labor", "Equipment", "Material"].map(type => (
              <div key={type} style={{ marginTop: type !== "Labor" ? "6px" : "0" }}>
                <div style={styles.treeFolderRow} onClick={() => setTreeExpanded({ ...treeExpanded, [type]: !treeExpanded[type] })}>
                  {treeExpanded[type] ? <MdOutlineFolderOpen color="#fbbf24" size={13} /> : <MdOutlineFolder color="#fbbf24" size={13} />}
                  <span style={styles.treeFolderLabel}>{type}</span>
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

        {/* PRIMARY MAIN CENTER WORK PANEL: Primavera P6 Layout Format [Table Top, Profile Bottom] */}
        <div style={styles.centerPanel}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.stickyHeader}>
                  {["Activity ID", "Activity Name", "Resource ID", "Resource Name", "Budgeted", "Remaining", "Actual", "Cost", "Status"].map(h => (
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
                      <td style={styles.tableBodyCell}>{asg.actName}</td>
                      <td style={{ ...styles.tableBodyCell, color: COLOR_RULES[asg.resType]?.text }}>{asg.resId}</td>
                      <td style={styles.tableBodyCell}>{asg.resName}</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right" }}>{asg.budgeted}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#ef4444" }}>{asg.remaining}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#10b981" }}>{asg.actual}h</td>
                      <td style={{ ...styles.tableBodyCell, textAlign: "right", color: "#cbd5e1" }}>₹{asg.cost.toLocaleString()}</td>
                      <td style={styles.tableBodyCell}>
                        {loading.isOver ? (
                          <span style={styles.badgeOver}>OVERALLOCATED</span>
                        ) : <span style={{ color: "#64748b", fontSize: "10px" }}>Normal</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DUAL MODE HISTOGRAM VIEW SPLIT SCREEN LAYER */}
          <div style={styles.histogramWrapper}>
            <div style={styles.histogramHeader}>
              <span style={styles.histogramTitle}><MdBarChart /> Dynamic Profile Matrix</span>
              <span style={{ color: "#378add", fontSize: "10px", fontWeight: "600" }}>Focus Track: {activeResource ? `[${activeResource.id}] ${activeResource.name}` : "None Selected"}</span>
            </div>

            {activeResource ? (
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", background: "#0d1018" }}>
                
                {/* PART A: Time-Distributed Column Segment Charts */}
                <div style={styles.chartArea}>
                  {/* FIXIC 5: Capacity limit line threshold mapped directly to active units profile configurations */}
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: "100%", transform: "translateY(100%)", borderTop: "2px dashed #f59e0b", zIndex: 5, pointerEvents: "none", top: "25px" }}>
                    <span style={styles.thresholdLabel}>MAX AVAILABILITY LIMIT ({activeResource.maxUnits} Units)</span>
                  </div>

                  {["Wk 1", "Wk 2", "Wk 3", "Wk 4"].map((week, index) => {
                    const weeklyLoad = assignments.filter(a => a.resId === activeResource.id).reduce((sum, c) => sum + (c.weekData[index] || 0), 0);
                    // FIX 7: Universal loading alert rule evaluated via baseline metrics overrides
                    const isOverLimit = weeklyLoad > activeResource.maxUnits;
                    
                    // FIX 4: Dynamically computing scaling denominator utilizing current focus configurations boundaries
                    const parsedHeightPercentage = Math.min(100, (weeklyLoad / (activeResource.maxUnits || 1)) * 100);

                    return (
                      <div key={week} style={styles.barContainer}>
                        <div style={styles.barTrack}>
                          <div style={{ ...styles.barFill, height: `${parsedHeightPercentage}%`, background: isOverLimit ? "#ef4444" : COLOR_RULES[activeResource.type]?.text || "#378add" }} />
                          <span style={{ ...styles.barValue, color: isOverLimit ? "#ef4444" : "#cbd5e1" }}>{weeklyLoad}h/d</span>
                        </div>
                        <span style={styles.weekLabel}>{week}</span>
                      </div>
                    );
                  })}
                </div>

                {/* BIGGEST MISSING FEATURE SOLVED: Cumulative Linear Tracking Display specifically focused on selected dictionary row context node */}
                <div style={{ borderLeft: "1px solid #1e2330", padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0f1117" }}>
                  {activeHistogramMetrics ? (
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px" }}>Spread Ledger Metrics</div>
                      
                      {/* Budget Stack */}
                      <div style={{ marginBottom: "8px" }}>
                        <div style={styles.spreadLabelRow}><span>Cumulative Budgeted</span><span>{activeHistogramMetrics.total_budgeted} Un.</span></div>
                        <div style={styles.spreadProgressBarContainer}>
                          <div style={{ width: `${Math.min((Number(activeHistogramMetrics.total_budgeted) / (activeResource.maxUnits || 1)) * 100, 100)}%`, height: "100%", background: Number(activeHistogramMetrics.total_budgeted) > activeResource.maxUnits ? "#ef4444" : "#3b82f6" }} />
                        </div>
                      </div>

                      {/* Actual Stack */}
                      <div style={{ marginBottom: "8px" }}>
                        <div style={styles.spreadLabelRow}><span>Cumulative Actual</span><span>{activeHistogramMetrics.total_actual} Un.</span></div>
                        <div style={styles.spreadProgressBarContainer}>
                          <div style={{ width: `${Math.min((Number(activeHistogramMetrics.total_actual) / (activeResource.maxUnits || 1)) * 100, 100)}%`, height: "100%", background: "#22c55e" }} />
                        </div>
                      </div>

                      {/* Remaining Stack */}
                      <div>
                        <div style={styles.spreadLabelRow}><span>Balance Remaining</span><span>{activeHistogramMetrics.total_remaining} Un.</span></div>
                        <div style={styles.spreadProgressBarContainer}>
                          <div style={{ width: `${Math.min((Number(activeHistogramMetrics.total_remaining) / (activeResource.maxUnits || 1)) * 100, 100)}%`, height: "100%", background: "#f59e0b" }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#475569", textAlign: "center", fontSize: "11px" }}>No distributed database logging mapping available for this node index resource.</div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#475569" }}>Select an enterprise record node to pull tracking graphs.</div>
            )}
          </div>
        </div>

        {/* RIGHT DOCK DETAILS AREA - FIX 2: All duplicate structural graphs fully expunged for clean layout structure */}
        <div style={styles.rightDock}>
          <div style={{ padding: "12px" }}>
            <div style={{ ...styles.summaryCard, border: `1px solid ${activeResLoading.isOver ? "rgba(239, 68, 68, 0.25)" : "#1e2433"}` }}>
              <div style={styles.cardHeader}>
                <span style={{ color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>Active Summary Matrix</span>
                <MdTrendingUp size={14} color={activeResLoading.isOver ? "#ef4444" : "#3b82f6"} />
              </div>
              <div style={styles.cardGrid}>
                <div style={styles.cardStat}>
                  <label style={styles.cardLabel}>RESOURCE ID</label>
                  <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "13px" }}>{activeResource?.id}</span>
                </div>
                <div style={styles.cardStat}>
                  <label style={styles.cardLabel}>PEAK LOADING RATE</label>
                  <span style={{ color: activeResLoading.isOver ? "#ef4444" : "#10b981", fontWeight: "700" }}>{activeResLoading.loadingPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.tabWrapper}>
            <div style={styles.tabHeader}>
              {["General", "Codes"].map(tab => (
                <button key={tab} onClick={() => setCurrentTab(tab)} style={{ ...styles.tabBtn, color: currentTab === tab ? "#378add" : "#64748b", borderBottom: currentTab === tab ? "2px solid #378add" : "2px solid transparent" }}>{tab}</button>
              ))}
            </div>
            <div style={{ padding: "10px" }}>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Name</label><input type="text" readOnly value={activeResource?.name || ""} style={styles.fieldInputReadOnly} /></div>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Dept</label><input type="text" readOnly value={activeResource?.dept || ""} style={styles.fieldInputReadOnly} /></div>
            </div>
          </div>

          <div style={styles.asgDetailsWrapper}>
            <div style={styles.asgHeader}><MdInfoOutline color="#fbbf24" size={14} /><span style={{ fontSize: "10px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" }}>Assignment Details</span></div>
            {activeAssignment && (
              <div style={{ padding: "12px" }}>
                <div style={styles.asgSummary}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{activeAssignment.actName}</div>
                  <div style={styles.asgStatGrid}>
                    <div><span style={{ color: "#475569" }}>Budgeted:</span> {activeAssignment.budgeted}h</div>
                    <div><span style={{ color: "#475569" }}>Cost:</span> ₹{activeAssignment.cost.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CORE INPUT ACTION MODAL WINDOW FOR ASSIGNMENT CREATION LINKS */}
      {isAssignModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWrapper}>
            <div style={styles.modalHeader}><span>Link Resource</span><MdClose style={{ cursor: "pointer" }} onClick={() => setIsAssignModalOpen(false)} /></div>
            <div style={{ padding: "14px" }}>
              <div style={styles.formGroup}>
                <label style={styles.fieldLabel}>Select Activity</label>
                <select value={assignForm.activityId} onChange={(e) => setAssignForm({ ...assignForm, activityId: e.target.value })} style={styles.fieldInputEditable}>
                  <option value="">Select Activity</option>
                  {activities.map(act => <option key={act.id} value={act.id}>{act.activity_code} - {act.activity_name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.fieldLabel}>Resource Target</label>
                <select value={assignForm.resId} onChange={(e) => setAssignForm({ ...assignForm, resId: e.target.value })} style={styles.fieldInputEditable}>
                  <option value="">Select Resource</option>
                  {resources.map(r => <option key={r.id} value={r.id}>[{r.id}] {r.name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}><label style={styles.fieldLabel}>Budgeted Units</label><input type="number" value={assignForm.budgeted} onChange={(e) => setAssignForm({ ...assignForm, budgeted: e.target.value })} style={styles.fieldInputEditable} /></div>
            </div>
            <div style={styles.modalFooter}><button onClick={() => setIsAssignModalOpen(false)} style={styles.btnSecondary}>Cancel</button><button onClick={handleCreateAssignment} style={styles.btnPrimary}>Commit Link</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#0d1018", minHeight: "100vh", color: "#e2e8f0", fontFamily: "sans-serif", display: "flex", flexDirection: "column", fontSize: "12px", overflow: "hidden" },
  header: { height: "40px", background: "#0f1117", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" },
  logo: { fontWeight: 700, color: "#378add", fontSize: "11px", textTransform: "uppercase", marginRight: "16px", borderRight: "1px solid #1e2330", paddingRight: "16px" },
  toolbarBtn: { background: "rgba(55,138,221,0.12)", color: "#509deb", border: "1px solid rgba(55,138,221,0.3)", fontSize: "11px", padding: "3px 8px", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" },
  searchIcon: { position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", color: "#475569" },
  searchInput: { width: "100%", background: "#0d1018", border: "1px solid #1e2330", color: "#e2e8f0", padding: "3px 8px 3px 22px", borderRadius: "3px", fontSize: "11px", height: "24px", outline: "none" },
  mainGrid: { flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 340px", height: "calc(100vh - 40px)", overflow: "hidden" },
  sidebar: { background: "#0f1117", borderRight: "1px solid #1e2330", display: "flex", flexDirection: "column", overflowY: "auto" },
  sidebarHeader: { padding: "6px 12px", background: "#141822", borderBottom: "1px solid #1e2330", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, color: "#64748b" },
  treeFolderRow: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", cursor: "pointer" },
  treeFolderLabel: { fontSize: "11px", fontWeight: 600, color: "#94a3b8" },
  treeItemRow: { display: "flex", flexDirection: "column", gap: "2px", padding: "6px 8px 6px 20px", cursor: "pointer", borderBottom: "1px solid #141822" },
  centerPanel: { background: "#0d1018", display: "flex", flexDirection: "column", borderRight: "1px solid #1e2330", overflow: "hidden" },
  tableWrapper: { flex: 3, overflow: "auto", borderBottom: "4px solid #1e2330" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "11px" },
  stickyHeader: { background: "#141822", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 #1e2330" },
  tableHeaderCell: { padding: "6px 10px", color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", borderRight: "1px solid #1e2330", borderBottom: "1px solid #1e2330", textAlign: "left" },
  tableBodyCell: { padding: "6px 10px", borderRight: "1px solid #161b26", whiteSpace: "nowrap" },
  badgeOver: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid #ef4444", padding: "1px 4px", borderRadius: "2px", fontSize: "9px", fontWeight: 700 },
  histogramWrapper: { flex: 2.2, background: "#0f1117", display: "flex", flexDirection: "column", overflow: "hidden" },
  histogramHeader: { background: "#141822", padding: "6px 12px", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", justifyContent: "space-between" },
  histogramTitle: { fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" },
  chartArea: { flex: 1, padding: "28px 24px 10px 24px", display: "flex", gap: "28px", alignItems: "flex-end", position: "relative" },
  thresholdLabel: { position: "absolute", right: "12px", background: "#f59e0b", color: "#000", padding: "1px 5px", borderRadius: "2px", fontSize: "8px", fontWeight: "bold", top: "-14px" },
  barContainer: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 2 },
  barTrack: { width: "100%", height: "65px", background: "#111520", position: "relative", border: "1px solid #1e2330", borderRadius: "2px 2px 0 0" },
  barFill: { position: "absolute", bottom: 0, left: 0, right: 0, transition: "height 0.3s" },
  barValue: { position: "absolute", top: "-15px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: 700 },
  weekLabel: { fontSize: "9px", color: "#64748b", fontWeight: "600" },
  rightDock: { background: "#0f1117", display: "flex", flexDirection: "column", overflow: "hidden" },
  summaryCard: { background: "linear-gradient(135deg, #141a29 0%, #0e121d 100%)", borderRadius: "6px", padding: "12px" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" },
  cardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  cardStat: { display: "flex", flexDirection: "column", gap: "2px" },
  cardLabel: { color: "#475569", fontSize: "9px", fontWeight: "700" },
  tabWrapper: { flex: 1, display: "flex", flexDirection: "column", borderBottom: "2px solid #1e2330" },
  tabHeader: { display: "flex", background: "#141822" },
  tabBtn: { flex: 1, background: "transparent", border: "none", padding: "6px 0", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  asgDetailsWrapper: { flex: 1.2, display: "flex", flexDirection: "column", background: "#11141c" },
  asgHeader: { background: "#141822", padding: "6px 12px", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", gap: "6px" },
  asgSummary: { background: "#0d1018", border: "1px solid #1e2330", padding: "8px", borderRadius: "3px" },
  asgStatGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px", color: "#94a3b8" },
  formGroup: { display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" },
  fieldLabel: { fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase" },
  fieldInputReadOnly: { background: "#0d1018", border: "1px solid #1a202c", borderRadius: "2px", padding: "4px 8px", color: "#94a3b8", fontSize: "11px", width: "100%", boxSizing: "border-box" },
  fieldInputEditable: { background: "#0d1018", border: "1px solid #2d3748", borderRadius: "3px", padding: "5px 8px", color: "#fff", fontSize: "11px", width: "100%", boxSizing: "border-box" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(5,7,12,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modalWrapper: { background: "#0f1117", border: "1px solid #2d3748", borderRadius: "4px", width: "400px" },
  modalHeader: { padding: "10px 14px", background: "#141822", borderBottom: "1px solid #2d3748", display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalFooter: { padding: "10px 14px", display: "flex", justifyContent: "flex-end", gap: "8px" },
  btnPrimary: { background: "#378add", color: "#fff", border: "none", padding: "5px 14px", borderRadius: "3px", cursor: "pointer", fontWeight: 600 },
  btnSecondary: { background: "#1e2330", color: "#cbd5e1", border: "1px solid #334155", padding: "4px 12px", borderRadius: "3px", cursor: "pointer" },
  spreadLabelRow: { fontSize: "10px", color: "#94a3b8", display: "flex", justifyContent: "space-between" },
  spreadProgressBarContainer: { height: "6px", background: "#0d1018", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }
};