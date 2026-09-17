import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  staleTime: 5 * 60_000,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Realtime: novas métricas/alertas atualizam a tela sem refresh (com debounce).
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const invalidate = (key: string) => {
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: [key],
            refetchType: "active",
          });
        }, 800),
      );
    };

    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_metrics" }, () =>
        ["campaign_metrics", "campaign_metrics_summary", "campaign_metrics_daily"].forEach(invalidate),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () =>
        invalidate("campaigns"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "broker_campaigns" }, () =>
        invalidate("broker_campaigns"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () =>
        invalidate("alerts"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "meta_ads" }, () =>
        invalidate("meta_ads"),
      )
      .subscribe();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      void supabase.removeChannel(channel);
    };
  }, [queryClient, router]);


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur md:px-6">
            <SidebarTrigger className="shrink-0" />
            <span className="truncate text-xs text-muted-foreground sm:text-sm">
              Painel de tráfego pago &amp; CRM
            </span>
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden p-3 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
