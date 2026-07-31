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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
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
        .select("*")
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broker_campaigns")
        .select("*, campaigns(*), brokers(*)")
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
        .select("*")
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
        .select("*")
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
