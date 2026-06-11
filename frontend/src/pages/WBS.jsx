import { useEffect, useState } from "react";
import API from "../api"; // <-- आपका सेंट्रल API मैनेजर
import { MdEdit, MdDelete } from "react-icons/md";

export default function WBSDashboard() {
  const [wbsItems, setWbsItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWBS();
  }, []);

  const loadWBS = async () => {
    try {
      setLoading(true);
      const response = await API.get("/wbs");
      setWbsItems(response.data || []);
    } catch (err) {
      console.error("Error fetching WBS directory:", err);
      setWbsItems([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("क्या आप वाकई इस WBS एलिमेंट को डिलीट करना चाहते हैं?")) {
      try {
        await API.delete(`/wbs/${id}`);
        setWbsItems(wbsItems.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Error deleting WBS element:", err);
      }
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
      {/* Step 2: Simple & Direct Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <h1
          style={{
            color: "#f8fafc",
            fontSize: "24px",
            fontWeight: 500,
            margin: 0
          }}
        >
          Work Breakdown Structure
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
          onClick={() => alert("Redirecting to create WBS form...")}
        >
          + New WBS
        </button>
      </div>

      {/* Step 3: Transform Table into True Hierarchy Tree View */}
      <div
        style={{
          background: "#0f1117",
          border: "1px solid #1e2330",
          borderRadius: "12px",
          padding: "24px"
        }}
      >
        {loading ? (
          <div style={{ color: "#475569", fontSize: "14px", textAlign: "center", padding: "20px" }}>
            Building architectural WBS tree node maps...
          </div>
        ) : (
          wbsItems
            // 1. सबसे पहले Root Parents निकालो (जिनका parent_wbs_id null है)
            .filter((wbs) => wbs.parent_wbs_id === null || !wbs.parent_wbs_id)
            .map((parent) => (
              <div
                key={parent.id}
                style={{ 
                  marginBottom: "24px", 
                  background: "#11141d60", 
                  padding: "16px", 
                  borderRadius: "8px",
                  border: "1px solid #1a202c"
                }}
              >
                {/* Parent Container Block */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: "16px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span style={{ color: "#378ADD", fontFamily: "monospace", fontSize: "12px", fontWeight: "normal" }}>
                      [{parent.wbs_code}]
                    </span>
                    📁 {parent.wbs_name}
                  </div>
                  
                  {/* Inline Action Triggers for Parent */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <MdEdit size={14} style={{ color: "#64748b", cursor: "pointer" }} onClick={() => alert(`Edit ${parent.wbs_code}`)} />
                    <MdDelete size={14} style={{ color: "#E24B4A", cursor: "pointer" }} onClick={() => handleDelete(parent.id)} />
                  </div>
                </div>

                {/* 2. अब इस Parent से लिंक्ड Children (Sub-WBS) को रेंडर करो */}
                {wbsItems
                  .filter((child) => child.parent_wbs_id === parent.id)
                  .map((child) => (
                    <div
                      key={child.id}
                      style={{
                        marginLeft: "32px",
                        marginTop: "14px",
                        padding: "8px 12px",
                        background: "#0d101860",
                        borderRadius: "6px",
                        borderLeft: "2px dashed #2d3748",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span style={{ color: "#64748b" }}>└──</span>
                        <span style={{ color: "#EF9F27", fontFamily: "monospace", fontSize: "11px" }}>
                          [{child.wbs_code}]
                        </span>
                        📂 {child.wbs_name}
                      </div>

                      {/* Inline Action Triggers for Child */}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <MdEdit size={13} style={{ color: "#475569", cursor: "pointer" }} onClick={() => alert(`Edit ${child.wbs_code}`)} />
                        <MdDelete size={13} style={{ color: "#E24B4A", cursor: "pointer" }} onClick={() => handleDelete(child.id)} />
                      </div>
                    </div>
                  ))}
              </div>
            ))
        )}

        {/* Fallback Condition if Array is Empty */}
        {!loading && wbsItems.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#475569" }}>
            No structured nodes found. Create a root WBS to begin the layout tree.
          </div>
        )}
      </div>
    </div>
  );
}