/**
 * Ampulheta da marca, desenhada em traço. Serve de marca d'água discreta nos
 * cartões de destaque (use com opacidade baixa e `text-*` para a cor).
 */
export function Hourglass({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 170"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M16 10h88M16 160h88" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M26 10c0 40 28 55 36 75-8 20-36 35-36 75M94 10c0 40-28 55-36 75 8 20 36 35 36 75"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* areia: topo escorrendo e montinho embaixo */}
      <path d="M46 34h28c-3 14-10 20-14 28-4-8-11-14-14-28z" fill="currentColor" opacity=".35" />
      <path d="M40 148c6-14 14-22 20-22s14 8 20 22z" fill="currentColor" opacity=".45" />
      <path d="M60 62v64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}
