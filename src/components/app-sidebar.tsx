import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Megaphone,
  Users,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import logoAsset from "@/assets/arco-logo.png.asset.json";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Agência (admin)",
  owner: "Dono da imobiliária",
  broker: "Corretor",
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items = [
    { title: "Dashboard geral", url: "/dashboard", icon: BarChart3 },
    { title: "Campanhas", url: "/campanhas", icon: Megaphone },
    { title: "Corretores", url: "/corretores", icon: Users },
    ...(isAdmin
      ? [
          { title: "Configurações", url: "/configuracoes", icon: SettingsIcon },
          { title: "Admin", url: "/admin", icon: ShieldCheck },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-0 px-4 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="Arco Gerenciamento Imobiliário"
            width={160}
            height={160}
            className="h-10 w-auto"
          />
        </div>
      </SidebarHeader>


      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role ?? ""] ?? "Sem papel"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
