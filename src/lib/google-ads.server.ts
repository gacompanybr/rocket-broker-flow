import type { Admin } from "./meta.server";

const GOOGLE_ADS_API = "https://connector-gateway.lovable.dev/google_ads/v25";
const OARCO_CUSTOMER_ID = "7455487545";
const GOOGLE_MIN_DATE = "2026-09-01";

type GoogleCampaignRow = {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    startDateTime?: string;
  };
  campaignBudget?: { amountMicros?: string };
  segments?: { date?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number | string;
  };
};

function googleEnv() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_ADS_API_KEY"];
  const configuredId = (process.env["GOOGLE_ADS_CUSTOMER_ID"] ?? OARCO_CUSTOMER_ID).replace(/\D/g, "");
  if (!lovableKey || !connectionKey) throw new Error("Conexão do Google Ads não configurada no projeto");
  if (configuredId !== OARCO_CUSTOMER_ID) throw new Error("A conta Google Ads configurada não é a conta OArco autorizada");
  return { lovableKey, connectionKey, customerId: configuredId };
}

async function searchGoogleAds(query: string): Promise<GoogleCampaignRow[]> {
  const { lovableKey, connectionKey, customerId } = googleEnv();
  const response = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Google Ads respondeu ${response.status}: ${body}`);
  const payload = JSON.parse(body) as Array<{ results?: GoogleCampaignRow[] }> | { results?: GoogleCampaignRow[] };
  return Array.isArray(payload)
    ? payload.flatMap((batch) => batch.results ?? [])
    : payload.results ?? [];
}

function campaignStatus(status?: string): "active" | "paused" | "finished" {
  if (status === "ENABLED") return "active";
  if (status === "REMOVED") return "finished";
  return "paused";
}

const fromMicros = (value?: string) => Number(value ?? 0) / 1_000_000;

export async function syncGoogleAds(admin: Admin) {
  const campaignRows = await searchGoogleAds(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
      campaign.start_date_time, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.start_date_time DESC
  `);

  for (const row of campaignRows) {
    const campaign = row.campaign;
    if (!campaign?.id || !campaign.name) continue;
    await admin.from("campaigns").upsert(
      {
        external_id: campaign.id,
        platform: "google",
        nome: campaign.name,
        status: campaignStatus(campaign.status),
        objetivo: campaign.advertisingChannelType ?? null,
        daily_budget: row.campaignBudget?.amountMicros
          ? fromMicros(row.campaignBudget.amountMicros)
          : null,
        ...(campaign.startDateTime
          ? { criada_em: new Date(campaign.startDateTime.replace(" ", "T")).toISOString() }
          : {}),
      },
      { onConflict: "platform,external_id" },
    );
  }

  const { data: localCampaigns, error: localError } = await admin
    .from("campaigns")
    .select("id, external_id")
    .eq("platform", "google");
  if (localError) throw localError;
  const idByExternal = new Map((localCampaigns ?? []).map((campaign) => [campaign.external_id, campaign.id]));

  const today = new Date().toISOString().slice(0, 10);
  const metricRows = await searchGoogleAds(`
    SELECT campaign.id, segments.date, metrics.impressions, metrics.clicks,
      metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${GOOGLE_MIN_DATE}' AND '${today}'
    ORDER BY segments.date ASC
  `);

  let metricsSynced = 0;
  for (const row of metricRows) {
    const campaignId = idByExternal.get(row.campaign?.id ?? "");
    const date = row.segments?.date;
    if (!campaignId || !date) continue;
    const spend = fromMicros(row.metrics?.costMicros);
    const clicks = Number(row.metrics?.clicks ?? 0);
    const impressions = Number(row.metrics?.impressions ?? 0);
    const leads = Math.round(Number(row.metrics?.conversions ?? 0));
    const { error } = await admin.from("campaign_metrics").upsert(
      {
        campaign_id: campaignId,
        date,
        spend,
        impressions,
        reach: 0,
        clicks,
        leads,
        cpm: impressions > 0 ? Math.round((spend / impressions) * 100_000) / 100 : 0,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        cost_per_lead: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
        coletado_em: new Date().toISOString(),
      },
      { onConflict: "campaign_id,date" },
    );
    if (error) throw error;
    metricsSynced += 1;
  }

  await admin
    .from("settings")
    .update({ google_ads_customer_id: "745-548-7545", updated_at: new Date().toISOString() })
    .eq("singleton", true);

  return {
    conta: OARCO_CUSTOMER_ID,
    campanhas: campaignRows.length,
    metricas: metricsSynced,
  };
}

export async function runGoogleSyncWithLog() {
  const { getAdmin, logIntegration } = await import("./meta.server");
  const admin = await getAdmin();
  try {
    const result = await syncGoogleAds(admin);
    await logIntegration(admin, {
      source: "google_ads_campaigns",
      level: "info",
      message: "Sincronização do Google Ads concluída com sucesso",
      details: result,
    });
    return { ok: true as const, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logIntegration(admin, {
      source: "google_ads_campaigns",
      level: "error",
      message: `Falha na integração com o Google Ads: ${message}`,
    });
    return { ok: false as const, message };
  }
}