import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users2,
  DollarSign,
  MessageSquare,
  Eye,
  MousePointerClick,
  Target,
  Instagram,
  Share2,
  Heart,
  Gauge,
  Search,
  MapPin,
  LineChart as LineChartIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { PeriodFilter } from "@/components/period-filter";
import {
  previousRange,
  rangeForPreset,
  useCampaignMetrics,
  useCampaigns,
  useSiteMetrics,
  useSocialMetrics,
  type Range,
} from "@/lib/data";
import { brl, dayLabel, num } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard geral | Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content:
          "Visão geral de contas alcançadas, investimento, leads, redes sociais e desempenho do site.",
      },
      { property: "og:title", content: "Dashboard geral de tráfego pago" },
      {
        property: "og:description",
        content: "Métricas consolidadas de campanhas, Instagram e site da imobiliária.",
      },
    ],
  }),
  component: DashboardPage,
});

type Totals = {
  spend: number;
  leads: number;
  impressions: number;
  reach: number;
  clicks: number;
};

const emptyTotals: Totals = { spend: 0, leads: 0, impressions: 0, reach: 0, clicks: 0 };

function sumMetrics(rows: { spend: number; leads: number; impressions: number; reach: number; clicks: number }[] | undefined): Totals {
  return (rows ?? []).reduce<Totals>(
    (acc, r) => ({
      spend: acc.spend + Number(r.spend),
      leads: acc.leads + Number(r.leads),
      impressions: acc.impressions + Number(r.impressions),
      reach: acc.reach + Number(r.reach),
      clicks: acc.clicks + Number(r.clicks),
    }),
    { ...emptyTotals },
  );
}

const variation = (atual: number, anterior: number) =>
  anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;

type PlatformFilter = "all" | "meta" | "google";

const PLATFORM_TABS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
];

function DashboardPage() {
  const [preset, setPreset] = useState("30");
  const [range, setRange] = useState<Range>(rangeForPreset("30"));
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const prev = useMemo(() => previousRange(range), [range]);

  const campaigns = useCampaigns();
  const metrics = useCampaignMetrics(range);
  const metricsPrev = useCampaignMetrics(prev);
  const social = useSocialMetrics(range);
  const socialPrev = useSocialMetrics(prev);
  const site = useSiteMetrics(range);

  const platformById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of campaigns.data ?? []) map.set(c.id, c.platform);
    return map;
  }, [campaigns.data]);

  const keep = useMemo(
    () => (campaignId: string) =>
      platform === "all" ? true : platformById.get(campaignId) === platform,
    [platform, platformById],
  );

  const rows = useMemo(
    () => (metrics.data ?? []).filter((r) => keep(r.campaign_id)),
    [metrics.data, keep],
  );
  const rowsPrev = useMemo(
    () => (metricsPrev.data ?? []).filter((r) => keep(r.campaign_id)),
    [metricsPrev.data, keep],
  );

  const totals = useMemo(() => sumMetrics(rows), [rows]);
  const totalsPrev = useMemo(() => sumMetrics(rowsPrev), [rowsPrev]);

  const series = useMemo(() => {
    const byDate = new Map<string, { date: string; gasto: number; leads: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.date) ?? { date: r.date, gasto: 0, leads: 0 };
      cur.gasto += Number(r.spend);
      cur.leads += Number(r.leads);
      byDate.set(r.date, cur);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);


  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const cplPrev = totalsPrev.leads > 0 ? totalsPrev.spend / totalsPrev.leads : 0;

  const socialLast = social.data?.[social.data.length - 1];
  const socialFirst = social.data?.[0];
  const socialPrevLast = socialPrev.data?.[socialPrev.data.length - 1];
  const engajamento = (social.data ?? []).reduce((a, r) => a + Number(r.engajamento), 0);
  const engajamentoPrev = (socialPrev.data ?? []).reduce((a, r) => a + Number(r.engajamento), 0);
  const shares = (social.data ?? []).reduce((a, r) => a + Number(r.compartilhamentos), 0);
  const sharesPrev = (socialPrev.data ?? []).reduce(
    (a, r) => a + Number(r.compartilhamentos),
    0,
  );

  const siteLast = site.data?.[site.data.length - 1];
  const visitas = (site.data ?? []).reduce((a, r) => a + Number(r.visitas_diarias), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard geral</h1>
          <p className="text-sm text-muted-foreground">
            Desempenho consolidado das campanhas, redes sociais e site
          </p>
        </div>
        <PeriodFilter
          preset={preset}
          range={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-card p-1">
          {PLATFORM_TABS.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={platform === t.value ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setPlatform(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {platform === "meta" ? (
          <Badge variant="outline" className="border-primary/40 text-primary">
            Dados reais · Meta Ads
          </Badge>
        ) : (
          <Badge variant="secondary">
            {platform === "google" ? "Dados simulados · Google Ads" : "Inclui dados simulados (Google Ads)"}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

        <KpiCard
          label="Contas alcançadas"
          value={num(totals.reach)}
          icon={Users2}
          delta={variation(totals.reach, totalsPrev.reach)}
          hint="vs período anterior"
        />
        <KpiCard
          label="Valor total gasto"
          value={brl(totals.spend)}
          icon={DollarSign}
          delta={variation(totals.spend, totalsPrev.spend)}
          hint="vs período anterior"
        />
        <KpiCard
          label="Leads (conversas iniciadas)"
          value={num(totals.leads)}
          icon={MessageSquare}
          delta={variation(totals.leads, totalsPrev.leads)}
          hint="vs período anterior"
        />
        <KpiCard
          label="Impressões"
          value={num(totals.impressions)}
          icon={Eye}
          delta={variation(totals.impressions, totalsPrev.impressions)}
        />
        <KpiCard
          label="Cliques"
          value={num(totals.clicks)}
          icon={MousePointerClick}
          delta={variation(totals.clicks, totalsPrev.clicks)}
        />
        <KpiCard
          label="Custo por lead"
          value={brl(cpl)}
          icon={Target}
          delta={variation(cpl, cplPrev)}
        />
      </div>

      <Card className="surface-card gap-4 p-5">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Gasto e leads no período</h2>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dayLabel}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(v) => dayLabel(String(v))}
                formatter={(value, name) =>
                  name === "gasto" ? [brl(Number(value)), "Gasto"] : [num(Number(value)), "Leads"]
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gasto"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="leads"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-card gap-4 p-5">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Redes sociais</h2>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Instagram real · histórico simulado
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label="Seguidores"
              value={num(socialLast?.seguidores)}
              icon={Instagram}
              delta={variation(
                Number(socialLast?.seguidores ?? 0),
                Number(socialFirst?.seguidores ?? 0),
              )}
              hint="no período"
            />
            <KpiCard
              label="Engajamento"
              value={num(engajamento)}
              icon={Heart}
              delta={variation(engajamento, engajamentoPrev)}
            />
            <KpiCard
              label="Compartilhamentos"
              value={num(shares)}
              icon={Share2}
              delta={variation(shares, sharesPrev)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Alcance do perfil: {num(socialLast?.alcance_perfil)} (anterior:{" "}
            {num(socialPrevLast?.alcance_perfil)})
          </p>
        </Card>

        <Card className="surface-card gap-4 p-5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Site &amp; Google</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard label="Score de SEO" value={`${siteLast?.seo_score ?? 0}/100`} icon={Search} />
            <KpiCard
              label="PageSpeed"
              value={`${siteLast?.page_speed_score ?? 0}/100`}
              icon={Gauge}
            />
            <KpiCard label="Visitas no período" value={num(visitas)} icon={Users2} />
            <KpiCard
              label="Google Meu Negócio"
              value={`${siteLast?.posicao_gmb ?? "-"}ª posição`}
              icon={MapPin}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
