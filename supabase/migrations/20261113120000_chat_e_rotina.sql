-- =====================================================================
-- KAIROS · Registro rápido (chat) + Rotina (tarefas, lembretes, notas)
-- Rode no SQL Editor do Supabase DEPOIS da migration da Fase 1.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Chat de registro rápido: histórico do que o usuário escreveu e do que o
-- sistema entendeu/salvou. A entidade criada (transação, tarefa, nota) fica
-- referenciada para permitir "desfazer".
-- ---------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(trim(content)) > 0),
  entity_type text check (entity_type in ('transaction', 'task', 'note')),
  entity_id uuid,
  undone_at timestamptz,
  created_at timestamptz not null default now(),
  check ((entity_type is null) = (entity_id is null))
);
create index chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Tarefas e lembretes (mesma tabela, `kind` diferencia)
--   task:     item de checklist, com prazo opcional (due_date)
--   reminder: algo a lembrar em um dia/hora (remind_at)
-- ---------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'task' check (kind in ('task', 'reminder')),
  title text not null check (length(trim(title)) > 0),
  notes text,
  due_date date,
  remind_at timestamptz,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done') = (completed_at is not null))
);
create index tasks_user_status_idx
  on public.tasks (user_id, status, due_date) where deleted_at is null;
create index tasks_user_remind_idx
  on public.tasks (user_id, remind_at) where deleted_at is null and kind = 'reminder';

-- ---------------------------------------------------------------------
-- Bloco de notas
-- ---------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx
  on public.notes (user_id, pinned desc, updated_at desc) where deleted_at is null;

-- ---------------------------------------------------------------------
-- updated_at + RLS (mesmo padrão da Fase 1)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['tasks', 'notes']
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;

  foreach t in array array['chat_messages', 'tasks', 'notes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || ': dono tudo', t);
  end loop;
end;
$$;
