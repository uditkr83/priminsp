function Dashboard() {
  return (
    <div>

      <h1
        style={{
          fontSize: "60px",
          marginBottom: "30px"
        }}
      >
        📊 Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap"
        }}
      >

        <div style={cardStyle}>
          <h2>📁 Projects</h2>
          <h1>1</h1>
        </div>

        <div style={cardStyle}>
          <h2>📋 Activities</h2>
          <h1>4</h1>
        </div>

        <div style={cardStyle}>
          <h2>🗂️ WBS</h2>
          <h1>2</h1>
        </div>

        <div style={cardStyle}>
          <h2>🔗 Relationships</h2>
          <h1>3</h1>
        </div>

      </div>

    </div>
  );
}

const cardStyle = {
  background: "#1f2937",
  padding: "25px",
  borderRadius: "15px",
  minWidth: "220px",
  textAlign: "center",
  boxShadow: "0 4px 15px rgba(0,0,0,0.4)"
};

export default Dashboard;