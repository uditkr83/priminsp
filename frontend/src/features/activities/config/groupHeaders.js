export const generateGroupHeaders = (columns) => {
  const groupHeaders = [];
  columns.forEach((col) => {
    const lastGroup = groupHeaders[groupHeaders.length - 1];
    if (lastGroup && lastGroup.name === col.group) {
      lastGroup.colSpan += 1;
    } else {
      let color = "#64748b";
      if (col.group === "Activity Definition & Logic") color = "#378ADD";
      else if (col.group === "Durations") color = "#10b981";
      else if (col.group === "Dates") color = "#e2e8f0";
      else if (col.group === "Logic Relations") color = "#fbbf24";

      groupHeaders.push({
        name: col.group,
        colSpan: 1,
        color: color
      });
    }
  });
  return groupHeaders;
};