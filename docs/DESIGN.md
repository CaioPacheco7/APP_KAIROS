# KAIROS · Sistema de design

Guia curto para manter o app consistente. Tudo aqui está implementado em `src/app/globals.css`
(cores e tipografia) e em `src/components/` (peças reutilizáveis).

## Princípios

1. **Premium, mas fácil de captar.** Hierarquia clara: um número ou título em destaque por bloco, o resto em apoio.
2. **Setores reconhecíveis.** Cada área tem identidade própria (foto, ícone e cor de detalhe), para a pessoa saber onde está.
3. **Calmo.** Muito espaço, bordas finas, sombras suaves, movimento discreto (respeita "reduzir movimento").
4. **Nunca só cor.** Status sempre com ícone + texto (semáforo, atrasado, concluído).
5. **Dois temas de verdade.** Claro ("papel") e noturno. Segue o sistema; a escolha fica guardada no navegador.

## Marca

Paleta tirada da logo: preto quente, marfim e **dourado champanhe**. A logo é usada só como o cartão (sem a moldura
preta): `public/brand/icone-card.png`. A **ampulheta** (`components/brand/hourglass.tsx`) é a assinatura, usada como
marca d'água bem discreta em cartões de destaque.

## Cores

Definidas como variáveis CSS (`:root` = claro, `.dark` = noturno) e expostas ao Tailwind. Contrastes medidos (WCAG).

| Papel | Claro | Noturno | Uso |
|---|---|---|---|
| `background` | `#F5F2EC` | `#0B0A09` | fundo da página |
| `card` | `#FFFFFF` | `#141210` | cartões |
| `foreground` | `#17140F` | `#F3EDE3` | texto (18:1 / 16:1) |
| `muted-foreground` | `#6B6357` | `#9D9488` | texto de apoio (≥ 5,3:1) |
| `primary` | `#1B1812` | `#EDE4D3` | ação principal |
| `gold` (texto) / `gold-fill` | `#7C5F1D` / `#B28A3E` | `#D6B878` | realces, progresso, foco |
| `money-in` | `#0B7A37` | `#7FD89B` | dinheiro que entra (texto) |
| status bom / atenção / risco | `#0CA30C` / `#C27A00` / `#D03B3B` | `#0CA30C` / `#FAB219` / `#D03B3B` | semáforo (sempre com ícone e texto) |
| série 1 / série 2 | `#2A78D6` / `#EB6834` | `#3987E5` / `#D95926` | gráficos (validados no validador de paleta) |

Regra: **texto não usa cor de série nem de status** (exceto `money-in`, que tem contraste próprio). Use `text-muted-foreground`.

## Tipografia

- **Geist**: toda a interface.
- **Instrument Serif** (`font-display`): títulos de página, números de destaque (saldo, %, valores) e títulos dos setores.
  Use `tracking-normal` em números (a serifa é estreita) e `tabular-nums` para alinhar valores.
- Etiqueta de setor: classe `eyebrow` (pequena, maiúscula, espaçada, dourada).

## Peças reutilizáveis

| Peça | Onde | Para quê |
|---|---|---|
| `PageHeader` | `components/app/page-header.tsx` | etiqueta + título em serifa + descrição + ações |
| `SectorCard` | `components/app/sector-card.tsx` | setor com foto de capa (Início) |
| `IconChip` | `components/app/icon-chip.tsx` | ícone em quadradinho colorido (tons: gold, sage, rose, sky, ember) |
| `EmptyState` | `components/app/empty-state.tsx` | estado vazio acolhedor com próximo passo |
| `ProgressRing` | `components/app/progress-ring.tsx` | anel de progresso (hábitos do dia) |
| `HealthSummary` / `HealthCard` | `components/health/health-card.tsx` | semáforo com zonas e marcador |
| `TransactionItem` | `components/transactions/transaction-item.tsx` | linha de movimentação com ícone por categoria |
| `Card` | `components/ui/card.tsx` | superfície base (borda fina, brilho no topo, sombra suave) |
| `Button` | `components/ui/button.tsx` | variantes `default`, `gold` (destaque), `outline`, `ghost`… |

## Padrões de página

- Raiz da página: `grid grid-cols-1 gap-8`. **Sempre `grid-cols-1`**: impede que textos longos alarguem a coluna no celular.
- Começa com `PageHeader`. Blocos de conteúdo com a classe `animate-rise` e atraso crescente (`--d`).
- Cada página tem o seu `loading.tsx`.
- Navegação: topo (Início, Finanças, Rotina, Registrar) com indicador deslizante; abas de Finanças logo abaixo; no celular, barra flutuante embaixo.

## Fotos

Em `public/photos/` (Unsplash, licença livre para uso comercial; ver `CREDITS.md`). Sempre com degradê escuro por cima do
texto, para ler bem nos dois temas. Usadas no login, na entrevista, nos setores do Início e no topo de Planejar.

## Como conferir o visual

Contraste: medir antes de adotar uma cor nova (texto ≥ 4,5:1; ícones e gráficos ≥ 3:1). Telas: conferir nos dois temas
e em 360, 390, 768 e 1024 px. Regra de ouro no celular: **nada pode gerar rolagem horizontal**.
