import React, { useState, useRef, useEffect } from "react";
import { MdSearch, MdAddCircle, MdFilterList, MdViewColumn } from "react-icons/md";

export default function ActivityToolbar({ 
  filterMode, 
  setFilterMode, 
  searchTerm, 
  setSearchTerm, 
  onAddClick,
  columns,
  onToggleColumnVisibility
}) {
  const [isDialogIsOpen, setIsDialogIsOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        setIsDialogIsOpen(false);
      }
    };
    if (isDialogIsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDialogIsOpen]);

  // Group metadata structures for human readable breakdown in selection popup
  const groups = ["Structure", "Activity Definition & Logic", "Durations", "Dates", "Logic Relations", "Control Status"];

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", background: "#0f121d", padding: "16px 20px", borderBottom: "1px solid #1e2330", margin: "-16px -24px 16px -24px", position: "relative" }}>
      <div>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Advanced Planning & Control Matrix</div>
        <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>Project Activities Master Spreadsheet</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", padding: "0 8px", height: "32px" }}>
          <MdFilterList style={{ color: "#64748b" }} />
          <select 
            value={filterMode} 
            onChange={(e) => setFilterMode(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#cbd5e1", fontSize: "12px", outline: "none", cursor: "pointer", fontWeight: 500 }}
          >
            <option value="ALL" style={{ background: "#0f121d" }}>Show: All Activities</option>
            <option value="CONSTRAINED" style={{ background: "#0f121d" }}>Show: Only Constrained</option>
            <option value="CRITICAL" style={{ background: "#0f121d" }}>Show: Only Critical</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#090b11", border: "1px solid #1e2330", borderRadius: "4px", padding: "6px 12px", width: "200px" }}>
          <MdSearch style={{ color: "#475569", fontSize: "16px" }} />
          <input type="text" placeholder="Search code, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", width: "100%" }} />
        </div>

        {/* Columns Option Selector Trigger Button */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setIsDialogIsOpen(!isDialogIsOpen)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            <MdViewColumn size={16} /> Columns
          </button>

          {isDialogIsOpen && (
            <div ref={dialogRef} style={{ position: "absolute", top: "40px", right: 0, width: "280px", background: "#0f121d", border: "1px solid #1e2330", borderRadius: "6px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)", zIndex: 600, padding: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #1e2330", paddingBottom: "6px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primavera P6 Columns</div>
              <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
                {groups.map(group => {
                  const groupCols = columns.filter(c => c.group === group);
                  if (groupCols.length === 0) return null;
                  return (
                    <div key={group} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>{group}</div>
                      {groupCols.map(col => (
                        <label key={col.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer", padding: "2px 0" }}>
                          <input 
                            type="checkbox" 
                            checked={col.visible !== false} 
                            onChange={() => onToggleColumnVisibility(col.id)}
                            style={{ accentColor: "#378ADD", cursor: "pointer" }}
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <button onClick={onAddClick} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#378ADD", border: "none", color: "white", padding: "8px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
          <MdAddCircle size={16} /> Add Activity
        </button>
      </div>
    </div>
  );
}