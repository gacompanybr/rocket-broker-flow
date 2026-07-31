import { createFileRoute } from "@tanstack/react-router";

/** Chamada pelo cron 1x por hora: sincroniza seguidores/engajamento do Instagram. */
export const Route = createFileRoute("/api/public/hooks/sync-meta-social")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "") ??
          "";
        if (!key || provided !== key) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const meta = await import("@/lib/meta.server");
        const outcome = await meta.runWithLog("meta_social", (admin) => meta.syncMetaSocial(admin));
        return new Response(JSON.stringify(outcome), {
          status: outcome.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
