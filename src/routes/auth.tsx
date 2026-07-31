import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Painel de Tráfego & CRM Imobiliário" },
      {
        name: "description",
        content: "Acesse o painel de tráfego pago e CRM da imobiliária com e-mail e senha.",
      },
      { property: "og:title", content: "Entrar no Painel de Tráfego & CRM" },
      {
        property: "og:description",
        content: "Acesso restrito à agência, ao dono da imobiliária e aos corretores.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const entrar = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  const criarConta = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Conta criada", {
        description: "Confirme seu e-mail para acessar o painel.",
      });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Painel de Tráfego &amp; CRM</h1>
            <p className="text-sm text-muted-foreground">Gestão de campanhas da imobiliária</p>
          </div>
        </div>

        <Card className="surface-card p-6">
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={loading} onClick={entrar}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">E-mail</Label>
                <Input
                  id="email2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha2">Senha</Label>
                <Input
                  id="senha2"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={loading} onClick={criarConta}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta
              </Button>
              <p className="text-xs text-muted-foreground">
                O primeiro cadastro do projeto recebe o papel de administrador da agência. Os
                demais entram como corretor e podem ser promovidos na aba Admin.
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
