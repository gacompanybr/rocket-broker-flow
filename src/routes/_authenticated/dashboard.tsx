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
  Radio,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { AdCreativeCard } from "@/components/ad-creative-card";
import { StatusBadge } from "@/components/status-badge";
import { PeriodFilter } from "@/components/period-filter";
import {
  previousRange,
  rangeForPreset,
  useCampaignMetricDaily,
  useCampaignMetricSummary,
  useCampaigns,
  useMetaAds,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const metrics = useCampaignMetricSummary(range);
  const metricsDaily = useCampaignMetricDaily(range);
  const metricsPrev = useCampaignMetricSummary(prev);
  const activeAds = useMetaAds({ activeOnly: true });
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
  const totalsPorCampaign = useMemo(
    () => new Map((metrics.data ?? []).map((row) => [row.campaign_id, row])),
    [metrics.data],
  );

  const series = useMemo(() => {
    const byDate = new Map<string, { date: string; gasto: number; leads: number }>();
    for (const r of (metricsDaily.data ?? []).filter((item) => keep(item.campaign_id))) {
      const cur = byDate.get(r.date) ?? { date: r.date, gasto: 0, leads: 0 };
      cur.gasto += Number(r.spend);
      cur.leads += Number(r.leads);
      byDate.set(r.date, cur);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [metricsDaily.data, keep]);

  const activeCampaigns = useMemo(
    () => (campaigns.data ?? []).filter((campaign) => campaign.platform === "meta" && campaign.status === "active"),
    [campaigns.data],
  );
  const activeCampaignNames = useMemo(
    () => new Map(activeCampaigns.map((campaign) => [campaign.id, campaign.nome])),
    [activeCampaigns],
  );


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
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard geral</h1>
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
        {platform === "google" ? (
          <Badge variant="secondary">Google Ads ainda não integrado</Badge>
        ) : (
          <Badge variant="outline" className="border-primary/40 text-primary">
            Dados reais · Meta Ads
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
        <div className="h-[220px] w-full sm:h-[300px]">
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

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-success" />
          <h2 className="text-base font-semibold">Em veiculação agora</h2>
          <Badge variant="outline" className="ml-auto border-success/40 text-success">
            {activeCampaigns.length} ativas
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeCampaigns.map((campaign) => {
            const total = totalsPorCampaign?.get(campaign.id);
            const cplAtivo = total && Number(total.leads) > 0 ? Number(total.spend) / Number(total.leads) : 0;
            return (
              <Card key={campaign.id} className="surface-card gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold">{campaign.nome}</h3>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="block text-muted-foreground">Gasto</span><strong>{brl(Number(total?.spend ?? 0))}</strong></div>
                  <div><span className="block text-muted-foreground">Leads</span><strong>{num(Number(total?.leads ?? 0))}</strong></div>
                  <div><span className="block text-muted-foreground">CPL</span><strong>{brl(cplAtivo)}</strong></div>
                  <div><span className="block text-muted-foreground">Orç. diário</span><strong>{campaign.daily_budget ? brl(Number(campaign.daily_budget)) : "—"}</strong></div>
                </div>
              </Card>
            );
          })}
          {activeCampaigns.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha ativa no Meta.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Criativos ativos</h2>
          <Badge variant="secondary">{activeAds.data?.length ?? 0} anúncios</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(activeAds.data ?? []).slice(0, 8).map((ad) => (
            <AdCreativeCard key={ad.id} ad={ad} campaignName={activeCampaignNames.get(ad.campaign_id)} />
          ))}
          {!activeAds.isLoading && activeAds.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Os criativos aparecerão após a próxima sincronização da Meta.</p>
          )}
        </div>
      </section>

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
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Ainda não integrado
            </Badge>
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
