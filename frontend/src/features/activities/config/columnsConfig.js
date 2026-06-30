export const initialColumnsConfig = [
  { id: "id", label: "ID", width: 60, frozen: true, group: "Structure", align: "left" },
  { id: "wbs_code", label: "WBS Code", width: 160, frozen: true, group: "Structure", align: "left" },
  { id: "activity_code", label: "Activity Code", width: 120, frozen: true, group: "Activity Definition & Logic", align: "left" },
  { id: "constraint", label: "Constraint", width: 100, frozen: true, group: "Activity Definition & Logic", align: "left" },
  { id: "activity_name", label: "Activity Name", width: 240, frozen: true, group: "Activity Definition & Logic", align: "left", borderRight: "1px solid #1e2330" },
  { id: "duration", label: "Original", width: 80, frozen: false, group: "Durations", align: "center" },
  { id: "remaining_duration", label: "Remain", width: 80, frozen: false, group: "Durations", align: "center", borderRight: "1px solid #1e2330" },
  { id: "start_date", label: "Start", width: 110, frozen: false, group: "Dates", align: "center" },
  { id: "finish_date", label: "Finish", width: 110, frozen: false, group: "Dates", align: "center", borderRight: "1px solid #1e2330" },
  { id: "predecessors", label: "Predecessors", width: 130, frozen: false, group: "Logic Relations", align: "left" },
  { id: "successors", label: "Successors", width: 130, frozen: false, group: "Logic Relations", align: "left", borderRight: "1px solid #1e2330" },
  { id: "progress", label: "Progress %", width: 150, frozen: false, group: "Control Status", align: "left" },
  { id: "status", label: "Status", width: 110, frozen: false, group: "Control Status", align: "center" },
  { id: "action", label: "Action", width: 90, frozen: false, group: "Control Status", align: "center" }
];

export const computeColumnOffsets = (columns) => {
  let currentOffset = 0;
  return columns.map((col) => {
    const calculatedLeft = col.frozen ? currentOffset : undefined;
    if (col.frozen && col.visible !== false) {
      currentOffset += col.width;
    }
    return { ...col, leftOffset: calculatedLeft };
  });
};