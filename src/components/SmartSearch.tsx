import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, Loader2, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchItem = {
  key: string;
  label: string;
};

export type SmartSearchProps = {
  onResult?: (result: SearchItem | null, query: string) => void;
  onSearch?: (query: string) => Promise<SearchItem[]>;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
};

export type SmartSearchHandle = {
  /** Clear the input, results and resolved state without unmounting. */
  reset: () => void;
  /** Focus the underlying input. */
  focus: () => void;
  /** Read the current trimmed input value synchronously. */
  getQuery: () => string;
  /** Trigger an immediate search (bypassing the debounce) and return the resolution. */
  searchNow: () => Promise<{ match: SearchItem | null; results: SearchItem[]; query: string }>;
};

/* --- Mock REST endpoint ----------------------------------------------------
 * Replace `defaultSearch` with your real fetch call. The function must accept
 * even single characters (e.g. "G") and return a list of {key,label} items.
 * -------------------------------------------------------------------------- */
const MOCK_DATA: SearchItem[] = [
  // D – mehrere Treffer
  { key: "DE", label: "Deutschland" },
  { key: "DK", label: "Dänemark" },
  { key: "DO", label: "Dominikanische Republik" },
  { key: "DZ", label: "Demokratische Volksrepublik Algerien" },
  { key: "DJ", label: "Dschibuti" },
  { key: "DM", label: "Dominica" },
  // G – mehrere Treffer
  { key: "GB", label: "Großbritannien" },
  { key: "GR", label: "Griechenland" },
  { key: "GH", label: "Ghana" },
  { key: "GE", label: "Georgien" },
  { key: "GT", label: "Guatemala" },
  { key: "GQ", label: "Äquatorialguinea" },
  { key: "G7", label: "G7" },
  { key: "G20", label: "G20" },
  // weitere
  { key: "FR", label: "Frankreich" },
  { key: "ES", label: "Spanien" },
  { key: "IT", label: "Italien" },
  { key: "AT", label: "Österreich" },
  { key: "CH", label: "Schweiz" },
  { key: "NL", label: "Niederlande" },
  { key: "BE", label: "Belgien" },
  { key: "LU", label: "Luxemburg" },
  { key: "PL", label: "Polen" },
  { key: "PT", label: "Portugal" },
  { key: "SE", label: "Schweden" },
  { key: "NO", label: "Norwegen" },
  { key: "FI", label: "Finnland" },
  { key: "IS", label: "Island" },
  { key: "IE", label: "Irland" },
  { key: "US", label: "Vereinigte Staaten von Amerika" },
  { key: "GB-SCT", label: "Vereinigtes Königreich Schottland" },
];

export async function defaultSearch(query: string): Promise<SearchItem[]> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 2000));
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_DATA.filter(
    (i) =>
      i.key.toLowerCase().startsWith(q) ||
      i.label.toLowerCase().startsWith(q) ||
      i.label.toLowerCase().includes(q),
  );
}

/* --- Resolution logic ------------------------------------------------------
 * NEVER auto-pick results[0]. We only auto-resolve on an unambiguous match:
 *   1. exact key match (case-insensitive)
 *   2. exact label match (case-insensitive)
 *   3. exactly one result returned
 * Otherwise the user must pick from the dropdown.
 * -------------------------------------------------------------------------- */
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

export const SmartSearch = forwardRef<SmartSearchHandle, SmartSearchProps>(function SmartSearch({
  onResult,
  onSearch = defaultSearch,
  placeholder = "Search…",
  debounceMs = 300,
  className,
}, ref) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [resolved, setResolved] = useState<SearchItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);

  // Refs to avoid stale state inside async callbacks (TAB race condition).
  const latestQueryRef = useRef("");
  const requestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      requestIdRef.current++; // invalidate any in-flight request
      latestQueryRef.current = "";
      setQuery("");
      setResults([]);
      setResolved(null);
      setAmbiguous(false);
      setLoading(false);
    },
    focus: () => inputRef.current?.focus(),
    getQuery: () => (inputRef.current?.value ?? "").trim(),
    searchNow: async () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      const raw = (inputRef.current?.value ?? "").trim();
      if (!raw) return { match: null, results: [], query: "" };
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await onSearch(raw);
        if (reqId !== requestIdRef.current) {
          return { match: null, results: [], query: raw };
        }
        setResults(res);
        const match = resolveMatch(raw, res);
        setResolved(match);
        setAmbiguous(res.length > 0 && !match);
        onResult?.(match, raw);
        return { match, results: res, query: raw };
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
  }));

  /** Core search routine. Always uses the latest query, ignores stale responses. */
  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      latestQueryRef.current = q;

      if (!q) {
        setResults([]);
        setResolved(null);
        setAmbiguous(false);
        onResult?.(null, "");
        return null;
      }

      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await onSearch(q);
        // Drop stale responses
        if (reqId !== requestIdRef.current) return null;

        setResults(res);
        const match = resolveMatch(q, res);
        setResolved(match);
        setAmbiguous(res.length > 0 && !match);
        onResult?.(match, q);
        return match;
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [onSearch, onResult],
  );

  /** Debounced search on typing — even single characters are accepted. */
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs]);

  /** TAB / Blur: ensure the latest input is processed before focus leaves. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      // Cancel any pending debounce and fire immediately.
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      // We do NOT call e.preventDefault() — focus must still move on.
      // Fire-and-forget: the async result is captured via onResult/state.
      void runSearch(query);
    }
  };

  const handleBlur = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    void runSearch(query);
  };

  const pick = (item: SearchItem) => {
    setResolved(item);
    setAmbiguous(false);
    setFocused(false);
    setQuery(item.label);
    latestQueryRef.current = item.label;
    onResult?.(item, item.label);
  };

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            // Close only when focus leaves the whole widget (not when clicking
            // an option inside the dropdown).
            const next = e.relatedTarget as Node | null;
            if (!next || !e.currentTarget.parentElement?.parentElement?.contains(next)) {
              setFocused(false);
            }
            handleBlur();
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        {!loading && resolved && (
          <span className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            <Check className="h-3 w-3" />
            {resolved.key}
          </span>
        )}
        {!loading && ambiguous && !resolved && (
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {focused && ambiguous && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Mehrere Treffer – bitte auswählen
          </div>
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              // onMouseDown so the click fires before input blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span>{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
SmartSearch.displayName = "SmartSearch";

export default SmartSearch;