import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

// Your newly styled, upgraded premium page dashboard components
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import WBS from "./pages/WBS";
import Activities from "./pages/Activities";
import Relationships from "./pages/Relationships";
import Schedule from "./pages/Schedule";
import Gantt from "./pages/Gantt";

// 🔥 Added: Primavera Resource Management Grid Component
import PrimaveraUltimateManager from "./pages/ResourcePage"; 

// 📅 Added: Enterprise Calendar Administration Engine Component
import CalendarPage from "./pages/CalendarPage";

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", background: "#0d1018", minHeight: "100vh" }}>
        
        {/* Persistent Premium Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Page Router Outlet Panel */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          height: "100vh",
          boxSizing: "border-box"
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/wbs" element={<WBS />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/relationships" element={<Relationships />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/gantt" element={<Gantt />} />
            
            {/* Connected: Sidebar '/resources' URL directly maps here now */}
            <Route path="/resources" element={<PrimaveraUltimateManager />} />

            {/* 📅 Connected: Enterprise Calendar Router Link */}
            <Route path="/calendars" element={<CalendarPage />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;