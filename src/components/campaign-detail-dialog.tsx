import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdCreativeCard, type AdCreative } from "@/components/ad-creative-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayLabel } from "@/lib/format";

type HistoryPoint = { date: string; gasto: number; leads: number; cliques: number };

export default function CampaignDetailDialog({
  open,
  onOpenChange,
  campaignName,
  history,
  ads,
  adsLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName?: string;
  history: HistoryPoint[];
  ads: AdCreative[];
  adsLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{campaignName}</DialogTitle>
          <DialogDescription>Histórico e criativos ativos da campanha.</DialogDescription>
        </DialogHeader>
        <div className="h-[220px] w-full sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dayLabel} stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                labelFormatter={(value) => dayLabel(String(value))}
              />
              <Line type="monotone" dataKey="gasto" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cliques" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Anúncios ativos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {ads.map((ad) => (
              <AdCreativeCard key={ad.id} ad={ad} campaignName={campaignName} />
            ))}
            {!adsLoading && ads.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum criativo ativo nesta campanha.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}