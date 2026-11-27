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
| Barra do topo | `components/shell/top-bar.tsx` | marca + data, busca/registro, "+ Novo" (Finanças), tema, avisos, sair |
| Busca/registro | `components/shell/ask-bar.tsx` | abre com clique, **Ctrl+K** ou **/**; busca telas e registra gastos, tarefas, lembretes e notas (mesmo interpretador do Registrar, sem IA) |
| Avisos | `components/shell/notices-button.tsx` + `server/notices.ts` | sino com ponto coral: tarefas atrasadas/de hoje e contas vencidas ou que vencem em até 3 dias |
| Palco | `app/(app)/layout.tsx` | o painel de vidro grande onde a tela acontece |
| Doca lateral | `components/shell/docks.tsx` | os 4 módulos (computador), só ícones com dica |
| Doca de baixo | idem | abas do módulo atual (Finanças, Rotina); no Início e no Registrar, os módulos |
| Celular | idem | doca fixa embaixo com os módulos; as abas do módulo ficam no topo do palco |

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
| `Card`, `Button`, `Input`, `Dialog`, `Badge` | `components/ui/` | base shadcn (Base UI) já no estilo vidro |

## Padrões de página

- Raiz: `grid grid-cols-1 gap-5`. **Sempre `grid-cols-1`** nas grades que empilham (evita que textos
  longos alarguem a coluna no celular).
- Grupos de painéis com `stagger` para a entrada em cascata.
- Cada página tem o seu `loading.tsx`.
- A doca de baixo é fixa: o palco tem folga embaixo para ela não cobrir o fim da página.

## Como conferir o visual

Medir contraste sobre os pixels reais do vidro (texto ≥ 4,5:1; ícones e gráficos ≥ 3:1). Conferir
nos dois temas e em 360, 390, 768, 1024 e 1440 px. Regra de ouro: **nada pode gerar rolagem horizontal**.
