import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OArco Analytics | Tráfego & CRM Imobiliário" },
      { name: "description", content: "Acompanhe campanhas, anúncios e resultados da OArco." },
      { property: "og:title", content: "OArco Analytics" },
      { property: "og:description", content: "Painel de tráfego pago e gestão imobiliária." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
