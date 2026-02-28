import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

console.log("=== MAIN.TSX EXECUTING ===", import.meta.env);
window.addEventListener("error", (e) =>
  console.error("GLOBAL ERROR:", e.error || e.message),
);
window.addEventListener("unhandledrejection", (e) =>
  console.error("PROMISE REJECTION:", e.reason),
);

const rootElement = document.getElementById("root");
console.log("Root element found:", rootElement);

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log("ReactDOM.render completed without instant crash");
  } catch (err) {
    console.error("Instant crash during render:", err);
  }
}
