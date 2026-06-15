import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdAccountTree,
  MdCheckBox,
  MdCallSplit,
  MdCalendarMonth,
  MdBarChart,
  MdFolderOpen,
  MdSettings,
  MdHelpOutline,
  MdSearch,
  MdMoreVert,
  MdMenu,
} from "react-icons/md";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/", icon: MdDashboard, label: "Dashboard" }],
  },
  {
    label: "Project",
    items: [
      { to: "/projects", icon: MdAccountTree, label: "Projects", badge: "4", badgeColor: "blue" },
      { to: "/wbs", icon: MdFolderOpen, label: "WBS" },
      { to: "/activities", icon: MdCheckBox, label: "Activities", badge: "12", badgeColor: "green" },
      { to: "/relationships", icon: MdCallSplit, label: "Relationships" },
    ],
  },
  {
    label: "Planning",
    items: [
      { to: "/schedule", icon: MdCalendarMonth, label: "Schedule" },
      { to: "/gantt", icon: MdBarChart, label: "Gantt" },
    ],
  },
];

const FOOTER_ITEMS = [
  { to: "/settings", icon: MdSettings, label: "Settings" },
  { to: "/help", icon: MdHelpOutline, label: "Help & support" },
];

function NavItem({ to, icon: Icon, label, badge, badgeColor, active, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : ""} 
      style={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? "0px" : "10px",
        padding: "8px 10px",
        borderRadius: "6px",
        marginBottom: "3px", 
        cursor: "pointer",
        background: active ? "rgba(55, 138, 221, 0.12)" : "transparent",
        border: active ? "1px solid rgba(55, 138, 221, 0.25)" : "1px solid transparent",
        position: "relative",
        transition: "all 0.2s ease",
        textDecoration: "none",
        userSelect: "none",
        justifyContent: collapsed ? "center" : "flex-start",
        boxSizing: "border-box"
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "18px",
            background: "#378ADD",
            borderRadius: "0 3px 3px 0",
          }}
        />
      )}
      <Icon
        style={{
          fontSize: "18px",
          color: active ? "#378ADD" : "#64748b",
          flexShrink: 0,
          width: "18px",
        }}
      />
      
      <span
        style={{
          fontSize: "13px",
          color: active ? "#e2e8f0" : "#94a3b8",
          fontWeight: active ? 500 : 400,
          flex: 1,
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          transition: "opacity 0.15s ease, max-width 0.15s ease",
        }}
      >
        {label}
      </span>

      {badge && !collapsed && (
        <span
          style={{
            background: badgeColor === "green" ? "#1D9E75" : "#185FA5",
            color: badgeColor === "green" ? "#9FE1CB" : "#B5D4F4",
            fontSize: "10px",
            fontWeight: 500,
            padding: "2px 7px",
            borderRadius: "10px",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const activePath = location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        width: collapsed ? "64px" : "260px",
        height: "100vh",
        background: "#0f1117",
        borderRight: "1px solid #1e2330",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        flexShrink: 0,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden"
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "20px 12px",
          borderBottom: "1px solid #1e2330",
          height: "69px",
          boxSizing: "border-box"
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "#185FA5",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MdDashboard style={{ color: "#fff", fontSize: "18px" }} />
            </div>
            <div style={{ whiteSpace: "nowrap" }}>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#f1f5f9", letterSpacing: "0.01em" }}>
                PlanMaster
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Enterprise
              </div>
            </div>
          </div>
        )}
        
        <MdMenu
          onClick={() => setCollapsed(!collapsed)}
          style={{
            color: "#94a3b8",
            fontSize: "22px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Navigation Filter Search Bar Input */}
      <div 
        style={{ 
          margin: "12px", 
          position: "relative",
          height: "32px",
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-start"
        }}
      >
        <MdSearch
          onClick={() => collapsed && setCollapsed(false)}
          title={collapsed ? "Search" : ""} 
          style={{
            position: collapsed ? "static" : "absolute",
            left: "9px",
            top: "50%",
            transform: collapsed ? "none" : "translateY(-50%)",
            color: "#475569",
            fontSize: "18px",
            cursor: collapsed ? "pointer" : "none",
            alignSelf: "center",
          }}
        />
        
        <input
          type="text"
          placeholder="Search..."
          style={{
            width: "100%",
            background: "#1a1f2e",
            border: "1px solid #1e2330",
            borderRadius: "6px",
            padding: "7px 10px 7px 32px",
            fontSize: "12px",
            color: "#94a3b8",
            outline: "none",
            boxSizing: "border-box",
            display: collapsed ? "none" : "block",
          }}
        />
      </div>

      {/* Main Navigation Items Stack Container */}
      <div style={{ flex: 1, padding: collapsed ? "0 10px" : "0 8px", overflowY: "auto", overflowX: "hidden" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "#475569",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "10px 8px 4px",
                display: collapsed ? "none" : "block",
              }}
            >
              {section.label}
            </span>

            {section.items.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={activePath === item.to}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}

        <div style={{ height: "1px", background: "#1e2330", margin: "8px 4px" }} />

        {FOOTER_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            active={activePath === item.to}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User Session Footer Control */}
      <div style={{ padding: "8px", borderTop: "1px solid #1e2330" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? "0px" : "10px",
            padding: "8px 6px",
            borderRadius: "6px",
            cursor: "default",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#185FA5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 500,
              color: "#B5D4F4",
              flexShrink: 0,
            }}
          >
            UKV
          </div>

          <div style={{ flex: 1, minWidth: 0, display: collapsed ? "none" : "block" }}>
            <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Udit Kumar Verma</div>
            <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Operation Associate</div>
          </div>
          
          {!collapsed && <MdMoreVert style={{ color: "#475569", fontSize: "18px", cursor: "pointer" }} />}
        </div>
      </div>
    </div>
  );
}