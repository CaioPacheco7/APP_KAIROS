-- =====================================================================
-- KAIROS · Planos: conquistar algo (meta) e sair de dívida
-- Rode no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- =====================================================================

-- Um plano salvo a partir do simulador.
--   purchase: target_amount = valor do objetivo; monthly_amount = quanto guardar por mês
--   debt:     target_amount = total a pagar no plano; monthly_amount = parcela
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('purchase', 'debt')),
  title text not null check (length(trim(title)) > 0),
  target_amount bigint not null check (target_amount > 0),
  monthly_amount bigint not null check (monthly_amount > 0),
  months_planned int check (months_planned is null or months_planned > 0),
  -- rendimento (purchase) ou juros (debt) ao mês, em %, informado pela pessoa
  rate_pct_month numeric(7, 3) not null default 0 check (rate_pct_month >= 0),
  starts_on date not null
    default (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date,
  status text not null default 'active' check (status in ('active', 'done', 'paused')),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index goals_user_idx on public.goals (user_id, status) where deleted_at is null;

-- Aportes (meta) ou pagamentos (dívida) já feitos.
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  amount bigint not null check (amount > 0),
  date date not null
    default (now() at time zone 'America/Sao_Paulo')::date,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id)
);
create index goal_contributions_goal_idx
  on public.goal_contributions (goal_id) where deleted_at is null;

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
create policy "goals: dono tudo" on public.goals
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "goal_contributions: dono tudo" on public.goal_contributions
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Progresso: total já aportado/pago por plano (ignora excluídos).
create view public.v_goal_progress
with (security_invoker = true) as
select
  g.id as goal_id,
  g.user_id,
  coalesce(sum(c.amount) filter (where c.deleted_at is null), 0)::bigint as contributed,
  (count(c.id) filter (where c.deleted_at is null))::int as contributions
from public.goals g
left join public.goal_contributions c on c.goal_id = g.id
where g.deleted_at is null
group by g.id, g.user_id;
