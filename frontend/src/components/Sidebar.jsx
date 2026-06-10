import {
  FaTachometerAlt,
  FaProjectDiagram,
  FaTasks,
  FaLink,
  FaCalendarAlt,
  FaChartBar,
  FaFolderOpen
} from "react-icons/fa";

import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div
      style={{
        width: "250px",
        height: "100vh",
        background: "#111827",
        borderRight: "1px solid #374151",
        boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        padding: "20px",
        color: "white"
      }}
    >
      <h2
        style={{
          color: "#60a5fa",
          fontSize: "32px"
        }}
      >
        PlanMaster
      </h2>

      <div style={{ marginTop: "30px" }}>

        <p>
          <Link
            to="/"
            style={linkStyle}
          >
            <FaTachometerAlt />
            Dashboard
          </Link>
        </p>

        <p>
          <Link
            to="/projects"
            style={linkStyle}
          >
            <FaProjectDiagram />
            Projects
          </Link>
        </p>

        <p>
          <Link
            to="/wbs"
            style={linkStyle}
          >
            <FaFolderOpen />
            WBS
          </Link>
        </p>

        <p>
          <Link
            to="/activities"
            style={linkStyle}
          >
            <FaTasks />
            Activities
          </Link>
        </p>

        <p>
          <Link
            to="/relationships"
            style={linkStyle}
          >
            <FaLink />
            Relationships
          </Link>
        </p>

        <p>
          <Link
            to="/schedule"
            style={linkStyle}
          >
            <FaCalendarAlt />
            Schedule
          </Link>
        </p>

        <p>
          <Link
            to="/gantt"
            style={linkStyle}
          >
            <FaChartBar />
            Gantt
          </Link>
        </p>

      </div>
    </div>
  );
}

const linkStyle = {
  color: "white",
  textDecoration: "none",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  borderRadius: "10px"
};

export default Sidebar;