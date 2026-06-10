import { useEffect, useState } from "react";
import axios from "axios";

function Relationships() {
  const [relationships, setRelationships] = useState([]);

  const [predecessorId, setPredecessorId] = useState("");
const [successorId, setSuccessorId] = useState("");
const [relationshipType, setRelationshipType] = useState("FS");
const [lag, setLag] = useState(0);

const [activities, setActivities] = useState([]);

  useEffect(() => {
  loadRelationships();
  loadActivities();
}, []);

  const loadRelationships = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/relationships"
      );

      setRelationships(response.data);
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

const addRelationship = async () => {
  try {

    await axios.post(
      "http://13.60.26.19:5000/relationships",
      {
        predecessor_activity_id:
          Number(predecessorId),

        successor_activity_id:
          Number(successorId),

        relationship_type:
          relationshipType,

        lag: Number(lag)
      }
    );

    setPredecessorId("");
    setSuccessorId("");
    setRelationshipType("FS");
    setLag(0);

    loadRelationships();

  } catch (err) {
    console.error(err);
  }
};

  return (
    <div>
      <h1>🔗 Relationships</h1>
      <div style={{ marginBottom: "20px" }}>

  <select
    value={predecessorId}
    onChange={(e) =>
      setPredecessorId(e.target.value)
    }
  >
    <option value="">Predecessor</option>

    {activities.map((activity) => (
      <option
        key={activity.id}
        value={activity.id}
      >
        {activity.activity_code}
      </option>
    ))}
  </select>

  <select
    value={successorId}
    onChange={(e) =>
      setSuccessorId(e.target.value)
    }
    style={{ marginLeft: "10px" }}
  >
    <option value="">Successor</option>

    {activities.map((activity) => (
      <option
        key={activity.id}
        value={activity.id}
      >
        {activity.activity_code}
      </option>
    ))}
  </select>

</div>

<select
  value={relationshipType}
  onChange={(e) =>
    setRelationshipType(e.target.value)
  }
  style={{ marginLeft: "10px" }}
>
  <option value="FS">FS</option>
  <option value="SS">SS</option>
  <option value="FF">FF</option>
  <option value="SF">SF</option>
</select>

<input
  type="number"
  placeholder="Lag"
  value={lag}
  onChange={(e) =>
    setLag(e.target.value)
  }
  style={{ marginLeft: "10px", width: "80px" }}
/>

<button
  onClick={addRelationship}
  style={{ marginLeft: "10px" }}
>
  Add Relationship
</button>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Predecessor</th>
            <th>Successor</th>
            <th>Type</th>
          </tr>
        </thead>

        <tbody>
          {relationships.map((rel) => (
            <tr key={rel.id}>
              <td>{rel.id}</td>
              <td>{rel.predecessor_code}</td>
              <td>{rel.successor_code}</td>
              <td>{rel.relationship_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Relationships;
