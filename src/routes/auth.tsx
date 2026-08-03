import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/arco-logo.png.asset.json";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | OArco Analytics" },
      {
        name: "description",
        content:
          "Acesse o dashboard interativo de campanhas e performance da imobiliária OArco.",
      },
      { property: "og:title", content: "Entrar | OArco Analytics" },
      {
        property: "og:description",
        content:
          "Dashboard interativo de campanhas e performance da imobiliária OArco.",
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

  const entrarComGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google", {
        description: result.error.message,
      });
      return;
    }
    if (result.redirected) return;
    setLoading(false);
    navigate({ to: "/dashboard", replace: true });
  };

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (signInError) {
        toast.error("Conta criada, mas não foi possível entrar", {
          description: signInError.message,
        });
        return;
      }
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={logoAsset.url}
            alt="Arco Gerenciamento Imobiliário"
            width={280}
            height={280}
            className="h-16 w-auto"
          />
          <p className="text-sm text-muted-foreground">
            Dashboard interativo de campanhas e performance
          </p>
        </div>

        <Card className="surface-card p-6">
          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={entrarComGoogle}
          >
            Continuar com Google
          </Button>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
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
