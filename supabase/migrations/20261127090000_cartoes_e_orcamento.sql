-- =====================================================================
-- KAIROS · Fase 2 · Cartões de crédito e orçamento por categoria
-- Rode no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- Regras: docs/ RN-05..RN-09 (cartões) e RN-12 (orçamento).
--
-- Como o cartão funciona aqui:
--   compra no cartão  = despesa com card_id e SEM conta (o dinheiro ainda não
--                       saiu do banco; a despesa conta na data da compra)
--   pagar a fatura    = transferência conta -> cartão (card_id + invoice_month,
--                       sem conta de destino): tira da conta, não é despesa
--   fatura            = soma das compras com o mesmo invoice_month (o mês do
--                       VENCIMENTO, como os bancos chamam: "fatura de dezembro")
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cartões
-- ---------------------------------------------------------------------
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  credit_limit bigint not null default 0 check (credit_limit >= 0),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  -- conta sugerida para pagar a fatura
  default_account_id uuid,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (default_account_id, user_id) references public.accounts (id, user_id)
);
create index credit_cards_user_idx on public.credit_cards (user_id) where deleted_at is null;

create trigger credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

alter table public.credit_cards enable row level security;
create policy "credit_cards: dono tudo" on public.credit_cards
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Transações: compra no cartão, parcelas e pagamento de fatura
-- ---------------------------------------------------------------------
alter table public.transactions
  drop constraint transactions_transfer_shape,
  alter column account_id drop not null,
  add column card_id uuid,
  add column invoice_month date,
  add column installment_group_id uuid,
  add column installment_number smallint,
  add column installment_total smallint,
  add constraint transactions_card_fk
    foreign key (card_id, user_id) references public.credit_cards (id, user_id),
  add constraint transactions_invoice_month_first_day
    check (invoice_month is null or extract(day from invoice_month) = 1),
  add constraint transactions_shape check (
    -- transferência entre contas
    (type = 'transfer' and card_id is null and invoice_month is null
       and account_id is not null and transfer_account_id is not null
       and transfer_account_id <> account_id and category_id is null)
    or
    -- pagamento de fatura: transferência conta -> cartão (RN-05)
    (type = 'transfer' and card_id is not null and invoice_month is not null
       and account_id is not null and transfer_account_id is null and category_id is null)
    or
    -- compra no cartão: despesa sem conta
    (type = 'expense' and card_id is not null and invoice_month is not null
       and account_id is null and transfer_account_id is null)
    or
    -- receita ou despesa numa conta
    (type in ('income', 'expense') and card_id is null and invoice_month is null
       and account_id is not null and transfer_account_id is null)
  ),
  -- RN-07: parcelas ligadas pelo grupo; 2 a 48 parcelas, só em compra no cartão
  add constraint transactions_installment_shape check (
    (installment_group_id is null and installment_number is null and installment_total is null)
    or
    (installment_group_id is not null and card_id is not null and type = 'expense'
       and installment_total between 2 and 48
       and installment_number between 1 and installment_total)
  );

create index transactions_card_invoice_idx
  on public.transactions (card_id, invoice_month)
  where deleted_at is null and card_id is not null;
create index transactions_installment_group_idx
  on public.transactions (installment_group_id)
  where installment_group_id is not null;

-- Faturas: compras e pagamentos de cada cartão por mês de vencimento.
-- O limite usado (RN-08) é a soma de (compras - pagos) de todas as faturas.
create view public.v_card_invoices
with (security_invoker = true) as
select
  t.user_id,
  t.card_id,
  t.invoice_month,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as charges,
  coalesce(sum(t.amount) filter (where t.type = 'transfer' and t.status = 'settled'), 0) as paid,
  count(*) filter (where t.type = 'expense') as items
from public.transactions t
where t.deleted_at is null
  and t.card_id is not null
group by t.user_id, t.card_id, t.invoice_month;

-- ---------------------------------------------------------------------
-- Orçamento por categoria (RN-12)
--   Um limite vale do mês em que foi definido em diante, até ser trocado.
--   O limite de um mês é a linha mais recente com month <= aquele mês.
--   amount = 0 quer dizer "sem limite a partir deste mês".
-- ---------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);
create index budgets_user_month_idx on public.budgets (user_id, month);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;
create policy "budgets: dono tudo" on public.budgets
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
