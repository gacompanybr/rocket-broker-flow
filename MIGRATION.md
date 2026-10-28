# Diagnóstico de migração — OArco Analytics

## 1. Tipo do projeto e stack
- **Tipo:** sistema web com banco de dados, autenticação e integrações (dashboard de tráfego pago + mini-CRM imobiliário).
- **Framework:** TanStack Start v1 (React 19, SSR + server functions), Vite 7, Tailwind CSS v4.
- **Runtime alvo do build:** Cloudflare Workers (via nitro, configurado por `@lovable.dev/vite-tanstack-config`).
- **Node:** 22.x (ambiente atual: v22.23.4).
- **Gerenciador de pacotes:** Bun (`bun.lock`, `bunfig.toml`). npm também funciona.

## 2. Comandos
```sh
bun install        # instalar
bun run dev        # rodar em desenvolvimento (vite dev)
bun run build      # build de produção (vite build)
bun run preview    # servir o build localmente
```

## 3. Banco (Postgres / Supabase) — contagem aproximada de linhas
| Tabela | Linhas |
|---|---|
| alerts | 7 |
| broker_campaigns | 7 |
| brokers | 5 |
| campaign_metrics | 547 |
| campaigns | 53 |
| integration_logs | 37991 |
| meta_ads | 111 |
| profiles | 3 |
| settings | 1 |
| settlements | 1 |
| site_metrics | 0 |
| social_metrics | 119 |
| user_roles | 3 |

- Migrações em `supabase/migrations/` (7 arquivos).
- Funções SQL: `campaign_metrics_daily`, `campaign_metrics_summary`, `handle_new_user` (trigger em `auth.users`), `has_role`, `is_admin`, `my_broker_ids`, `set_updated_at`.
- RLS ativo em todas as tabelas; Realtime habilitado nas tabelas de métricas/campanhas.
- Extensões: `pg_cron` e `pg_net` (agendamentos de sincronização chamam as rotas `/api/public/hooks/*`). Os jobs não puderam ser listados (sem permissão no schema `cron`) — recriá-los no destino.

## 4. Auth
- Supabase Auth padrão (e-mail/senha, confirmação de e-mail desativada).
- Login com Google via `@lovable.dev/cloud-auth-js` (gerenciado pela Lovable).
- Papéis em `public.user_roles` (admin | owner | broker).
- **Usuários:** 3 (estimado pela tabela `profiles`; `auth.users` não acessível para contagem direta).

## 5. Storage
- Sem buckets (0 buckets, 0 arquivos).

## 6. Edge Functions
- Nenhuma Supabase Edge Function. A lógica de servidor está no próprio app:
  - `src/routes/api/public/hooks/sync-meta-campaigns.ts` — sincroniza campanhas, métricas e anúncios do Meta Ads e gera alertas de verba (cron 5 min).
  - `src/routes/api/public/hooks/sync-meta-social.ts` — sincroniza métricas do Instagram/página (cron 1 h).
  - `src/routes/api/public/hooks/sync-google-ads.ts` — sincroniza campanhas e métricas do Google Ads (cron 5 min).
  - `src/lib/meta.functions.ts` — server functions: pausar/ativar e alterar orçamento no Meta, sync manual, prévia de vídeo.
  - `src/lib/google-ads.functions.ts` — sync manual do Google Ads (admin).
  - `src/lib/admin.functions.ts` — gestão de usuários/papéis (usa service role).

## 7. Secrets (somente nomes)
| Nome | Origem |
|---|---|
| META_ACCESS_TOKEN | Meta (token de system user) |
| META_AD_ACCOUNT_ID | Meta Ads |
| META_PAGE_ID | Meta / Facebook Page |
| META_IG_BUSINESS_ID | Instagram Graph API |
| GOOGLE_ADS_API_KEY | Conector Google Ads da Lovable |
| GOOGLE_ADS_CUSTOMER_ID | Google Ads (conta) |
| LOVABLE_API_KEY | Lovable (gateway de conectores) |
| SUPABASE_URL | Supabase |
| SUPABASE_ANON_KEY | Supabase |
| SUPABASE_PUBLISHABLE_KEY | Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Supabase |
| SUPABASE_DB_URL | Supabase |

## 8. Integrações externas
- **Meta Graph API v21.0** (Ads, Página, Instagram) — chamada direta.
- **Google Ads API v25** — via gateway de conectores da Lovable (`connector-gateway.lovable.dev`).
- Pagamento, WhatsApp, e-mail transacional: não usados.
- **Gateway de IA da Lovable:** não utilizado (nenhuma chamada de IA). `LOVABLE_API_KEY` é usado só para o conector Google Ads.

## 9. Variáveis de ambiente (nomes)
- Front (VITE_*): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`, `LOVABLE_API_KEY`, `GOOGLE_ADS_API_KEY`, `GOOGLE_ADS_CUSTOMER_ID`, `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID`, `META_IG_BUSINESS_ID`.

## 10. Tipo de backend
- **Lovable Cloud** (Supabase gerenciado pela Lovable).
- Project ID: `wudcmcwyowfonrlwjtce`.

## 11. Dependências da plataforma Lovable (quebram fora dela)
- **Google Ads:** usa `connector-gateway.lovable.dev` + `LOVABLE_API_KEY` + `GOOGLE_ADS_API_KEY`. Fora da Lovable, reescrever `src/lib/google-ads.server.ts` para a Google Ads API oficial (developer token + OAuth).
- **Login com Google:** `@lovable.dev/cloud-auth-js` / `src/integrations/lovable/`. Substituir por `supabase.auth.signInWithOAuth` com credenciais OAuth próprias.
- **Build:** `@lovable.dev/vite-tanstack-config` (pacote npm, funciona fora, mas é mantido pela Lovable); plugins de dev da Lovable só atuam no sandbox.
- `src/integrations/supabase/previewAuthStorage.ts` e `src/lib/lovable-error-reporting.ts` — específicos do preview/editor Lovable.
- Banco Lovable Cloud: sem acesso ao painel Supabase nem à service role key/senha do banco; exportar dados em Lovable → Database → Settings → Export data e recriar o schema pelas migrações.
- Jobs `pg_cron` apontam para o domínio atual; atualizar URLs no novo servidor.
- Domínio próprio (oarcoanalytics.online) configurado na Lovable — repontar DNS.

## Valores
- `VITE_SUPABASE_URL` / `SUPABASE_URL`: https://wudcmcwyowfonrlwjtce.supabase.co
- `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID`: wudcmcwyowfonrlwjtce
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`: sb_publishable_pZDotZl5mwsqLxhFJpRR-Q_6mMwtOPB (chave pública)
- `SUPABASE_ANON_KEY`: valor não acessível
- `SUPABASE_SERVICE_ROLE_KEY`: valor não acessível
- `SUPABASE_DB_URL`: valor não acessível
- `LOVABLE_API_KEY`: valor não acessível
- `GOOGLE_ADS_API_KEY`: valor não acessível
- `GOOGLE_ADS_CUSTOMER_ID`: valor não acessível
- `META_ACCESS_TOKEN`: valor não acessível
- `META_AD_ACCOUNT_ID`: valor não acessível
- `META_PAGE_ID`: valor não acessível
- `META_IG_BUSINESS_ID`: valor não acessível
