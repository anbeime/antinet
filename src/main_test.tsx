import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

console.log("=== Main.tsx Loading ===");
console.log("React:", typeof StrictMode);
console.log("ReactDOM:", typeof createRoot);

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (!rootElement) {
  console.error("ERROR: Root element not found!");
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-size: 20px;">ERROR: Root element not found!</div>';
} else {
  try {
    console.log("Creating React root...");
    const root = createRoot(rootElement);
    
    console.log("Rendering test content...");
    root.render(
      <StrictMode>
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
          <h1 style={{ color: "green" }}>✓ React is Working!</h1>
          <p>If you see this, React is loading correctly.</p>
          <p>Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </StrictMode>
    );
    console.log("=== Render Complete ===");
  } catch (error) {
    console.error("ERROR during render:", error);
    document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Render Error</h1><pre>${error}</pre></div>`;
  }
}
