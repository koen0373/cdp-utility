import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";              // <-- MOET erin
import CDPUtilityApp from "./CDPUtilityApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CDPUtilityApp />
  </React.StrictMode>
);