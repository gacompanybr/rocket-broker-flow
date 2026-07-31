import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pause, Play, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAllCampaignMetrics, useBrokerCampaigns, useCampaigns } from "@/lib/data";
import { brl, dayLabel, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas | Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content: "Campanhas Meta e Google com gasto, orçamento, leads, cliques, alcance e CPL.",
      },
      { property: "og:title", content: "Campanhas Meta e Google" },
      {
        property: "og:description",
        content: "Acompanhe e gerencie as campanhas de tráfego pago da imobiliária.",
      },
    ],
  }),
  component: CampanhasPage,
});

function CampanhasPage() {
  const { isAdmin } = useAuth();
  const campaigns = useCampaigns();
  const metrics = useAllCampaignMetrics();
  const links = useBrokerCampaigns();
  const queryClient = useQueryClient();
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [orcamentoAberto, setOrcamentoAberto] = useState<string | null>(null);
  const [novoOrcamento, setNovoOrcamento] = useState("");

  const totaisPorCampanha = useMemo(() => {
    const map = new Map<
      string,
      { spend: number; leads: number; clicks: number; reach: number; impressions: number }
    >();
    for (const m of metrics.data ?? []) {
      const cur =
        map.get(m.campaign_id) ?? { spend: 0, leads: 0, clicks: 0, reach: 0, impressions: 0 };
      cur.spend += Number(m.spend);
      cur.leads += Number(m.leads);
      cur.clicks += Number(m.clicks);
      cur.reach += Number(m.reach);
      cur.impressions += Number(m.impressions);
      map.set(m.campaign_id, cur);
    }
    return map;
  }, [metrics.data]);

  const orcamentoPorCampanha = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of links.data ?? []) {
      map.set(l.campaign_id, (map.get(l.campaign_id) ?? 0) + Number(l.total_budget ?? 0));
    }
    return map;
  }, [links.data]);

  const toggleStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      platform,
      externalId,
    }: {
      id: string;
      status: "active" | "paused";
      platform: string;
      externalId: string;
    }) => {
      if (platform === "meta") {
        await acaoMeta({
          data: { externalId, status: status === "active" ? "ACTIVE" : "PAUSED" },
        });
        return;
      }
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da campanha atualizado");
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const salvarOrcamento = useMutation({
    mutationFn: async ({
      id,
      valor,
      platform,
      externalId,
    }: {
      id: string;
      valor: number;
      platform: string;
      externalId: string;
    }) => {
      if (platform === "meta") {
        await acaoMeta({ data: { externalId, dailyBudgetBRL: valor } });
        return;
      }
      const { error } = await supabase
        .from("campaigns")
        .update({ daily_budget: valor })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento diário atualizado");
      setOrcamentoAberto(null);
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const historico = useMemo(
    () =>
      (metrics.data ?? [])
        .filter((m) => m.campaign_id === detalhe)
        .map((m) => ({
          date: m.date,
          gasto: Number(m.spend),
          leads: Number(m.leads),
          cliques: Number(m.clicks),
        })),
    [metrics.data, detalhe],
  );

  const campanhaDetalhe = campaigns.data?.find((c) => c.id === detalhe);

  const renderTabela = (platform: "meta" | "google") => {
    const rows = (campaigns.data ?? []).filter((c) => c.platform === platform);
    return (
      <Card className="surface-card overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Orçamento</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const t = totaisPorCampanha.get(c.id);
              const orcamento = orcamentoPorCampanha.get(c.id) ?? 0;
              const cpl = t && t.leads > 0 ? t.spend / t.leads : 0;
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setDetalhe(c.id)}
                >
                  <TableCell className="font-medium">
                    {c.nome}
                    <span className="block text-xs text-muted-foreground">
                      ID {c.external_id} · {c.objetivo ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">{brl(t?.spend ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    {orcamento > 0 ? brl(orcamento) : "—"}
                    <span className="block text-xs text-muted-foreground">
                      diário {c.daily_budget ? brl(Number(c.daily_budget)) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{num(t?.leads ?? 0)}</TableCell>
                  <TableCell className="text-right">{num(t?.clicks ?? 0)}</TableCell>
                  <TableCell className="text-right">{num(t?.reach ?? 0)}</TableCell>
                  <TableCell className="text-right">{num(t?.impressions ?? 0)}</TableCell>
                  <TableCell className="text-right">{brl(cpl)}</TableCell>
                  {isAdmin && (
                    <TableCell
                      className="text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleStatus.mutate({
                            id: c.id,
                            status: c.status === "active" ? "paused" : "active",
                          })
                        }
                      >
                        {c.status === "active" ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-1"
                        onClick={() => {
                          setOrcamentoAberto(c.id);
                          setNovoOrcamento(String(c.daily_budget ?? ""));
                        }}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Orçamento
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground">
                  Nenhuma campanha encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Clique em uma campanha para ver o histórico detalhado
        </p>
      </div>

      <Tabs defaultValue="meta">
        <TabsList>
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
        </TabsList>
        <TabsContent value="meta" className="mt-4">
          {renderTabela("meta")}
        </TabsContent>
        <TabsContent value="google" className="mt-4">
          {renderTabela("google")}
        </TabsContent>
      </Tabs>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{campanhaDetalhe?.nome}</DialogTitle>
            <DialogDescription>
              Histórico diário de gasto, leads e cliques da campanha.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historico} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={dayLabel}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  labelFormatter={(v) => dayLabel(String(v))}
                />
                <Line type="monotone" dataKey="gasto" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="leads" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cliques" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orcamentoAberto} onOpenChange={(o) => !o && setOrcamentoAberto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar orçamento diário</DialogTitle>
            <DialogDescription>Valor em reais aplicado à campanha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="orc">Orçamento diário (R$)</Label>
            <Input
              id="orc"
              type="number"
              step="0.01"
              value={novoOrcamento}
              onChange={(e) => setNovoOrcamento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                orcamentoAberto &&
                salvarOrcamento.mutate({
                  id: orcamentoAberto,
                  valor: Number(novoOrcamento),
                })
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
