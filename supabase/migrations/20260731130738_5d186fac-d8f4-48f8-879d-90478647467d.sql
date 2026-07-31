-- ENUMS
create type public.app_role as enum ('admin','owner','broker');
create type public.ad_platform as enum ('meta','google');
create type public.campaign_status as enum ('active','paused','finished');
create type public.bc_status as enum ('running','near_limit','exhausted','over_budget','finished_early','completed');
create type public.alert_type as enum ('near_limit','exhausted','over_budget');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  telefone text,
  foto text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;

-- BROKERS
create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references auth.users(id) on delete set null,
  nome text not null,
  telefone text,
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.brokers to authenticated;
grant all on public.brokers to service_role;
alter table public.brokers enable row level security;

create or replace function public.my_broker_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.brokers where profile_id = auth.uid()
$$;

-- CAMPAIGNS
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  platform public.ad_platform not null,
  nome text not null,
  status public.campaign_status not null default 'active',
  objetivo text,
  daily_budget numeric(12,2),
  criada_em timestamptz not null default now(),
  unique (platform, external_id)
);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;

-- BROKER CAMPAIGNS
create table public.broker_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  broker_id uuid not null references public.brokers(id) on delete cascade,
  broker_deposit numeric(12,2) not null default 0,
  agency_match numeric(12,2) not null default 0,
  total_budget numeric(12,2) generated always as (broker_deposit + agency_match) stored,
  status public.bc_status not null default 'running',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select, insert, update, delete on public.broker_campaigns to authenticated;
grant all on public.broker_campaigns to service_role;
alter table public.broker_campaigns enable row level security;

-- CAMPAIGN METRICS
create table public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  date date not null,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  leads bigint not null default 0,
  cpm numeric(12,2) not null default 0,
  cpc numeric(12,2) not null default 0,
  cost_per_lead numeric(12,2) not null default 0,
  coletado_em timestamptz not null default now(),
  unique (campaign_id, date)
);
grant select, insert, update, delete on public.campaign_metrics to authenticated;
grant all on public.campaign_metrics to service_role;
alter table public.campaign_metrics enable row level security;

-- SETTLEMENTS
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  broker_campaign_id uuid not null references public.broker_campaigns(id) on delete cascade,
  total_spent numeric(12,2) not null default 0,
  broker_share_spent numeric(12,2) not null default 0,
  agency_share_spent numeric(12,2) not null default 0,
  refund_to_broker numeric(12,2) not null default 0,
  refund_to_agency numeric(12,2) not null default 0,
  calculated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.settlements to authenticated;
grant all on public.settlements to service_role;
alter table public.settlements enable row level security;

-- ALERTS
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  broker_campaign_id uuid not null references public.broker_campaigns(id) on delete cascade,
  tipo public.alert_type not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;

-- SITE METRICS
create table public.site_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  visitas_diarias integer not null default 0,
  seo_score integer not null default 0,
  page_speed_score integer not null default 0,
  posicao_gmb integer,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.site_metrics to authenticated;
grant all on public.site_metrics to service_role;
alter table public.site_metrics enable row level security;

-- SOCIAL METRICS
create table public.social_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  seguidores integer not null default 0,
  engajamento integer not null default 0,
  compartilhamentos integer not null default 0,
  alcance_perfil integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.social_metrics to authenticated;
grant all on public.social_metrics to service_role;
alter table public.social_metrics enable row level security;

-- SETTINGS
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  site_url text,
  meta_ad_account_id text,
  meta_page_id text,
  instagram_business_id text,
  google_ads_customer_id text,
  gbp_location_id text,
  alert_threshold integer not null default 80,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;

-- POLICIES: profiles
create policy "profiles_select_self_or_staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.has_role(auth.uid(),'owner'));
create policy "profiles_admin_write" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- POLICIES: user_roles
create policy "user_roles_select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "user_roles_admin_write" on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- POLICIES: brokers / campaigns / campaign_metrics / site / social / settings (read all authenticated, write admin)
create policy "brokers_read" on public.brokers for select to authenticated using (true);
create policy "brokers_admin_write" on public.brokers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaigns_read" on public.campaigns for select to authenticated using (true);
create policy "campaigns_admin_write" on public.campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "campaign_metrics_read" on public.campaign_metrics for select to authenticated using (true);
create policy "campaign_metrics_admin_write" on public.campaign_metrics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "site_metrics_read" on public.site_metrics for select to authenticated using (true);
create policy "site_metrics_admin_write" on public.site_metrics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "social_metrics_read" on public.social_metrics for select to authenticated using (true);
create policy "social_metrics_admin_write" on public.social_metrics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settings_read" on public.settings for select to authenticated
  using (public.is_admin() or public.has_role(auth.uid(),'owner'));
create policy "settings_admin_write" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- POLICIES: broker_campaigns
create policy "broker_campaigns_read" on public.broker_campaigns for select to authenticated
  using (
    public.is_admin()
    or public.has_role(auth.uid(),'owner')
    or broker_id in (select public.my_broker_ids())
  );
create policy "broker_campaigns_admin_write" on public.broker_campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- POLICIES: settlements
create policy "settlements_read" on public.settlements for select to authenticated
  using (
    public.is_admin()
    or public.has_role(auth.uid(),'owner')
    or exists (select 1 from public.broker_campaigns bc where bc.id = broker_campaign_id and bc.broker_id in (select public.my_broker_ids()))
  );
create policy "settlements_admin_write" on public.settlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- POLICIES: alerts
create policy "alerts_read" on public.alerts for select to authenticated
  using (
    public.is_admin()
    or public.has_role(auth.uid(),'owner')
    or exists (select 1 from public.broker_campaigns bc where bc.id = broker_campaign_id and bc.broker_id in (select public.my_broker_ids()))
  );
create policy "alerts_admin_write" on public.alerts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  has_admin boolean;
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  select exists(select 1 from public.user_roles where role = 'admin') into has_admin;

  insert into public.user_roles (user_id, role)
  values (new.id, case when has_admin then 'broker'::public.app_role else 'admin'::public.app_role end)
  on conflict do nothing;

  update public.brokers set profile_id = new.id
   where profile_id is null and lower(email) = lower(new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- REALTIME
alter publication supabase_realtime add table public.campaign_metrics;
alter publication supabase_realtime add table public.broker_campaigns;
alter publication supabase_realtime add table public.alerts;

-- SEED DATA
insert into public.settings (singleton, site_url, meta_ad_account_id, meta_page_id, instagram_business_id, google_ads_customer_id, gbp_location_id)
values (true, 'https://www.imobiliariaexemplo.com.br', 'act_1029384756', '104857392019283', '17841400000000000', '123-456-7890', 'locations/987654321');

insert into public.brokers (id, nome, telefone, email) values
 ('11111111-1111-1111-1111-111111111111','Ana Beatriz Souza','(11) 98877-1234','ana.souza@imobiliariaexemplo.com.br'),
 ('22222222-2222-2222-2222-222222222222','Carlos Eduardo Lima','(11) 99654-8877','carlos.lima@imobiliariaexemplo.com.br'),
 ('33333333-3333-3333-3333-333333333333','Fernanda Rocha','(11) 97722-3311','fernanda.rocha@imobiliariaexemplo.com.br'),
 ('44444444-4444-4444-4444-444444444444','Rafael Monteiro','(11) 96543-2210','rafael.monteiro@imobiliariaexemplo.com.br');

insert into public.campaigns (id, external_id, platform, nome, status, objetivo, daily_budget) values
 ('aaaaaaa1-0000-4000-8000-000000000001','23851234567890001','meta','Apartamentos Zona Sul - Mensagens','active','Mensagens',60.00),
 ('aaaaaaa1-0000-4000-8000-000000000002','23851234567890002','meta','Lançamento Residencial Aurora','active','Mensagens',80.00),
 ('aaaaaaa1-0000-4000-8000-000000000003','23851234567890003','meta','Casas Alto Padrão - Alphaville','paused','Mensagens',45.00),
 ('aaaaaaa1-0000-4000-8000-000000000004','23851234567890004','meta','Remarketing Site - Visitantes','active','Conversas',35.00),
 ('bbbbbbb1-0000-4000-8000-000000000001','9876543210','google','Search - Imóveis à Venda SP','active','Leads',70.00),
 ('bbbbbbb1-0000-4000-8000-000000000002','9876543211','google','Performance Max - Aluguel','active','Leads',50.00);

insert into public.broker_campaigns (id, campaign_id, broker_id, broker_deposit, agency_match, status) values
 ('cccccccc-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111',300,300,'running'),
 ('cccccccc-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000002','22222222-2222-2222-2222-222222222222',500,500,'near_limit'),
 ('cccccccc-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000003','33333333-3333-3333-3333-333333333333',200,200,'exhausted'),
 ('cccccccc-0000-4000-8000-000000000004','bbbbbbb1-0000-4000-8000-000000000001','44444444-4444-4444-4444-444444444444',400,400,'running');

-- 30 dias de métricas por campanha
insert into public.campaign_metrics (campaign_id, date, spend, impressions, reach, clicks, leads, cpm, cpc, cost_per_lead)
select c.id,
       d::date,
       round((15 + random()*35)::numeric, 2) as spend,
       (2000 + random()*6000)::bigint,
       (1500 + random()*4000)::bigint,
       (40 + random()*160)::bigint,
       (1 + random()*9)::bigint,
       0, 0, 0
from public.campaigns c
cross join generate_series(current_date - interval '29 day', current_date, interval '1 day') d;

update public.campaign_metrics set
  cpm = round(spend / greatest(impressions,1) * 1000, 2),
  cpc = round(spend / greatest(clicks,1), 2),
  cost_per_lead = round(spend / greatest(leads,1), 2);

insert into public.social_metrics (date, seguidores, engajamento, compartilhamentos, alcance_perfil)
select d::date,
       12000 + (row_number() over (order by d)) * 35,
       (400 + random()*350)::int,
       (20 + random()*45)::int,
       (5000 + random()*4000)::int
from generate_series(current_date - interval '29 day', current_date, interval '1 day') d;

insert into public.site_metrics (date, visitas_diarias, seo_score, page_speed_score, posicao_gmb)
select d::date,
       (250 + random()*400)::int,
       (78 + random()*15)::int,
       (65 + random()*25)::int,
       (1 + random()*4)::int
from generate_series(current_date - interval '29 day', current_date, interval '1 day') d;

insert into public.alerts (broker_campaign_id, tipo, mensagem) values
 ('cccccccc-0000-4000-8000-000000000002','near_limit','Orçamento próximo de acabar (85% consumido) - Lançamento Residencial Aurora'),
 ('cccccccc-0000-4000-8000-000000000003','exhausted','Orçamento acabou - Casas Alto Padrão - Alphaville');