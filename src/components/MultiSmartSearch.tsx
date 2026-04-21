import { useRef, useState, KeyboardEvent } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartSearch, { SearchItem, SmartSearchHandle, SmartSearchProps } from "./SmartSearch";

export type MultiSmartSearchProps = Omit<SmartSearchProps, "onResult"> & {
  onChange?: (items: PendingItem[]) => void;
  initialItems?: PendingItem[];
};

/** A chip can be resolved (real key), pending (still searching), or ambiguous (no unique match). */
export type PendingItem = SearchItem & {
  /** Original raw query the user typed before pressing Enter. */
  query: string;
  /** "resolved" → key is the real API key. "pending" → still searching. "ambiguous" → multiple hits, user must refine. */
  status: "resolved" | "pending" | "ambiguous";
};

let pendingCounter = 0;
const nextPendingId = () => `__pending_${++pendingCounter}`;

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
 * MultiSmartSearch wraps SmartSearch and adds:
 *  - Enter: IMMEDIATELY pushes a chip. If the key is already resolved → done.
 *    Otherwise the chip stays "pending" and keeps searching in the background;
 *    once the API resolves it uniquely the chip auto-updates.
 *  - Chips render directly below the input with a small ✕ to remove them.
 *  - Duplicates (by resolved key) are silently ignored.
 */
export const MultiSmartSearch = ({
  onChange,
  initialItems = [],
  className,
  onSearch,
  ...searchProps
}: MultiSmartSearchProps) => {
  const [items, setItems] = useState<PendingItem[]>(initialItems);
  const currentRef = useRef<{ item: SearchItem | null; query: string }>({
    item: null,
    query: "",
  });
  const searchRef = useRef<SmartSearchHandle>(null);

  const commitItems = (updater: (prev: PendingItem[]) => PendingItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      onChange?.(next);
      return next;
    });
  };

  /** Background re-resolution for a pending chip. */
  const resolvePending = async (chipId: string, query: string) => {
    try {
      const res = await (onSearch ?? (async () => []))(query);
      const match = resolveMatch(query, res);
      commitItems((prev) =>
        prev.map((it) => {
          if (it.key !== chipId) return it;
          if (match) {
            // Avoid duplicates: if another chip already holds this key, drop the pending one.
            if (prev.some((p) => p.key === match.key && p.key !== chipId)) {
              return it; // keep as-is, the filter below will remove it
            }
            return { ...it, key: match.key, label: match.label, status: "resolved" as const };
          }
          return { ...it, status: (res.length > 1 ? "ambiguous" : "pending") as PendingItem["status"] };
        }).filter((it, idx, arr) => {
          // Drop pending chip if its resolved key duplicates a real chip.
          if (it.key !== chipId) return true;
          return arr.findIndex((x) => x.key === it.key) === idx;
        }),
      );
    } catch {
      // Leave chip as pending on error.
    }
  };

  const addAndContinue = () => {
    const { item, query } = currentRef.current;
    const trimmed = query.trim();
    if (!item && !trimmed) return;

    if (item) {
      // Already resolved → just add (skip duplicates).
      commitItems((prev) =>
        prev.some((i) => i.key === item.key)
          ? prev
          : [...prev, { ...item, query: trimmed, status: "resolved" }],
      );
    } else {
      // Not resolved yet → add a pending chip and keep searching in the background.
      const chipId = nextPendingId();
      commitItems((prev) => [
        ...prev,
        { key: chipId, label: trimmed, query: trimmed, status: "pending" },
      ]);
      void resolvePending(chipId, trimmed);
    }

    currentRef.current = { item: null, query: "" };
    searchRef.current?.reset();
    searchRef.current?.focus();
  };

  const removeItem = (key: string) => {
    commitItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAndContinue();
    }
  };

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div onKeyDown={handleKeyDown}>
        <SmartSearch
          ref={searchRef}
          {...searchProps}
          onSearch={onSearch}
          onResult={(item, query) => {
            currentRef.current = { item, query };
          }}
        />
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
                item.status === "ambiguous" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
              )}
              title={
                item.status === "pending"
                  ? `Suche läuft für „${item.query}"…`
                  : item.status === "ambiguous"
                    ? `Mehrdeutig: „${item.query}" – bitte präzisieren`
                    : undefined
              }
            >
              {item.status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {item.status === "ambiguous" && <AlertCircle className="h-3 w-3" />}
              {item.status === "resolved" && (
                <span className="font-medium">{item.key}</span>
              )}
              <span className={cn(item.status === "resolved" && "text-muted-foreground")}>
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