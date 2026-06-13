import React, { useEffect, useState, useMemo, useCallback } from "react";
import API from "../api";
import { 
  MdEdit, 
  MdDelete, 
  MdChevronRight, 
  MdKeyboardArrowDown, 
  MdDragIndicator, 
  MdAddCircleOutline 
} from "react-icons/md";

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 PERFORMANCE & TREE CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds dynamic Primavera P6 style sequence layouts safely from relational object lists.
 * level 1 -> 1.0, 2.0; level 2 -> 1.1, 1.2; level 3 -> 1.1.1
 */
const computeWBSDisplayNumbers = (items) => {
  const lookups = {};
  items.forEach(item => {
    // FIXED: Corrected single dot to triple dot spread operator
    lookups[item.id] = { ...item, _children: [] };
  });

  const rootNodes = [];
  items.forEach(item => {
    const initializedNode = lookups[item.id];
    if (item.parent_wbs_id === null || !item.parent_wbs_id || !lookups[item.parent_wbs_id]) {
      rootNodes.push(initializedNode);
    } else {
      lookups[item.parent_wbs_id]._children.push(initializedNode);
    }
  });

  const sortBySequenceOrder = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
  rootNodes.sort(sortBySequenceOrder);
  
  const finalDisplayMap = new Map();

  const traverseAndLabel = (nodes, parentString = "") => {
    nodes.forEach((node, index) => {
      const naturalIndex = index + 1;
      let displayCode = parentString ? `${parentString}.${naturalIndex}` : `${naturalIndex}.0`;
      
      finalDisplayMap.set(node.id, displayCode);
      
      if (node._children.length > 0) {
        node._children.sort(sortBySequenceOrder);
        const inheritancePrefix = parentString ? displayCode : `${naturalIndex}`;
        traverseAndLabel(node._children, inheritancePrefix);
      }
    });
  };

  traverseAndLabel(rootNodes);
  return finalDisplayMap;
};

/**
 * Validates drag-and-drop structural updates to prevent circular hierarchies.
 */
const detectIsCircularityPresent = (draggedId, targetDropParentId, items) => {
  if (!targetDropParentId) return false;
  if (draggedId === targetDropParentId) return true;

  const itemMap = new Map(items.map(item => [item.id, item]));
  let activeCursor = itemMap.get(targetDropParentId);

  while (activeCursor) {
    if (activeCursor.parent_wbs_id === draggedId) {
      return true; 
    }
    activeCursor = activeCursor.parent_wbs_id ? itemMap.get(activeCursor.parent_wbs_id) : null;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🌳 MEMOIZED RECURSIVE NODE VIEW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const WBSNode = React.memo(({ 
  node, 
  allItems, 
  depth, 
  wbsNumberMap, 
  collapsedState, 
  toggleCollapse, 
  onEditInitiate, 
  onDeleteRequest,
  onNodeMove,
  onQuickAdd,
  draggedNodeId,
  setDraggedNodeId
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPositionIndicator, setDropPositionIndicator] = useState(null); 

  const childNodes = useMemo(() => {
    return allItems
      .filter((item) => item.parent_wbs_id === node.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [allItems, node.id]);

  const isCollapsed = !!collapsedState[node.id];
  const wbsDisplayLabel = wbsNumberMap.get(node.id) || "";
  const baseMarginOffset = depth === 0 ? 0 : 24;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedNodeId(node.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (draggedNodeId === node.id) return;

    const clientBoundingRect = e.currentTarget.getBoundingClientRect();
    const cursorYOffset = e.clientY - clientBoundingRect.top;
    
    if (cursorYOffset < clientBoundingRect.height * 0.3) {
      setDropPositionIndicator("above");
    } else {
      setDropPositionIndicator("inside");
    }
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setDropPositionIndicator(null);
  };

  const handleDropEvent = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const originSourceId = draggedNodeId;
    setDraggedNodeId(null);

    if (!originSourceId || originSourceId === node.id) return;

    const intendedParentId = dropPositionIndicator === "inside" ? node.id : node.parent_wbs_id;
    if (detectIsCircularityPresent(originSourceId, intendedParentId, allItems)) {
      alert("Invalid Operation: Circular reference logic breakdown prevented.");
      setDropPositionIndicator(null);
      return;
    }

    onNodeMove(originSourceId, intendedParentId, dropPositionIndicator === "above" ? node.sort_order : (node.sort_order || 0) + 1);
    setDropPositionIndicator(null);
  };

  return (
    <div 
      style={{ 
        marginLeft: `${baseMarginOffset}px`, 
        marginTop: depth === 0 ? "8px" : "4px",
        position: "relative" 
      }}
    >
      {isDragOver && dropPositionIndicator === "above" && (
        <div style={{
          position: "absolute", top: "-2px", left: 0, right: 0, height: "3px",
          background: "#38bdf8", zIndex: 10, borderRadius: "2px"
        }} />
      )}

      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: isDragOver && dropPositionIndicator === "inside" ? "#1e293b" : depth === 0 ? "#111622" : "#161b26",
          padding: depth === 0 ? "14px 16px" : "10px 12px",
          borderRadius: "6px",
          border: depth === 0 ? "1px solid #1e293b" : "1px solid #161b26",
          borderLeft: depth === 0 ? "4px solid #185FA5" : "2px dashed #334155",
          transition: "background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          cursor: "grab"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <div style={{ color: "#475569", display: "flex", alignItems: "center", cursor: "pointer" }}>
            <MdDragIndicator size={16} />
          </div>

          {childNodes.length > 0 ? (
            <div 
              onClick={() => toggleCollapse(node.id)} 
              style={{ cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
            >
              {isCollapsed ? <MdChevronRight size={18} /> : <MdKeyboardArrowDown size={18} />}
            </div>
          ) : (
            <div style={{ width: "18px" }} />
          )}

          <span style={{ 
            color: "#0284c7", 
            fontFamily: "monospace", 
            fontSize: "12px", 
            fontWeight: "600",
            background: "#0c4a6e",
            padding: "2px 6px",
            borderRadius: "4px"
          }}>
            {wbsDisplayLabel}
          </span>

          <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: "11px" }}>
            [{node.wbs_code}]
          </span>

          <span style={{ color: depth === 0 ? "#f8fafc" : "#cbd5e1", fontSize: "14px", fontWeight: depth === 0 ? "600" : "500" }}>
            {node.wbs_name}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <MdAddCircleOutline 
            size={16} 
            title="Create Child Sub Node"
            style={{ color: "#10b981", cursor: "pointer" }} 
            onClick={() => onQuickAdd(node.id)}
          />
          <MdEdit 
            size={15} 
            style={{ color: "#64748b", cursor: "pointer" }} 
            onClick={() => onEditInitiate(node)} 
          />
          <MdDelete 
            size={15} 
            style={{ color: "#f43f5e", cursor: "pointer" }} 
            onClick={() => onDeleteRequest(node.id)} 
          />
        </div>
      </div>

      {childNodes.length > 0 && !isCollapsed && (
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px",
          marginTop: "4px"
        }}>
          {childNodes.map((child) => (
            <WBSNode
              key={child.id}
              node={child}
              allItems={allItems}
              depth={depth + 1}
              wbsNumberMap={wbsNumberMap}
              collapsedState={collapsedState}
              toggleCollapse={toggleCollapse}
              onEditInitiate={onEditInitiate}
              onDeleteRequest={onDeleteRequest}
              onNodeMove={onNodeMove}
              onQuickAdd={onQuickAdd}
              draggedNodeId={draggedNodeId}
              setDraggedNodeId={setDraggedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

WBSNode.displayName = "WBSNode";

// ─────────────────────────────────────────────────────────────────────────────
// 🖥️ MAIN ENTERPRISE COMPONENT WORKSPACE CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
export default function WBSDashboard() {
  const [wbsItems, setWbsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState(null);

  const [modalMode, setModalMode] = useState("create"); 
  const [activeEditingId, setActiveEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [wbsCode, setWbsCode] = useState("");
  const [wbsName, setWbsName] = useState("");
  const [parentWbsId, setParentWbsId] = useState("");
  const [saving, setSaving] = useState(false);

  const [collapsedNodes, setCollapsedNodes] = useState({});

  useEffect(() => {
    loadWBS();
  }, []);

  const loadWBS = async () => {
    try {
      setLoading(true);
      const response = await API.get("/wbs");
      setWbsItems(response.data || []);
    } catch (err) {
      console.error("Critical Failure fetching layout records catalog:", err);
      setWbsItems([]);
    } finally {
      setLoading(false);
    }
  };

  const calculatedWBSNumbersMap = useMemo(() => {
    return computeWBSDisplayNumbers(wbsItems);
  }, [wbsItems]);

  const handleToggleCollapse = useCallback((id) => {
    // FIXED: Corrected single dot to triple dot spread operator
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setActiveEditingId(null);
    setWbsCode("");
    setWbsName("");
    setParentWbsId("");
    setShowModal(true);
  };

  const handleQuickAddChild = useCallback((parentId) => {
    setModalMode("create");
    setActiveEditingId(null);
    setWbsCode("");
    setWbsName("");
    setParentWbsId(parentId.toString());
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((node) => {
    setModalMode("edit");
    setActiveEditingId(node.id);
    setWbsCode(node.wbs_code);
    setWbsName(node.wbs_name);
    setParentWbsId(node.parent_wbs_id ? node.parent_wbs_id.toString() : "");
    setShowModal(true);
  }, []);

  const handleFormSubmissionSubmit = async (e) => {
    e.preventDefault();
    if (!wbsCode.trim() || !wbsName.trim()) {
      alert("Validation Exception: WBS Identifier code and label values required.");
      return;
    }

    const assignedParentId = parentWbsId ? parseInt(parentWbsId, 10) : null;

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/wbs", {
          wbs_code: wbsCode,
          wbs_name: wbsName,
          parent_wbs_id: assignedParentId,
          sort_order: wbsItems.length
        });
      } else {
        if (activeEditingId === assignedParentId) {
          alert("Circular hierarchy mapping parameters exception tracking block triggered.");
          setSaving(false);
          return;
        }
        await API.put(`/wbs/${activeEditingId}`, {
          wbs_code: wbsCode,
          wbs_name: wbsName,
          parent_wbs_id: assignedParentId
        });
      }
      setShowModal(false);
      loadWBS();
    } catch (err) {
      console.error("Mutation failed executing state persist processing workflow:", err);
      alert(err.response?.data?.error || "Transaction payload processing system error runtime exception.");
    } finally {
      setSaving(false);
    }
  };

  const handleNodeHierarchyShiftMove = useCallback(async (nodeId, destinationParentId, assignedOrderWeight) => {
    try {
      setWbsItems(prev => prev.map(item => 
        item.id === nodeId 
          ? { ...item, parent_wbs_id: destinationParentId, sort_order: assignedOrderWeight } 
          : item
      ));

      await API.put(`/wbs/${nodeId}`, {
        parent_wbs_id: destinationParentId,
        sort_order: assignedOrderWeight
      });
    } catch (err) {
      console.error("Hierarchy restructuring database update pipeline fault error:", err);
      loadWBS(); 
    }
  }, []);

  const handleDeleteWBSNode = useCallback(async (id) => {
    if (window.confirm("Are you sure you want to delete this WBS element and its sub-nodes?")) {
      try {
        await API.delete(`/wbs/${id}`);
        setWbsItems(prev => prev.filter((item) => item.id !== id && item.parent_wbs_id !== id));
        loadWBS();
      } catch (err) {
        console.error("Delete target node extraction fault occurred:", err);
      }
    }
  }, []);

  const topLevelRootElementsList = useMemo(() => {
    return wbsItems
      .filter((wbs) => wbs.parent_wbs_id === null || !wbs.parent_wbs_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [wbsItems]);

  const selectableParentItemsList = useMemo(() => {
    if (modalMode === "create") return wbsItems;
    return wbsItems.filter(item => item.id !== activeEditingId);
  }, [wbsItems, modalMode, activeEditingId]);

  return (
    <div style={{
      background: "#090d16",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Inter, -apple-system, sans-serif",
      color: "#e2e8f0",
      boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 600, margin: 0, letterSpacing: "-0.5px" }}>
            Work Breakdown Structure (WBS)
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
            PlanMaster Planning Console Engine Architecture
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            background: "#185FA5", border: "none", color: "white", padding: "8px 16px",
            borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "13px",
            boxShadow: "0 2px 4px rgba(24,95,165,0.3)"
          }}
        >
          + Add WBS Element
        </button>
      </div>

      <div style={{
        background: "#0f1322", border: "1px solid #1e293b", borderRadius: "10px", padding: "20px"
      }}>
        {loading ? (
          <div style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "40px" }}>
            Loading workspace mapping telemetry paths...
          </div>
        ) : topLevelRootElementsList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
            No WBS items found. Click "+ Add WBS Element" to establish an entry baseline.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {topLevelRootElementsList.map((rootNodeItem) => (
              <WBSNode
                key={rootNodeItem.id}
                node={rootNodeItem}
                allItems={wbsItems}
                depth={0}
                wbsNumberMap={calculatedWBSNumbersMap}
                collapsedState={collapsedNodes}
                toggleCollapse={handleToggleCollapse}
                onEditInitiate={openEditModal}
                onDeleteRequest={handleDeleteWBSNode}
                onNodeMove={handleNodeHierarchyShiftMove}
                onQuickAdd={handleQuickAddChild}
                draggedNodeId={draggedNodeId}
                setDraggedNodeId={setDraggedNodeId}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(3, 7, 18, 0.82)", backdropFilter: "blur(6px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            width: "440px", background: "#0f1322", border: "1px solid #242c42",
            borderRadius: "12px", padding: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f8fafc", margin: "0 0 16px 0" }}>
              {modalMode === "create" ? "Create New WBS Element" : "Modify Configuration Properties"}
            </h2>

            <form onSubmit={handleFormSubmissionSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>
                  WBS Reference Layer Code
                </label>
                <input
                  type="text"
                  placeholder="e.g., ENG-01"
                  value={wbsCode}
                  onChange={(e) => setWbsCode(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", background: "#070a12",
                    border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc",
                    fontSize: "13px", outline: "none", boxSizing: "border-box"
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>
                  WBS Element Descriptive Title Label
                </label>
                <input
                  type="text"
                  placeholder="e.g., Engineering Phase Design Review"
                  value={wbsName}
                  onChange={(e) => setWbsName(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", background: "#070a12",
                    border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc",
                    fontSize: "13px", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>
                  Parent Node Assignment Path
                </label>
                <select
                  value={parentWbsId}
                  onChange={(e) => setParentWbsId(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", background: "#070a12",
                    border: "1px solid #242c42", borderRadius: "6px", color: "#f8fafc",
                    fontSize: "13px", outline: "none", cursor: "pointer", boxSizing: "border-box"
                  }}
                >
                  <option value="">None (Top-Level Root Layer Node)</option>
                  {selectableParentItemsList.map((wbs) => (
                    <option key={wbs.id} value={wbs.id}>
                      {calculatedWBSNumbersMap.get(wbs.id) ? `(${calculatedWBSNumbersMap.get(wbs.id)}) ` : ""}[{wbs.wbs_code}] {wbs.wbs_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent", border: "1px solid #334155", color: "#94a3b8",
                    padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#185FA5", border: "none", color: "white", padding: "8px 14px",
                    borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px",
                    fontWeight: 600, opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? "Saving Changes..." : "Commit Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}