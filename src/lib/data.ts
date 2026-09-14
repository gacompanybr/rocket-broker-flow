import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Range = { from: string; to: string };

export function daysAgoISO(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function rangeForPreset(preset: string): Range {
  if (preset === "hoje") return { from: todayISO(), to: todayISO() };
  if (preset === "7") return { from: daysAgoISO(6), to: todayISO() };
  return { from: daysAgoISO(29), to: todayISO() };
}

export function previousRange(range: Range): Range {
  const from = new Date(range.from + "T00:00:00Z");
  const to = new Date(range.to + "T00:00:00Z");
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (days - 1));
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, external_id, platform, nome, status, objetivo, daily_budget, criada_em, created_time")
        .order("criada_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignMetrics(range: Range) {
  return useQuery({
    queryKey: ["campaign_metrics", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_metrics")
        .select("campaign_id, date, spend, impressions, reach, clicks, leads")
        .gte("date", range.from)
        .lte("date", range.to)
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllCampaignMetrics() {
  return useQuery({
    queryKey: ["campaign_metrics", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_metrics")
        .select("campaign_id, date, spend, leads, clicks, impressions, reach, cost_per_lead")
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignMetricSummary(range: Range) {
  return useQuery({
    queryKey: ["campaign_metrics_summary", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("campaign_metrics_summary", {
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignMetricDaily(range: Range) {
  return useQuery({
    queryKey: ["campaign_metrics_daily", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("campaign_metrics_daily", {
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignHistory(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign_metrics", "campaign", campaignId],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_metrics")
        .select("date, spend, leads, clicks")
        .eq("campaign_id", campaignId)
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useMetaAds(options?: {
  campaignId?: string | null;
  activeOnly?: boolean;
  enabled?: boolean;
  limit?: number;
}) {
  const campaignId = options?.campaignId ?? null;
  const activeOnly = options?.activeOnly ?? false;
  const limit = options?.limit;
  return useQuery({
    queryKey: ["meta_ads", campaignId ?? "all", activeOnly ? "active" : "all", limit ?? "all"],
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let query = supabase
        .from("meta_ads")
        .select("id, campaign_id, adset_name, nome, effective_status, media_type, thumbnail_url, image_url, video_id, body, title, link_url")
        .order("updated_at", { ascending: false });
      if (campaignId) query = query.eq("campaign_id", campaignId);
      if (activeOnly) query = query.eq("effective_status", "ACTIVE");
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBrokers() {
  return useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useBrokerCampaigns() {
  return useQuery({
    queryKey: ["broker_campaigns"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broker_campaigns")
        .select("id, campaign_id, broker_id, broker_deposit, agency_match, total_budget, status, created_at, finished_at, campaigns(id, nome, platform, status, daily_budget), brokers(id, nome, email, telefone, ativo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*, broker_campaigns(id, campaigns(nome), brokers(nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select("*, broker_campaigns(id, broker_deposit, agency_match, campaigns(nome), brokers(nome))")
        .order("calculated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSiteMetrics(range: Range) {
  return useQuery({
    queryKey: ["site_metrics", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_metrics")
        .select("date, visitas_diarias, seo_score, page_speed_score, posicao_gmb")
        .gte("date", range.from)
        .lte("date", range.to)
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useSocialMetrics(range: Range) {
  return useQuery({
    queryKey: ["social_metrics", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_metrics")
        .select("date, seguidores, engajamento, compartilhamentos, alcance_perfil")
        .gte("date", range.from)
        .lte("date", range.to)
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIntegrationLogs(source?: string) {
  return useQuery({
    queryKey: ["integration_logs", source ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (source) q = q.eq("source", source);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
