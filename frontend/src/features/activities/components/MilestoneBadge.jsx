import React from "react";

export default function MilestoneBadge({ type }) {
  const isStart = type === "Start Milestone";
  return (
    <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, background: isStart ? "#2563eb" : "#9333ea", color: "#fff", display: "inline-flex", alignItems: "center", gap: "3px" }}>
      <span>◆</span> {isStart ? "SM" : "FM"}
    </span>
  );
}