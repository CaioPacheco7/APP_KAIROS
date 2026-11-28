# KAIROS · Sistema de design "Vidro"

Guia curto para manter o app consistente. Cores, vidro e movimento estão em `src/app/globals.css`;
as peças reutilizáveis, em `src/components/`. O estilo nasceu de um painel de vidro fosco sobre foto
(referência da comunidade 21st.dev) e foi adaptado à marca: dados reais, português, dourado do KAIROS.

## Princípios

1. **Vidro sobre uma cena.** Cada módulo tem uma foto de fundo própria, com o mesmo filtro quente.
   Os painéis são vidro fosco: dá profundidade sem perder a leitura.
2. **Setores reconhecíveis.** A cena e o ícone mostram onde você está (Início e Registrar na sala,
   Finanças nas montanhas, Rotina no quarto claro).
3. **Um número em destaque por tela.** O resto apoia (indicadores, gráficos finos, listas).
4. **Nunca só cor.** Status sempre com ícone + texto (semáforo, atrasado, vence hoje, variação).
5. **Dois temas de verdade.** Claro (vidro de leite quente) e noturno (**vidro negro: preto de verdade, nunca
   marrom**; o calor fica só no dourado da marca). Segue o sistema; a escolha fica no navegador.
6. **Acessível por padrão.** Quem pede menos transparência ou mais contraste no sistema recebe
   superfícies sólidas, sem desfoque. "Reduzir movimento" desliga as animações.

## Estrutura da tela

| Parte | Onde | O que faz |
|---|---|---|
| Cena | `components/shell/scenery.tsx` | foto fixa do módulo, filtro quente, troca suave entre cenas |
| Barra do topo | `components/shell/top-bar.tsx` | marca + data (abaixo de 400 px, só o logo), busca/registro, "+ Novo" (Finanças), ocultar valores, tema, avisos, sair |
| Ocultar valores | `components/shell/privacy-toggle.tsx` + `lib/privacy.ts` | o olho embaça todo valor em reais (ver abaixo) |
| Busca/registro | `components/shell/ask-bar.tsx` | abre com clique, **Ctrl+K** ou **/**; busca telas e registra gastos, tarefas, lembretes e notas (mesmo interpretador do Registrar, sem IA) |
| Avisos | `components/shell/notices-button.tsx` + `server/notices.ts` | sino com ponto coral: tarefas atrasadas/de hoje, contas e faturas vencidas ou que vencem em até 3 dias, e categorias a partir de 80% do orçamento |
| Palco | `app/(app)/layout.tsx` | o painel de vidro grande onde a tela acontece |
| Doca lateral | `components/shell/docks.tsx` | os 4 módulos (computador), só ícones com dica |
| Doca de baixo | idem | abas do módulo atual (Finanças, Rotina); no Início e no Registrar, os módulos |
| Celular | idem | doca fixa embaixo com os módulos e o "+" no meio; as abas do módulo ficam no topo do palco, todas à vista |

O mapa de módulos, abas, cenas e destinos da busca é puro e testado: `lib/navigation.ts`.

## Cenas (fotos de fundo)

| Módulo | Arquivo | Brilho (claro / noturno) |
|---|---|---|
| Início, Registrar | `public/photos/cena-casa.jpg` | 0,86 / 0,42 |
| Finanças | `public/photos/login-montanhas.jpg` | 1,04 / 0,55 |
| Rotina | `public/photos/cena-rotina.jpg` | 0,90 / 0,42 |

Filtro: no claro, `sepia(.22) saturate(.78)` e um véu quente em degradê; fotos escuras ganham mais brilho
para o vidro manter o contraste. No noturno, a foto fica em **preto e branco** (`grayscale(1)`), bem escura,
sob um véu preto: só dá profundidade, sem tingir a tela de marrom.
Créditos em `public/photos/CREDITS.md`.

## Cores

Variáveis CSS (`:root` = claro, `.dark` = noturno), expostas ao Tailwind (`bg-inner`, `bg-raised`,
`border-rim`, `text-good`…). Utilitários de vidro: `glass-panel` (painéis), `glass-rail` (barra e
docas, com desfoque próprio), `glass-stage` (palco), `glass-inner` (poços: campos, listas) e
`glass-raised` (botões secundários).

| Papel | Claro | Noturno | Uso |
|---|---|---|---|
| fundo / painéis | `#AB8E76` + vidro creme | `#060606` + vidro preto (`rgb(19 19 19 / 76%)`) | base, palco, cartões |
| texto | `#25201E` | `#F4F0E8` | texto principal (16:1 no preto) |
| texto de apoio | `#423731` | `#ACA69D` | rótulos, descrições (≥ 7:1 no vidro) |
| ação principal | `#261E1B` | `#F1ECE2` | botões escuros/marfim |
| foco | `#194B48` | `#D6B878` (dourado) | anel de foco do teclado |
| status bom / atenção / risco | `#09644F` / `#7A4F00` / `#A43C27` | `#75DAC0` / `#F1BE58` / `#FF9177` | semáforo, variações, atrasos (sempre com ícone e texto) |
| dourado (marca) | `#6B5016` (texto) · `#8A6A28` (marcas) | `#D6B878` | hábitos, progresso, destaques |
| Entradas / Saídas | `#2F6DB8` / `#B9532F` | `#5B94DD` / `#DD7A50` | séries dos gráficos |
| Saídas: fixas / dia a dia | `#8F3F22` / `#C9623A` | `#B85A35` / `#E89A74` | colunas empilhadas |
| contas 1–4 / outras | `#2F6DB8` `#B9532F` `#6A4CE2` `#9A7428` / `#8A7F76` | `#5B94DD` `#DD7A50` `#9887EF` `#BD923F` / `#8C8078` | identidade das contas (barra de divisão do saldo); terracota e dourado nunca vizinhos |

Como os painéis são translúcidos, o contraste foi **medido nos pixels reais** das capturas (não só no
papel): no tema claro o vidro é um pouco mais opaco que o da referência para os textos de status
passarem de 4,5:1 mesmo sobre a foto mais escura (montanhas). As séries dos gráficos passaram no
validador de paleta (faixa de luminosidade, croma, separação para daltonismo, contraste) nos dois temas.

Regra: **texto não usa cor de série.** Valores e rótulos ficam nos tons de texto; a cor fica na
marca ao lado (linha, quadradinho). Exceção: "dinheiro que entra" (`text-money-in`, = status bom).

## Tipografia

- **Manrope** (variável, via `next/font`) em tudo: interface, títulos e números.
- Títulos de página: 780–800, tracking bem negativo (`-0.06em`). A classe `font-display` ainda existe
  e vira Manrope pesada (compatibilidade com telas antigas).
- Números grandes (saldo, indicadores) usam algarismos **proporcionais**; `tabular-nums` só em colunas
  e eixos, onde os números precisam alinhar.
- Etiqueta de setor: `eyebrow` (pequena, maiúscula, espaçada, tom de apoio).

## Gráficos

Feitos à mão em SVG/HTML (`components/viz/`), seguindo o guia de visualização:

- **A forma vem do trabalho:** tendência → linhas (`FlowChart`); composição ao longo do tempo →
  colunas empilhadas (`SpendStack`); partes de um todo para comparar → barras ordenadas
  (`CategoryBars`); um número → indicador (`Metric`); uma razão contra limites → medidor (`HealthSummary`);
  como um todo se divide, com nome e valor de cada parte logo abaixo → barra fina segmentada, sem texto,
  com o quadradinho da cor ao lado de cada nome (Contas). Sem rosca/pizza.
- Linhas de 2px, colunas de até 24px com ponta arredondada de 4px e 2px de respiro entre partes,
  marcadores com anel da superfície, grade em linhas finas e **contínuas** (nunca tracejadas).
- Legenda sempre que houver 2+ séries; dica ao passar o mouse **e** ao focar pelo teclado; todo gráfico
  tem "Ver como tabela".
- Eixo com marcas redondas, por extenso abaixo de 10 mil reais (`lib/viz.ts`, testado).

## Movimento

- **CSS** (de graça, desde a primeira pintura): painéis entram em cascata (`stagger`), barras crescem
  (`animate-grow-y/x`), linhas se revelam (`animate-reveal-x`), a dica da busca "digita" (`animate-type-in`).
- **GSAP** (`@gsap/react`): números que contam até o valor (`Count`) e deslizam do valor antigo para
  o novo ao trocar o mês; as linhas do gráfico mudam de forma em vez de pular.
- Tudo respeita "reduzir movimento".

## Peças reutilizáveis

| Peça | Onde | Para quê |
|---|---|---|
| `Panel` | `components/app/panel.tsx` | painel de vidro com título, subtítulo e ação |
| `PageHeader` | `components/app/page-header.tsx` | etiqueta + título grande + descrição + ações |
| `SectorCard` | `components/app/sector-card.tsx` | setor do Início (ícone, título, "Abrir") |
| `Metric` / `Delta` | `components/viz/metric.tsx` | indicador com variação "vs mês anterior" (`highlight` = dourado) |
| `Count` | `components/viz/count.tsx` | número animado com GSAP |
| `FlowChart` / `SpendStack` / `HabitWeek` | `components/viz/` | gráficos interativos |
| `ActivityTable` | `components/transactions/activity-table.tsx` | últimas movimentações com busca e filtro |
| `MonthSwitcher` | `components/month-switcher.tsx` | pílula de período (?mes=) |
| `TaskCard` | `components/routine/task-card.tsx` | cartão do quadro de tarefas (raias por prazo) |
| `TodayAllowance` | `components/health/today-allowance.tsx` | "Hoje você ainda pode gastar" (dourado, o destaque do Início) |
| `ReservePanel` | `components/accounts/reserve-panel.tsx` | reserva em meses, com medidor de 0 a 6 e marca em 3 |
| `SubscriptionsCard` | `components/recurrences/subscriptions-card.tsx` | assinaturas: total por mês e por ano, próxima renovação |
| `HabitYearMap` | `components/routine/habit-year.tsx` | mapa do ano dos hábitos (setas do teclado + tabela) |
| `Money` / `MoneyText` | `components/app/money.tsx` | marcam valores em reais para o "ocultar valores" |
| `CardDialog` / `PayInvoiceDialog` | `components/cards/` | novo/editar cartão; pagar fatura (toda, parte ou adiantada) |
| `BudgetCard` / `BudgetDialog` | `components/budget/` | orçamento do mês por categoria; definir, trocar ou tirar um limite |
| `Card`, `Button`, `Input`, `Dialog`, `Badge` | `components/ui/` | base shadcn (Base UI) já no estilo vidro |

## Ocultar valores

O olho da barra do topo liga um modo que **embaça todo valor em reais** (para abrir o app em público).
A preferência fica no navegador (vale para aquele aparelho) e um script no `<head>` aplica o modo
antes da primeira pintura, então os números nunca aparecem por um instante.

Regra para telas novas: **todo valor em reais precisa estar marcado.**
- `Count` com formato `brl` já se marca sozinho.
- Valor solto no JSX: `<Money>{formatBRL(v)}</Money>`.
- Frase com valor no meio: `<MoneyText>{frase}</MoneyText>` (só os valores somem).
- Rótulos de eixo e dicas dos gráficos: classe `money`.
- `Metric` (rodapé) e "Ver como tabela" já passam o texto pelo `MoneyText`.

Leitores de tela continuam lendo os valores. Texto livre escrito pela pessoa (notas) não é escondido.

## Mapa do ano (hábitos)

Escala de **um só tom** (o dourado dos hábitos, `--series-habit`), em 5 passos: nada feito (trilho),
até 1/3, até 2/3, quase tudo e tudo. Dia sem hábito previsto = só o contorno. O tamanho do
quadradinho acompanha a largura do painel (11 a 18 px); no celular o mapa rola por dentro e abre
nas semanas mais recentes. Legenda "Menos → Mais", leitura do dia ao passar o mouse ou pelas setas
(aviso para leitores de tela) e "Ver como tabela" por mês.

## Cartões e orçamento

- **Fatura**: o número em destaque é o que falta pagar (ou o total, se ainda aberta). A situação vem sempre com
  ícone + texto: aberta (relógio), fechada (cadeado, tom de atenção), vencida (alerta, tom de risco), paga (check, tom bom).
- **Limite do cartão**: medidor dourado (o mesmo de "progresso"), com usado, livre e "contando as parcelas futuras".
- **Faturas mês a mês**: faixa de botões que rola por dentro no celular; a selecionada usa a pílula marfim (`bg-pick`).
- **Orçamento**: a barra é o gasto (na cor das Saídas, até o limite); o **traço fino** em cada linha é o ritmo de
  hoje (fração do mês que já passou). Em "Para onde foi o dinheiro", o traço é o **limite** da categoria e a escala
  vai até o maior entre gasto e limite.
- A barra **nunca muda de cor** por estar acima do limite: o vermelho de risco e a cor das Saídas são quase o mesmo
  tom no tema claro. Quem diz "passou" é o texto com ícone logo abaixo.

## Celular e app instalável

O KAIROS é pensado para o celular primeiro (vai ser usado como aplicativo, instalado na tela inicial).

- **Instalar:** `app/manifest.ts` (+ `lib/app-manifest.ts`, testado) com nome, ícones em `public/icons/`
  (normais e "adaptáveis" para o Android recortar), tela cheia (`standalone`), cor da abertura `#0c0b0c` e atalhos
  (Registrar, Meu mês, Cartões, Hábitos). O manifesto e os ícones ficam fora do login (`src/proxy.ts`).
- **Convite:** `components/shell/install-hint.tsx` no Início, só no toque e fora do app instalado. Android: botão
  "Instalar"; iPhone: o caminho pelo Compartilhar. "Agora não" fica salvo no aparelho.
- **Bordas do aparelho:** `viewport-fit=cover` + `env(safe-area-inset-*)` no topo (entalhe), na doca e nas folhas.
  No iPhone instalado, a barra de status fica sobre a cena (`black-translucent`).
- **Toque (`pointer: coarse`):** todo controle tem área de toque de 44 px ou mais. Os botões pequenos crescem um
  pouco e ganham um `::after` invisível; links e textos clicáveis usam a classe `touch-hit`. No mouse nada muda.
- **Texto:** nada abaixo de 11 px no celular (`text-[0.6875rem] sm:text-[0.625rem]`). Campos com 16 px, senão o
  iPhone dá zoom ao tocar.
- **Formulários:** no celular abrem como **folha de baixo** (alcance do polegar); a partir de 640 px, janela no
  centro. A busca/registro fica presa no **topo** (o teclado ocupa a parte de baixo).
- **Doca do celular:** módulos + o **"+"** no meio, que lança gasto, receita ou compra no cartão de qualquer tela
  (`components/shell/quick-add.tsx`). Por isso o "+ Novo" do topo some no celular.
- **Abas do módulo:** todas visíveis numa linha (ícone + nome curto; "Transações" vira "Extrato").
- **Sem internet:** `experimental.useOffline` + `components/shell/offline-banner.tsx`: aviso no topo e o Next repete
  sozinho a navegação e os registros quando a conexão volta.

- **Respiro no celular:** abaixo de 640 px, dentro do palco, `gap-3` vira 16 px, `gap-4` 20 px e `gap-5` 24 px (regra em
  `globals.css`); painéis e linhas de lista ficam um pouco mais altos. No computador nada muda.
- **Notificações:** `public/sw.js` (mostra o aviso e abre o app no lugar certo), `components/routine/push-toggle.tsx`
  (ativar/desativar/testar por aparelho, com o texto de cada situação: bloqueado, sem suporte, iPhone sem instalar) e
  o ícone da barra de status `public/icons/badge-96.png` (silhueta branca).

Conferir no celular: `shots/mobile-audit.mjs` (scratchpad) mede alvos de toque, textos, zoom e rolagem em todas as telas.

## Padrões de página

- Raiz: `grid grid-cols-1 gap-5`. **Sempre `grid-cols-1`** nas grades que empilham (evita que textos
  longos alarguem a coluna no celular).
- Grupos de painéis com `stagger` para a entrada em cascata.
- Cada página tem o seu `loading.tsx`.
- A doca de baixo é fixa: o palco tem folga embaixo para ela não cobrir o fim da página.

## Como conferir o visual

Medir contraste sobre os pixels reais do vidro (texto ≥ 4,5:1; ícones e gráficos ≥ 3:1). Conferir
nos dois temas e em 360, 390, 768, 1024 e 1440 px. Regra de ouro: **nada pode gerar rolagem horizontal**.
