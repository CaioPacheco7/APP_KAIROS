import { Suspense } from "react";
import { ShellFooter } from "@/components/shell/client-bits";
import { BottomDock, MobileDock, SectionTabs, SideDock } from "@/components/shell/docks";
import { Scenery } from "@/components/shell/scenery";
import { TopBar } from "@/components/shell/top-bar";

/**
 * Casca do app no estilo "vidro": foto de cena ao fundo, barra do topo,
 * palco de vidro com a tela atual, doca lateral (módulos) e doca de baixo
 * (abas do módulo). No celular, uma doca fixa embaixo com os módulos.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Scenery />
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-pick px-4 py-2 text-sm font-bold text-pick-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>

      <div className="mx-auto w-full max-w-[1380px] flex-1 px-3 pt-[11px] pb-[calc(84px+env(safe-area-inset-bottom))] md:w-[calc(100%-74px)] md:px-0 md:pt-6 md:pb-2 lg:w-[calc(100%-100px)]">
        <TopBar />

        <div className="relative mt-[11px]">
          <SideDock />
          <main
            id="conteudo"
            className="glass-stage min-w-0 rounded-[23px] px-[13px] pt-[15px] pb-[17px] md:rounded-[34px] md:px-[clamp(25px,3.2vw,49px)] md:pt-[clamp(19px,2.15vw,35px)] md:pb-24"
          >
            <Suspense fallback={null}>
              <SectionTabs />
            </Suspense>
            {/* Cada página tem o seu loading.tsx (carregamento instantâneo na navegação) */}
            <div className="min-w-0">{children}</div>
          </main>
          <Suspense fallback={null}>
            <BottomDock />
          </Suspense>
        </div>

        <ShellFooter />
      </div>

      <MobileDock />
    </div>
  );
}
