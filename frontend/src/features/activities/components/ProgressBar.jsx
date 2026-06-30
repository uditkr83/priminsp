import React from "react";

export default function ProgressBar({ percentage }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "100px", minWidth: "60px", background: "#1e293b", height: "4px", overflow: "hidden" }}>
        <div style={{ width: `${percentage || 0}%`, background: "#3b82f6", height: "100%" }} />
      </div>
      <span style={{ fontSize: "10px", color: "#38bdf8", fontFamily: "monospace" }}>{Number(percentage || 0).toFixed(0)}%</span>
    </div>
  );
}