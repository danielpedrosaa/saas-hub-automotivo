import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface VisualMarker {
  id: string;
  x: number;
  y: number;
  view: "top" | "left_side" | "right_side";
  label: string;
}

const MARKER_LABELS = ["Risco", "Amassado", "Mancha", "Quebra"] as const;

interface CarDiagramProps {
  markers: VisualMarker[];
  onAddMarker: (marker: VisualMarker) => void;
  onRemoveMarker: (id: string) => void;
  readOnly?: boolean;
}

type CarView = "top" | "left_side" | "right_side";

const viewLabels: Record<CarView, string> = {
  top: "Topo",
  left_side: "Lado Esq.",
  right_side: "Lado Dir.",
};

export default function CarDiagram({
  markers,
  onAddMarker,
  onRemoveMarker,
  readOnly = false,
}: CarDiagramProps) {
  const [activeView, setActiveView] = useState<CarView>("top");
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPoint({ x, y });
  };

  const confirmMarker = (label: string) => {
    if (!pendingPoint) return;
    onAddMarker({
      id: crypto.randomUUID(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      view: activeView,
      label,
    });
    setPendingPoint(null);
  };

  const viewMarkers = markers.filter((m) => m.view === activeView);

  return (
    <div className="space-y-3">
      {/* View tabs */}
      <div className="flex gap-1.5">
        {(Object.keys(viewLabels) as CarView[]).map((v) => {
          const count = markers.filter((m) => m.view === v).length;
          return (
            <Button
              key={v}
              type="button"
              variant={activeView === v ? "default" : "secondary"}
              size="sm"
              onClick={() => { setActiveView(v); setPendingPoint(null); }}
              className="flex-1 text-xs h-9"
            >
              {viewLabels[v]}
              {count > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Car SVG */}
      <div className="relative rounded-lg border border-border bg-muted/50 overflow-hidden">
        <svg
          viewBox="0 0 300 200"
          className="w-full h-auto cursor-crosshair"
          onClick={handleSvgClick}
        >
          {activeView === "top" && <CarTopView />}
          {activeView === "left_side" && <CarSideView flip={false} />}
          {activeView === "right_side" && <CarSideView flip={true} />}

          {/* Markers */}
          {viewMarkers.map((m) => (
            <g
              key={m.id}
              transform={`translate(${(m.x / 100) * 300}, ${(m.y / 100) * 200})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) onRemoveMarker(m.id);
              }}
            >
              <circle r="8" fill="hsl(0, 72%, 51%)" opacity="0.9" />
              <circle r="3" fill="white" />
              <title>{m.label}</title>
            </g>
          ))}

          {/* Pending point */}
          {pendingPoint && (
            <g transform={`translate(${(pendingPoint.x / 100) * 300}, ${(pendingPoint.y / 100) * 200})`}>
              <circle r="8" fill="hsl(207, 90%, 54%)" opacity="0.9" className="animate-pulse" />
            </g>
          )}
        </svg>

        {/* Label selector popup */}
        {pendingPoint && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 bg-card/95 backdrop-blur-sm rounded-lg border border-border p-2">
            {MARKER_LABELS.map((label) => (
              <Button
                key={label}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => confirmMarker(label)}
                className="flex-1 text-xs h-9"
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPendingPoint(null)}
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Marker legend */}
      {viewMarkers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {viewMarkers.map((m) => (
            <span
              key={m.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs text-destructive",
                !readOnly && "cursor-pointer hover:bg-destructive/25"
              )}
              onClick={() => !readOnly && onRemoveMarker(m.id)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {m.label}
              {!readOnly && <X className="h-3 w-3" />}
            </span>
          ))}
        </div>
      )}

      {!readOnly && viewMarkers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Toque no diagrama para marcar pontos com problemas
        </p>
      )}
    </div>
  );
}

/** Top-down view of a car */
function CarTopView() {
  return (
    <g>
      {/* Car body */}
      <rect x="100" y="15" width="100" height="170" rx="35" ry="25"
        fill="none" stroke="hsl(215, 15%, 35%)" strokeWidth="2" />
      {/* Windshield */}
      <line x1="115" y1="55" x2="185" y2="55" stroke="hsl(207, 90%, 54%)" strokeWidth="1.5" opacity="0.6" />
      {/* Rear window */}
      <line x1="120" y1="150" x2="180" y2="150" stroke="hsl(207, 90%, 54%)" strokeWidth="1.5" opacity="0.6" />
      {/* Center line */}
      <line x1="150" y1="25" x2="150" y2="180" stroke="hsl(215, 15%, 30%)" strokeWidth="0.5" strokeDasharray="4 3" />
      {/* Left mirrors */}
      <ellipse cx="95" cy="65" rx="8" ry="5" fill="none" stroke="hsl(215, 15%, 35%)" strokeWidth="1.5" />
      {/* Right mirror */}
      <ellipse cx="205" cy="65" rx="8" ry="5" fill="none" stroke="hsl(215, 15%, 35%)" strokeWidth="1.5" />
      {/* Wheels */}
      <rect x="88" y="35" width="8" height="22" rx="3" fill="hsl(215, 15%, 30%)" />
      <rect x="204" y="35" width="8" height="22" rx="3" fill="hsl(215, 15%, 30%)" />
      <rect x="88" y="140" width="8" height="22" rx="3" fill="hsl(215, 15%, 30%)" />
      <rect x="204" y="140" width="8" height="22" rx="3" fill="hsl(215, 15%, 30%)" />
      {/* Labels */}
      <text x="150" y="10" textAnchor="middle" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter">FRENTE</text>
      <text x="150" y="198" textAnchor="middle" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter">TRASEIRA</text>
    </g>
  );
}

/** Side view of a car */
function CarSideView({ flip }: { flip: boolean }) {
  return (
    <g transform={flip ? "translate(300, 0) scale(-1, 1)" : undefined}>
      {/* Body */}
      <path
        d="M 40 130 Q 40 110 55 110 L 80 110 L 105 70 L 200 65 Q 230 65 240 80 L 250 110 Q 265 110 265 130 L 265 140 Q 265 148 258 148 L 48 148 Q 40 148 40 140 Z"
        fill="none" stroke="hsl(215, 15%, 35%)" strokeWidth="2"
      />
      {/* Windows */}
      <path
        d="M 108 72 L 88 108 L 148 108 L 148 72 Z"
        fill="hsl(207, 90%, 54%)" opacity="0.15" stroke="hsl(207, 90%, 54%)" strokeWidth="1"
      />
      <path
        d="M 152 70 L 152 108 L 220 108 L 228 78 Q 220 68 200 68 Z"
        fill="hsl(207, 90%, 54%)" opacity="0.15" stroke="hsl(207, 90%, 54%)" strokeWidth="1"
      />
      {/* Door line */}
      <line x1="150" y1="70" x2="150" y2="145" stroke="hsl(215, 15%, 30%)" strokeWidth="1" />
      {/* Front wheel */}
      <circle cx="85" cy="148" r="18" fill="hsl(215, 15%, 18%)" stroke="hsl(215, 15%, 35%)" strokeWidth="2" />
      <circle cx="85" cy="148" r="8" fill="hsl(215, 15%, 25%)" />
      {/* Rear wheel */}
      <circle cx="222" cy="148" r="18" fill="hsl(215, 15%, 18%)" stroke="hsl(215, 15%, 35%)" strokeWidth="2" />
      <circle cx="222" cy="148" r="8" fill="hsl(215, 15%, 25%)" />
      {/* Headlight */}
      <rect x="42" y="115" width="10" height="8" rx="2" fill="hsl(48, 96%, 53%)" opacity="0.6" />
      {/* Taillight */}
      <rect x="253" y="115" width="8" height="8" rx="2" fill="hsl(0, 72%, 51%)" opacity="0.6" />
      {/* Labels (unflipped) */}
      {!flip && (
        <>
          <text x="50" y="100" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter">FRENTE</text>
          <text x="240" y="100" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter" textAnchor="end">TRÁS</text>
        </>
      )}
      {flip && (
        <>
          <text x="50" y="100" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter" transform="translate(300, 0) scale(-1, 1)">TRÁS</text>
          <text x="240" y="100" fontSize="8" fill="hsl(215, 15%, 55%)" fontFamily="Inter" textAnchor="end" transform="translate(300, 0) scale(-1, 1)">FRENTE</text>
        </>
      )}
    </g>
  );
}
