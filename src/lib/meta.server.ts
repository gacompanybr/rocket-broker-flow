/**
 * Integração real com a Graph API do Meta (Marketing + Instagram).
 * Todo o acesso ao token acontece aqui, no servidor. Nunca no navegador.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const META_API_VERSION = "v21.0";
export const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

export type Admin = SupabaseClient<Database>;

export async function getAdmin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export function metaEnv() {
  const token = process.env["META_ACCESS_TOKEN"];
  const adAccountRaw = process.env["META_AD_ACCOUNT_ID"] ?? "act_586570306868370";
  const pageId = process.env["META_PAGE_ID"] ?? "1204803679626583";
  const igId = process.env["META_IG_BUSINESS_ID"] ?? "17841404754536218";
  if (!token) throw new MetaError("META_ACCESS_TOKEN não configurado", null);
  const adAccountId = adAccountRaw.startsWith("act_") ? adAccountRaw : `act_${adAccountRaw}`;
  return { token, adAccountId, pageId, igId };
}

export class MetaError extends Error {
  code: number | null;
  details: unknown;
  constructor(message: string, code: number | null, details?: unknown) {
    super(message);
    this.name = "MetaError";
    this.code = code;
    this.details = details ?? null;
  }
}

/** true quando o erro é de token inválido/expirado (190). */
export function isTokenError(code: number | null) {
  return code === 190 || code === 102 || code === 463;
}

/** true quando o erro é limite de chamadas (17, 80004, 4, 613). */
export function isRateLimitError(code: number | null) {
  return code === 17 || code === 80004 || code === 4 || code === 613;
}

export async function logIntegration(
  admin: Admin,
  entry: { source: string; level: "info" | "error"; code?: number | null; message: string; details?: unknown },
) {
  await admin.from("integration_logs").insert({
    source: entry.source,
    level: entry.level,
    code: entry.code ?? null,
    message: entry.message,
    details: (entry.details ?? null) as never,
  });
}

async function graph<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json["error"]) {
    const err = (json["error"] ?? {}) as Record<string, unknown>;
    const code = typeof err["code"] === "number" ? (err["code"] as number) : null;
    const sub = typeof err["error_subcode"] === "number" ? (err["error_subcode"] as number) : null;
    const message = String(err["message"] ?? `Falha HTTP ${res.status} na Graph API`);
    throw new MetaError(message, sub && isRateLimitError(sub) ? sub : code, err);
  }
  return json as T;
}

type Paged<T> = { data: T[]; paging?: { next?: string } };

async function graphAll<T>(firstUrl: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | undefined = firstUrl;
  let guard = 0;
  while (url && guard < 25) {
    const page: Paged<T> = await graph<Paged<T>>(url);
    out.push(...(page.data ?? []));
    url = page.paging?.next;
    guard += 1;
  }
  return out;
}

const centsToBRL = (v: unknown) => (v == null ? null : Number(v) / 100);

/** Só importamos campanhas criadas a partir desta data (inclusive). */
export const META_MIN_CREATED = "2026-06-30";

type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time?: string;
};

export function mapCampaignStatus(c: MetaCampaign): "active" | "paused" | "finished" {
  const s = (c.effective_status ?? c.status ?? "").toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "DELETED" || s === "ARCHIVED" || s === "CAMPAIGN_COMPLETED") return "finished";
  return "paused";
}

type MetaInsight = {
  campaign_id: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  actions?: { action_type: string; value: string }[];
};

type MetaAd = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  created_time?: string;
  campaign_id?: string;
  adset_id?: string;
  campaign?: { id?: string };
  adset?: { id?: string; name?: string };
  creative?: { id?: string };
};

type MetaCreative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  body?: string;
  title?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    link_data?: { image_hash?: string; link?: string; message?: string; name?: string };
    video_data?: {
      video_id?: string;
      image_url?: string;
      message?: string;
      title?: string;
      call_to_action?: { value?: { link?: string } };
    };
  };
};

const MESSAGING_ACTION = "onsite_conversion.messaging_conversation_started_7d";

function extractLeads(actions: MetaInsight["actions"]) {
  let messaging = 0;
  let leadForms = 0;
  for (const a of actions ?? []) {
    if (a.action_type === MESSAGING_ACTION) messaging += Number(a.value ?? 0);
    if (a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped")
      leadForms += Number(a.value ?? 0);
  }
  return { messaging, leadForms, total: messaging + leadForms };
}

/** Sincroniza campanhas + métricas do Meta e reavalia orçamentos. */
export async function syncMetaCampaigns(admin: Admin) {
  const { token, adAccountId } = metaEnv();

  const campaignsUrl =
    `${META_GRAPH}/${adAccountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time` +
    `&limit=100&access_token=${encodeURIComponent(token)}`;
  const all = await graphAll<MetaCampaign>(campaignsUrl);

  const cutoff = new Date(`${META_MIN_CREATED}T00:00:00Z`).getTime();
  const remote = all.filter((c) => {
    if (!c.created_time) return true;
    const t = new Date(c.created_time).getTime();
    return Number.isNaN(t) || t >= cutoff;
  });

  for (const c of remote) {
    await admin
      .from("campaigns")
      .upsert(
        {
          external_id: c.id,
          platform: "meta",
          nome: c.name,
          status: mapCampaignStatus(c),
          objetivo: c.objective ?? null,
          daily_budget: centsToBRL(c.daily_budget) ?? centsToBRL(c.lifetime_budget),
          ...(c.created_time ? { criada_em: new Date(c.created_time).toISOString() } : {}),
        },
        { onConflict: "platform,external_id" },
      );
  }


  const { data: localCampaigns } = await admin
    .from("campaigns")
    .select("id, external_id")
    .eq("platform", "meta");
  const idByExternal = new Map((localCampaigns ?? []).map((c) => [c.external_id, c.id]));

  // Primeira sync = ainda não existem métricas de campanhas Meta.
  const localIds = (localCampaigns ?? []).map((c) => c.id);
  let firstSync = true;
  if (localIds.length) {
    const { count } = await admin
      .from("campaign_metrics")
      .select("id", { count: "exact", head: true })
      .in("campaign_id", localIds);
    firstSync = (count ?? 0) === 0;
  }

  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const range = (since: string) =>
    `time_range=${encodeURIComponent(JSON.stringify({ since, until: iso(today) }))}`;
  const timeParam = firstSync ? range(META_MIN_CREATED) : range(iso(yesterday));


  const insightsUrl =
    `${META_GRAPH}/${adAccountId}/insights?level=campaign` +
    `&fields=campaign_id,spend,impressions,reach,clicks,cpm,cpc,actions` +
    `&time_increment=1&${timeParam}&limit=200&access_token=${encodeURIComponent(token)}`;
  const insights = await graphAll<MetaInsight>(insightsUrl);

  let rows = 0;
  for (const i of insights) {
    const campaignId = idByExternal.get(i.campaign_id);
    if (!campaignId) continue;
    const spend = Number(i.spend ?? 0);
    const leads = extractLeads(i.actions);
    await admin.from("campaign_metrics").upsert(
      {
        campaign_id: campaignId,
        date: i.date_start,
        spend,
        impressions: Number(i.impressions ?? 0),
        reach: Number(i.reach ?? 0),
        clicks: Number(i.clicks ?? 0),
        cpm: Number(i.cpm ?? 0),
        cpc: Number(i.cpc ?? 0),
        leads: leads.total,
        cost_per_lead: leads.total > 0 ? Math.round((spend / leads.total) * 100) / 100 : 0,
        coletado_em: new Date().toISOString(),
      },
      { onConflict: "campaign_id,date" },
    );
    rows += 1;
  }

  const ads = await syncMetaAds(admin, idByExternal, token, adAccountId);

  const budget = await checkBudgets(admin);

  return { campanhas: remote.length, metricas: rows, anuncios: ads, firstSync, ...budget };
}

/** Sincroniza anúncios e os dados visuais essenciais de seus criativos. */
export async function syncMetaAds(
  admin: Admin,
  campaignIdByExternal?: Map<string, string>,
  accessToken?: string,
  accountId?: string,
) {
  const env = metaEnv();
  const token = accessToken ?? env.token;
  const adAccountId = accountId ?? env.adAccountId;
  let idByExternal = campaignIdByExternal;
  if (!idByExternal) {
    const { data: localCampaigns } = await admin
      .from("campaigns")
      .select("id, external_id")
      .eq("platform", "meta");
    idByExternal = new Map((localCampaigns ?? []).map((c) => [c.external_id, c.id]));
  }

  const fields = [
    "id",
    "name",
    "status",
    "effective_status",
    "created_time",
    "campaign_id",
    "adset_id",
    "creative{id}",
  ].join(",");
  const url = `${META_GRAPH}/${adAccountId}/ads?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(token)}`;
  const remoteAds = await graphAll<MetaAd>(url);
  const creativeIds = [...new Set(remoteAds.map((ad) => ad.creative?.id).filter((id): id is string => Boolean(id)))];
  const creativeById = new Map<string, MetaCreative>();
  for (let offset = 0; offset < creativeIds.length; offset += 8) {
    const batch = creativeIds.slice(offset, offset + 8);
    const creatives = await Promise.all(
      batch.map((id) =>
        graph<MetaCreative>(
          `${META_GRAPH}/${id}?fields=thumbnail_url,image_url,body,title,effective_object_story_id,object_story_spec&access_token=${encodeURIComponent(token)}`,
        ).catch(() => ({ id })),
      ),
    );
    creatives.forEach((creative, index) => creativeById.set(batch[index], creative));
  }
  const syncedAt = new Date().toISOString();
  const seen: string[] = [];

  for (const ad of remoteAds) {
    const campaignId = idByExternal.get(ad.campaign_id ?? ad.campaign?.id ?? "");
    if (!campaignId) continue;
    const creative = creativeById.get(ad.creative?.id ?? "");
    const story = creative?.object_story_spec;
    const video = story?.video_data;
    const link = story?.link_data;
    const mediaType = video?.video_id ? "video" : link?.image_hash || creative?.image_url ? "image" : "unknown";
    const effective = (ad.effective_status ?? ad.status ?? "UNKNOWN").toUpperCase();
    await admin.from("meta_ads").upsert(
      {
        external_id: ad.id,
        campaign_id: campaignId,
        adset_external_id: ad.adset_id ?? ad.adset?.id ?? null,
        adset_name: ad.adset?.name ?? null,
        nome: ad.name,
        status: effective === "ACTIVE" ? "active" : "paused",
        effective_status: effective,
        creative_external_id: creative?.id ?? ad.creative?.id ?? null,
        media_type: mediaType,
        thumbnail_url: creative?.thumbnail_url ?? video?.image_url ?? creative?.image_url ?? null,
        image_url: creative?.image_url ?? video?.image_url ?? null,
        video_id: video?.video_id ?? null,
        body: creative?.body ?? video?.message ?? link?.message ?? null,
        title: creative?.title ?? video?.title ?? link?.name ?? null,
        link_url: video?.call_to_action?.value?.link ?? link?.link ?? null,
        source_story_id: creative?.effective_object_story_id ?? null,
        created_time: ad.created_time ? new Date(ad.created_time).toISOString() : null,
        last_synced_at: syncedAt,
      },
      { onConflict: "external_id" },
    );
    seen.push(ad.id);
  }

  if (seen.length) {
    await admin
      .from("meta_ads")
      .update({ status: "paused", effective_status: "NOT_DELIVERING", last_synced_at: syncedAt })
      .not("external_id", "in", `(${seen.join(",")})`);
  }
  return { sincronizados: seen.length, ativos: remoteAds.filter((a) => a.effective_status === "ACTIVE").length };
}

/** Resolve a fonte atual de um vídeo apenas quando a prévia é aberta. */
export async function getMetaVideoSource(videoId: string) {
  const { token } = metaEnv();
  const video = await graph<{ source?: string; picture?: string }>(
    `${META_GRAPH}/${encodeURIComponent(videoId)}?fields=source,picture&access_token=${encodeURIComponent(token)}`,
  );
  return { source: video.source ?? null, picture: video.picture ?? null };
}

/** Reavalia consumo de verba dos vínculos e emite alertas sem duplicar. */
export async function checkBudgets(admin: Admin) {
  const { data: settings } = await admin.from("settings").select("alert_threshold").limit(1).maybeSingle();
  const threshold = Number(settings?.alert_threshold ?? 80);

  const { data: links } = await admin
    .from("broker_campaigns")
    .select("id, campaign_id, created_at, total_budget, status")
    .in("status", ["running", "near_limit", "exhausted", "over_budget"]);

  let atualizados = 0;
  let alertas = 0;

  for (const link of links ?? []) {
    const total = Number(link.total_budget ?? 0);
    if (total <= 0) continue;
    const since = String(link.created_at).slice(0, 10);
    const { data: metrics } = await admin
      .from("campaign_metrics")
      .select("spend")
      .eq("campaign_id", link.campaign_id)
      .gte("date", since);
    const spent = (metrics ?? []).reduce((acc, m) => acc + Number(m.spend), 0);
    const ratio = (spent / total) * 100;

    let status: "running" | "near_limit" | "exhausted" | "over_budget" = "running";
    let tipo: "near_limit" | "exhausted" | "over_budget" | null = null;
    if (ratio > 100) {
      status = "over_budget";
      tipo = "over_budget";
    } else if (ratio >= 100) {
      status = "exhausted";
      tipo = "exhausted";
    } else if (ratio >= threshold) {
      status = "near_limit";
      tipo = "near_limit";
    }

    if (status !== link.status) {
      await admin.from("broker_campaigns").update({ status }).eq("id", link.id);
      atualizados += 1;
    }

    if (tipo) {
      const { data: existing } = await admin
        .from("alerts")
        .select("id")
        .eq("broker_campaign_id", link.id)
        .eq("tipo", tipo)
        .limit(1);
      if (!existing?.length) {
        const pct = Math.round(ratio);
        const mensagem =
          tipo === "near_limit"
            ? `Verba em ${pct}% do orçamento contratado.`
            : tipo === "exhausted"
              ? "Orçamento contratado foi totalmente consumido."
              : `Orçamento estourado: gasto em ${pct}% do contratado.`;
        await admin.from("alerts").insert({ broker_campaign_id: link.id, tipo, mensagem });
        alertas += 1;
      }
    }
  }

  return { vinculosAtualizados: atualizados, alertasCriados: alertas };
}

/** Sincroniza seguidores e engajamento do Instagram Business. */
export async function syncMetaSocial(admin: Admin) {
  const { token, igId } = metaEnv();

  const profile = await graph<{ followers_count?: number; media_count?: number }>(
    `${META_GRAPH}/${igId}?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`,
  );

  const insights = await graph<{
    data: { name: string; total_value?: { value?: number } }[];
  }>(
    `${META_GRAPH}/${igId}/insights?metric=reach,accounts_engaged,shares&period=day&metric_type=total_value&access_token=${encodeURIComponent(token)}`,
  );

  const valueOf = (name: string) =>
    Number(insights.data?.find((d) => d.name === name)?.total_value?.value ?? 0);

  const row = {
    date: new Date().toISOString().slice(0, 10),
    seguidores: Number(profile.followers_count ?? 0),
    alcance_perfil: valueOf("reach"),
    engajamento: valueOf("accounts_engaged"),
    compartilhamentos: valueOf("shares"),
  };

  await admin.from("social_metrics").upsert(row, { onConflict: "date" });
  return row;
}

/** Pausa/ativa ou altera orçamento diário de uma campanha no Meta. */
export async function updateMetaCampaign(
  admin: Admin,
  input: { externalId: string; status?: "ACTIVE" | "PAUSED"; dailyBudgetCents?: number },
) {
  const { token } = metaEnv();
  const body = new URLSearchParams();
  if (input.status) body.set("status", input.status);
  if (input.dailyBudgetCents != null) body.set("daily_budget", String(Math.round(input.dailyBudgetCents)));
  body.set("access_token", token);

  await graph<{ success?: boolean }>(`${META_GRAPH}/${input.externalId}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const fresh = await graph<MetaCampaign>(
    `${META_GRAPH}/${input.externalId}?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget&access_token=${encodeURIComponent(token)}`,
  );

  const status = mapCampaignStatus(fresh);
  const daily_budget = centsToBRL(fresh.daily_budget) ?? centsToBRL(fresh.lifetime_budget);

  await admin
    .from("campaigns")
    .update({ status, daily_budget, nome: fresh.name })
    .eq("platform", "meta")
    .eq("external_id", input.externalId);

  return { status, daily_budget, effective_status: fresh.effective_status ?? fresh.status ?? null };
}

/** Executa uma sync e registra o resultado (ou o erro) em integration_logs. */
export async function runWithLog<T>(source: string, fn: (admin: Admin) => Promise<T>) {
  const admin = await getAdmin();
  try {
    const result = await fn(admin);
    await logIntegration(admin, {
      source,
      level: "info",
      message: "Sincronização concluída com sucesso",
      details: result as unknown,
    });
    return { ok: true as const, result };
  } catch (error) {
    const code = error instanceof MetaError ? error.code : null;
    const message = error instanceof Error ? error.message : String(error);
    const prefix = isTokenError(code)
      ? "Token do Meta inválido ou expirado"
      : isRateLimitError(code)
        ? "Limite de chamadas do Meta atingido"
        : "Falha na integração com o Meta";
    await logIntegration(admin, {
      source,
      level: "error",
      code,
      message: `${prefix}: ${message}`,
      details: error instanceof MetaError ? error.details : null,
    });
    return { ok: false as const, code, message: `${prefix}: ${message}` };
  }
}
