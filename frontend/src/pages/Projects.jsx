import { useEffect, useState, useMemo } from "react";
import API from "../api"; 
import { MdFolderOpen, MdEdit, MdDelete, MdAssignment, MdAssessment, MdFolderSpecial, MdDvr, MdPlayArrow } from "react-icons/md";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🛠️ Modal & Form Fields States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); 
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [projectCode, setProjectCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [managerName, setManagerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [baselineStart, setBaselineStart] = useState("");
  const [baselineFinish, setBaselineFinish] = useState("");
  const [status, setStatus] = useState("Planned");
  const [progress, setProgress] = useState(0); 
  
  // Modal Telemetry States
  const [wbsCount, setWbsCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [relationshipsCount, setRelationshipsCount] = useState(0);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await API.get("/projects");
      setProjects(response.data || []);
    } catch (err) {
      console.error("Error fetching projects directory:", err);
    } finally {
      setLoading(false);
    }
  };

  // 📅 Primavera Date Formatter (e.g., 01-Jun-2026)
  const formatPrimaveraDate = (dateString) => {
    if (!dateString) return "Not Scheduled";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Not Scheduled";
    
    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  // 📊 Dashboard Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === "In Progress").length;
    const totalWbs = projects.reduce((acc, curr) => acc + (parseInt(curr.wbs_count, 10) || 0), 0);
    const totalActivities = projects.reduce((acc, curr) => acc + (parseInt(curr.activity_count, 10) || 0), 0);
    const totalRelationships = projects.reduce((acc, curr) => acc + (parseInt(curr.relationships_count, 10) || 0), 0);

    return { total, active, totalWbs, totalActivities, totalRelationships };
  }, [projects]);

  // 📅 Dynamic Duration
  const projectDuration = useMemo(() => {
    if (!startDate || !finishDate) return "--";
    const start = new Date(startDate);
    const finish = new Date(finishDate);
    const differenceInTime = finish.getTime() - start.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    
    return differenceInDays >= 0 ? `${differenceInDays} Days` : "0 Days";
  }, [startDate, finishDate]);

  // 📝 Modals Handlers
  const openCreateModal = () => {
    setModalMode("create");
    setActiveProjectId(null);
    setProjectCode("");
    setProjectName("");
    setDescription("");
    setManagerName("");
    setStartDate("");
    setFinishDate("");
    setBaselineStart("");
    setBaselineFinish("");
    setStatus("Planned");
    setProgress(0);
    setWbsCount(0);
    setActivityCount(0);
    setRelationshipsCount(0);
    setShowProjectModal(true);
  };

  const openEditModal = (project) => {
    setModalMode("edit");
    setActiveProjectId(project.id);
    setProjectCode(project.project_code || "");
    setProjectName(project.project_name || "");
    setDescription(project.description || "");
    setManagerName(project.manager_name || "");
    setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
    setFinishDate(project.finish_date ? project.finish_date.split("T")[0] : "");
    setBaselineStart(project.baseline_start ? project.baseline_start.split("T")[0] : "");
    setBaselineFinish(project.baseline_finish ? project.baseline_finish.split("T")[0] : "");
    setStatus(project.status || "Planned");
    setProgress(project.progress || 0);
    setWbsCount(project.wbs_count || 0);
    setActivityCount(project.activity_count || 0);
    setRelationshipsCount(project.relationships_count || 0);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectCode.trim() || !projectName.trim()) {
      alert("Validation Exception: Project Code & Name values are strictly required.");
      return;
    }

    const payload = {
      project_code: projectCode,
      project_name: projectName,
      description,
      manager_name: managerName,
      start_date: startDate || null,
      finish_date: finishDate || null,
      baseline_start: baselineStart || null,
      baseline_finish: baselineFinish || null,
      status,
      progress: parseFloat(progress) || 0
    };

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/projects", payload);
      } else {
        await API.put(`/projects/${activeProjectId}`, payload);
      }
      setShowProjectModal(false);
      loadProjects();
    } catch (err) {
      console.error("Mutation failed executing state persist processing workflow:", err);
      alert("Transaction payload processing system error runtime exception.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project baseline configuration permanently?")) {
      try {
        await API.delete(`/projects/${id}`);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err) {
        console.error("Delete sequence mapping exception:", err);
      }
    }
  };

  const getStatusStyle = (project) => {
    const wbs = parseInt(project.wbs_count, 10) || 0;
    const act = parseInt(project.activity_count, 10) || 0;
    
    if (wbs === 0 && act === 0) {
      return { label: "Setup Required", bg: "#1e293b", border: "#475569", text: "#94a3b8" };
    }

    const currentStatus = project.status || "Planned";
    switch (currentStatus) {
      case "Completed":
        return { label: "Completed", bg: "#042f1a", border: "#10b981", text: "#34d399" };
      case "In Progress":
        return { label: "In Progress", bg: "#362005", border: "#f59e0b", text: "#fbbf24" };
      case "Planned":
        return { label: "Planned", bg: "#3b0712", border: "#ef4444", text: "#f87171" };
      case "On Hold":
      default:
        return { label: currentStatus, bg: "#2d124d", border: "#a855f7", text: "#c084fc" };
    }
  };

  return (
    <div
      style={{
        background: "#090d16",
        minHeight: "100vh",
        padding: "24px 32px",
        fontFamily: "Inter, -apple-system, sans-serif",
        color: "#e2e8f0",
        boxSizing: "border-box"
      }}
    >
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Enterprise Directory
          </div>
          <h1 style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 600, marginTop: "4px", marginBottom: 0, letterSpacing: "-0.5px" }}>
            Projects Workspace Matrix
          </h1>
        </div>

        <button
          style={{
            background: "#185FA5", border: "none", color: "white", padding: "8px 16px",
            borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "13px",
            boxShadow: "0 2px 4px rgba(24,95,165,0.3)"
          }}
          onClick={openCreateModal}
        >
          + New Project baseline
        </button>
      </div>

      {/* 📊 Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { title: "Total Projects", value: metrics.total, icon: <MdFolderSpecial size={18} color="#3b82f6" />, bg: "#0f162a" },
          { title: "Active Projects", value: metrics.active, icon: <MdPlayArrow size={18} color="#38bdf8" />, bg: "#081b2e" },
          { title: "WBS Elements", value: metrics.totalWbs, icon: <MdAssignment size={18} color="#10b981" />, bg: "#061c14" },
          { title: "Total Activities", value: metrics.totalActivities, icon: <MdAssessment size={18} color="#f59e0b" />, bg: "#1c150c" },
          { title: "Total Relationships", value: metrics.totalRelationships, icon: <MdDvr size={18} color="#a855f7" />, bg: "#170f26" }
        ].map((card, idx) => (
          <div key={idx} style={{ background: card.bg, border: "1px solid #1e293b", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>{card.title}</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>{card.value}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Table Area */}
      <div style={{ background: "#0f1322", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
          Active EPS Control Catalog ({projects.length})
        </div>
        
        {/* Horizontal scroll container for safety */}
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ background: "#070a12" }}>
                <th style={{ width: "60px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>ID</th>
                <th style={{ width: "120px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Code</th>
                {/* 1366px Optimized Pixel Budget Settings */}
                <th style={{ minWidth: "280px", width: "auto", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Project Baseline Structure</th>
                <th style={{ width: "140px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Manager</th>
                <th style={{ width: "140px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Progress</th>
                <th style={{ width: "140px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "left", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Status</th>
                <th style={{ width: "70px", padding: "14px 16px", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "center", textTransform: "uppercase", borderBottom: "2px solid #1e293b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
                    Loading active enterprise directory paths telemetry...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                    No active structures returned from remote instance mapping.
                  </td>
                </tr>
              ) : (
                projects.map((project, index) => {
                  const badge = getStatusStyle(project);

                  return (
                    <tr key={project.id} style={{ borderTop: "1px solid #161b26", background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "#475569", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        #{project.id}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                        {project.project_code}
                      </td>
                      
                      {/* Primavera 3-line Content Grid */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <MdFolderOpen style={{ fontSize: "18px", color: "#3b82f6", marginTop: "2px", flexShrink: 0 }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>
                              {project.project_name}
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", fontWeight: 500, whiteSpace: "nowrap" }}>
                              {formatPrimaveraDate(project.start_date)} <span style={{ color: "#475569" }}>→</span> {formatPrimaveraDate(project.finish_date)}
                            </span>
                            {project.description && (
                              <span style={{ fontSize: "11px", color: "#475569", fontWeight: 400, marginTop: "1px", lineHeight: "14px" }}>
                                {project.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Manager */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#cbd5e1" }}>
                        {project.manager_name || "Unassigned"}
                      </td>

                      {/* Progress Bar Column */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "100%", background: "#1e293b", borderRadius: "20px", height: "6px", overflow: "hidden" }}>
                            <div style={{ width: `${Number(project.progress || 0)}%`, background: "#10b981", height: "100%", borderRadius: "20px" }} />
                          </div>
                          {/* 🛠️ CRITICAL FIX: Safe String-to-Number casting to avoid crashing */}
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#10b981", fontWeight: 600, flexShrink: 0 }}>
                            {Number(project.progress || 0).toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ 
                          background: badge.bg, 
                          color: badge.text, 
                          border: `1px solid ${badge.border}`, 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          display: "inline-block",
                          whiteSpace: "nowrap"
                        }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button 
                            onClick={() => openEditModal(project)} 
                            title="Edit Project"
                            style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", padding: "5px", borderRadius: "4px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                          >
                            <MdEdit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(project.id)} 
                            title="Delete Project"
                            style={{ background: "transparent", border: "1px solid #521622", color: "#e11d48", padding: "5px", borderRadius: "4px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚙️ PRIMAVERA WIZARD MODAL */}
      {showProjectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(3, 7, 18, 0.82)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ width: "580px", background: "#0f1322", border: "1px solid #242c42", borderRadius: "12px", padding: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)", maxHeight: "92vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f8fafc", margin: "0 0 20px 0", letterSpacing: "-0.5px" }}>
              {modalMode === "create" ? "Create New Project Configuration baseline" : "Modify Enterprise Project Parameters"}
            </h2>

            <form onSubmit={handleSaveProject}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Project ID / Code</label>
                  <input type="text" placeholder="e.g., METRO-LINE-1" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} autoFocus />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Project Name</label>
                  <input type="text" placeholder="e.g., Underground Tunnel System" value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Scope / Description</label>
                <textarea rows="2" placeholder="Describe the structural architectural boundaries of this node execution strategy..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box", resize: "none" }} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Manager Name</label>
                <input type="text" placeholder="e.g., Udit Sharma" value={managerName} onChange={(e) => setManagerName(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Scheduled Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Scheduled Finish Date</label>
                  <input type="date" value={finishDate} onChange={(e) => setFinishDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Baseline Start Target</label>
                  <input type="date" value={baselineStart} onChange={(e) => setBaselineStart(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Baseline Finish Target</label>
                  <input type="date" value={baselineFinish} onChange={(e) => setBaselineFinish(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Operations Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#070a12", border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc", fontSize: "13px", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#475569", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Auto-Calculated Progress (%)</label>
                  <input type="number" disabled value={progress} style={{ width: "100%", padding: "8px 12px", background: "#0b0f19", border: "1px solid #1e293b", borderRadius: "6px", color: "#10b981", fontSize: "13px", outline: "none", boxSizing: "border-box", cursor: "not-allowed", fontWeight: 600 }} />
                </div>
              </div>

              {/* Stats Block */}
              {modalMode === "edit" && (
                <div style={{ background: "#070a12", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px 14px", marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>WBS Nodes</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>{wbsCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>Activities</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#a855f7", marginTop: "4px" }}>{activityCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>Relations</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>{relationshipsCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>Duration</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8", marginTop: "4px", whiteSpace: "nowrap" }}>{projectDuration}</div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowProjectModal(false)} style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: "#185FA5", border: "none", color: "white", padding: "8px 14px", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Processing Payload..." : "Commit Structure Baseline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}