import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes: string;
}

const PREDEFINED_ITEMS = [
  "Lataria danificada",
  "Rodas riscadas",
  "Retrovisor danificado",
  "Vidros riscados",
  "Interior sujo",
  "Faróis danificados",
  "Para-choque riscado",
  "Pintura descascando",
];

interface StructuredChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readOnly?: boolean;
}

export default function StructuredChecklist({
  items,
  onChange,
  readOnly = false,
}: StructuredChecklistProps) {
  const [customLabel, setCustomLabel] = useState("");

  const toggleItem = (id: string) => {
    if (readOnly) return;
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const updateNotes = (id: string, notes: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const addCustomItem = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    onChange([
      ...items,
      { id: crypto.randomUUID(), label: trimmed, checked: true, notes: "" },
    ]);
    setCustomLabel("");
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {checkedCount} {checkedCount === 1 ? "item marcado" : "itens marcados"}
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3 transition-colors ${
              item.checked
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              {!readOnly && (
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="h-5 w-5"
                />
              )}
              <span
                className={`flex-1 text-sm ${
                  item.checked ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {readOnly && item.checked && (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-destructive" />
                )}
                {item.label}
              </span>
              {!readOnly && !PREDEFINED_ITEMS.includes(item.label) && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {item.checked && !readOnly && (
              <Input
                value={item.notes}
                onChange={(e) => updateNotes(item.id, e.target.value)}
                placeholder="Observação (opcional)..."
                className="mt-2 h-9 text-xs"
                maxLength={200}
              />
            )}
            {item.checked && readOnly && item.notes && (
              <p className="mt-1.5 text-xs text-muted-foreground pl-4">
                ↳ {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add custom item */}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Adicionar item personalizado..."
            className="h-10 text-sm"
            maxLength={100}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={addCustomItem}
            disabled={!customLabel.trim()}
            className="h-10 w-10 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Creates initial checklist items from predefined list */
export function createInitialChecklist(): ChecklistItem[] {
  return PREDEFINED_ITEMS.map((label) => ({
    id: crypto.randomUUID(),
    label,
    checked: false,
    notes: "",
  }));
}
