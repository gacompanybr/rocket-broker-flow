import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Flag, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { SettlementCard } from "@/components/settlement-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAlerts, useAllCampaignMetrics, useBrokerCampaigns } from "@/lib/data";
import { brl, num, pct } from "@/lib/format";
import { ALERT_LABEL, budgetStatus, budgetTone, calcSettlement } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/corretores")({
  head: () => ({
    meta: [
      { title: "Corretores | Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content:
          "Aportes dos corretores, contrapartida da imobiliária, consumo de orçamento e acertos.",
      },
      { property: "og:title", content: "Corretores e aportes de campanha" },
      {
        property: "og:description",
        content: "Controle do matching 1:1 entre aporte do corretor e verba da imobiliária.",
      },
    ],
  }),
  component: CorretoresPage,
});

function CorretoresPage() {
  const { isAdmin } = useAuth();
  const links = useBrokerCampaigns();
  const metrics = useAllCampaignMetrics();
  const alerts = useAlerts();
  const queryClient = useQueryClient();
  const [finalizando, setFinalizando] = useState<string | null>(null);

  const gastoPorCampanha = useMemo(() => {
    const map = new Map<string, { spend: number; leads: number }>();
    for (const m of metrics.data ?? []) {
      const cur = map.get(m.campaign_id) ?? { spend: 0, leads: 0 };
      cur.spend += Number(m.spend);
      cur.leads += Number(m.leads);
      map.set(m.campaign_id, cur);
    }
    return map;
  }, [metrics.data]);

  const porCorretor = useMemo(() => {
    const groups = new Map<
      string,
      { nome: string; vinculos: NonNullable<typeof links.data> }
    >();
    for (const l of links.data ?? []) {
      const nome = l.brokers?.nome ?? "Corretor";
      const g = groups.get(l.broker_id) ?? { nome, vinculos: [] };
      g.vinculos.push(l);
      groups.set(l.broker_id, g);
    }
    return [...groups.entries()];
  }, [links.data]);

  const alertasPorVinculo = useMemo(() => {
    const map = new Map<string, NonNullable<typeof alerts.data>>();
    for (const a of alerts.data ?? []) {
      const arr = map.get(a.broker_campaign_id) ?? [];
      arr.push(a);
      map.set(a.broker_campaign_id, arr);
    }
    return map;
  }, [alerts.data]);

  const vinculo = (links.data ?? []).find((l) => l.id === finalizando);
  const gastoVinculo = vinculo ? (gastoPorCampanha.get(vinculo.campaign_id)?.spend ?? 0) : 0;
  const acerto = vinculo
    ? calcSettlement(gastoVinculo, Number(vinculo.broker_deposit), Number(vinculo.agency_match))
    : null;

  const finalizar = useMutation({
    mutationFn: async () => {
      if (!vinculo || !acerto) return;
      const { error: sErr } = await supabase.from("settlements").insert({
        broker_campaign_id: vinculo.id,
        total_spent: acerto.total_spent,
        broker_share_spent: acerto.broker_share_spent,
        agency_share_spent: acerto.agency_share_spent,
        refund_to_broker: acerto.refund_to_broker,
        refund_to_agency: acerto.refund_to_agency,
      });
      if (sErr) throw sErr;
      const { error: bErr } = await supabase
        .from("broker_campaigns")
        .update({ status: "finished_early", finished_at: new Date().toISOString() })
        .eq("id", vinculo.id);
      if (bErr) throw bErr;
      const { error: cErr } = await supabase
        .from("campaigns")
        .update({ status: "finished" })
        .eq("id", vinculo.campaign_id);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      toast.success("Campanha finalizada e acerto registrado");
      setFinalizando(null);
      void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["settlements"] });
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro ao finalizar", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Corretores</h1>
        <p className="text-sm text-muted-foreground">
          Apenas campanhas com corretor vinculado · matching 1:1 entre aporte e verba da imobiliária
        </p>
      </div>

      {porCorretor.length === 0 && (
        <Card className="surface-card p-8 text-center text-muted-foreground">
          Nenhuma campanha vinculada a corretores ainda.
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {porCorretor.map(([brokerId, grupo]) => {
          const aporte = grupo.vinculos.reduce((a, l) => a + Number(l.broker_deposit), 0);
          const match = grupo.vinculos.reduce((a, l) => a + Number(l.agency_match), 0);
          const orcamento = grupo.vinculos.reduce((a, l) => a + Number(l.total_budget ?? 0), 0);
          const gasto = grupo.vinculos.reduce(
            (a, l) => a + (gastoPorCampanha.get(l.campaign_id)?.spend ?? 0),
            0,
          );
          const leads = grupo.vinculos.reduce(
            (a, l) => a + (gastoPorCampanha.get(l.campaign_id)?.leads ?? 0),
            0,
          );
          const ativas = grupo.vinculos.filter(
            (l) => l.status === "running" || l.status === "near_limit",
          ).length;
          const ratio = orcamento > 0 ? (gasto / orcamento) * 100 : 0;
          const tone = budgetTone(ratio);

          return (
            <Card key={brokerId} className="surface-card gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{grupo.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {ativas} campanha(s) ativa(s) · {num(leads)} leads gerados
                    </p>
                  </div>
                </div>
                <span className="text-right text-sm">
                  <span className="block text-xs text-muted-foreground">Orçamento total</span>
                  <strong>{brl(orcamento)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs leading-snug text-muted-foreground">Aporte do corretor</p>
                  <p className="mt-1 font-semibold">{brl(aporte)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs leading-snug text-muted-foreground">Imobiliária cobriu</p>
                  <p className="mt-1 font-semibold">{brl(match)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs leading-snug text-muted-foreground">Gasto até agora</p>
                  <p className="mt-1 font-semibold">{brl(gasto)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Consumo do orçamento</span>
                  <span
                    className={
                      tone === "destructive"
                        ? "text-destructive"
                        : tone === "warning"
                          ? "text-warning"
                          : "text-success"
                    }
                  >
                    {pct(ratio)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={
                      "h-full rounded-full transition-all " +
                      (tone === "destructive"
                        ? "bg-destructive"
                        : tone === "warning"
                          ? "bg-warning"
                          : "bg-success")
                    }
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>

              </div>

              <div className="space-y-2 border-t border-border/60 pt-3">
                {grupo.vinculos.map((l) => {
                  const g = gastoPorCampanha.get(l.campaign_id)?.spend ?? 0;
                  const total = Number(l.total_budget ?? 0);
                  const st = l.finished_at
                    ? l.status
                    : budgetStatus(g, total);
                  const vAlerts = alertasPorVinculo.get(l.id) ?? [];
                  return (
                    <div key={l.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {l.campaigns?.nome ?? "Campanha"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {brl(g)} de {brl(total)} · aporte {brl(Number(l.broker_deposit))} +
                            match {brl(Number(l.agency_match))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={st} />
                          {isAdmin && !l.finished_at && (
                            <Button size="sm" variant="outline" onClick={() => setFinalizando(l.id)}>
                              <Flag className="h-3.5 w-3.5" /> Finalizar
                            </Button>
                          )}
                        </div>
                      </div>
                      {vAlerts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {vAlerts.map((a) => (
                            <p
                              key={a.id}
                              className="flex items-start gap-1.5 text-xs text-warning"
                            >
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>
                                <strong>{ALERT_LABEL[a.tipo] ?? a.tipo}:</strong> {a.mensagem}
                              </span>
                            </p>
                          ))}
                        </div>
                      )}
                      {l.finished_at && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Finalizada — acerto registrado
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!finalizando} onOpenChange={(o) => !o && setFinalizando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar campanha</DialogTitle>
            <DialogDescription>
              O gasto é dividido igualmente entre corretor e imobiliária. Confira o acerto antes de
              confirmar.
            </DialogDescription>
          </DialogHeader>
          {acerto && <SettlementCard settlement={acerto} />}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Valores negativos aparecem como &quot;a cobrar&quot;.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizando(null)}>
              Cancelar
            </Button>
            <Button onClick={() => finalizar.mutate()} disabled={finalizar.isPending}>
              Confirmar finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
