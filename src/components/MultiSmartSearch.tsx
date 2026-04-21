import { useRef, useState, KeyboardEvent } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartSearch, { SearchItem, SmartSearchHandle, SmartSearchProps } from "./SmartSearch";

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

let chipCounter = 0;
const nextChipId = () => `__chip_${++chipCounter}`;

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

/**
 * MultiSmartSearch wraps SmartSearch with a chip list.
 * Enter → IMMEDIATELY adds a pending chip with the raw query and clears the input
 * (focus stays). The REST search runs in the background; once it resolves, the
 * chip is updated to "resolved" (showing the API key) or "error" (red, raw query
 * preserved as value).
 */
export const MultiSmartSearch = ({
  onChange,
  initialItems = [],
  className,
  ...searchProps
}: MultiSmartSearchProps) => {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const searchRef = useRef<SmartSearchHandle>(null);
  // Keep latest onChange & items accessible from async callbacks.
  const itemsRef = useRef<ListItem[]>(initialItems);
  itemsRef.current = items;

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

    // 1) IMMEDIATELY add a pending chip with the raw input.
    const chipId = nextChipId();
    commitItems((prev) => [
      ...prev,
      { key: chipId, label: raw, status: "pending", query: raw },
    ]);

    // 2) Clear the input but keep focus → user can type the next entry right away.
    handle.reset();
    handle.focus();

    // 3) Run the search in the background.
    const onSearch = (searchProps as SmartSearchProps).onSearch;
    try {
      const results = onSearch
        ? await onSearch(raw)
        : await defaultBackgroundSearch(raw);
      const match = resolveMatch(raw, results);

      if (match) {
        // Skip duplicates: if another resolved chip already holds this key, drop the pending one.
        const dup = itemsRef.current.some(
          (i) => i.status === "resolved" && i.key === match.key && i.key !== chipId,
        );
        if (dup) {
          removeItem(chipId);
        } else {
          // Replace chip id with the real key so duplicate detection works going forward.
          commitItems((prev) =>
            prev.map((i) =>
              i.key === chipId
                ? { ...i, key: match.key, label: match.label, status: "resolved" }
                : i,
            ),
          );
        }
      } else {
        // No unique match → mark chip as error, keep raw query as label/value.
        updateChip(chipId, { status: "error", label: raw });
      }
    } catch {
      updateChip(chipId, { status: "error", label: raw });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void addAndSearch();
    }
  };

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div onKeyDown={handleKeyDown}>
        <SmartSearch ref={searchRef} {...searchProps} />
      </div>

      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                item.status === "resolved" &&
                  "border-border bg-secondary text-secondary-foreground",
                item.status === "pending" &&
                  "border-dashed border-border bg-muted text-muted-foreground",
                item.status === "error" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
              )}
              title={
                item.status === "pending"
                  ? `Suche läuft für „${item.query}"…`
                  : item.status === "error"
                    ? `Kein eindeutiger Treffer für „${item.query}"`
                    : undefined
              }
            >
              {item.status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {item.status === "error" && <AlertCircle className="h-3 w-3" />}
              {item.status === "resolved" && (
                <span className="font-medium">{item.key}</span>
              )}
              <span
                className={cn(item.status === "resolved" && "text-muted-foreground")}
              >
                {item.label}
              </span>
              <button
                type="button"
                aria-label={`Entferne ${item.label}`}
                onClick={() => removeItem(item.key)}
                className="ml-1 rounded-sm p-0.5 transition-colors hover:bg-accent hover:text-accent-foreground"
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

/** Fallback so the chip can resolve even if no onSearch was passed (uses SmartSearch's default mock). */
async function defaultBackgroundSearch(_q: string): Promise<SearchItem[]> {
  return [];
}

export default MultiSmartSearch;
