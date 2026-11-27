# KAIROS — Documento de Produto

> Versão 0.1 · Nov/2026 · Uso inicial: pessoal (1 usuário). Possibilidade de abrir ao público no futuro.

**Proposta:** o KAIROS ajuda você a entender onde está, organizar o que importa e decidir para onde quer ir.
**Identidade:** ampulheta + K. Tempo, dinheiro e energia como recursos a administrar. Tema escuro, preto e off-white quente, minimalista.

---

## 1. O que é e qual problema resolve

O KAIROS reúne em um só lugar o controle financeiro, a rotina e os objetivos pessoais.

**Problema:** a vida pessoal fica espalhada em vários apps (planilha de gastos, app do banco, agenda, to-do, metas no caderno). Nenhum deles conversa com os outros, então fica difícil responder perguntas simples:

- Para onde meu dinheiro está indo?
- Eu consigo pagar isso este mês?
- Estou me aproximando da minha meta ou me afastando?

**Diferencial:** os módulos são conectados. Uma meta financeira alimenta o orçamento, as tarefas e o dashboard. O valor do app está nos dashboards que cruzam essas áreas, não em ter muitos módulos.

**Fora do escopo agora:** inteligência artificial (ver seção 11), Open Finance/integração bancária e app mobile nativo.

---

## 2. Público-alvo

| Fase | Público | Observação |
|---|---|---|
| Agora | Você (1 usuário) | Define o que é essencial; o app precisa ser útil no dia a dia. |
| Futuro | Pessoas físicas, 22–45 anos, que já controlam gastos em planilha ou app simples e querem algo mais completo | Só se o uso próprio provar valor. |

Mesmo com 1 usuário, o banco nasce **multiusuário** (todo registro tem `user_id` + RLS). Custa pouco agora e evita reescrita depois.

---

## 3. Funcionalidades (visão completa)

### Finanças
- Receitas, despesas e transferências entre contas
- Contas (corrente, poupança, carteira, investimento)
- Cartões de crédito com fatura, fechamento, vencimento e parcelamento
- Categorias e subcategorias, tags
- Transações recorrentes (salário, aluguel, assinaturas)
- Orçamento mensal por categoria
- Investimentos (acompanhamento simples de saldo/aportes)
- Importação de extrato (CSV/OFX), fase posterior

### Registro rápido (chat)
- Escrever do jeito que fala ("hoje tomei um café na padaria R$ 50") e o sistema entende valor, data, tipo e categoria e salva
- Também cria tarefas, lembretes e notas ("tarefa: …", "lembrar de … amanhã 9h", "anotar: …")
- Cada registro pode ser desfeito; o histórico da conversa fica salvo
- **Sem IA:** interpretador por regras (palavras-chave, valores, datas). Entende frases simples; não entende tudo. Pode ser trocado por IA no futuro

### Rotina
- Tarefas (prioridade, prazo, projeto)
- Lembretes (dia e hora)
- Bloco de notas (com nota fixada)
- Calendário / compromissos (depois)
- Hábitos (frequência, sequência/streak) (depois)

### Objetivos
- Metas financeiras (valor alvo + prazo) e pessoais (marco/prazo)
- Contribuições e progresso
- Previsão de conclusão com base no ritmo atual

### Dashboards e relatórios
- Dashboard geral (visão da vida)
- Dashboards por módulo
- Relatórios por período, categoria e conta; exportação CSV

### Base
- Login com Google (MVP); e-mail/senha e recuperação de senha só se abrir ao público
- Onboarding (contas, categorias, primeira meta)
- Configurações (moeda, fuso, tema, exportar/excluir dados)

---

## 4. Módulos e responsabilidades

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| **Auth** | Identidade via Google OAuth, sessão. Cadastros restritos por lista de e-mails permitidos enquanto for uso pessoal | — |
| **Onboarding** | Deixar o app utilizável nos primeiros minutos | Auth, Contas, Categorias |
| **Contas** | Onde o dinheiro está; saldo calculado | — |
| **Categorias** | Classificar transações; base dos relatórios | — |
| **Transações** | Registrar receitas, despesas e transferências | Contas, Categorias |
| **Cartões** | Faturas, parcelamentos, limite | Transações, Contas |
| **Recorrências** | Gerar lançamentos futuros automaticamente | Transações |
| **Orçamento** | Limite por categoria/mês e alertas | Categorias, Transações |
| **Investimentos** | Posição e evolução (simples) | Contas |
| **Registro rápido** | Chat que transforma frases em transações, tarefas, lembretes e notas | Transações, Tarefas, Notas |
| **Tarefas e lembretes** | Pendências com prazo/prioridade e avisos por dia/hora | — |
| **Notas** | Bloco de notas livre | — |
| **Calendário** | Visão temporal de tarefas, vencimentos e eventos | Tarefas, Transações |
| **Hábitos** | Registro diário e sequência | — |
| **Objetivos** | Metas e progresso | Contas, Transações, Tarefas |
| **Dashboard** | Resumo agregado de todos os módulos | Todos (leitura) |
| **Relatórios** | Análises por período e exportação | Finanças (principalmente) |
| **Configurações** | Preferências e dados da conta | — |

Regra de arquitetura: **Dashboard e Relatórios só leem**; nunca escrevem em outros módulos.

---

## 5. Mapa de navegação

Estrutura atual (decisão de 14/11/2026): o app abre no **Início**, com os setores; **Finanças** é um módulo opcional
(só quem entra nele passa pela entrevista).

```
/entrar                          Login com Google
/entrevista                      Entrevista de Finanças (só na primeira vez, ao entrar em Finanças)

/ (Início)                       Saudação, atalhos, setores: Finanças · Rotina · Bloco de notas
/registrar                       Chat de registro rápido (gastos, tarefas, lembretes, notas)

Finanças  (/financas → /dashboard)
├── /dashboard                   Visão geral: saldo, indicadores, semáforo, contas a pagar, planos, gráficos
├── /mes                         Meu mês: entradas, contas do mês (Paguei/Recebi), contas fixas
├── /transacoes                  Movimentações por dia, com filtros
├── /contas                      Contas e saldos
└── /planejar                    Planos
    ├── /conquista               Simulador: conquistar algo
    └── /divida                  Simulador: sair de uma dívida

/rotina                          Abas: Hoje (hábitos e semana) · Tarefas (quadro por prazo) · Lembretes · Notas
```

**Navegação (design "vidro", branch `feature/design-vidro`):** doca lateral com os módulos (Início, Finanças, Rotina,
Registrar) e doca de baixo com as abas do módulo atual; no celular, doca fixa embaixo com os módulos e as abas no
topo da tela. Na barra do topo: **busca e registro rápido** (clique, Ctrl+K ou "/": vai para qualquer tela ou registra
"café 12,50", "tarefa: …", "lembrar de …", "anotar: …"), **sino de avisos** (atrasos, o que é para hoje e contas que
vencem em até 3 dias), botão **"+ Novo"** (transação, dentro de Finanças), tema claro/noturno e sair. Cada módulo tem
uma foto de fundo própria. Visual detalhado em `DESIGN.md`.

Ainda por vir: cartões, orçamento por categoria, relatórios, configurações.

---

## 6. Fluxos de utilização

**6.1 Primeiro acesso**
Cadastro → confirmar e-mail → onboarding (nome, moeda/fuso, criar contas com saldo inicial, categorias padrão aceitas ou editadas, primeira meta opcional) → dashboard.

**6.2 Registrar uma despesa (fluxo mais frequente, deve levar menos de 10s)**
"+ Novo" → valor → categoria → conta ou cartão → data (padrão: hoje) → salvar. Dashboard e saldos atualizam.

**6.3 Compra parcelada no cartão**
Nova despesa → escolher cartão → informar nº de parcelas → o sistema cria uma parcela em cada fatura futura conforme o fechamento.

**6.4 Pagar fatura**
Cartões → fatura → "Pagar" → escolher conta de origem → o sistema cria uma **transferência** conta → cartão (não uma despesa; ver regra RN-05).

**6.5 Meta financeira**
Objetivos → nova meta → valor alvo, prazo, conta vinculada (opcional) → aportes manuais ou automáticos → barra de progresso e data prevista.

**6.6 Revisão mensal**
Relatórios → mês → ver gastos por categoria, orçamento vs realizado, comparação com mês anterior → ajustar orçamento do próximo mês.

**6.7 Rotina diária**
Dashboard mostra: tarefas de hoje, hábitos pendentes, contas que vencem nos próximos 7 dias.

---

## 7. Regras de negócio

### Dinheiro e saldos
- **RN-01** Valores são guardados em **centavos (inteiro)**, nunca como float. Moeda padrão BRL; a coluna `currency` existe, mas o MVP usa só BRL.
- **RN-02** O saldo da conta **não é guardado**; é calculado: `saldo_inicial + soma das transações efetivadas`. Isso evita inconsistência quando se edita uma transação antiga.
- **RN-03** Transação tem status `pendente` ou `efetivada`. Só as efetivadas entram no saldo; as pendentes entram na projeção.
- **RN-04** Tipos: `receita`, `despesa`, `transferência`. Transferência tem conta de origem e destino e **não conta** como receita nem despesa nos relatórios.
- **RN-05** **Pagar fatura de cartão é transferência**, não despesa. A despesa já foi contada na data da compra. Isso evita contar o gasto duas vezes.

### Cartões
- **RN-06** Cartão tem dia de fechamento e dia de vencimento. Compra feita **no dia do fechamento ou depois** entra na fatura seguinte.
- **RN-07** Compra parcelada gera N lançamentos, um por fatura, ligados por `installment_group_id`. O resto da divisão em centavos vai para a primeira parcela (ex.: 100,00 em 3x → 33,34 + 33,33 + 33,33).
- **RN-08** Limite disponível = limite total − faturas abertas e parcelas futuras ainda não pagas.
- **RN-09** Editar ou excluir uma parcela deve perguntar: só esta, esta e as próximas, ou todas.

### Categorias e orçamento
- **RN-10** Categoria tem tipo (receita ou despesa) e pode ter subcategoria (1 nível).
- **RN-11** Categoria com transações não pode ser apagada; só **arquivada**, ou as transações são movidas para outra categoria.
- **RN-12** Orçamento é por categoria e por mês. Alertas em 80% e 100% do limite. Orçamento da categoria-pai inclui as subcategorias.

### Recorrências
- **RN-13** Recorrência gera transações `pendentes` com antecedência de 3 meses. Editar a regra afeta só as futuras ainda pendentes.

### Objetivos
- **RN-14** Progresso = valor atual ÷ valor alvo. Valor atual vem de contribuições manuais, ou do saldo de uma conta vinculada.
- **RN-15** Data prevista = hoje + (falta ÷ média mensal dos últimos 3 meses de contribuição). Sem histórico, mostra "sem previsão".

### Rotina
- **RN-16** Hábito tem frequência (diária ou N vezes por semana). Sequência (streak) conta períodos consecutivos cumpridos; um dia sem registro quebra a sequência.
- **RN-17** Datas e "hoje" usam o fuso do usuário (padrão `America/Sao_Paulo`), nunca o do servidor.

### Dados
- **RN-18** Exclusão de dados importantes é lógica (`deleted_at`); a exclusão definitiva só acontece pela opção "apagar minha conta".
- **RN-19** Todo dado é do usuário dono do registro; o acesso é imposto pelo banco (RLS), não só pelo código.

### Entrevista, contas fixas e semáforo
- **RN-20** O app só é liberado depois da **entrevista inicial**. Ela é concluída numa única transação no banco: se algo falhar, nada é criado. Só pode ser feita uma vez.
- **RN-21** Salário e contas fixas são **recorrências**. Cada mês vira uma transação **pendente** (agendada), com chave única por recorrência/mês (gerar de novo não duplica). Dia 31 em mês curto vira o último dia do mês. Se a pessoa exclui a instância de um mês, ela não volta.
- **RN-22** Editar uma recorrência altera só as instâncias **pendentes** do mês atual em diante (o que já foi pago não muda). Encerrar remove as pendentes daqui para frente e mantém o histórico.
- **RN-23** Conta fixa pendente com data anterior a hoje aparece como **atrasada**. "Paguei/Recebi" efetiva a transação (passa a contar no saldo); "Desfazer" volta para pendente.
- **RN-24** **Semáforo:** compara o que está **comprometido** no mês (despesas pagas + agendadas) com a renda do mês (recebida + a receber). 🟢 até 70% · 🟡 até 90% · 🔴 acima, ou se o ritmo de gastos do dia a dia, projetado até o fim do mês, passar do limite (a projeção só vale a partir do 7º dia). Limites ajustáveis por usuário (`health_green_max`, `health_yellow_max`). Sempre mostra ícone e texto, não só cor.
- **RN-25** **Planejar uma conquista:** sobra = renda − gastos mensais. Cenários: no ritmo com folga (90% da sobra), usando toda a sobra, e no prazo desejado (mostra quanto falta quando não cabe). Rendimento é opcional e informado pela pessoa. É simulação, não recomendação de investimento.
- **RN-26** **Planejar sair de dívida:** sobra = renda − gastos essenciais. Compara parcelamentos (3 a 36x, tabela Price com os juros informados) e pagar com 80% da sobra. Recomenda o prazo mais curto cuja parcela cabe com folga; avisa quando nada cabe e orienta a negociar. Sem juros informados, avisa que o custo real é maior.

---

## 8. Estrutura do banco de dados (PostgreSQL / Supabase)

Convenções: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users`, `created_at`, `updated_at`, `deleted_at` (soft delete). Valores em `bigint` (centavos). RLS habilitado em todas as tabelas com política `user_id = auth.uid()`.

### Base
| Tabela | Campos principais |
|---|---|
| `profiles` | id (= auth.users.id), name, currency, timezone, theme, onboarded_at |

### Finanças
| Tabela | Campos principais |
|---|---|
| `accounts` | name, type (`checking`/`savings`/`wallet`/`investment`), initial_balance, color, archived_at |
| `categories` | name, type (`income`/`expense`), parent_id, icon, color, archived_at |
| `credit_cards` | name, credit_limit, closing_day, due_day, default_account_id (p/ pagamento), archived_at |
| `card_invoices` | card_id, reference_month, closing_date, due_date, status (`open`/`closed`/`paid`), paid_transaction_id |
| `transactions` | type, amount, date, status, description, account_id, category_id, card_id, invoice_id, transfer_account_id, installment_group_id, installment_number, installment_total, recurrence_id, notes |
| `tags` / `transaction_tags` | tag e relação N:N com transações |
| `budgets` | category_id, month, amount |
| `recurrences` | template da transação, frequency, interval, starts_on, ends_on, next_run |
| `investment_snapshots` | account_id, date, balance, contributions (evolução simples) |

### Rotina
| Tabela | Campos principais |
|---|---|
| `tasks` | title, description, due_date, priority, status, project, goal_id |
| `events` | title, starts_at, ends_at, all_day, notes |
| `habits` | name, frequency_type, target_per_week, archived_at |
| `habit_logs` | habit_id, date (único por hábito+data), done |

### Objetivos
| Tabela | Campos principais |
|---|---|
| `goals` | title, type (`financial`/`personal`), target_amount, target_date, linked_account_id, status |
| `goal_contributions` | goal_id, amount, date, transaction_id (opcional) |

### Relações importantes
- `transactions.account_id` → `accounts`; `transactions.card_id` e `invoice_id` quando for compra no cartão.
- Transferência: `account_id` (origem) + `transfer_account_id` (destino); sem categoria.
- Pagamento de fatura: transferência com `card_invoices.paid_transaction_id` apontando para ela.

### Views para os dashboards
- `v_account_balances` — saldo atual por conta (RN-02)
- `v_monthly_summary` — receitas, despesas e saldo por mês
- `v_spending_by_category` — gasto por categoria/mês
- `v_budget_vs_actual` — orçamento vs realizado
- `v_goal_progress` — progresso e previsão por meta

Índices mínimos: `(user_id, date)` e `(user_id, category_id, date)` em `transactions`; `(user_id, month)` em `budgets`.

---

## 9. Arquitetura tecnológica

| Camada | Escolha | Papel |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Páginas, rotas, server actions |
| UI | **Tailwind CSS + shadcn/ui** | Design system; tema escuro como padrão |
| Banco/Auth | **Supabase (PostgreSQL)** | Dados, autenticação, RLS, storage de arquivos |
| Gráficos | **Recharts** | Dashboards |
| Deploy | **Vercel** | Hospedagem e previews |

**Complementos recomendados**
- **Zod** para validar entradas (formulários e server actions)
- **date-fns** com locale `pt-BR` para datas
- **Supabase CLI** para migrations versionadas (o banco vira código)
- **Vitest** para testar a lógica crítica: cálculo de fatura, parcelamento, saldo e streak
- Tipos gerados do banco (`supabase gen types`) para ter TypeScript de ponta a ponta

**Princípios**
1. Lógica de negócio fica em funções puras (`/lib/finance`, `/lib/habits`), testáveis sem banco.
2. Agregações dos dashboards ficam em **views/SQL**, não em loops no front.
3. Segurança na RLS; o código nunca confia só no `user_id` vindo do cliente.
4. Formatação em um lugar só (`formatMoney`, `formatDate`).

**Estrutura de pastas (sugerida)**
```
src/
├── app/
│   ├── (auth)/            entrar, cadastro, recuperar-senha
│   ├── onboarding/
│   └── (app)/             dashboard, financas, rotina, objetivos, relatorios, configuracoes
├── components/            ui (shadcn), charts, forms
├── lib/                   finance, habits, goals, supabase, format
├── server/                actions por módulo
└── types/
supabase/migrations/
docs/
```

---

## 10. Escopo do MVP e roadmap

Princípio: **usar o app o mais cedo possível**. Cada fase termina com algo que você usa de verdade.

### Fase 1 — Núcleo financeiro + registro rápido + rotina básica (v1, na `main`)

> Decisão de 13/11/2026: o **chat de registro** e a **rotina básica** (tarefas, lembretes, notas) entram já na v1, junto do núcleo financeiro. Navegação no **topo** (sem menu lateral).

- Login com Google e restrição de cadastro ao seu e-mail
- Contas (com saldo inicial), categorias padrão, transações (receita, despesa, transferência)
- Dashboard: saldo total, receitas × despesas do mês, gasto por categoria, evolução de 6 meses, últimas transações, "hoje na rotina"
- Transações: lista por mês com filtros, criar, editar, excluir
- Registrar (chat): despesas/receitas, tarefas, lembretes e notas por frase, com desfazer
- Rotina: tarefas, lembretes e notas (criar, concluir, fixar, excluir)
- **Ainda fora da v1:** gerenciar categorias (criar/editar), editar tarefas, notificações dos lembretes, calendário, hábitos, cartões

**Critério de pronto:** você lança suas transações reais por 2 semanas sem voltar para a planilha.

### Fase 1.5 — Entrevista, contas fixas, semáforo e planejamento (branches `feature/...`)

> Decisão de 14/11/2026, a partir do pedido do Caio: o app precisa conhecer a renda da pessoa para ajudar de verdade.

- **Entrevista inicial** obrigatória: nome, renda mensal e dia de recebimento, saldo atual, contas fixas (ex.: água, luz, consórcio, alimentação). Termina com uma prévia do semáforo
- **Meu mês:** entradas e contas fixas viram lançamentos agendados todo mês; "paguei/recebi" debita do saldo; atrasadas em destaque
- **Semáforo de saúde financeira** 🟢🟡🔴 no dashboard e em Meu mês, com mensagem e projeção do ritmo de gastos
- **Planejar:** simulador de **conquista** (ex.: moto de R$ 23.000 com renda 2.500 e gastos 1.700: quanto guardar por mês e em quanto tempo) e de **saída de dívida** (ex.: cartão de R$ 1.900 com renda 1.500: compara parcelamentos), com planos salvos e progresso por aporte/pagamento
- Sem IA: tudo é cálculo transparente com os números informados pela pessoa

### Fase 2 — Cartões e orçamento
- Cartões, faturas, parcelamento, pagamento de fatura
- Orçamento por categoria + alertas (ex.: "alimentação até R$ 600")
- Dashboard: orçamento vs realizado, faturas a vencer
- (Recorrências já entregues na Fase 1.5)

### Fase 3 — Objetivos pessoais
- Metas não financeiras (marcos e prazos)
- Dashboard de metas e integração dos planos com o orçamento (reservar o aporte mensal)

### Fase 4 — Rotina avançada
- Calendário (inclui vencimentos financeiros), hábitos, notificações dos lembretes
- Edição de tarefas, projetos

### Fase 5 — Relatórios e investimentos
- Relatórios por período/categoria/conta, exportação CSV
- Investimentos (snapshots e evolução patrimonial)
- Importação de extrato (CSV/OFX)

### Fora do MVP (parking lot)
Open Finance, app mobile/PWA offline, compartilhamento com outra pessoa (casal/família), multi-moeda, notificações push.

---

## 11. Visão futura: IA (não faz parte do MVP)

Objetivo: ajudar em decisões **dentro do app, usando os dados do próprio usuário**.

Exemplos de uso:
- "Tenho R$ 10 mil e quero investir em X. Compensa?"
- "Preciso pagar R$ 10 mil. Como organizo isso sem estourar o orçamento?"

O que já deixar preparado no MVP, sem implementar IA:
- Histórico limpo e categorizado (é o combustível da IA)
- Views de resumo (gasto médio mensal, fluxo de caixa, reserva em meses de despesa)
- Metas e prazos estruturados, para a IA poder simular cenários

Cuidados quando chegar a hora: a IA **orienta e simula**, não executa operações; mostra os números que usou; avisa que não é recomendação de investimento profissional; e só envia dados ao provedor com consentimento do usuário (LGPD).

---

## 12. Decisões em aberto

- [ ] Nome do banco de cores/tokens (a partir da logo: preto, off-white quente; definir cor de destaque para receita/despesa/alerta)
- [ ] Exportar logos em **SVG** (hoje só existem PNGs) e testar o ícone em tamanho de favicon
- [ ] Checar o nome "KAIROS" no INPI antes de qualquer lançamento público
- [x] Autenticação: **somente Google** no MVP (decidido). E-mail+senha pode ser adicionado se o app for aberto ao público.
- [ ] Importação de extrato: qual banco você usa hoje (formato do arquivo)?
