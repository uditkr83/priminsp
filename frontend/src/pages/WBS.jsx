import { useEffect, useState } from "react";
import axios from "axios";

function WBS() {

  const [wbsList, setWbsList] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadWBS();
    loadActivities();
  }, []);

  const loadWBS = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/wbs"
      );

      setWbsList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/activities"
      );

      setActivities(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>🗂️ WBS</h1>

      <div
        style={{
          fontSize: "24px",
          textAlign: "left",
          marginTop: "30px"
        }}
      >
        {wbsList
          .filter((wbs) => wbs.parent_wbs_id === null)
          .map((parent) => (
            <div key={parent.id}>

              <div>
                📁 {parent.wbs_name}
              </div>

              {wbsList
                .filter(
                  (child) =>
                    child.parent_wbs_id === parent.id
                )
                .map((child) => (
                  <div
                    key={child.id}
                    style={{
                      marginLeft: "50px",
                      marginTop: "10px"
                    }}
                  >
                    <div>
                      └── 📂 {child.wbs_name}
                    </div>

                    {activities
                      .filter(
                        (activity) =>
                          activity.wbs_id === child.id
                      )
                      .map((activity) => (
                        <div
                          key={activity.id}
                          style={{
                            marginLeft: "50px",
                            marginTop: "5px",
                            fontSize: "20px"
                          }}
                        >
                          ├── 📋 {activity.activity_code}
                          {" - "}
                          {activity.activity_name}
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))}
      </div>
    </div>
  );
}

export default WBS;