# KAIROS

Plataforma de gestão pessoal: finanças, rotina e objetivos em um só lugar.
*Entenda onde você está, organize o que importa e decida para onde quer ir.*

> Em desenvolvimento. Uso inicial pessoal.

## Documentação

- [Documento de produto](docs/KAIROS_documento_de_produto.md): escopo, módulos, regras de negócio, banco de dados e roadmap.

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui · Supabase (PostgreSQL + Auth) · Recharts · Vercel

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um projeto no [Supabase](https://supabase.com) e rode, **em ordem**, os 4 arquivos de `supabase/migrations/` no SQL Editor (núcleo financeiro, chat e rotina, entrevista e contas fixas, planos).
3. Copie `.env.example` para `.env.local` e preencha a URL e a publishable key do projeto.
4. Ative o provedor Google em *Authentication → Providers* e cadastre `http://localhost:3000/auth/callback` nas URLs de redirecionamento.
5. Libere seu e-mail para cadastro (o app aceita apenas e-mails da lista):
   ```sql
   insert into public.allowed_emails (email) values ('seu@email.com');
   ```
6. Inicie:
   ```bash
   npm run dev
   ```

Abra <http://localhost:3000>.

## Convenções

- Valores monetários sempre em **centavos** (inteiro).
- Saldos são calculados, nunca armazenados.
- Segurança de dados garantida por RLS no banco (todo registro tem `user_id`).
- Esta versão do Next.js usa Cache Components e Partial Prefetching. Regras que o dev server valida:
  - Páginas que leem a hora atual, `searchParams` ou dados do usuário começam com `await connection()` (de `next/server`).
  - Cada página do app tem um `loading.tsx` ao lado (carregamento instantâneo na navegação).
  - Um `<Suspense>` só em layout compartilhado não basta para a navegação entre páginas.
- Dinheiro, datas e o interpretador do chat são funções puras com testes (`npm test`).
- Navegação no topo (sem menu lateral); o layout do app está em `src/app/(app)/layout.tsx`.
