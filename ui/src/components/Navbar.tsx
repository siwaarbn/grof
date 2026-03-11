export default function Navbar() {
  return (
    <nav style={{
      width: "100%",
      padding: "15px 20px",
      //background: "#202020",
        background: "#1a1a1a",
        borderBottom: "1px solid #333",
        boxSizing: "border-box",  // ← И это
      color: "white",
      fontSize: "20px"
    }}>
        <h1 style={{ margin: 0, fontSize: "1.5em" }}>GROF Profiler</h1>
    </nav>
  );
}

