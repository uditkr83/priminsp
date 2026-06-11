import { useEffect, useState } from "react";
import API from "../api"; // <-- आपका सेंट्रल API मैनेजर इम्पोर्ट
import { MdFolderOpen, MdEdit, MdDelete } from "react-icons/md";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // स्टेटस के हिसाब से डायनेमिक बैकग्राउंड और टेक्स्ट कलर सेट करने के लिए हेल्पर
  const getStatusStyle = (status) => {
    const s = String(status || "Active").toLowerCase();
    if (s === "active" || s === "completed" || s === "success") {
      return { bg: "#05291e", color: "#1D9E75" };
    }
    if (s === "pending" || s === "in progress" || s === "review") {
      return { bg: "#2a1f08", color: "#EF9F27" };
    }
    return { bg: "#2a0d1a", color: "#E24B4A" }; // Closed या Delayed के लिए
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
      {/* Step 2: Clean & Simple Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.08em"
            }}
          >
            Enterprise Directory
          </div>
          <h1
            style={{
              color: "#f8fafc",
              fontSize: "24px",
              fontWeight: 500,
              marginTop: "5px",
              marginBottom: 0
            }}
          >
            Projects
          </h1>
        </div>

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
          onClick={() => alert("Redirecting to create project form...")}
        >
          + New Project
        </button>
      </div>

      {/* Projects Table View Container */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{
          padding: "16px 20px", 
          borderBottom: "1px solid #1e2330", 
          fontSize: "13px", 
          fontWeight: 500, 
          color: "#e2e8f0"
        }}>
          Active Projects Workspace ({projects.length})
        </div>
        
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1018" }}>
              {["System ID", "Project Code", "Project Name", "Operations Status", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "12px 20px", fontSize: "10px", fontWeight: 600,
                  color: "#475569", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase"
                }}>
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
                // Step 4: Fetch Dynamic Status Style
                const currentStatus = project.status || "Active";
                const statusStyle = getStatusStyle(currentStatus);

                return (
                  <tr 
                    key={project.id} 
                    style={{ 
                      borderTop: "1px solid #1e2330",
                      background: index % 2 === 0 ? "transparent" : "#11141d40"
                    }}
                  >
                    {/* Numeric Database ID */}
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                      #{project.id}
                    </td>
                    
                    {/* Clean Project Tracking Code */}
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600, color: "#378ADD" }}>
                      {project.project_code}
                    </td>
                    
                    {/* Full Descriptive Project Title */}
                    <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <MdFolderOpen style={{ fontSize: "16px", color: "#64748b" }} />
                        {project.project_name}
                      </div>
                    </td>

                    {/* Step 4: Styled Dynamic Status Badge */}
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 500,
                          textTransform: "capitalize"
                        }}
                      >
                        {currentStatus}
                      </span>
                    </td>

                    {/* Step 3: Explicit Actions Column */}
                    <td style={{ padding: "14px 20px" }}>
                      <button
                        onClick={() => alert(`Editing project ${project.project_code}`)}
                        style={{
                          background: "transparent",
                          border: "1px solid #334155",
                          color: "#94a3b8",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <MdEdit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        style={{
                          marginLeft: "8px",
                          background: "transparent",
                          border: "1px solid #521622",
                          color: "#E24B4A",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
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
    </div>
  );
}