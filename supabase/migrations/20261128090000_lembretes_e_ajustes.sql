-- =====================================================================
-- KAIROS · Rodada 1 de melhorias (testes no celular)
-- Rode no SQL Editor do Supabase DEPOIS das migrations anteriores.
--
-- 1. "Antes de começar": conta paga ou salário recebido antes de usar o app
--    (o saldo informado na entrevista já desconta) e saldo anterior do cartão.
-- 2. Lembretes fixos: repetem nos dias escolhidos, num horário.
-- 3. Notificações no celular (Web Push): inscrições, entregas e a função que
--    o disparador chama a cada minuto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Antes de começar a usar o KAIROS
-- ---------------------------------------------------------------------
alter table public.transactions
  add column before_start boolean not null default false;

-- O saldo não conta o que aconteceu antes de começar: o saldo inicial
-- informado já inclui (RN-39). O resto do app (mês, semáforo) conta normal.
create or replace view public.v_account_balances
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
          and not t.before_start
      ), 0)
    + coalesce((
        select sum(t.amount)
        from public.transactions t
        where t.transfer_account_id = a.id
          and t.type = 'transfer'
          and t.status = 'settled'
          and t.deleted_at is null
          and not t.before_start
      ), 0) as balance
from public.accounts a
where a.deleted_at is null;

-- Entrevista: o que já foi pago/recebido neste mês antes de começar entra
-- como efetivado "antes de começar" (não mexe no saldo informado).
--   p_fixed: [{"description":"Luz","amount":40000,"day":10,"category":"Contas e taxas","paid":true}]
drop function public.complete_interview(text, bigint, int, text, bigint, jsonb, date);

create function public.complete_interview(
  p_name text,
  p_income bigint,
  p_income_day int,
  p_account_name text,
  p_balance bigint,
  p_fixed jsonb,
  p_month date,
  p_income_paid boolean default false
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
  rec uuid;
  item jsonb;
  paid_ids uuid[] := '{}';
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
  values (uid, 'income', 'Salário', p_income, coalesce(p_income_day, 5), acc, cat, month_start)
  returning id into rec;
  if coalesce(p_income_paid, false) then
    paid_ids := paid_ids || rec;
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_fixed, '[]'::jsonb)) loop
    select id into cat from public.categories
    where user_id = uid and type = 'expense'
      and name = item ->> 'category' and deleted_at is null
    limit 1;
    insert into public.recurrences
      (user_id, kind, description, amount, day_of_month, account_id, category_id, starts_on)
    values (uid, 'expense', trim(item ->> 'description'), (item ->> 'amount')::bigint,
            (item ->> 'day')::int, acc, cat, month_start)
    returning id into rec;
    if coalesce((item ->> 'paid')::boolean, false) then
      paid_ids := paid_ids || rec;
    end if;
  end loop;

  perform public.generate_recurring_transactions(month_start);

  update public.transactions
  set status = 'settled', before_start = true
  where user_id = uid
    and recurrence_month = month_start
    and recurrence_id = any (paid_ids);
end;
$$;

revoke execute on function public.complete_interview(text, bigint, int, text, bigint, jsonb, date, boolean) from public, anon;
grant execute on function public.complete_interview(text, bigint, int, text, bigint, jsonb, date, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Lembretes fixos (RN-40)
--   repeat_weekdays: 1 = segunda ... 7 = domingo; remind_time: hora local.
--   Lembrete fixo não tem dia (due_date/remind_at ficam vazios).
-- ---------------------------------------------------------------------
alter table public.tasks
  add column repeat_weekdays smallint[],
  add column remind_time time,
  add constraint tasks_repeat_pair
    check ((repeat_weekdays is null) = (remind_time is null)),
  add constraint tasks_repeat_only_reminders
    check (repeat_weekdays is null or (kind = 'reminder' and due_date is null and remind_at is null)),
  add constraint tasks_repeat_weekdays_valid
    check (repeat_weekdays is null or (
      cardinality(repeat_weekdays) between 1 and 7
      and repeat_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]));

-- ---------------------------------------------------------------------
-- 3. Notificações no celular (Web Push)
-- ---------------------------------------------------------------------

-- Um registro por aparelho/navegador em que a pessoa ativou as notificações.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: dono tudo" on public.push_subscriptions
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Cada lembrete é avisado uma vez por horário (evita repetir a notificação).
create table public.push_deliveries (
  task_id uuid not null references public.tasks (id) on delete cascade,
  slot timestamptz not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, slot)
);
alter table public.push_deliveries enable row level security;
create policy "push_deliveries: dono lê" on public.push_deliveries
  for select using (user_id = (select auth.uid()));

-- Segredo do disparador (fica fora da API: o schema private não é exposto).
-- O valor é gravado à parte, no SQL de configuração das notificações.
create schema if not exists private;
create table if not exists private.settings (
  key text primary key,
  value text not null
);
revoke all on schema private from public, anon, authenticated;
revoke all on private.settings from public, anon, authenticated;

-- Lembretes que venceram agora (janela de 15 min), marcados como entregues
-- e já com os aparelhos de cada pessoa. Chamada pelo disparador do app.
--   único com hora: na hora · único sem hora: às 9h do dia
--   fixo: nos dias escolhidos, no horário (fuso da pessoa)
create or replace function public.claim_due_reminders(p_secret text, p_now timestamptz default now())
returns table (task_id uuid, endpoint text, p256dh text, auth text, title text, body text, url text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_secret is null or not exists (
    select 1 from private.settings s where s.key = 'push_secret' and s.value = p_secret
  ) then
    raise exception 'Não autorizado' using errcode = '42501';
  end if;

  return query
  with due as (
    select t.id as tid, t.user_id as uid, t.title as ttitle,
           coalesce(
             t.remind_at,
             (t.due_date + time '09:00') at time zone coalesce(p.timezone, 'America/Sao_Paulo')
           ) as tslot,
           case when t.remind_at is null then 'Lembrete de hoje' else 'Lembrete' end as tbody
    from public.tasks t
    join public.profiles p on p.id = t.user_id
    where t.kind = 'reminder' and t.status = 'open' and t.deleted_at is null
      and t.repeat_weekdays is null
      and (t.remind_at is not null or t.due_date is not null)
    union all
    select t.id, t.user_id, t.title,
           (((p_now at time zone z.tz)::date) + t.remind_time) at time zone z.tz,
           'Lembrete fixo'
    from public.tasks t
    join public.profiles p on p.id = t.user_id
    cross join lateral (select coalesce(p.timezone, 'America/Sao_Paulo') as tz) z
    where t.repeat_weekdays is not null and t.status = 'open' and t.deleted_at is null
      and extract(isodow from (p_now at time zone z.tz))::smallint = any (t.repeat_weekdays)
  ),
  fresh as (
    insert into public.push_deliveries (task_id, slot, user_id)
    select d.tid, d.tslot, d.uid
    from due d
    where d.tslot <= p_now and d.tslot > p_now - interval '15 minutes'
    on conflict do nothing
    returning push_deliveries.task_id as ftask, push_deliveries.slot as fslot, push_deliveries.user_id as fuser
  )
  select f.ftask, s.endpoint, s.p256dh, s.auth, d.ttitle, d.tbody, '/rotina?aba=lembretes'::text
  from fresh f
  join due d on d.tid = f.ftask and d.tslot = f.fslot
  join public.push_subscriptions s on s.user_id = f.fuser;
end;
$$;

-- Aparelho que não existe mais (desinstalou, revogou): o disparador remove.
create or replace function public.drop_push_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or not exists (
    select 1 from private.settings s where s.key = 'push_secret' and s.value = p_secret
  ) then
    raise exception 'Não autorizado' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

-- O disparador do app chama sem usuário logado (chave pública + segredo).
revoke execute on function public.claim_due_reminders(text, timestamptz) from public;
revoke execute on function public.drop_push_subscription(text, text) from public;
grant execute on function public.claim_due_reminders(text, timestamptz) to anon, authenticated;
grant execute on function public.drop_push_subscription(text, text) to anon, authenticated;
