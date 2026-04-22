import { createRoot, Root } from "react-dom/client";
import SmartSearch, { SmartSearchProps } from "./components/SmartSearch";
import MultiSmartSearch, { MultiSmartSearchProps } from "./components/MultiSmartSearch";
import KZLViewer from "./components/KZLViewer";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";

/**
 * Helper to create a Web Component wrapper for a React component
 */
function registerWebComponent(tagName: string, Component: any, propMapper: (elt: HTMLElement) => any) {
  if (customElements.get(tagName)) return;

  class ReactWebComponent extends HTMLElement {
    private root: Root | null = null;

    connectedCallback() {
      if (!this.root) {
        this.root = createRoot(this);
      }
      this.render();
    }

    static get observedAttributes() {
      return ["placeholder", "kzl-string", "action-label", "initial-items"];
    }

    attributeChangedCallback() {
      this.render();
    }

    /**
     * Executes an inline event handler attribute (e.g. onchange="...")
     */
    private executeInlineHandler(attrName: string, args: Record<string, any>) {
      const handlerStr = this.getAttribute(attrName);
      if (!handlerStr) return null;

      try {
        const argKeys = Object.keys(args);
        const argValues = Object.values(args);
        const fn = new Function(...argKeys, handlerStr);
        return fn.apply(this, argValues);
      } catch (err) {
        console.error(`Error executing ${attrName}:`, err);
        return null;
      }
    }

    render() {
      if (!this.root) return;
      const props = propMapper(this);
      
      // Sync dynamic JS properties to React props
      const dynamicProps = ["onSearch", "onChange", "onResult", "onAction", "onresult", "onchange", "onaction", "initialItems"];
      dynamicProps.forEach(p => {
        if ((this as any)[p]) props[p] = (this as any)[p];
      });

      // Handle initial-items attribute fallback (JSON)
      if (!props.initialItems && this.hasAttribute("initial-items")) {
        try {
          props.initialItems = JSON.parse(this.getAttribute("initial-items") || "[]");
        } catch (e) {
          console.error("Error parsing initial-items attribute:", e);
        }
      }

      // Handle inline attribute fallback for search if no JS property is set
      if (!props.onSearch && this.hasAttribute("onsearch")) {
        props.onSearch = (query: string) => this.executeInlineHandler("onsearch", { query });
      }
      
      this.root.render(
        <TooltipProvider>
          <Component {...props} />
        </TooltipProvider>
      );
    }

    // Generic property support
    get placeholder() { return this.getAttribute("placeholder"); }
    set placeholder(val) { this.setAttribute("placeholder", val || ""); }

    get kzlString() { return this.getAttribute("kzl-string"); }
    set kzlString(val) { this.setAttribute("kzl-string", val || ""); }

    get actionLabel() { return this.getAttribute("action-label"); }
    set actionLabel(val) { this.setAttribute("action-label", val || ""); }

    get initialItems() { return (this as any)._initialItems; }
    set initialItems(val) { (this as any)._initialItems = val; this.render(); }

    // Callback setters
    set onSearch(fn: any) { (this as any)._onSearch = fn; this.render(); }
    get onSearch() { return (this as any)._onSearch; }

    set onChange(fn: any) { (this as any)._onChange = fn; this.render(); }
    get onChange() { return (this as any)._onChange; }

    set onResult(fn: any) { (this as any)._onResult = fn; this.render(); }
    get onResult() { return (this as any)._onResult; }

    set onAction(fn: any) { (this as any)._onAction = fn; this.render(); }
    get onAction() { return (this as any)._onAction; }

    disconnectedCallback() {
      this.root?.unmount();
    }
  }

  customElements.define(tagName, ReactWebComponent);
}

// Register Smart Search
registerWebComponent("smart-search", SmartSearch, (elt: any) => ({
  placeholder: elt.placeholder || undefined,
  onResult: (item: any, query: string) => {
    elt.dispatchEvent(new CustomEvent("result", { detail: { item, query } }));
    if (elt.onResult) elt.onResult(item, query);
    elt.executeInlineHandler?.("onresult", { item, query });
  },
}));

// Register Multi Smart Search
registerWebComponent("multi-smart-search", MultiSmartSearch, (elt: any) => ({
  placeholder: elt.placeholder || undefined,
  initialItems: elt.initialItems || undefined,
  onChange: (items: any) => {
    elt.dispatchEvent(new CustomEvent("change", { detail: items }));
    if (elt.onChange) elt.onChange(items);
    elt.executeInlineHandler?.("onchange", { detail: items, items });
  },
}));

// Register KZL Viewer
registerWebComponent("kzl-viewer", KZLViewer, (elt: any) => ({
  kzlString: elt.kzlString || "",
  actionLabel: elt.actionLabel || undefined,
  onAction: (kzl: string) => {
    elt.dispatchEvent(new CustomEvent("action", { detail: kzl }));
    if (elt.onAction) elt.onAction(kzl);
    elt.executeInlineHandler?.("onaction", { detail: kzl, kzl });
  },
}));

// Initialization functions for UMD/Library usage
export const init = (elementId: string, props: any = {}) => {
  const container = document.getElementById(elementId);
  if (!container) return;
  const root = createRoot(container);
  root.render(
    <TooltipProvider>
      <SmartSearch {...props} />
    </TooltipProvider>
  );
  return root;
};

export const initMulti = (elementId: string, props: any = {}) => {
  const container = document.getElementById(elementId);
  if (!container) return;
  const root = createRoot(container);
  root.render(
    <TooltipProvider>
      <MultiSmartSearch {...props} />
    </TooltipProvider>
  );
  return root;
};
