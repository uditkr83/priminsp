import React from "react";
import { MdDelete, MdEdit, MdLock } from "react-icons/md";
import ConstraintBadge from "./ConstraintBadge";
import ProgressBar from "./ProgressBar";
import MilestoneBadge from "./MilestoneBadge";
import { formatPrimaveraDate } from "../utils/formatDate";

export default function SpreadsheetRow({ activity, columns, isSelected, onSelect, onEdit, onDelete }) {
  const isCritical = activity.is_critical && (activity.percent_complete || 0) < 100;
  const isConstrained = activity.constraint_type && activity.constraint_type !== "ASAP";

  const rawDeps = activity.dependencies || [];
  const predStr = rawDeps.filter(d => d.type === "PRED").map(d => d.target_code).join(", ") || "-";
  const succStr = rawDeps.filter(d => d.type === "SUCC").map(d => d.target_code).join(", ") || "-";

  return (
    <tr 
      onClick={() => onSelect(activity)}
      style={{ 
        borderBottom: "1px solid #1e2330", 
        height: "30px", 
        cursor: "pointer", 
        background: isSelected ? "rgba(55, 138, 221, 0.12)" : isCritical ? "rgba(226, 75, 74, 0.03)" : "transparent"
      }}
    >
      {columns.map((col) => {
        const cellStyle = {
          padding: "0 12px",
          fontSize: "11px",
          textAlign: col.align,
          borderRight: col.borderRight,
          position: col.frozen ? "sticky" : "static",
          left: col.frozen ? `${col.leftOffset}px` : undefined,
          background: isSelected ? "#121926" : "#0f1117",
          zIndex: col.frozen ? 10 : "auto",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        };

        if (col.id === "id") {
          return <td key={col.id} style={{ ...cellStyle, color: "#475569", fontFamily: "monospace" }}>#{activity.id}</td>;
        }
        if (col.id === "wbs_code") {
          return <td key={col.id} style={{ ...cellStyle, fontWeight: 700, color: "#cbd5e1" }}>{activity.wbs_code || `WBS-${activity.wbs_id}`}</td>;
        }
        if (col.id === "activity_code") {
          return <td key={col.id} style={{ ...cellStyle, fontSize: "12px", fontWeight: 700, color: isCritical ? "#E24B4A" : "#378ADD", fontFamily: "monospace" }}>{activity.activity_code}</td>;
        }
        if (col.id === "constraint") {
          return <td key={col.id} style={cellStyle}><ConstraintBadge type={activity.constraint_type} /></td>;
        }
        if (col.id === "activity_name") {
          return (
            <td key={col.id} style={{ ...cellStyle, fontSize: "12px", fontWeight: 500, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", boxShadow: isSelected ? "inset 4px 0 0 #378ADD" : "none" }}>
              {isConstrained && <MdLock style={{ color: "#fbbf24", marginRight: "4px", verticalAlign: "middle" }} title={`Constrained via ${activity.constraint_type}`} />}
              <span style={{ verticalAlign: "middle" }}>{activity.activity_name}</span>
              {activity.activity_type && activity.activity_type !== "Task" && <MilestoneBadge type={activity.activity_type} />}
            </td>
          );
        }
        if (col.id === "duration") {
          return <td key={col.id} style={{ ...cellStyle, color: "#10b981", fontFamily: "monospace" }}>{activity.duration}d</td>;
        }
        if (col.id === "remaining_duration") {
          return <td key={col.id} style={{ ...cellStyle, color: "#f97316", fontFamily: "monospace" }}>{activity.remaining_duration ?? activity.duration}d</td>;
        }
        if (col.id === "start_date") {
          return <td key={col.id} style={{ ...cellStyle, fontFamily: "monospace" }}>{formatPrimaveraDate(activity.start_date)}</td>;
        }
        if (col.id === "finish_date") {
          return <td key={col.id} style={{ ...cellStyle, fontFamily: "monospace" }}>{formatPrimaveraDate(activity.finish_date)}</td>;
        }
        if (col.id === "predecessors") {
          return <td key={col.id} style={{ ...cellStyle, color: "#fbbf24" }}>{predStr}</td>;
        }
        if (col.id === "successors") {
          return <td key={col.id} style={{ ...cellStyle, color: "#fbbf24" }}>{succStr}</td>;
        }
        if (col.id === "progress") {
          return <td key={col.id} style={cellStyle}><ProgressBar percentage={activity.percent_complete} /></td>;
        }
        if (col.id === "status") {
          return (
            <td key={col.id} style={cellStyle}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: activity.status === "Completed" ? "#34d399" : "#fbbf24" }}>{activity.status || "Not Started"}</span>
            </td>
          );
        }
        if (col.id === "action") {
          return (
            <td key={col.id} style={cellStyle}>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                <button onClick={(e) => onEdit(activity, e)} style={{ background: "transparent", border: "none", color: "#378ADD", cursor: "pointer" }}><MdEdit size={12} /></button>
                <button onClick={(e) => onDelete(activity.id, e)} style={{ background: "transparent", border: "none", color: "#E24B4A", cursor: "pointer" }}><MdDelete size={12} /></button>
              </div>
            </td>
          );
        }
        return null;
      })}
    </tr>
  );
}