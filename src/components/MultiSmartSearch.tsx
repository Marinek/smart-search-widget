import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartSearch, { SearchItem, SmartSearchProps } from "./SmartSearch";

export type MultiSmartSearchProps = Omit<SmartSearchProps, "onResult"> & {
  onChange?: (items: SearchItem[]) => void;
  initialItems?: SearchItem[];
};

/**
 * MultiSmartSearch wraps SmartSearch and adds:
 *  - Enter: pushes the current resolved match (or, if ambiguous, nothing) into a chip list.
 *  - Chips render directly below the input with a small ✕ to remove them.
 *  - Duplicates (by key) are silently ignored.
 */
export const MultiSmartSearch = ({
  onChange,
  initialItems = [],
  className,
  ...searchProps
}: MultiSmartSearchProps) => {
  const [items, setItems] = useState<SearchItem[]>(initialItems);
  const [current, setCurrent] = useState<{ item: SearchItem | null; query: string }>({
    item: null,
    query: "",
  });
  // Bump to force-remount the inner SmartSearch and clear its internal state.
  const [resetKey, setResetKey] = useState(0);

  const addItem = (item: SearchItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.key === item.key)) return prev;
      const next = [...prev, item];
      onChange?.(next);
      return next;
    });
    setCurrent({ item: null, query: "" });
    setResetKey((k) => k + 1);
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.key !== key);
      onChange?.(next);
      return next;
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && current.item) {
      e.preventDefault();
      addItem(current.item);
    }
  };

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div onKeyDown={handleKeyDown}>
        <SmartSearch
          key={resetKey}
          {...searchProps}
          onResult={(item, query) => setCurrent({ item, query })}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              <span className="font-medium">{item.key}</span>
              <span className="text-muted-foreground">{item.label}</span>
              <button
                type="button"
                aria-label={`Entferne ${item.label}`}
                onClick={() => removeItem(item.key)}
                className="ml-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MultiSmartSearch;