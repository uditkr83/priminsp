import React from "react";

export default function ActivityModal({ isEditMode, form, setForm, lastTaskDuration, setLastTaskDuration, onClose, onSave }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(5, 6, 10, 0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 500 }}>
      <div style={{ background: "#0f121d", border: "1px solid #1e2330", borderRadius: "6px", width: "460px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#f1f5f9" }}>{isEditMode ? `Edit Node: ${form.activity_code}` : "Create Logic Activity Node"}</h3>
        
        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
            <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid #1e2330", color: "#64748b", padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
            <button type="submit" style={{ background: "#378ADD", border: "none", color: "white", padding: "6px 16px", fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}