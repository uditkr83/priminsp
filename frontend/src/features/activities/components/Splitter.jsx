import React from "react";

export default function Splitter({ onMouseDown, isResizingRef }) {
  return (
    <div 
      onMouseDown={onMouseDown}
      style={{ 
        width: "6px",
        cursor: "col-resize",
        background: "#1e2330",
        transition: "background 0.2s",
        position: "relative",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#378ADD"}
      onMouseLeave={(e) => { if(!isResizingRef.current) e.currentTarget.style.background = "#1e2330"; }}
    />
  );
}