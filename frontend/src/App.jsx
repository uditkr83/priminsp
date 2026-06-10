import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import WBS from "./pages/WBS";
import Activities from "./pages/Activities";
import Relationships from "./pages/Relationships";
import Schedule from "./pages/Schedule";
import Gantt from "./pages/Gantt";

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex" }}>
        <Sidebar />

        <div style={{ padding: "20px", flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/projects"
              element={<Projects />}
            />
            <Route
  path="/wbs"
  element={<WBS />}
/>

            <Route
              path="/activities"
              element={<Activities />}
            />
            <Route
  path="/relationships"
  element={<Relationships />}
/>
<Route
  path="/schedule"
  element={<Schedule />}
/>
<Route
  path="/gantt"
  element={<Gantt />}
/>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;