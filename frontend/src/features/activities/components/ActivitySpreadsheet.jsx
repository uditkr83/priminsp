import React, { useState, useMemo, useEffect } from "react";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SpreadsheetRow from "./SpreadsheetRow";
import ActivityToolbar from "./ActivityToolbar";
import { initialColumnsConfig, computeColumnOffsets } from "../config/columnsConfig";

export default function ActivitySpreadsheet({ filteredActivities, selectedActivity, onSelectRow, onEditRow, onDeleteRow, filterMode, setFilterMode, searchTerm, setSearchTerm, onAddClick }) {
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("p6_activities_columns_visibility");
    if (saved) {
      try {
        const parsedVisibility = JSON.parse(saved); // mapping object: { [id]: boolean }
        return initialColumnsConfig.map(col => ({
          ...col,
          visible: parsedVisibility[col.id] !== false
        }));
      } catch (e) {
        console.error("Failed to parse column configuration out of localStorage storage sequence.", e);
      }
    }
    return initialColumnsConfig;
  });

  const handleToggleColumnVisibility = (columnId) => {
    setColumns(prevCols => {
      const nextCols = prevCols.map(col => 
        col.id === columnId ? { ...col, visible: col.visible === false ? true : false } : col
      );
      
      const visibilityState = nextCols.reduce((acc, col) => {
        acc[col.id] = col.visible !== false;
        return acc;
      }, {});
      localStorage.setItem("p6_activities_columns_visibility", JSON.stringify(visibilityState));
      
      return nextCols;
    });
  };

  const handleResizeColumn = (columnId, newWidth) => {
    setColumns((prevCols) =>
      prevCols.map((col) => (col.id === columnId ? { ...col, width: Math.max(newWidth, 60) } : col))
    );
  };

  // Filter out columns designated as hidden prior to calculations
  const visibleColumns = useMemo(() => {
    return columns.filter(c => c.visible !== false);
  }, [columns]);

  const computedColumns = useMemo(() => {
    return computeColumnOffsets(visibleColumns);
  }, [visibleColumns]);

  const groupHeaders = useMemo(() => {
    return generateGroupHeaders(computedColumns);
  }, [computedColumns]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Intercept toolbar hierarchy processing directly via component proxy structure */}
      

      <div style={{ flexGrow: 1, overflowX: "auto", overflowY: "auto", position: "relative", width: "100%", height: "100%", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "max-content", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {computedColumns.map((col) => (
              <col key={col.id} style={{ width: `${col.width}px` }} />
            ))}
          </colgroup>
          
          <SpreadsheetHeader 
            columns={computedColumns} 
            groupHeaders={groupHeaders} 
            onResizeColumn={handleResizeColumn} 
          />

          <tbody>
            {filteredActivities.map((activity, index) => (
              <SpreadsheetRow
                key={activity.id || index}
                activity={activity}
                columns={computedColumns}
                isSelected={selectedActivity?.id === activity.id}
                onSelect={onSelectRow}
                onEdit={onEditRow}
                onDelete={onDeleteRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}