import { useEffect, useState } from "react";
import API from "../api"; // <-- आपका सेंट्रल API मैनेजर
import { MdFolderOpen, MdEdit, MdDelete } from "react-icons/md";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🛠️ Step 1: Modal और Form Inputs के लिए States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectCode, setProjectCode] = useState("");
  const [projectName, setProjectName] = useState("");
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

  // 💾 New Project Submit Logic (Database Insert + State Sync)
  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectCode.trim() || !projectName.trim()) {
      alert("कृपया Project Code और Name दोनों भरें!");
      return;
    }

    try {
      setSaving(true);
      const newProjectPayload = {
        project_code: projectCode,
        project_name: projectName,
        status: "Active" // डिफ़ॉल्ट स्टेटस
      };

      // एक्सप्रेस बैकएंड पर हिट मारो
      const response = await API.post("/projects", newProjectPayload);
      
      // ग्रिड को बिना रीलोड किए लाइव अपडेट करो
      if (response.data) {
        setProjects([...projects, response.data]);
      } else {
        loadProjects(); // Fallback अगर डायरेक्ट ऑब्जेक्ट वापस नहीं आ रहा
      }

      // फॉर्म रीसेट और मॉडल बंद
      setProjectCode("");
      setProjectName("");
      setShowProjectModal(false);
    } catch (err) {
      console.error("Error creating new project:", err);
      alert("प्रोजेक्ट सेव करने में एरर आया!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("क्या आप वाकई इस प्रोजेक्ट को डिलीट करना चाहते हैं?")) {
      try {
        await API.delete(`/projects/${id}`);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err) {
        console.error("Error deleting project:", err);
      }
    }
  };

  const getStatusStyle = (status) => {
    const s = String(status || "Active").toLowerCase();
    if (s === "active" || s === "completed" || s === "success") {
      return { bg: "#05291e", color: "#1D9E75" };
    }
    if (s === "pending" || s === "in progress" || s === "review") {
      return { bg: "#2a1f08", color: "#EF9F27" };
    }
    return { bg: "#2a0d1a", color: "#E24B4A" };
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
      {/* Clean & Simple Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Enterprise Directory
          </div>
          <h1 style={{ color: "#f8fafc", fontSize: "24px", fontWeight: 500, marginTop: "5px", marginBottom: 0 }}>
            Projects
          </h1>
        </div>

        {/* 🛠️ Step 2: Trigger Modal on Click */}
        <button
          style={{
            background: "#185FA5",
            border: "none",
            color: "white",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "13px",
            transition: "background 0.2s"
          }}
          onClick={() => setShowProjectModal(true)}
        >
          + New Project
        </button>
      </div>

      {/* Projects Table View Container */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
          Active Projects Workspace ({projects.length})
        </div>
        
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1018" }}>
              {["System ID", "Project Code", "Project Name", "Operations Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "12px 20px", fontSize: "10px", fontWeight: 600, color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                  Loading active workspace data...
                </td>
              </tr>
            ) : (
              projects.map((project, index) => {
                const currentStatus = project.status || "Active";
                const statusStyle = getStatusStyle(currentStatus);

                return (
                  <tr key={project.id} style={{ borderTop: "1px solid #1e2330", background: index % 2 === 0 ? "transparent" : "#11141d40" }}>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                      #{project.id}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#378ADD" }}>
                      {project.project_code}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <MdFolderOpen style={{ fontSize: "16px", color: "#64748b" }} />
                        {project.project_name}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 500, textTransform: "capitalize" }}>
                        {currentStatus}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button onClick={() => alert(`Editing project ${project.project_code}`)} style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <MdEdit size={12} /> Edit
                      </button>
                      <button onClick={() => handleDelete(project.id)} style={{ marginLeft: "8px", background: "transparent", border: "1px solid #521622", color: "#E24B4A", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <MdDelete size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
                  No active projects returned from remote instance registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🛠️ Step 3: Upgraded Primavera-Style Dark Modal */}
      {showProjectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(5, 7, 12, 0.85)", // Smooth dark overlay
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: "460px",
              background: "#0f1117",
              border: "1px solid #1e2330",
              borderRadius: "12px",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 500, color: "#f8fafc", margin: "0 0 20px 0" }}>
              Create New Project Wizard
            </h2>

            <form onSubmit={handleSaveProject}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
                  Project ID / Code
                </label>
                <input
                  type="text"
                  placeholder="e.g., P6-RETAIL-01"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#0d1018",
                    border: "1px solid #1e2330",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Commercial Construction Phase 1"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#0d1018",
                    border: "1px solid #1e2330",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setProjectCode("");
                    setProjectName("");
                    setShowProjectModal(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#185FA5",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}