import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NewTransaction } from "@/components/app/new-transaction";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { FinanceOnly, FinanceSubNav, MobileNav, TopNav } from "@/components/app/top-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-(--header-bg) backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="KAIROS, ir para o início"
            className="flex h-16 items-center"
          >
            <BrandMark />
          </Link>

          {/* centro: navegação principal (no celular fica na barra de baixo) */}
          <div className="hidden md:block">
            <TopNav />
          </div>

          <div className="flex items-center gap-1.5">
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
            <ThemeToggle />
            <form action="/auth/sair" method="post">
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                <LogOutIcon />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>

          <FinanceSubNav />
        </div>
      </header>

      {/* Cada página tem o seu loading.tsx (carregamento instantâneo na navegação) */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pt-10 md:pb-14">
        {children}
      </div>

      <MobileNav />
    </div>
  );
}
