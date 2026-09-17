import { createFileRoute } from "@tanstack/react-router";

/** Sincroniza campanhas e métricas do Google Ads por uma chamada agendada. */
export const Route = createFileRoute("/api/public/hooks/sync-google-ads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        const provided =
          request.headers.get("apikey") ?? request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
        if (!key || provided !== key) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const google = await import("@/lib/google-ads.server");
        const outcome = await google.runGoogleSyncWithLog();
        return Response.json(outcome, { status: outcome.ok ? 200 : 502 });
      },
    },
  },
});