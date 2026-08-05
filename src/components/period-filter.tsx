import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { rangeForPreset, type Range } from "@/lib/data";

const PRESETS = [
  { id: "hoje", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
];

type Props = {
  preset: string;
  range: Range;
  onChange: (preset: string, range: Range) => void;
};

export function PeriodFilter({ preset, range, onChange }: Props) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {PRESETS.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant={preset === p.id ? "default" : "outline"}
          onClick={() => onChange(p.id, rangeForPreset(p.id))}
        >
          {p.label}
        </Button>
      ))}
      <Button
        size="sm"
        variant={preset === "custom" ? "default" : "outline"}
        onClick={() => onChange("custom", range)}
      >
        Personalizado
      </Button>
      {preset === "custom" && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="date"
            className={cn("h-8 min-w-0 flex-1 sm:w-[150px] sm:flex-none")}
            value={range.from}
            onChange={(e) => onChange("custom", { ...range, from: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            className="h-8 min-w-0 flex-1 sm:w-[150px] sm:flex-none"
            value={range.to}
            onChange={(e) => onChange("custom", { ...range, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
