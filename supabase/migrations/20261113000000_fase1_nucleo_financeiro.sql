-- =====================================================================
-- KAIROS · Fase 1 · Núcleo financeiro
-- Perfis, trava de e-mail, contas, categorias, transações, views.
-- Valores monetários sempre em CENTAVOS (bigint). Ver docs/ RN-01..RN-05.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitário: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Trava de cadastro: só e-mails da lista podem criar conta (uso pessoal)
--
-- Para liberar seu e-mail, rode UMA vez no SQL Editor do Supabase:
--   insert into public.allowed_emails (email) values ('seu@gmail.com');
-- Para abrir ao público no futuro: drop trigger enforce_allowed_email
--   on auth.users;
-- ---------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint allowed_emails_lowercase check (email = lower(email))
);
alter table public.allowed_emails enable row level security;
-- Sem policies de propósito: ninguém acessa pela API; só pelo SQL Editor.

create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where email = lower(new.email)
  ) then
    raise exception 'E-mail não autorizado a criar conta.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: dono lê" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles: dono atualiza" on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null
    check (type in ('checking', 'savings', 'wallet', 'investment')),
  initial_balance bigint not null default 0,
  color text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite FK composta (id, user_id): impede apontar para conta de outro usuário
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts (user_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Categorias (RN-10, RN-11): 1 nível de subcategoria; arquivar, não apagar
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income', 'expense')),
  parent_id uuid,
  icon text,
  color text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (parent_id, user_id) references public.categories (id, user_id),
  check (parent_id is null or parent_id <> id)
);
create index categories_user_idx on public.categories (user_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Transações (RN-01..RN-05)
--   amount é sempre POSITIVO; o sinal vem do tipo.
--   transfer: account_id = origem, transfer_account_id = destino, sem categoria.
-- ---------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount bigint not null check (amount > 0),
  date date not null default current_date,
  status text not null default 'settled' check (status in ('pending', 'settled')),
  description text,
  notes text,
  account_id uuid not null,
  category_id uuid,
  transfer_account_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id),
  foreign key (transfer_account_id, user_id) references public.accounts (id, user_id),
  constraint transactions_transfer_shape check (
    (type = 'transfer'
       and transfer_account_id is not null
       and transfer_account_id <> account_id
       and category_id is null)
    or
    (type <> 'transfer' and transfer_account_id is null)
  )
);
create index transactions_user_date_idx
  on public.transactions (user_id, date desc) where deleted_at is null;
create index transactions_user_category_date_idx
  on public.transactions (user_id, category_id, date) where deleted_at is null;
create index transactions_account_idx
  on public.transactions (account_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- updated_at + RLS (padrão idêntico para as 3 tabelas de dados)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'transactions']
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || ': dono tudo', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Novo usuário → perfil + categorias padrão
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name')
  );

  insert into public.categories (user_id, name, type) values
    (new.id, 'Salário',        'income'),
    (new.id, 'Renda extra',    'income'),
    (new.id, 'Investimentos',  'income'),
    (new.id, 'Outras receitas','income'),
    (new.id, 'Moradia',        'expense'),
    (new.id, 'Mercado',        'expense'),
    (new.id, 'Alimentação fora','expense'),
    (new.id, 'Transporte',     'expense'),
    (new.id, 'Saúde',          'expense'),
    (new.id, 'Educação',       'expense'),
    (new.id, 'Lazer',          'expense'),
    (new.id, 'Assinaturas',    'expense'),
    (new.id, 'Compras',        'expense'),
    (new.id, 'Contas e taxas', 'expense'),
    (new.id, 'Outras despesas','expense');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funções de trigger não devem ser chamáveis pela API
revoke execute on function public.enforce_allowed_email() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Views para os dashboards (security_invoker: respeitam a RLS do usuário)
-- ---------------------------------------------------------------------

-- RN-02: saldo é calculado, nunca guardado. Só transações efetivadas (RN-03).
create view public.v_account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.initial_balance
    + coalesce((
        select sum(case t.type when 'income' then t.amount else -t.amount end)
        from public.transactions t
        where t.account_id = a.id
          and t.status = 'settled'
          and t.deleted_at is null
      ), 0)
    + coalesce((
        select sum(t.amount)
        from public.transactions t
        where t.transfer_account_id = a.id
          and t.type = 'transfer'
          and t.status = 'settled'
          and t.deleted_at is null
      ), 0) as balance
from public.accounts a
where a.deleted_at is null;

-- Receitas e despesas por mês. Transferências ficam de fora (RN-04).
create view public.v_monthly_summary
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  coalesce(sum(t.amount) filter (where t.type = 'income'  and t.status = 'settled'), 0) as income_settled,
  coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'settled'), 0) as expense_settled,
  coalesce(sum(t.amount) filter (where t.type = 'income'  and t.status = 'pending'), 0) as income_pending,
  coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'pending'), 0) as expense_pending
from public.transactions t
where t.deleted_at is null
  and t.type in ('income', 'expense')
group by t.user_id, date_trunc('month', t.date);

-- Gasto por categoria/mês (efetivado + pendente: é o gasto do mês).
create view public.v_spending_by_category
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  t.category_id,
  sum(t.amount) as total
from public.transactions t
where t.deleted_at is null
  and t.type = 'expense'
group by t.user_id, date_trunc('month', t.date), t.category_id;
