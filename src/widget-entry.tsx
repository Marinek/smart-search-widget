import { createRoot } from "react-dom/client";
import SmartSearch, { SmartSearchProps } from "./components/SmartSearch";
import MultiSmartSearch, { MultiSmartSearchProps } from "./components/MultiSmartSearch";
import "./index.css";

/**
 * Initializes the Smart Search widget on a specific element.
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

/**
 * Initializes the Multi Smart Search widget on a specific element.
 */
export const initMultiSmartSearch = (elementId: string, props: MultiSmartSearchProps = {}) => {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Container with id "${elementId}" not found.`);
    return;
  }

  const root = createRoot(container);
  root.render(<MultiSmartSearch {...props} />);
  
  return root;
};

// Expose to window for direct script usage
(window as any).SmartWidget = {
  init: initSmartSearch,
  initMulti: initMultiSmartSearch
};
