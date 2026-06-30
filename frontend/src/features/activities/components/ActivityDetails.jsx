import React from "react";
import { MdEdit } from "react-icons/md";
import { formatPrimaveraDate } from "../utils/formatDate";

export default function ActivityDetails({ selectedActivity, activeTab, setActiveTab, onEditClick, widthPercent }) {
  return (
    <div 
      style={{ 
        width: `${100 - widthPercent}%`,
        minWidth: "15%",
        background: "#0f121d", 
        border: "1px solid #1e2330", 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      <div style={{ padding: "12px 16px", background: "#090b11", borderBottom: "1px solid #1e2330", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{selectedActivity.activity_code} Details</span>
        <button onClick={(e) => onEditClick(selectedActivity, e)} style={{ background: "#1e293b", border: "none", color: "#e2e8f0", padding: "4px 8px", borderRadius: "3px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}><MdEdit size={12}/> Edit</button>
      </div>

      <div style={{ display: "flex", background: "#090b11", borderBottom: "1px solid #1e2330", flexShrink: 0 }}>
        {["General", "Status"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "#0f121d" : "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #378ADD" : "2px solid transparent", color: activeTab === tab ? "#378ADD" : "#64748b", padding: "8px 16px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}>{tab}</button>
        ))}
      </div>

      <div style={{ flexGrow: 1, padding: "16px", overflowY: "auto", fontSize: "12px" }}>
        {activeTab === "General" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Name Scope</label>
              <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#e2e8f0", wordBreak: "break-all" }}>{selectedActivity.activity_name}</div>
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Activity Type</label>
              <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#cbd5e1", fontWeight: 700 }}>{selectedActivity.activity_type || "Task"}</div>
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Constraint Configuration</label>
              <div style={{ background: "#090b11", border: "1px solid #1e2330", padding: "8px", color: "#fbbf24", fontFamily: "monospace" }}>
                Type: {selectedActivity.constraint_type || "None (ASAP)"} <br />
                Date: {selectedActivity.constraint_date ? formatPrimaveraDate(selectedActivity.constraint_date) : "-"}
              </div>
            </div>
          </div>
        )}
        {activeTab === "Status" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Project Dates</label>
              <div style={{ color: "#cbd5e1" }}>Start: {formatPrimaveraDate(selectedActivity.start_date)}</div>
              <div style={{ color: "#cbd5e1" }}>Finish: {formatPrimaveraDate(selectedActivity.finish_date)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}