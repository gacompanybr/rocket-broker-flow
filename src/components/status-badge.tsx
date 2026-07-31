import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/business";

const TONE: Record<string, string> = {
  running: "bg-primary/15 text-primary border-primary/30",
  active: "bg-primary/15 text-primary border-primary/30",
  near_limit: "bg-warning/15 text-warning border-warning/30",
  paused: "bg-muted text-muted-foreground border-border",
  exhausted: "bg-destructive/15 text-destructive border-destructive/30",
  over_budget: "bg-destructive/25 text-destructive border-destructive/40",
  finished_early: "bg-secondary text-secondary-foreground border-border",
  completed: "bg-secondary text-secondary-foreground border-border",
  finished: "bg-secondary text-secondary-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE[status] ?? TONE.paused, className)}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
