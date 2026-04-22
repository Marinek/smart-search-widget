import React from "react";
import { Paperclip, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KZLViewerProps {
  kzlString: string;
  className?: string;
  actionLabel?: string;
  onAction?: (kzl: string) => void;
}

/**
 * KZLViewer component for visualizing atomic document identifiers (KZL).
 * Special support for KKS (Kraftwerk-Kennzeichensystem) in the 'Technischer Platz' column.
 */
export const KZLViewer: React.FC<KZLViewerProps> = ({ 
  kzlString, 
  className,
  actionLabel,
  onAction 
}) => {
  const parts = kzlString.split("/").map((p) => p.trim() || "-");
  const displayParts = Array.from({ length: 10 }, (_, i) => parts[i] || "-");

  // KKS segments (Funktion, Komponente, Baugruppe)
  const g1 = displayParts[2]; // Gliederungsstufe 1 – Funktionales Gesamtsystem
  const g2 = displayParts[3]; // Gliederungsstufe 2 – Aggregat
  const g3 = displayParts[4]; // Gliederungsstufe 3 – Betriebsmittel

  const columns = [
    { label: "Projekt", value: displayParts[0], minWidth: "60px" },
    { label: "PSP", value: displayParts[1], minWidth: "60px" },
    { 
      label: "Technischer Platz (KKS)", 
      value: `${g1}/${g2}/${g3}`, 
      minWidth: "160px",
      isKks: true,
      kksDetails: { g1, g2, g3 }
    },
    { label: "Aufgabenart", value: displayParts[5], minWidth: "70px" },
    { label: "Dokumentart", value: displayParts[6], minWidth: "80px" },
    { label: "Unid", value: displayParts[7], minWidth: "50px" },
    { label: "Ri", value: displayParts[8], minWidth: "30px" },
    { label: "O", value: displayParts[9], minWidth: "30px" },
  ];

  return (
    <div className={cn("w-full overflow-hidden rounded border border-border bg-background shadow-sm", className)}>
      <div className="overflow-x-auto custom-scrollbar">
        <div className="flex items-stretch min-w-max md:min-w-0 w-full divide-x divide-border/40">
          {columns.map((col, index) => (
            <div 
              key={index} 
              className={cn(
                "flex-1 group transition-colors hover:bg-muted/30",
                col.isKks && "bg-muted/5"
              )}
              style={{ minWidth: col.minWidth }}
            >
              <div className="flex flex-col px-2 py-1 relative">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground/70 mb-0 leading-tight truncate" title={col.label}>
                    {col.label}
                  </span>
                  {col.isKks && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-2 w-2 text-muted-foreground/40 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs p-3">
                        <div className="space-y-2 text-[11px]">
                          <p className="font-bold border-b border-border pb-1 mb-1">KKS Gliederungsstufen</p>
                          <div>
                            <span className="text-primary font-bold">GS 1:</span> {col.kksDetails?.g1}
                            <p className="text-[10px] text-muted-foreground">Funktionales Gesamtsystem</p>
                          </div>
                          <div>
                            <span className="text-primary font-bold">GS 2:</span> {col.kksDetails?.g2}
                            <p className="text-[10px] text-muted-foreground">Aggregat / Gruppe</p>
                          </div>
                          <div>
                            <span className="text-primary font-bold">GS 3:</span> {col.kksDetails?.g3}
                            <p className="text-[10px] text-muted-foreground">Betriebsmittel / Signal</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold text-foreground whitespace-nowrap">
                  {col.value}
                </span>
              </div>
            </div>
          ))}
          
          {/* Action Icon Segment */}
          {onAction && (
            <div className="flex items-center px-2 bg-muted/10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAction(kzlString)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground active:scale-90"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs font-medium">{actionLabel || "Aktion ausführen"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}} />
    </div>
  );
};

export default KZLViewer;
