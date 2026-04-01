/**
 * extension/popup/index.tsx
 * React entry point for the popup.
 * Mounts <Popup /> into #root.
 */

import { createRoot } from "react-dom/client";
import Popup from "./Popup";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<Popup />);
}
