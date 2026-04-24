import { useRef, useState, KeyboardEvent, useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartSearch, { SearchItem, SmartSearchHandle, SmartSearchProps, defaultSearch } from "./SmartSearch";

export type ListItem = SearchItem & {
  /** "pending" → background search still running. "resolved" → unique key found. "error" → no/ambiguous match. */
  status: "pending" | "resolved" | "error";
  /** Original raw query the user typed. Always preserved, even on error. */
  query: string;
};

export type MultiSmartSearchProps = Omit<SmartSearchProps, "onResult"> & {
  onChange?: (items: ListItem[]) => void;
  initialItems?: ListItem[];
};

function resolveMatch(query: string, results: SearchItem[]): SearchItem | null {
  const q = query.trim().toLowerCase();
  if (!q || results.length === 0) return null;
  const exactKey = results.find((r) => r.key.toLowerCase() === q);
  if (exactKey) return exactKey;
  const exactLabel = results.find((r) => r.label.toLowerCase() === q);
  if (exactLabel) return exactLabel;
  if (results.length === 1) return results[0];
  return null;
}

const EMPTY_ARRAY: any[] = [];

/**
 * MultiSmartSearch wraps SmartSearch with a chip list.
 */
export const MultiSmartSearch = ({
  onChange,
  initialItems = EMPTY_ARRAY,
  className,
  ...searchProps
}: MultiSmartSearchProps) => {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const searchRef = useRef<SmartSearchHandle>(null);
  const itemsRef = useRef<ListItem[]>(initialItems);
  itemsRef.current = items;

  // Sync internal state if initialItems prop changes (e.g. via Web Component property)
  useEffect(() => {
    if (initialItems !== itemsRef.current) {
      setItems(initialItems);
      itemsRef.current = initialItems;
    }
  }, [initialItems]);

  const commitItems = (updater: (prev: ListItem[]) => ListItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      itemsRef.current = next;
      onChange?.(next);
      return next;
    });
  };

  const removeItem = (id: string) => {
    commitItems((prev) => prev.filter((i) => i.key !== id));
  };

  const updateChip = (id: string, patch: Partial<ListItem>) => {
    commitItems((prev) => prev.map((i) => (i.key === id ? { ...i, ...patch } : i)));
  };

  const addAndSearch = async () => {
    const handle = searchRef.current;
    if (!handle) return;
    const raw = handle.getQuery();
    if (!raw) return;

    // 1) Prevent immediate duplicates based on raw query or existing keys
    const isDuplicate = itemsRef.current.some(
      (i) => i.query.toLowerCase() === raw.toLowerCase() || i.key.toLowerCase() === raw.toLowerCase()
    );
    if (isDuplicate) {
      handle.reset();
      handle.focus();
      return;
    }

    // 2) IMMEDIATELY add a pending chip with the raw input.
    const tempId = raw;
    commitItems((prev) => [
      ...prev,
      { key: tempId, label: raw, status: "pending", query: raw },
    ]);

    // 3) Clear the input but keep focus
    handle.reset();
    handle.focus();

    // 4) Run the search in the background.
    const onSearch = (searchProps as SmartSearchProps).onSearch || defaultSearch;
    try {
      const results = await onSearch(raw);
      const match = resolveMatch(raw, results);

      if (match) {
        const dup = itemsRef.current.some(
          (i) => i.status === "resolved" && i.key.toLowerCase() === match.key.toLowerCase() && i.key !== tempId
        );

        if (dup) {
          removeItem(tempId);
        } else {
          commitItems((prev) =>
            prev.map((i) =>
              i.key === tempId
                ? { ...i, key: match.key, label: match.label, status: "resolved" }
                : i
            )
          );
        }
      } else {
        updateChip(tempId, { status: "error" });
      }
    } catch {
      updateChip(tempId, { status: "error" });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void addAndSearch();
    }
  };

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <div onKeyDown={handleKeyDown}>
        <SmartSearch ref={searchRef} {...searchProps} />
      </div>

      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all duration-200",
                item.status === "resolved" &&
                "border-border bg-secondary text-secondary-foreground shadow-sm",
                item.status === "pending" &&
                "animate-pulse border-blue-300 bg-blue-50 text-blue-600",
                item.status === "error" &&
                "border-destructive bg-destructive text-destructive-foreground shadow-sm",
              )}
              title={
                item.status === "pending"
                  ? `Suche läuft für „${item.query}“...`
                  : item.status === "error"
                    ? `Kein eindeutiger Treffer für „${item.query}“`
                    : undefined
              }
            >
              {item.status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {item.status === "error" && <AlertCircle className="h-3 w-3" />}

              {item.status === "resolved" && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{item.key}</span>
                  <span className="opacity-40">—</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              )}

              {item.status !== "resolved" && (
                <span className="max-w-[150px] truncate">
                  {item.label}
                </span>
              )}

              <button
                type="button"
                aria-label={`Entferne ${item.label}`}
                onClick={() => removeItem(item.key)}
                className={cn(
                  "ml-0.5 rounded-full p-0.5 transition-colors",
                  item.status === "error"
                    ? "hover:bg-white/20 text-white"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                )}
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
