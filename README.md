# Imobiliária Conecta

PROMPT PARA LOVABLE:

Crie uma aplicação web completa: um dashboard de tráfego pago + mini-CRM para uma imobiliária, gerenciado por uma agência de marketing. Use Supabase (auth, banco Postgres, Edge Functions, Realtime) como backend. A aplicação será hospedada em domínio próprio.

1. Papéis e permissões (crítico)

Existem 3 papéis:

Admin (agência) — acesso total. Único papel que pode criar/editar/excluir qualquer coisa: corretores, aportes, vínculos de campanhas, integrações, configurações.

Dono da imobiliária — acesso somente leitura a todo o dashboard (todas as abas, todos os corretores).

Corretor — acesso somente leitura, e enxerga apenas as próprias campanhas e o próprio saldo na aba de corretores; o dashboard geral ele pode ver normalmente.

Implemente com Supabase Auth (login por e-mail/senha), tabela profiles com coluna role (admin | owner | broker), e RLS em todas as tabelas garantindo: escrita apenas para admin; leitura para owner em tudo; leitura para broker restrita às linhas onde broker_id = auth.uid() (exceto métricas gerais do dashboard). Nenhum botão de criar/editar/excluir deve sequer renderizar para não-admins.

2. Modelo de dados (Supabase)

profiles — id, nome, role, telefone, foto, ativo

brokers — id, profile_id (nullable, caso o corretor ainda não tenha login), nome, telefone, e-mail, ativo

campaigns — id, external_id (ID da campanha no Meta ou Google), platform (meta | google), nome, status (active | paused | finished), objetivo, criada_em

broker_campaigns — vínculo campanha ↔ corretor: id, campaign_id, broker_id, broker_deposit (valor que o corretor colocou), agency_match (valor que a imobiliária cobriu), total_budget (soma dos dois), status (running | near_limit | exhausted | over_budget | finished_early | completed), created_at, finished_at

campaign_metrics — snapshots por campanha: campaign_id, date, spend, impressions, reach, clicks, leads (conversas iniciadas), cpm, cpc, cost_per_lead, coletado_em

settlements — acertos de finalização: broker_campaign_id, total_spent, broker_share_spent, agency_share_spent, refund_to_broker, refund_to_agency, calculated_at

alerts — broker_campaign_id, tipo (near_limit | exhausted | over_budget), mensagem, lida, created_at

site_metrics — data, visitas_diarias, seo_score, page_speed_score, posicao_gmb

social_metrics — data, seguidores, engajamento, compartilhamentos, alcance_perfil (Instagram)

settings — url_do_site, tokens/IDs de integração (Meta ad account ID, página, Instagram business ID, Google Ads customer ID, GBP location ID)

3. Regra de negócio central: aporte com matching 1:1

Funciona assim, implemente exatamente:

No painel admin, ao vincular um corretor a uma campanha, o admin informa quanto o corretor colocou (ex: R$ 100). O sistema calcula automaticamente o valor que a imobiliária cobre (mesmo valor, matching 1:1 — mas deixe o campo agency_match editável caso o admin queira ajustar). total_budget = broker_deposit + agency_match.

O gasto real da campanha (vindo do Meta) é comparado continuamente contra total_budget.

Alertas automáticos:

Gasto ≥ 80% do total → status near_limit, alerta "Orçamento próximo de acabar"

Gasto ≥ 100% → exhausted, alerta "Orçamento acabou"

Gasto > 100% → over_budget, alerta "Orçamento estourou em R$ X"

Finalização antecipada: botão "Finalizar campanha" (só admin). Ao clicar, o sistema calcula o acerto e grava em settlements:

broker_share_spent = total_spent / 2

agency_share_spent = total_spent / 2

refund_to_broker = broker_deposit − broker_share_spent

refund_to_agency = agency_match − agency_share_spent

Exemplo: corretor colocou R$ 200, imobiliária R$ 200 (total R$ 400), gastou R$ 200 → gastou R$ 100 de cada → devolver R$ 100 ao corretor e R$ 100 à imobiliária. Se o gasto estourou, mostre quanto cobrar a mais de cada parte (valores negativos de refund viram "a cobrar").

Exiba o acerto num card claro: "Devolver R$ X ao corretor • Devolver R$ Y à imobiliária" ou "Cobrar R$ X do corretor".

4. Integrações (via Supabase Edge Functions)

Crie Edge Functions que buscam dados das APIs e gravam nas tabelas de métricas. Agende via cron (pg_cron ou scheduled functions) a cada 5 minutos para simular tempo real, e use Supabase Realtime para o front atualizar sozinho quando novos dados chegarem, sem refresh.

Meta Marketing API (prioridade máxima): listar campanhas da ad account, e por campanha buscar spend, impressions, reach, clicks, e conversas iniciadas por mensagem (métrica de leads). Também: ações de escrita — pausar/ativar campanha e alterar orçamento diário, disparadas por botões no painel (apenas admin), chamando a API do Meta.

Instagram Graph API: seguidores, engajamento da página, compartilhamentos, alcance do perfil.

Google Ads API: campanhas, gasto, cliques, impressões, conversões.

Google Business Profile: dados do perfil/avaliações/posição.

SEO do site: use a API do Google PageSpeed Insights (score de performance e SEO) a partir da URL cadastrada em configurações, e armazene histórico diário em site_metrics.

Guarde todos os tokens/secrets em Supabase secrets, nunca no front. Enquanto as credenciais reais não forem conectadas, popule com dados de exemplo realistas e deixe as Edge Functions prontas com um flag MOCK_MODE fácil de desligar.

5. Estrutura de abas / páginas

Aba 1 — Dashboard Geral (home):

Filtro de período global (hoje, 7 dias, 30 dias, personalizado) que afeta tudo na página

Cards principais: contas alcançadas, valor total gasto, leads totais (conversas iniciadas do Meta), impressões, cliques, custo por lead

Gráfico de linha de gasto e leads ao longo do período

Seção "Redes Sociais": seguidores do Instagram, engajamento com a página, compartilhamentos, com variação vs período anterior

Seção "Site & Google": score de SEO, PageSpeed, visualizações diárias do site, situação do Google Meu Negócio

Aba 2 — Campanhas:

Sub-abas Meta e Google

Tabela/cards de todas as campanhas: nome, status (badge colorido), gasto, orçamento, leads, cliques, alcance, impressões, CPL

Clicar numa campanha abre detalhe com gráficos históricos

Para admin: botões pausar/ativar e editar orçamento direto ali

Aba 3 — Corretores:

Mostra apenas campanhas que têm corretor vinculado

Card por corretor: nome, campanhas ativas, quanto ele aportou, quanto a imobiliária cobriu, orçamento total, gasto até agora, barra de progresso do orçamento com cores (verde / amarelo ≥80% / vermelho ≥100%), leads gerados

Alertas de orçamento visíveis aqui

Para admin: botão "Finalizar campanha" com o card de acerto/devolução

Aba 4 — Configurações (só admin):

URL do site, conexões Meta / Google / Instagram / GBP (campos de IDs e status da conexão), preferências de alerta (limiar %, etc.)

Aba 5 — Admin (só admin):

CRUD de corretores

Vincular campanha existente (puxada do Meta/Google) a um corretor + registrar aporte → matching automático

Registrar aportes adicionais numa campanha já vinculada (soma ao orçamento)

Gerenciar usuários (criar login para dono e corretores)

Histórico de acertos (settlements)

Central de alertas

6. Design

Visual profissional de ferramenta SaaS de analytics: dark mode elegante, sidebar de navegação fixa à esquerda com as 5 abas, cards com números grandes, gráficos (Recharts), badges de status coloridos, responsivo para o corretor abrir no celular. Nomes e textos todos em português do Brasil. Formate valores em R$ e datas em dd/mm/aaaa.

Comece criando: autenticação + roles + RLS, o modelo de dados completo, o layout com as 5 abas, e a lógica de aporte/matching/acerto funcionando com dados mock. As Edge Functions de integração vêm na sequência.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rocket-broker-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e5226e0-6940-4050-aa17-ae688fddd229).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
