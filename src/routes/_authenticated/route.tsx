import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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

  // Realtime: novas métricas/alertas atualizam a tela sem refresh.
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_metrics" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["campaign_metrics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "broker_campaigns" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, router]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur md:px-6">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">
              Painel de tráfego pago &amp; CRM
            </span>
          </header>
          <main className="flex-1 p-3 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
