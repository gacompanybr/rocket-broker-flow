import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CampaignActionInput = {
  externalId: string;
  status?: "ACTIVE" | "PAUSED";
  dailyBudgetBRL?: number;
};

/** Ação administrativa direto no Meta (pausar/ativar ou mudar orçamento diário). */
export const metaCampaignAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: CampaignActionInput) => {
    if (!input?.externalId) throw new Error("Campanha inválida");
    if (input.status && !["ACTIVE", "PAUSED"].includes(input.status))
      throw new Error("Status inválido");
    if (input.dailyBudgetBRL != null && !(input.dailyBudgetBRL > 0))
      throw new Error("Orçamento diário deve ser maior que zero");
    if (!input.status && input.dailyBudgetBRL == null) throw new Error("Nada a alterar");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Apenas administradores podem alterar campanhas");

    const meta = await import("./meta.server");
    const admin = await meta.getAdmin();
    try {
      const result = await meta.updateMetaCampaign(admin, {
        externalId: data.externalId,
        ...(data.status ? { status: data.status } : {}),
        ...(data.dailyBudgetBRL != null
          ? { dailyBudgetCents: Math.round(data.dailyBudgetBRL * 100) }
          : {}),
      });
      await meta.logIntegration(admin, {
        source: "meta_action",
        level: "info",
        message: `Campanha ${data.externalId} atualizada no Meta`,
        details: { ...data, ...result },
      });
      return result;
    } catch (err) {
      const code = err instanceof meta.MetaError ? err.code : null;
      const message = err instanceof Error ? err.message : String(err);
      await meta.logIntegration(admin, {
        source: "meta_action",
        level: "error",
        code,
        message: `Falha ao atualizar campanha no Meta: ${message}`,
        details: data,
      });
      throw new Error(message);
    }
  });

/** Dispara manualmente as syncs do Meta (somente admin). */
export const runMetaSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { social?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Apenas administradores podem sincronizar");

    const meta = await import("./meta.server");
    const campanhas = await meta.runWithLog("meta_campaigns", (admin) =>
      meta.syncMetaCampaigns(admin),
    );
    const social =
      data.social === false ? null : await meta.runWithLog("meta_social", (a) => meta.syncMetaSocial(a));
    return { campanhas, social };
  });

export const getMetaVideoPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { videoId: string }) => {
    if (!input?.videoId) throw new Error("Vídeo inválido");
    return input;
  })
  .handler(async ({ data }) => {
    const meta = await import("./meta.server");
    return meta.getMetaVideoSource(data.videoId);
  });
