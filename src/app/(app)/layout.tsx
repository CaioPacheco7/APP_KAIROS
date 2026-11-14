import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { NewTransaction } from "@/components/app/new-transaction";
import { FinanceOnly, FinanceSubNav, TopNav } from "@/components/app/top-nav";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="KAIROS, ir para o início"
          >
            <Image src="/brand/icone-card.png" alt="" width={32} height={32} />
            <span className="hidden text-sm font-semibold tracking-[0.25em] sm:inline">
              KAIROS
            </span>
          </Link>

          <div className="order-last w-full md:order-none md:w-auto">
            <TopNav />
          </div>

          <div className="flex items-center gap-2">
            <FinanceOnly>
              <Suspense
                fallback={
                  <Button size="sm" disabled>
                    Novo
                  </Button>
                }
              >
                <NewTransaction />
              </Suspense>
            </FinanceOnly>
            <form action="/auth/sair" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>

          <FinanceSubNav />
        </div>
      </header>

      {/* Cada página tem o seu loading.tsx (carregamento instantâneo na navegação) */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
