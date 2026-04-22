import React from "react";
import { FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KZLViewerProps {
  kzlString: string;
  className?: string;
  actionLabel?: string;
  onAction?: (kzl: string) => void;
}

const LABELS = [
  "Projekt",
  "PSP",
  "Funktion",
  "Komponente",
  "Baugruppe",
  "Aufgabenart",
  "Dokumentart",
  "Unid",
  "Ri",
  "O",
];

/**
 * KZLViewer component for visualizing atomic document identifiers (KZL).
 * Structure: Projekt / PSP / Funktion / Komponente / Baugruppe / Aufgabenart / Dokumentart / Unid / Ri / O
 */
export const KZLViewer: React.FC<KZLViewerProps> = ({ 
  kzlString, 
  className,
  actionLabel,
  onAction 
}) => {
  // Split the string and ensure we have 10 values, filling missing ones with '-'
  const parts = kzlString.split("/").map((p) => p.trim() || "-");
  const displayParts = Array.from({ length: 10 }, (_, i) => parts[i] || "-");

  return (
    <div className={cn("w-full overflow-hidden rounded-md border border-border bg-background shadow-sm", className)}>
      {/* Wrapper for horizontal scrolling if content is too wide */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="flex items-stretch min-w-max md:min-w-0 w-full divide-x divide-border/60">
          {displayParts.map((value, index) => (
            <div 
              key={index} 
              className="flex-1 min-w-[70px] md:min-w-[auto] group transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-col px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/80 mb-0.5 truncate" title={LABELS[index]}>
                  {LABELS[index]}
                </span>
                <span className="text-xs font-mono font-bold text-foreground whitespace-nowrap">
                  {value}
                </span>
              </div>
            </div>
          ))}
          
          {/* Action Button Segment */}
          {onAction && (
            <div className="flex items-center px-4 bg-muted/20">
              <button
                onClick={() => onAction(kzlString)}
                className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-95"
              >
                {actionLabel || "Aktion"}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom scrollbar styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default KZLViewer;
