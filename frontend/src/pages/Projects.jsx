import { useEffect, useState } from "react";
import axios from "axios";

function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(
        "http://13.60.26.19:5000/projects"
      );

      setProjects(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>📁 Projects</h1>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Project Code</th>
            <th>Project Name</th>
          </tr>
        </thead>

        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{project.id}</td>
              <td>{project.project_code}</td>
              <td>{project.project_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Projects;