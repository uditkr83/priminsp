import { useState } from "react";
import axios from "axios";

function Schedule() {
  const [scheduleData, setScheduleData] = useState({});

  const calculateSchedule = async () => {
    try {
      const response = await axios.post(
        "http://13.60.26.19:5000/cpm/calculate"
      );

      setScheduleData(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>📅 Schedule</h1>

      <button onClick={calculateSchedule}>
        Calculate CPM
      </button>

      <br />
      <br />

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Activity ID</th>
            <th>ES</th>
            <th>EF</th>
            <th>LS</th>
            <th>LF</th>
            <th>Float</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(scheduleData).map(
            ([id, data]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{data.ES}</td>
                <td>{data.EF}</td>
                <td>{data.LS}</td>
                <td>{data.LF}</td>
                <td>{data.Float}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Schedule;
