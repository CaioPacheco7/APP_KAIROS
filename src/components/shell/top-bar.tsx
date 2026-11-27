import { BellIcon, LogOutIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NewTransaction } from "@/components/app/new-transaction";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/navigation";
import { getNotices } from "@/server/notices";
import { getFormOptions } from "@/server/queries";
import { AskBar, AskButton } from "./ask-bar";
import { TodayLabel } from "./client-bits";
import { FinanceOnly } from "./finance-only";
import { NoticesButton } from "./notices-button";
import { PrivacyToggle } from "./privacy-toggle";
import { iconButtonClass } from "./styles";

async function AskLoader() {
  await connection();
  const { accounts, today } = await getFormOptions();
  return <AskBar accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} today={today} />;
}

async function NoticesLoader() {
  await connection();
  const { today } = await getFormOptions();
  return <NoticesButton items={await getNotices(today)} />;
}

/** Barra do topo em vidro: marca, busca/registro rápido e ações. */
export function TopBar() {
  return (
    <header className="glass-rail z-40 grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[21px] px-[9px] py-[7px] md:sticky md:top-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,400px)_minmax(0,1fr)] md:rounded-full md:py-1.5 md:pr-[9px] md:pl-[13px]">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-full pl-[3px] outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
      >
        <Image
          src="/brand/icone-card.png"
          alt=""
          width={35}
          height={35}
          loading="eager"
          className="shrink-0 drop-shadow-[0_2px_7px_rgb(var(--glass-shadow)/22%)]"
        />
        {/* em telas bem estreitas fica só o logo (o nome continua para leitores de tela) */}
        <span className="min-w-0 max-[400px]:sr-only">
          <strong className="block truncate text-[0.75rem] leading-[1.1] font-extrabold tracking-[0.17em]">
            KAIROS<span className="sr-only">, ir para o início</span>
          </strong>
          <small className="mt-[3px] block truncate text-[0.625rem] text-muted-foreground">
            <TodayLabel />
          </small>
        </span>
      </Link>

      <div className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
        <Suspense fallback={<AskButton hint={MODULES[0].hint} disabled />}>
          <AskLoader />
        </Suspense>
      </div>

      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 md:col-start-3">
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
        <PrivacyToggle className={iconButtonClass} />
        <ThemeToggle className={iconButtonClass} />
        <Suspense
          fallback={
            <span className={iconButtonClass} aria-hidden>
              <BellIcon />
            </span>
          }
        >
          <NoticesLoader />
        </Suspense>
        <form action="/auth/sair" method="post">
          <button type="submit" aria-label="Sair" title="Sair" className={iconButtonClass}>
            <LogOutIcon aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
