import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Wallet } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBrokerCampaigns, useBrokers, useCampaigns, useSettlements } from "@/lib/data";
import { brl, dateBR } from "@/lib/format";
import { createAppUser, setUserRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content: "Gestão de usuários, corretores, vínculos de campanha, aportes e histórico de acertos.",
      },
      { property: "og:title", content: "Administração da agência" },
      {
        property: "og:description",
        content: "Crie logins, cadastre corretores e vincule campanhas com matching 1:1.",
      },
    ],
  }),
  component: AdminPage,
});

const ROLE_LABEL: Record<string, string> = {
  admin: "Agência (admin)",
  owner: "Dono da imobiliária",
  broker: "Corretor",
};

function AdminPage() {
  const { isAdmin, isStaff } = useAuth();
  const brokers = useBrokers();
  const campaigns = useCampaigns();
  const links = useBrokerCampaigns();
  const settlements = useSettlements();
  const queryClient = useQueryClient();

  const criarUsuario = useServerFn(createAppUser);
  const alterarPapel = useServerFn(setUserRole);

  const [novoUsuario, setNovoUsuario] = useState({
    email: "",
    password: "",
    nome: "",
    role: "broker",
    brokerId: "",
  });
  const [novoCorretor, setNovoCorretor] = useState({ nome: "", email: "", telefone: "" });
  const [editandoCorretor, setEditandoCorretor] = useState<{
    id: string;
    nome: string;
    email: string;
    telefone: string;
  } | null>(null);
  const [excluindoCorretor, setExcluindoCorretor] = useState<{ id: string; nome: string } | null>(
    null,
  );
  const [vinculo, setVinculo] = useState({ brokerId: "", campaignId: "", deposit: "" });
  const [aporte, setAporte] = useState({ linkId: "", valor: "" });

  const usuarios = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, nome, ativo, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "broker" }));
    },
    enabled: isStaff,
  });

  const mCriarUsuario = useMutation({
    mutationFn: () =>
      criarUsuario({
        data: {
          email: novoUsuario.email,
          password: novoUsuario.password,
          nome: novoUsuario.nome,
          role: novoUsuario.role as "admin" | "owner" | "broker",
          brokerId: novoUsuario.brokerId || null,
        },
      }),
    onSuccess: () => {
      toast.success("Login criado com sucesso");
      setNovoUsuario({ email: "", password: "", nome: "", role: "broker", brokerId: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      void queryClient.invalidateQueries({ queryKey: ["brokers"] });
    },
    onError: (e: Error) => toast.error("Erro ao criar login", { description: e.message }),
  });

  const mPapel = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "owner" | "broker" }) =>
      alterarPapel({ data: v }),
    onSuccess: () => {
      toast.success("Papel atualizado");
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar papel", { description: e.message }),
  });

  const mCorretor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brokers").insert({
        nome: novoCorretor.nome,
        email: novoCorretor.email || null,
        telefone: novoCorretor.telefone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Corretor cadastrado");
      setNovoCorretor({ nome: "", email: "", telefone: "" });
      void queryClient.invalidateQueries({ queryKey: ["brokers"] });
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar", { description: e.message }),
  });

  const mEditarCorretor = useMutation({
    mutationFn: async () => {
      if (!editandoCorretor) throw new Error("Nenhum corretor selecionado");
      const { error } = await supabase
        .from("brokers")
        .update({
          nome: editandoCorretor.nome.trim(),
          email: editandoCorretor.email.trim() || null,
          telefone: editandoCorretor.telefone.trim() || null,
        })
        .eq("id", editandoCorretor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Corretor atualizado");
      setEditandoCorretor(null);
      void queryClient.invalidateQueries({ queryKey: ["brokers"] });
      void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const mExcluirCorretor = useMutation({
    mutationFn: async () => {
      if (!excluindoCorretor) throw new Error("Nenhum corretor selecionado");
      const { data: vinculosCorretor, error: vErr } = await supabase
        .from("broker_campaigns")
        .select("id")
        .eq("broker_id", excluindoCorretor.id);
      if (vErr) throw vErr;
      const ids = (vinculosCorretor ?? []).map((v) => v.id);
      if (ids.length > 0) {
        const { error: aErr } = await supabase.from("alerts").delete().in("broker_campaign_id", ids);
        if (aErr) throw aErr;
        const { error: sErr } = await supabase
          .from("settlements")
          .delete()
          .in("broker_campaign_id", ids);
        if (sErr) throw sErr;
        const { error: bcErr } = await supabase.from("broker_campaigns").delete().in("id", ids);
        if (bcErr) throw bcErr;
      }
      const { error } = await supabase.from("brokers").delete().eq("id", excluindoCorretor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Corretor excluído");
      setExcluindoCorretor(null);
      void queryClient.invalidateQueries({ queryKey: ["brokers"] });
      void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["settlements"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const mVinculo = useMutation({
    mutationFn: async () => {
      const deposit = Number(vinculo.deposit);
      if (!vinculo.brokerId || !vinculo.campaignId || !deposit)
        throw new Error("Preencha corretor, campanha e aporte");
      const { error } = await supabase.from("broker_campaigns").insert({
        broker_id: vinculo.brokerId,
        campaign_id: vinculo.campaignId,
        broker_deposit: deposit,
        agency_match: deposit,
        status: "running",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha vinculada com matching 1:1");
      setVinculo({ brokerId: "", campaignId: "", deposit: "" });
      void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro ao vincular", { description: e.message }),
  });

  const mAporte = useMutation({
    mutationFn: async () => {
      const extra = Number(aporte.valor);
      const link = (links.data ?? []).find((l) => l.id === aporte.linkId);
      if (!link || !extra) throw new Error("Selecione o vínculo e informe o valor");
      const { error } = await supabase
        .from("broker_campaigns")
        .update({
          broker_deposit: Number(link.broker_deposit) + extra,
          agency_match: Number(link.agency_match) + extra,
          status: "running",
        })
        .eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aporte adicional registrado (matching 1:1)");
      setAporte({ linkId: "", valor: "" });
      void queryClient.invalidateQueries({ queryKey: ["broker_campaigns"] });
    },
    onError: (e: Error) => toast.error("Erro no aporte", { description: e.message }),
  });

  const vinculosAtivos = useMemo(
    () => (links.data ?? []).filter((l) => !l.finished_at),
    [links.data],
  );

  if (!isStaff) {
    return (
      <Card className="surface-card p-8 text-center text-muted-foreground">
        Área restrita à agência e ao dono da imobiliária.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Usuários, corretores, vínculos de campanha e histórico de acertos
        </p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="corretores">Corretores</TabsTrigger>
          <TabsTrigger value="vinculos">Vínculos e aportes</TabsTrigger>
          <TabsTrigger value="acertos">Acertos</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <Card className="surface-card gap-4 p-5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Criar login</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha provisória</Label>
                <Input
                  type="password"
                  value={novoUsuario.password}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={novoUsuario.role}
                  onValueChange={(v) => setNovoUsuario({ ...novoUsuario, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Agência (admin)</SelectItem>
                    <SelectItem value="owner">Dono da imobiliária</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Corretor vinculado</Label>
                <Select
                  value={novoUsuario.brokerId}
                  onValueChange={(v) => setNovoUsuario({ ...novoUsuario, brokerId: v })}
                  disabled={novoUsuario.role !== "broker"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(brokers.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="mt-2 w-full sm:w-fit"
              onClick={() => mCriarUsuario.mutate()}
              disabled={mCriarUsuario.isPending}
            >
              <Plus className="h-4 w-4" /> Criar login
            </Button>
          </Card>

          <Card className="surface-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Alterar papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usuarios.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome ?? "—"}</TableCell>
                    <TableCell>{dateBR(u.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <ShieldCheck className="h-3 w-3" /> {ROLE_LABEL[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          mPapel.mutate({
                            userId: u.id,
                            role: v as "admin" | "owner" | "broker",
                          })
                        }
                      >
                        <SelectTrigger className="ml-auto w-[210px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Agência (admin)</SelectItem>
                          <SelectItem value="owner">Dono da imobiliária</SelectItem>
                          <SelectItem value="broker">Corretor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="corretores" className="mt-4 space-y-4">
          <Card className="surface-card gap-4 p-5">
            <h2 className="text-base font-semibold">Cadastrar corretor</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={novoCorretor.nome}
                  onChange={(e) => setNovoCorretor({ ...novoCorretor, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={novoCorretor.email}
                  onChange={(e) => setNovoCorretor({ ...novoCorretor, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={novoCorretor.telefone}
                  onChange={(e) => setNovoCorretor({ ...novoCorretor, telefone: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-2 w-full sm:w-fit"
              onClick={() => mCorretor.mutate()}
              disabled={mCorretor.isPending || !novoCorretor.nome}
            >
              <Plus className="h-4 w-4" /> Cadastrar
            </Button>
          </Card>

          <Card className="surface-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corretor</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Login vinculado</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(brokers.data ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    <TableCell>{b.email ?? "—"}</TableCell>
                    <TableCell>{b.telefone ?? "—"}</TableCell>
                    <TableCell>
                      {b.profile_id ? (
                        <Badge variant="secondary">vinculado</Badge>
                      ) : (
                        <span className="text-muted-foreground">sem login</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditandoCorretor({
                                id: b.id,
                                nome: b.nome,
                                email: b.email ?? "",
                                telefone: b.telefone ?? "",
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setExcluindoCorretor({ id: b.id, nome: b.nome })}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Dialog
            open={!!editandoCorretor}
            onOpenChange={(o) => !o && setEditandoCorretor(null)}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar corretor</DialogTitle>
                <DialogDescription>
                  Atualize os dados de contato do corretor cadastrado.
                </DialogDescription>
              </DialogHeader>
              {editandoCorretor && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={editandoCorretor.nome}
                      onChange={(e) =>
                        setEditandoCorretor({ ...editandoCorretor, nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      value={editandoCorretor.email}
                      onChange={(e) =>
                        setEditandoCorretor({ ...editandoCorretor, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={editandoCorretor.telefone}
                      onChange={(e) =>
                        setEditandoCorretor({ ...editandoCorretor, telefone: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditandoCorretor(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => mEditarCorretor.mutate()}
                  disabled={mEditarCorretor.isPending || !editandoCorretor?.nome.trim()}
                >
                  Salvar alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!excluindoCorretor}
            onOpenChange={(o) => !o && setExcluindoCorretor(null)}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Excluir corretor</DialogTitle>
                <DialogDescription>
                  {excluindoCorretor?.nome} será removido. Vínculos de campanha, aportes e acertos
                  desse corretor também serão apagados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExcluindoCorretor(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => mExcluirCorretor.mutate()}
                  disabled={mExcluirCorretor.isPending}
                >
                  Excluir definitivamente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </TabsContent>

        <TabsContent value="vinculos" className="mt-4 space-y-4">
          <Card className="surface-card gap-4 p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Vincular campanha a corretor</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select
                  value={vinculo.brokerId}
                  onValueChange={(v) => setVinculo({ ...vinculo, brokerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(brokers.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campanha</Label>
                <Select
                  value={vinculo.campaignId}
                  onValueChange={(v) => setVinculo({ ...vinculo, campaignId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(campaigns.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aporte do corretor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vinculo.deposit}
                  onChange={(e) => setVinculo({ ...vinculo, deposit: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A imobiliária cobre o mesmo valor automaticamente.
                </p>
              </div>
            </div>
            <Button className="mt-2 w-full sm:w-fit" onClick={() => mVinculo.mutate()} disabled={mVinculo.isPending}>
              <Link2 className="h-4 w-4" /> Vincular
            </Button>
          </Card>

          <Card className="surface-card gap-4 p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Aporte adicional</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Vínculo</Label>
                <Select
                  value={aporte.linkId}
                  onValueChange={(v) => setAporte({ ...aporte, linkId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {vinculosAtivos.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.brokers?.nome} · {l.campaigns?.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={aporte.valor}
                  onChange={(e) => setAporte({ ...aporte, valor: e.target.value })}
                />
              </div>
            </div>
            <Button className="mt-2 w-full sm:w-fit" onClick={() => mAporte.mutate()} disabled={mAporte.isPending}>
              <Plus className="h-4 w-4" /> Registrar aporte
            </Button>
          </Card>

          <Card className="surface-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Aporte</TableHead>
                  <TableHead className="text-right">Contrapartida</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(links.data ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.brokers?.nome}</TableCell>
                    <TableCell>{l.campaigns?.nome}</TableCell>
                    <TableCell className="text-right">{brl(Number(l.broker_deposit))}</TableCell>
                    <TableCell className="text-right">{brl(Number(l.agency_match))}</TableCell>
                    <TableCell className="text-right">{brl(Number(l.total_budget ?? 0))}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="acertos" className="mt-4">
          <Card className="surface-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Gasto total</TableHead>
                  <TableHead className="text-right">Parte do corretor</TableHead>
                  <TableHead className="text-right">Parte da imobiliária</TableHead>
                  <TableHead className="text-right">Devolver ao corretor</TableHead>
                  <TableHead className="text-right">Devolver à imobiliária</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(settlements.data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{dateBR(s.calculated_at)}</TableCell>
                    <TableCell className="text-right">{brl(Number(s.total_spent))}</TableCell>
                    <TableCell className="text-right">{brl(Number(s.broker_share_spent))}</TableCell>
                    <TableCell className="text-right">{brl(Number(s.agency_share_spent))}</TableCell>
                    <TableCell className="text-right">{brl(Number(s.refund_to_broker))}</TableCell>
                    <TableCell className="text-right">{brl(Number(s.refund_to_agency))}</TableCell>
                  </TableRow>
                ))}
                {(settlements.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum acerto registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
