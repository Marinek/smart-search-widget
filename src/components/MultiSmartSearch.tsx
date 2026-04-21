import { useRef, useState, KeyboardEvent } from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartSearch, { SearchItem, SmartSearchHandle, SmartSearchProps } from "./SmartSearch";

export type ListItem = SearchItem & {
  /** "resolved" → API found a unique key. "error" → no result found, kept as raw query. */
  status: "resolved" | "error";
  /** Original raw query the user typed. */
  query: string;
};

export type MultiSmartSearchProps = Omit<SmartSearchProps, "onResult"> & {
  onChange?: (items: ListItem[]) => void;
  initialItems?: ListItem[];
};

let errorCounter = 0;
const nextErrorId = () => `__err_${++errorCounter}`;

/**
 * MultiSmartSearch wraps SmartSearch and adds a chip list:
 *  - Enter triggers a synchronous search (bypassing the debounce).
 *  - If a unique match is found → green/neutral chip with the resolved key.
 *  - If no match (or ambiguous) → red error chip showing the raw query.
 *  - Chips can be removed via the ✕ button.
 */
export const MultiSmartSearch = ({
  onChange,
  initialItems = [],
  className,
  ...searchProps
}: MultiSmartSearchProps) => {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const searchRef = useRef<SmartSearchHandle>(null);
  const busyRef = useRef(false);

  const commitItems = (updater: (prev: ListItem[]) => ListItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      onChange?.(next);
      return next;
    });
  };

  const removeItem = (key: string) => {
    commitItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleEnter = async () => {
    if (busyRef.current) return;
    const handle = searchRef.current;
    if (!handle) return;
    const raw = handle.getQuery();
    if (!raw) return;

    busyRef.current = true;
    try {
      const { match, query } = await handle.searchNow();

      commitItems((prev) => {
        if (match) {
          // Skip duplicates by resolved key.
          if (prev.some((i) => i.status === "resolved" && i.key === match.key)) {
            return prev;
          }
          return [...prev, { ...match, status: "resolved", query }];
        }
        // No unique match → add as error chip (keep raw query as label).
        return [
          ...prev,
          { key: nextErrorId(), label: query, status: "error", query },
        ];
      });

      handle.reset();
      handle.focus();
    } finally {
      busyRef.current = false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleEnter();
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
                item.status === "error" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
              )}
              title={
                item.status === "error"
                  ? `Kein eindeutiger Treffer für „${item.query}"`
                  : undefined
              }
            >
              {item.status === "error" && <AlertCircle className="h-3 w-3" />}
              {item.status === "resolved" && (
                <span className="font-medium">{item.key}</span>
              )}
              <span
                className={cn(
                  item.status === "resolved" && "text-muted-foreground",
                )}
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

export default MultiSmartSearch;
