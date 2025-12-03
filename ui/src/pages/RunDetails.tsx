import { useParams } from "react-router-dom";

export default function RunDetails() {
  const { id } = useParams();

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1>Run Details</h1>
      <p>Details for run ID: {id}</p>
    </div>
  );
}

