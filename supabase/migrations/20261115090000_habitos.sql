-- =====================================================================
-- KAIROS · Hábitos da rotina (checklist diário: "tomar creatina",
-- "beber 2 litros de água"...). Rode no SQL Editor do Supabase DEPOIS das
-- migrations anteriores.
-- =====================================================================

-- Um hábito, com os dias da semana em que vale (ISO: 1 = segunda ... 7 = domingo).
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}',
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint habits_weekdays_valid check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);
create index habits_user_idx on public.habits (user_id) where deleted_at is null and archived_at is null;

-- Cada linha = "fiz este hábito neste dia". Desmarcar apaga a linha.
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, date desc);

create trigger habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
create policy "habits: dono tudo" on public.habits
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "habit_logs: dono tudo" on public.habit_logs
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
