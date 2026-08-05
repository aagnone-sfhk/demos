import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// NOTE: intentionally NOT wrapped in <StrictMode>. The original app renders
// once via ReactDOM.createRoot(...).render(<App />) with no double-invoke; the
// SMIL/CSS animations and the single document-level HelpOverlay listener are
// simplest when effects run exactly once. Parity with the original is the goal.
createRoot(document.getElementById("root")!).render(<App />);
