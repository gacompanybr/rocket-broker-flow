import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import type { Settlement } from "@/lib/business";

export function SettlementCard({ settlement }: { settlement: Settlement }) {
  const line = (label: string, value: number) => {
    const devolver = value >= 0;
    return (
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className={devolver ? "font-semibold text-success" : "font-semibold text-destructive"}>
          {devolver ? `Devolver ${brl(value)}` : `Cobrar ${brl(Math.abs(value))}`}
        </span>
      </div>
    );
  };

  return (
    <Card className="surface-card gap-3 border-primary/30 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          Acerto da campanha
        </span>
        <span className="text-sm">
          Gasto total <strong>{brl(settlement.total_spent)}</strong>
        </span>
      </div>
      <div className="grid gap-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Parte do corretor no gasto</span>
          <span>{brl(settlement.broker_share_spent)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Parte da imobiliária no gasto</span>
          <span>{brl(settlement.agency_share_spent)}</span>
        </div>
      </div>
      <div className="grid gap-2 border-t border-border/60 pt-3">
        {line("Corretor", settlement.refund_to_broker)}
        {line("Imobiliária", settlement.refund_to_agency)}
      </div>
    </Card>
  );
}
