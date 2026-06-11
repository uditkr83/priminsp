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

function NavItem({ to, icon: Icon, label, badge, badgeColor, active }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: "6px",
        marginBottom: "1px",
        cursor: "pointer",
        background: active ? "#0c2a4a" : "transparent",
        position: "relative",
        transition: "background 0.15s",
        textDecoration: "none", // Keeps HTML anchors clean
        userSelect: "none"
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
            height: "20px",
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
        }}
      >
        {label}
      </span>
      {badge && (
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

  return (
    <div
      style={{
        width: "240px",
        height: "100vh",
        background: "#0f1117",
        borderRight: "1px solid #1e2330",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid #1e2330",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
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
        <div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#f1f5f9", letterSpacing: "0.01em" }}>
            PlanMaster
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Enterprise
          </div>
        </div>
      </div>

      {/* Navigation Filter Search Bar Input */}
      <div style={{ margin: "12px 12px 8px", position: "relative" }}>
        <MdSearch
          style={{
            position: "absolute",
            left: "9px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#475569",
            fontSize: "16px",
            pointerEvents: "none",
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
          }}
        />
      </div>

      {/* Main Navigation Items Stack Container */}
      <div style={{ flex: 1, padding: "0 8px", overflowY: "auto" }}>
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
                display: "block",
              }}
            >
              {section.label}
            </span>
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={activePath === item.to}
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
          />
        ))}
      </div>

      {/* User Session Footer Control */}
      <div style={{ padding: "8px 8px 16px", borderTop: "1px solid #1e2330" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px",
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
            AS
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 500 }}>Udit Kumar Verma</div>
            <div style={{ fontSize: "11px", color: "#475569" }}>Operation Associate</div>
          </div>
          <MdMoreVert style={{ color: "#475569", fontSize: "18px", cursor: "pointer" }} />
        </div>
      </div>
    </div>
  );
}