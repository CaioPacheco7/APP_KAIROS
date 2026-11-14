-- =====================================================================
-- KAIROS · Entrevista inicial + contas fixas (recorrências) + limites do semáforo
-- Rode no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Limites do semáforo de saúde financeira (ajustáveis por usuário).
--   verde:    comprometido <= health_green_max  % da renda
--   amarelo:  até health_yellow_max %
--   vermelho: acima disso
-- A entrevista é concluída quando profiles.onboarded_at deixa de ser nulo.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column health_green_max smallint not null default 70
    check (health_green_max between 1 and 200),
  add column health_yellow_max smallint not null default 90
    check (health_yellow_max between 1 and 300),
  add constraint profiles_health_order check (health_green_max < health_yellow_max);

-- Permite o usuário ajustar os limites e o nome (já havia policy de update)

-- ---------------------------------------------------------------------
-- Recorrências: salário e contas fixas que se repetem todo mês (RN-13).
-- Cada mês vira uma transação PENDENTE (agendada) ligada à recorrência.
-- ---------------------------------------------------------------------
create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  description text not null check (length(trim(description)) > 0),
  amount bigint not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  account_id uuid not null,
  category_id uuid,
  -- primeiro dia do primeiro mês em que passa a valer
  starts_on date not null
    default (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);
create index recurrences_user_idx on public.recurrences (user_id) where deleted_at is null;

create trigger recurrences_updated_at
  before update on public.recurrences
  for each row execute function public.set_updated_at();

alter table public.recurrences enable row level security;
create policy "recurrences: dono tudo" on public.recurrences
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ligação da transação com a recorrência e o mês de referência.
alter table public.transactions
  add column recurrence_id uuid,
  add column recurrence_month date,
  add constraint transactions_recurrence_pair
    check ((recurrence_id is null) = (recurrence_month is null)),
  add constraint transactions_recurrence_fk
    foreign key (recurrence_id, user_id) references public.recurrences (id, user_id);

-- Uma instância por recorrência/mês (torna a geração idempotente).
create unique index transactions_recurrence_month_uq
  on public.transactions (recurrence_id, recurrence_month)
  where recurrence_id is not null;

-- ---------------------------------------------------------------------
-- Gera as transações pendentes de um mês. Idempotente: pode ser chamada
-- quantas vezes quiser. Se o usuário excluiu a instância daquele mês, ela
-- não volta (a linha excluída continua ocupando a chave única).
-- Dia 31 em mês curto vira o último dia do mês.
-- ---------------------------------------------------------------------
create or replace function public.generate_recurring_transactions(p_month date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m date := date_trunc('month', p_month)::date;
  last_day int := extract(day from (m + interval '1 month - 1 day'))::int;
  n integer;
begin
  with ins as (
    insert into public.transactions
      (user_id, type, amount, date, status, description,
       account_id, category_id, recurrence_id, recurrence_month)
    select r.user_id, r.kind, r.amount,
           m + (least(r.day_of_month, last_day) - 1),
           'pending', r.description, r.account_id, r.category_id, r.id, m
    from public.recurrences r
    where r.user_id = (select auth.uid())
      and r.deleted_at is null
      and r.active
      and r.starts_on <= m
    on conflict (recurrence_id, recurrence_month) where recurrence_id is not null
    do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- Aplica a edição de uma recorrência às instâncias PENDENTES de p_from em
-- diante (as já pagas não mudam). RN-13.
-- ---------------------------------------------------------------------
create or replace function public.apply_recurrence_changes(p_id uuid, p_from date)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.transactions t
  set amount = r.amount,
      description = r.description,
      account_id = r.account_id,
      category_id = r.category_id,
      date = t.recurrence_month + (
        least(r.day_of_month,
              extract(day from (t.recurrence_month + interval '1 month - 1 day'))::int) - 1)
  from public.recurrences r
  where r.id = p_id
    and r.user_id = (select auth.uid())
    and t.recurrence_id = r.id
    and t.status = 'pending'
    and t.deleted_at is null
    and t.recurrence_month >= date_trunc('month', p_from)::date;
$$;

-- ---------------------------------------------------------------------
-- Encerra uma recorrência: some das telas e as instâncias pendentes de
-- p_from em diante são excluídas (as já pagas ficam no histórico).
-- ---------------------------------------------------------------------
create or replace function public.remove_recurrence(p_id uuid, p_from date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.transactions
  set deleted_at = now()
  where recurrence_id = p_id
    and user_id = (select auth.uid())
    and status = 'pending'
    and deleted_at is null
    and recurrence_month >= date_trunc('month', p_from)::date;

  update public.recurrences
  set deleted_at = now()
  where id = p_id and user_id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- Entrevista inicial, em UMA transação (tudo ou nada): perfil, conta (ou
-- usa a primeira existente), salário e contas fixas recorrentes, e já gera
-- o mês atual.
--   p_fixed: [{"description":"Luz","amount":40000,"day":10,"category":"Contas e taxas"}]
-- ---------------------------------------------------------------------
create or replace function public.complete_interview(
  p_name text,
  p_income bigint,
  p_income_day int,
  p_account_name text,
  p_balance bigint,
  p_fixed jsonb,
  p_month date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  month_start date := date_trunc('month', p_month)::date;
  acc uuid;
  cat uuid;
  item jsonb;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.profiles where id = uid and onboarded_at is not null) then
    raise exception 'Entrevista já concluída';
  end if;
  if p_income is null or p_income <= 0 then
    raise exception 'Informe a renda mensal';
  end if;

  if p_account_name is not null and length(trim(p_account_name)) > 0 then
    insert into public.accounts (user_id, name, type, initial_balance)
    values (uid, trim(p_account_name), 'checking', coalesce(p_balance, 0))
    returning id into acc;
  else
    select id into acc from public.accounts
    where user_id = uid and deleted_at is null and archived_at is null
    order by created_at limit 1;
    if acc is null then
      raise exception 'Informe uma conta';
    end if;
  end if;

  update public.profiles
  set name = coalesce(nullif(trim(p_name), ''), name),
      onboarded_at = now()
  where id = uid;

  select id into cat from public.categories
  where user_id = uid and type = 'income' and name = 'Salário' and deleted_at is null
  limit 1;
  insert into public.recurrences
    (user_id, kind, description, amount, day_of_month, account_id, category_id, starts_on)
  values (uid, 'income', 'Salário', p_income, coalesce(p_income_day, 5), acc, cat, month_start);

  for item in select * from jsonb_array_elements(coalesce(p_fixed, '[]'::jsonb)) loop
    select id into cat from public.categories
    where user_id = uid and type = 'expense'
      and name = item ->> 'category' and deleted_at is null
    limit 1;
    insert into public.recurrences
      (user_id, kind, description, amount, day_of_month, account_id, category_id, starts_on)
    values (uid, 'expense', trim(item ->> 'description'), (item ->> 'amount')::bigint,
            (item ->> 'day')::int, acc, cat, month_start);
  end loop;

  perform public.generate_recurring_transactions(month_start);
end;
$$;

-- Só usuários logados chamam estas funções pela API.
revoke execute on function public.generate_recurring_transactions(date) from public, anon;
revoke execute on function public.apply_recurrence_changes(uuid, date) from public, anon;
revoke execute on function public.remove_recurrence(uuid, date) from public, anon;
revoke execute on function public.complete_interview(text, bigint, int, text, bigint, jsonb, date) from public, anon;
grant execute on function public.generate_recurring_transactions(date) to authenticated;
grant execute on function public.apply_recurrence_changes(uuid, date) to authenticated;
grant execute on function public.remove_recurrence(uuid, date) to authenticated;
grant execute on function public.complete_interview(text, bigint, int, text, bigint, jsonb, date) to authenticated;
