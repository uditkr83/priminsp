import React, { useRef } from "react";

export default function SpreadsheetHeader({ columns, groupHeaders, onResizeColumn }) {
  const resizeInfo = useRef({ columnId: null, startX: 0, startWidth: 0 });

  const handleMouseDown = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    
    resizeInfo.current = {
      columnId: col.id,
      startX: e.clientX,
      startWidth: col.width
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!resizeInfo.current.columnId) return;
    const deltaX = e.clientX - resizeInfo.current.startX;
    const newWidth = resizeInfo.current.startWidth + deltaX;
    onResizeColumn(resizeInfo.current.columnId, newWidth);
  };

  const handleMouseUp = () => {
    resizeInfo.current = { columnId: null, startX: 0, startWidth: 0 };
    document.body.style.userSelect = "unset";
    document.body.style.cursor = "default";
    
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <thead style={{ position: "sticky", top: 0, zIndex: 150, background: "#090b11" }}>
      <tr style={{ borderBottom: "1px solid #1e2330", height: "24px", background: "#0c0f18" }}>
        {groupHeaders.map((group, idx) => (
          <th 
            key={idx}
            colSpan={group.colSpan} 
            style={{ 
              background: "#0c0f18", 
              borderRight: "1px solid #1e2330", 
              fontSize: "9px", 
              color: group.color, 
              textTransform: "uppercase", 
              padding: "0 12px", 
              textAlign: "left"
            }}
          >
            {group.name}
          </th>
        ))}
      </tr>
      <tr style={{ borderBottom: "2px solid #1e2330", height: "28px", background: "#090b11" }}>
        {columns.map((col) => (
          <th 
            key={col.id}
            style={{ 
              padding: "0 12px", 
              fontSize: "9px", 
              color: col.frozen ? (col.id === "id" || col.id === "wbs_code" ? "#475569" : "#378ADD") : "#475569", 
              textAlign: col.align,
              borderRight: col.borderRight,
              position: col.frozen ? "sticky" : "static", 
              left: col.frozen ? `${col.leftOffset}px` : undefined, 
              zIndex: col.frozen ? 120 : "auto", 
              background: "#090b11",
              userSelect: "none"
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: col.align === "center" ? "center" : "flex-start" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col.label}
              </span>
              
              {/* Drag Handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, col)}
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-12px",
                  width: "6px",
                  height: "28px",
                  cursor: "col-resize",
                  zIndex: 160,
                  background: "transparent",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(55, 138, 221, 0.4)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              />
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}