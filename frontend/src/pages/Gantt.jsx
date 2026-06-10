import { useEffect, useState } from "react";
import axios from "axios";

function Gantt() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/schedules"
      );

      setSchedules(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>📈 Gantt Chart</h1>
      <div
  style={{
    display: "flex",
    marginBottom: "20px",
    marginLeft: "220px"
  }}
>
  {Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      style={{
        width: "25px",
        textAlign: "center",
        fontWeight: "bold",
        border: "1px solid gray"
      }}
    >
      {i + 1}
    </div>
  ))}
</div>

      {schedules.map((task) => (
        <div
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "15px"
          }}
        >
          <div
  style={{
    width: "220px",
    fontWeight: "bold",
    fontSize: "18px"
  }}
>
            {task.activity_code}
          </div>

          <div
            style={{
              marginLeft:
                (new Date(task.early_start).getDate() - 1) * 25,
              width:
(
  task.duration
) * 25,
              height: "30px",
borderRadius: "5px",
              background: task.is_critical
                ? "red"
                : "steelblue"
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default Gantt;
