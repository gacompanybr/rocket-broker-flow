import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Globe, Link2, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content: "Site, integrações Meta, Google, Instagram e GBP, e preferências de alerta.",
      },
      { property: "og:title", content: "Configurações e integrações" },
      {
        property: "og:description",
        content: "Cadastre IDs de integração e defina o limiar de alerta de orçamento.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const CAMPOS: { key: string; label: string; hint: string }[] = [
  { key: "site_url", label: "URL do site", hint: "Usada para SEO e PageSpeed" },
  { key: "meta_ad_account_id", label: "Meta — Ad Account ID", hint: "ex: act_1029384756" },
  { key: "meta_page_id", label: "Meta — Página", hint: "ID da página do Facebook" },
  { key: "instagram_business_id", label: "Instagram Business ID", hint: "Conta profissional" },
  { key: "google_ads_customer_id", label: "Google Ads — Customer ID", hint: "ex: 123-456-7890" },
  { key: "gbp_location_id", label: "Google Business Profile — Location ID", hint: "locations/..." },
];

function ConfiguracoesPage() {
  const { isAdmin } = useAuth();
  const settings = useSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState("80");

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const c of CAMPOS) next[c.key] = String(s[c.key] ?? "");
    setForm(next);
    setThreshold(String(s.alert_threshold ?? 80));
  }, [settings.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!settings.data) throw new Error("Configurações não encontradas");
      const { error } = await supabase
        .from("settings")
        .update({ ...form, alert_threshold: Number(threshold), updated_at: new Date().toISOString() })
        .eq("id", settings.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  if (!isAdmin) {
    return (
      <Card className="surface-card p-8 text-center text-muted-foreground">
        Área restrita ao administrador da agência.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Site, conexões de integração e preferências de alerta
        </p>
      </div>

      <Card className="surface-card gap-5 p-5">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Site e integrações</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {CAMPOS.map((c) => {
            const preenchido = !!form[c.key];
            return (
              <div key={c.key} className="space-y-2">
                <Label htmlFor={c.key} className="flex items-center gap-2">
                  {c.label}
                  {preenchido ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3" /> pendente
                    </span>
                  )}
                </Label>
                <Input
                  id={c.key}
                  value={form[c.key] ?? ""}
                  placeholder={c.hint}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="surface-card gap-5 p-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Preferências de alerta</h2>
        </div>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="threshold">Limiar de aviso de orçamento (%)</Label>
          <Input
            id="threshold"
            type="number"
            min={50}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Acima deste percentual a campanha entra em &quot;próximo do limite&quot;.
          </p>
        </div>
      </Card>

      <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
        <Save className="h-4 w-4" /> Salvar configurações
      </Button>

      <p className="text-xs text-muted-foreground">
        Tokens e chaves de API ficam armazenados com segurança no backend, nunca no navegador.
      </p>
    </div>
  );
}
