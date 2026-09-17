import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runGoogleAdsSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Apenas administradores podem sincronizar");
    const google = await import("./google-ads.server");
    const outcome = await google.runGoogleSyncWithLog();
    if (!outcome.ok) throw new Error(outcome.message);
    return outcome.result;
  });