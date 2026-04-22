import { useState } from "react";
import SmartSearch, { SearchItem } from "@/components/SmartSearch";
import MultiSmartSearch, { ListItem } from "@/components/MultiSmartSearch";
import KZLViewer from "@/components/KZLViewer";

const Index = () => {
  const [result, setResult] = useState<{ item: SearchItem | null; query: string }>({
    item: null,
    query: "",
  });
  const [multi, setMulti] = useState<ListItem[]>([]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-20">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Smart Search Widget</h1>
          <p className="text-sm text-muted-foreground">
            Tippe etwas (auch nur „G") oder verlasse das Feld mit TAB. Die Suche akzeptiert
            Einzelbuchstaben und wählt nie automatisch das erste Ergebnis.
          </p>
        </header>

        <SmartSearch
          placeholder="Suche nach einem Land oder Code…"
          onResult={(item, query) => setResult({ item, query })}
        />

        {/* Demo: zweites fokussierbares Element, um TAB-Verhalten zu zeigen */}
        <input
          type="text"
          placeholder="Nächstes Feld (TAB-Ziel)"
          className="w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Multi-Select Variante</h2>
          <p className="text-sm text-muted-foreground">
            Gleiches Verhalten wie oben. Zusätzlich: <kbd className="rounded border border-border bg-muted px-1 text-xs">Enter</kbd> fügt den aufgelösten Treffer als Chip hinzu.
          </p>
          <MultiSmartSearch
            placeholder="Mehrere Länder auswählen…"
            onChange={setMulti}
          />
          {multi.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Ausgewählt: <span className="font-mono text-foreground">{multi.map((i) => i.key).join(", ")}</span>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">KZL Viewer (Anlagentechnik)</h2>
          <p className="text-sm text-muted-foreground">
            Visualisierung eines atomrechtlichen Dokumenten-Kennzeichens (KZL).
          </p>
          <KZLViewer 
            kzlString="PRJ-01/B-12/PUMP/001/BG2/W/BERICHT/9999/A/1" 
            actionLabel="Als Anhang hinzufügen"
            onAction={(kzl) => alert(`Dokument ${kzl} wurde als Anhang hinzugefügt.`)}
          />
        </section>

        <section className="rounded-md border border-border bg-card p-4 text-sm text-card-foreground">
          <div className="mb-2 font-medium">Letzter Stand</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
            <span>Query:</span>
            <span className="font-mono text-foreground">{result.query || "—"}</span>
            <span>Resolved Key:</span>
            <span className="font-mono text-foreground">
              {result.item ? result.item.key : "—"}
            </span>
            <span>Label:</span>
            <span className="text-foreground">{result.item?.label ?? "—"}</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
