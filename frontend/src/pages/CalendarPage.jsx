import { useState, useEffect } from "react"; 
import API from "../api"; 
import {
  MdOutlineFolder,
  MdOutlineFolderOpen,
  MdCalendarToday,
  MdAdd,
  MdContentCopy,
  MdOutlineCelebration,
  MdChevronLeft,
  MdChevronRight,
  MdInfoOutline,
  MdClose,
  MdAccountTree,
  MdViewModule,
  MdViewHeadline
} from "react-icons/md";

// Fallback Mock Data केवल तब दिखेगा जब डेटाबेस पूरी तरह खाली होगा
const FALLBACK_CALENDAR = { 
  id: "CAL-LOADING",
  calendarCode: "LOADING...",
  name: "Loading System Calendars...", 
  type: "Global", 
  category: "Global", 
  hoursPerDay: 8, 
  hoursPerWeek: 40, 
  hoursPerMonth: 160, 
  hoursPerYear: 2000, 
  derivedFrom: "System Base" 
};

export default function CalendarPage() {
  const [calendars, setCalendars] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [shifts, setShifts] = useState([]);
  // Phase 3 - Step 1: Database workdays state
  const [workdays, setWorkdays] = useState([]);
  
  const [selectedCalId, setSelectedCalId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [treeExpanded, setTreeExpanded] = useState({ Global: true, Project: true, Resource: true });
  
  const [viewMode, setViewMode] = useState("Monthly"); 
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); 

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [activeExceptionForm, setActiveExceptionForm] = useState({ date: "", name: "", type: "Holiday", recurring: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch Calendars
      const calRes = await API.get("/calendars");
      
      if (calRes.data && calRes.data.length > 0) {
        const mappedCalendars = calRes.data.map(c => ({
          id: c.id,                      
          calendarCode: c.calendar_code, 
          name: c.calendar_name,
          type: c.calendar_type || "Project",
          category: c.calendar_type || "Project", 
          hoursPerDay: c.hours_per_day || 8,
          hoursPerWeek: c.hours_per_week || 40,
          hoursPerMonth: 160,
          hoursPerYear: 2000,
          derivedFrom: c.derived_from || "None (Root Base)"
        }));

        setCalendars(mappedCalendars);
        setSelectedCalId(mappedCalendars[0].id);
      }

      // 2. Fetch Holidays/Exceptions from Database
      try {
        const holidayRes = await API.get("/calendar/exceptions/1");
        if (holidayRes.data) {
          setHolidays(
            holidayRes.data.map(h => ({
              date: h.exception_date?.split("T")[0],
              name: h.exception_name,
              type: h.exception_type,
              recurring: h.is_recurring
            }))
          );
        }
      } catch (hErr) {
        console.error("Holidays fetch failed, using empty array", hErr);
        setHolidays([]);
      }

      // 3. Fetch Shifts from Database
      try {
        const shiftRes = await API.get("/calendar/shifts/1");
        if (shiftRes.data) {
          setShifts(
            shiftRes.data.map(s => ({
              id: s.id,
              name: s.shift_name,
              start: Number(s.start_hour),
              end: Number(s.end_hour),
              color: s.id === 1 || s.shift_name?.includes("1") ? "#378add" : s.id === 2 || s.shift_name?.includes("2") ? "#10b981" : "#a855f7"
            }))
          );
        }
      } catch (sErr) {
        console.error("Shifts fetch failed, using empty array", sErr);
        setShifts([]);
      }

      // 4. Phase 3 - Step 2 & 3: Fetch Workdays dynamically from backend
      try {
        const workdayRes = await API.get("/calendar/workdays/1");
        if (workdayRes.data && workdayRes.data.length > 0) {
          setWorkdays(workdayRes.data.map(w => w.day_of_week));
        } else {
          setWorkdays([1, 2, 3, 4, 5]); // Fallback if table empty
        }
      } catch (wErr) {
        console.error("Workday fetch failed, fallback to Mon-Fri", wErr);
        setWorkdays([1, 2, 3, 4, 5]);
      }

    } catch (err) {
      console.error("Calendar master bundle load failed from express backend", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCalendar = calendars.find(c => c.id === selectedCalId) || FALLBACK_CALENDAR;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOffset = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);

  const handleDayClick = (dayNum) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const target = holidays.find(h => h.date === formattedDate);

    if (target) {
      setActiveExceptionForm({ ...target });
    } else {
      setActiveExceptionForm({ date: formattedDate, name: "New Schedule Exception Override", type: "Holiday", recurring: false });
    }
    setIsExceptionModalOpen(true);
  };

  // Effective workdays checklist checker with fallback mechanism
  const targetWorkdaysList = workdays.length > 0 ? workdays : [1, 2, 3, 4, 5];

  const calculateStats = () => {
    let workingDays = 0, totalHours = 0, holidayCount = 0;
    if (!activeCalendar) return { workingDays, totalHours, holidayCount };

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dayOfWeek = dateObj.getDay(); 
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const matched = holidays.find(h => h.date === formattedDate);
      
      if (matched) {
        if (matched.type === "Holiday") holidayCount++;
      } else if (targetWorkdaysList.includes(dayOfWeek)) {
        workingDays++;
        totalHours += activeCalendar.hoursPerDay;
      }
    }
    return { workingDays, totalHours, holidayCount };
  };

  const stats = calculateStats();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div style={styles.container}>
      
      {/* FIXED TOP HEADER SECTION */}
      <div style={styles.topHeader}>
        <div style={styles.headerTextWrapper}>
          <div style={{ marginBottom: "6px" }}>
            <span style={styles.headerBadge}>PROJECT CALENDAR MANAGEMENT ENGINE</span>
          </div>
          <h1 style={styles.mainTitle}>Enterprise Calendar Administration Workspace</h1>
          <p style={styles.subTitle}>Manage Global, Project, and Resource Calendars used by the CPM Scheduling Engine</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setViewMode("Monthly")} style={{ ...styles.viewToggleBtn, background: viewMode === "Monthly" ? "#378add" : "#141822", color: "#fff" }}><MdViewHeadline /> Monthly View</button>
          <button onClick={() => setViewMode("Yearly")} style={{ ...styles.viewToggleBtn, background: viewMode === "Yearly" ? "#378add" : "#141822", color: "#fff" }}><MdViewModule /> Year Grid Overview</button>
        </div>
      </div>

      {/* TOP COMMAND ACTION TOOLBAR */}
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <button style={styles.toolbarBtn}><MdAdd size={14} /> New Calendar</button>
          <button style={styles.toolbarBtn}><MdContentCopy size={14} /> Copy Calendar</button>
          <div style={styles.divider} />
          <button style={styles.toolbarBtn} onClick={() => handleDayClick(18)}><MdOutlineCelebration size={14} color="#f97316" /> Declare Exception Event</button>
        </div>
        <div style={styles.searchWrapper}>
          <input type="text" placeholder="Filter Calendar Hierarchies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {/* THREE PANEL SCHEDULING INTERFACE */}
      <div style={styles.workspaceGrid}>
        
        {/* LEFT PANEL: TREE DICTIONARY DIALOG */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}><span>CALENDAR DICTIONARY</span><span style={styles.countBadge}>{calendars.length} Nodes</span></div>
          <div style={styles.panelContent}>
            {isLoading ? (
              <div style={{ color: "#64748b", padding: "10px", textAlign: "center" }}>Fetching database calendars...</div>
            ) : calendars.length === 0 ? (
              <div style={{ color: "#ef4444", padding: "10px", textAlign: "center" }}>No calendars found in database!</div>
            ) : (
              ["Global", "Project", "Resource"].map(cat => (
                <div key={cat} style={{ marginBottom: "6px" }}>
                  <div style={styles.treeFolderRow} onClick={() => setTreeExpanded({ ...treeExpanded, [cat]: !treeExpanded[cat] })}>
                    {treeExpanded[cat] ? <MdOutlineFolderOpen color="#fbbf24" size={13} /> : <MdOutlineFolder color="#fbbf24" size={13} />}
                    <span style={styles.treeFolderLabel}>{cat} Layout Templates</span>
                  </div>
                  
                  {treeExpanded[cat] && calendars.filter(c => c.category.toLowerCase() === cat.toLowerCase() && c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(cal => {
                    const isSelected = cal.id === selectedCalId;
                    return (
                      <div key={cal.id} onClick={() => setSelectedCalId(cal.id)} style={{ ...styles.treeItemRow, background: isSelected ? "rgba(55,138,221,0.15)" : "transparent", boxShadow: isSelected ? "inset 2px 0 0 #378add" : "none" }}>
                        <MdCalendarToday size={12} color={isSelected ? "#378add" : "#64748b"} />
                        <span>{cal.name}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div style={{ ...styles.panel, borderRight: "1px solid #1e2330" }}>
          <div style={styles.panelHeader}>
            <span>WORK WEEK DEFINITION MATRIX ({viewMode.toUpperCase()} BLOCK)</span>
            {viewMode === "Monthly" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button style={styles.navBtn} onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(currentYear - 1)) : setCurrentMonth(currentMonth - 1)}><MdChevronLeft /></button>
                <span style={{ color: "#378add", fontWeight: 700 }}>{monthNames[currentMonth]} {currentYear}</span>
                <button style={styles.navBtn} onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(currentYear + 1)) : setCurrentMonth(currentMonth + 1)}><MdChevronRight /></button>
              </div>
            )}
          </div>
          
          <div style={{ ...styles.panelContent, display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* MONTHLY MATRIX DISPLAY */}
            {viewMode === "Monthly" ? (
              <div style={styles.calendarGrid}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} style={styles.gridDayHeader}>{d}</div>)}
                {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`empty-${i}`} style={styles.gridCellDisabled} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(currentYear, currentMonth, dayNum);
                  const dayOfWeek = dateObj.getDay(); 
                  const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  
                  const matched = holidays.find(h => h.date === formattedDate);
                  // Better Version implementation: direct state validation
                  const isWorking = targetWorkdaysList.includes(dayOfWeek);
                  const isToday = dayNum === 18 && currentMonth === 5 && currentYear === 2026;

                  let cellStyle = { ...styles.gridCellWorking };
                  if (matched) {
                    cellStyle = matched.type === "Holiday" ? { ...styles.gridCellHoliday } : { ...styles.gridCellShutdown };
                  } else if (!isWorking) { cellStyle = { ...styles.gridCellNonWorking }; }
                  if (isToday) cellStyle = { ...cellStyle, ...styles.gridCellToday };

                  return (
                    <div key={`day-${dayNum}`} style={cellStyle} onClick={() => handleDayClick(dayNum)}>
                      <span style={{ fontWeight: 700 }}>{dayNum}</span>
                      {matched && <span style={styles.miniLabelEvent}>{matched.name.substring(0,6)}..</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* YEAR VIEW OVERVIEW */
              <div style={styles.yearViewContainerGrid}>
                {monthNames.map((mName, mIdx) => {
                  const dCount = getDaysInMonth(currentYear, mIdx);
                  const offset = getFirstDayOffset(currentYear, mIdx);
                  return (
                    <div key={mName} style={styles.miniMonthBox}>
                      <div style={styles.miniMonthTitle}>{mName.toUpperCase()}</div>
                      <div style={styles.miniGridContainer}>
                        {Array.from({ length: offset }).map((_, x) => <div key={x} style={{ background: "transparent" }} />)}
                        {Array.from({ length: dCount }).map((_, dayI) => {
                          const dNum = dayI + 1;
                          const dObj = new Date(currentYear, mIdx, dNum);
                          const fDate = `${currentYear}-${String(mIdx + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
                          const isHolidayMatch = holidays.some(h => h.date === fDate);
                          const isWork = targetWorkdaysList.includes(dObj.getDay());
                          
                          let cellBg = "#1e293b";
                          if (isHolidayMatch) cellBg = "#f97316";
                          else if (!isWork) cellBg = "#090d16";

                          return (
                            <div key={dayI} style={{ background: cellBg, borderRadius: "1px", height: "8px", width: "8px" }} title={`${dNum} ${mName}`} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TIMELINE WIDGET EDITOR */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "170px" }}>
              <div style={styles.subTableHeader}>NATIVE GRAPHICAL SHIFT TIMELINE WIDGET EDITOR</div>
              <div style={styles.graphicalTimelineWidgetContainer}>
                <div style={styles.timelineTicksContainer}>
                  {Array.from({ length: 24 }).map((_, hr) => (
                    <div key={hr} style={styles.tickLabelNode}>{String(hr).padStart(2, "0")}:00</div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "relative", marginTop: "10px" }}>
                  {shifts.length === 0 ? (
                    <div style={{ color: "#64748b", fontSize: "10px", padding: "10px", textAlign: "center" }}>No active shifts parsed from database context.</div>
                  ) : (
                    shifts.map(s => {
                      const startPos = (s.start / 24) * 100;
                      const widthBlock = ((s.end - s.start) / 24) * 100;
                      return (
                        <div key={s.id} style={styles.shiftTrackLane}>
                          <span style={styles.shiftLaneLabel}>{s.name}</span>
                          <div style={styles.laneCoreBackground}>
                            <div 
                              style={{
                                position: "absolute", left: `${startPos}%`, width: `${widthBlock}%`,
                                background: s.color || "#378add", height: "18px", borderRadius: "3px",
                                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px"
                              }}
                            >
                              <span style={styles.sliderInsideText}>{s.start}h</span>
                              <span style={styles.sliderInsideText}>{s.end}h</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: INHERITANCE PROFILE PROPERTIES */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>CALENDAR ROUTINE METADATA DOCK</div>
          <div style={{ ...styles.panelContent, display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <div style={styles.inheritanceContainerBox}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fbbf24", fontWeight: 700, fontSize: "10px" }}>
                <MdAccountTree /> PRIMAVERA BASE INHERITANCE ENGINE
              </div>
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div><span style={{ color: "#64748b" }}>Focused Context:</span> <span style={{ color: "#fff", fontWeight: "600" }}>{activeCalendar.name}</span></div>
                <div><span style={{ color: "#64748b" }}>Derived Inherited From:</span> <span style={{ color: "#3b82f6", fontWeight: "700", fontFamily: "monospace" }}>[{activeCalendar.derivedFrom}]</span></div>
              </div>
            </div>

            <div>
              <div style={styles.sectionTitle}>GENERAL PROFILE OBJECTS</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Calendar ID</label>
                <input 
                  type="text" 
                  readOnly 
                  value={activeCalendar.calendarCode || activeCalendar.id} 
                  style={styles.inputReadOnly} 
                />
              </div>
              <div style={styles.formGroup}><label style={styles.label}>Pool Category Context</label><input type="text" readOnly value={activeCalendar.type} style={styles.inputReadOnly} /></div>
            </div>

            <div>
              <div style={styles.sectionTitle}>BASE CALCULATOR STEADY QUOTIENT VALUES</div>
              <div style={styles.metricsGrid}>
                <div style={styles.metricCard}><span style={styles.metricLabel}>Hours / Day</span><span style={styles.metricValue}>{activeCalendar.hoursPerDay}h</span></div>
                <div style={styles.metricCard}><span style={styles.metricLabel}>Hours / Week</span><span style={styles.metricValue}>{activeCalendar.hoursPerWeek}h</span></div>
                <div style={styles.metricCard}><span style={styles.metricLabel}>Hours / Month</span><span style={styles.metricValue}>{activeCalendar.hoursPerMonth}h</span></div>
                <div style={styles.metricCard}><span style={styles.metricLabel}>Hours / Year</span><span style={styles.metricValue}>{activeCalendar.hoursPerYear}h</span></div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* BOTTOM STRIP */}
      <div style={styles.bottomBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontWeight: 700, borderRight: "1px solid #1e2330", paddingRight: "16px" }}>
          <MdInfoOutline size={14} color="#378add" />
          <span>LIVE TRACK CONSOLE MATRIX</span>
        </div>
        <div style={styles.summaryStatsWrapper}>
          <div style={styles.statNode}>Target Working Profile Days: <span style={{ color: "#10b981" }}>{stats.workingDays}</span></div>
          <div style={styles.statNode}>Net Scheduled Hours Capacity: <span style={{ color: "#378add" }}>{stats.totalHours}h</span></div>
          <div style={styles.statNode}><span style={{ color: "#f97316" }}>Holidays Tracked: {stats.holidayCount}</span></div>
        </div>
      </div>

    </div>
  );
}

// STYLES OBJECT (PRIMAVERA THEME)
const styles = {
  container: { background: "#0d1018", height: "100vh", display: "flex", flexDirection: "column", color: "#e2e8f0", fontFamily: "'Inter', sans-serif", fontSize: "11px", overflow: "hidden", boxSizing: "border-box" },
  topHeader: { minHeight: "84px", background: "#0f1117", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", padding: "14px 20px", justifyContent: "space-between", boxSizing: "border-box" },
  headerTextWrapper: { display: "flex", flexDirection: "column", justifyContent: "center" },
  headerBadge: { background: "rgba(55,138,221,0.12)", color: "#378add", padding: "3px 8px", borderRadius: "2px", fontSize: "9px", fontWeight: 700, display: "inline-block" },
  mainTitle: { fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: "6px 0", lineHeight: "1.3", letterSpacing: "0.4px" },
  subTitle: { fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4", letterSpacing: "0.1px" },
  viewToggleBtn: { border: "none", fontSize: "10px", padding: "5px 12px", borderRadius: "3px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" },
  toolbar: { height: "32px", background: "#141822", borderBottom: "1px solid #1e2330", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px" },
  toolbarBtn: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", fontSize: "11px" },
  divider: { width: "1px", height: "16px", background: "#2d3748", margin: "0 4px" },
  searchWrapper: { width: "220px" },
  searchInput: { width: "100%", background: "#0d1018", border: "1px solid #1e2330", color: "#fff", fontSize: "11px", padding: "3px 6px", outline: "none", height: "22px" },
  workspaceGrid: { flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 320px", overflow: "hidden" },
  panel: { background: "#0f1117", borderRight: "1px solid #1e2330", display: "flex", flexDirection: "column", overflow: "hidden" },
  panelHeader: { background: "#141822", borderBottom: "1px solid #1e2330", padding: "6px 12px", fontWeight: 700, color: "#94a3b8", fontSize: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "18px" },
  countBadge: { background: "#1e2330", color: "#cbd5e1", padding: "1px 5px", borderRadius: "2px" },
  panelContent: { flex: 1, padding: "8px", overflowY: "auto" },
  treeFolderRow: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 2px", cursor: "pointer" },
  treeFolderLabel: { fontWeight: 700, color: "#cbd5e1" },
  treeItemRow: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 6px 5px 18px", cursor: "pointer", marginTop: "1px" },
  navBtn: { background: "#1e2330", border: "1px solid #334155", color: "#cbd5e1", width: "20px", height: "20px", cursor: "pointer", padding: 0 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", background: "#1e2330", padding: "2px" },
  gridDayHeader: { background: "#141822", color: "#64748b", textAlign: "center", padding: "4px 0", fontWeight: 700, fontSize: "10px" },
  gridCellDisabled: { background: "#090d16" },
  gridCellWorking: { background: "#1e293b", border: "1px solid #334155", padding: "4px 6px", display: "flex", flexDirection: "column", height: "38px", cursor: "pointer", color: "#e2e8f0" },
  gridCellNonWorking: { background: "#090d16", border: "1px solid #1e2330", padding: "4px 6px", display: "flex", flexDirection: "column", height: "38px", cursor: "pointer", color: "#475569" },
  gridCellHoliday: { background: "rgba(249,115,22,0.15)", border: "1px solid #f97316", padding: "4px 6px", display: "flex", flexDirection: "column", height: "38px", cursor: "pointer", color: "#f97316" },
  gridCellShutdown: { background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", padding: "4px 6px", display: "flex", flexDirection: "column", height: "38px", cursor: "pointer", color: "#ef4444" },
  gridCellToday: { outline: "1.5px solid #f59e0b", outlineOffset: "-1.5px" },
  miniLabelEvent: { fontSize: "8px", background: "rgba(0,0,0,0.3)", padding: "1px 2px", color: "#94a3b8", borderRadius: "1px", marginTop: "auto", overflow: "hidden" },
  yearViewContainerGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "4px" },
  miniMonthBox: { background: "#141822", border: "1px solid #1e2330", padding: "6px", borderRadius: "3px" },
  miniMonthTitle: { fontSize: "9px", fontWeight: "700", color: "#378add", marginBottom: "4px" },
  miniGridContainer: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" },
  subTableHeader: { fontSize: "10px", fontWeight: 700, color: "#64748b", background: "#141822", padding: "4px 8px", border: "1px solid #1e2330" },
  graphicalTimelineWidgetContainer: { background: "#0d1018", border: "1px solid #1e2330", padding: "12px", display: "flex", flexDirection: "column" },
  timelineTicksContainer: { display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #1e2330", paddingBottom: "6px", overflowX: "auto" },
  tickLabelNode: { fontSize: "8px", fontFamily: "monospace", color: "#475569" },
  shiftTrackLane: { display: "flex", alignItems: "center", height: "26px" },
  shiftLaneLabel: { fontSize: "10px", width: "135px", color: "#cbd5e1", fontWeight: "600" },
  laneCoreBackground: { flex: 1, background: "#141822", height: "18px", position: "relative", borderRadius: "2px" },
  sliderInsideText: { fontSize: "8px", color: "#fff", fontWeight: "bold", fontFamily: "monospace" },
  inheritanceContainerBox: { background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", padding: "10px", borderRadius: "4px", marginBottom: "4px" },
  sectionTitle: { fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "2px", marginBottom: "5px" },
  label: { fontSize: "10px", color: "#475569", fontWeight: 600 },
  inputReadOnly: { background: "#0d1018", border: "1px solid #1e2330", padding: "4px 6px", color: "#94a3b8", fontSize: "11px", width: "100%", boxSizing: "border-box", outline: "none" },
  metricsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" },
  metricCard: { background: "#0d1018", border: "1px solid #1e2330", padding: "6px", display: "flex", flexDirection: "column" },
  metricLabel: { fontSize: "9px", color: "#475569", fontWeight: 700 },
  metricValue: { fontSize: "12px", color: "#378add", fontWeight: 700 },
  bottomBar: { height: "26px", background: "#141822", borderTop: "1px solid #1e2330", display: "flex", alignItems: "center", padding: "0 12px", gap: "16px" },
  summaryStatsWrapper: { display: "flex", gap: "20px" },
  statNode: { color: "#cbd5e1", fontSize: "11px" }
};