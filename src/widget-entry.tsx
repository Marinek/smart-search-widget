import { createRoot } from "react-dom/client";
import SmartSearch, { SmartSearchProps } from "./components/SmartSearch";
import "./index.css";

/**
 * Initializes the Smart Search widget on a specific element.
 * @param elementId The ID of the element to mount the widget into.
 * @param props Optional props for the SmartSearch component.
 */
export const initSmartSearch = (elementId: string, props: SmartSearchProps = {}) => {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Container with id "${elementId}" not found.`);
    return;
  }

  const root = createRoot(container);
  root.render(<SmartSearch {...props} />);
  
  return root;
};

// Expose to window for direct script usage
(window as any).SmartWidget = {
  init: initSmartSearch
};
