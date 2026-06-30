import React from "react";

export default function ConstraintBadge({ type }) {
  if (!type || type === "ASAP") return <span style={{ color: "#475569", fontSize: "11px" }}>None</span>;
  const isHard = ["MSO", "MFO"].includes(type);
  const bg = isHard ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)";
  const color = isHard ? "#ef4444" : "#f59e0b";
  return (
    <span style={{ background: bg, color: color, padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, border: `1px solid ${color}30`, fontFamily: "monospace" }}>
      {isHard ? "🔵 " : "🟡 "}{type}
    </span>
  );
}