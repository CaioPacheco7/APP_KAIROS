import { ShieldCheckIcon } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { Hourglass } from "@/components/brand/hourglass";
import { iconButtonClass } from "@/components/shell/styles";
import { GoogleButton } from "./google-button";

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  if (!erro) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-[14px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
    >
      <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      Não foi possível entrar. Esta conta não tem acesso ao KAIROS.
    </p>
  );
}

export default function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      {/* Cena: a mesma foto e o mesmo filtro quente do app */}
      <Image
        src="/photos/login-montanhas.jpg"
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="-z-20 object-cover [filter:sepia(.22)_saturate(.78)_brightness(.9)] dark:[filter:grayscale(1)_brightness(.5)_contrast(1.05)]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(30_20_14/72%),rgb(30_20_14/38%)_45%,transparent_80%),linear-gradient(0deg,rgb(30_20_14/45%),transparent_55%)] dark:bg-[linear-gradient(100deg,rgb(0_0_0/78%),rgb(0_0_0/45%)_45%,rgb(0_0_0/20%)_80%),linear-gradient(0deg,rgb(0_0_0/55%),transparent_55%)]" />
      <Hourglass className="pointer-events-none absolute bottom-8 left-[38%] -z-10 hidden h-[26rem] text-white opacity-[0.06] lg:block" />

      <div className="mx-auto grid min-h-screen w-full max-w-[1380px] content-center gap-8 px-4 py-8 md:w-[calc(100%-74px)] md:px-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,440px)] lg:items-center lg:gap-14">
        {/* Promessa da marca, sobre a foto */}
        <section className="text-white">
          <BrandMark size={40} nameClassName="text-white" />
          <blockquote className="mt-10 hidden max-w-xl lg:block">
            <p className="text-[clamp(2.4rem,4.2vw,3.6rem)] leading-[1.04] font-extrabold tracking-[-0.055em]">
              O momento certo para cuidar do seu <span className="text-[#f0d9a6]">dinheiro</span>, do seu{" "}
              <span className="text-[#f0d9a6]">tempo</span> e da sua <span className="text-[#f0d9a6]">rotina</span>.
            </p>
            <footer className="mt-6 text-sm font-semibold text-white/75">Kairos, do grego: o instante oportuno.</footer>
          </blockquote>
        </section>

        {/* Acesso, no vidro */}
        <section className="glass-stage relative rounded-[28px] p-6 sm:p-9">
          <div className="absolute top-4 right-4">
            <ThemeToggle className={iconButtonClass} />
          </div>
          <div className="grid gap-7">
            <div>
              <p className="eyebrow mb-3">Bem-vindo</p>
              <h1 className="text-[clamp(2.1rem,4vw,2.9rem)] leading-[1.03] font-extrabold tracking-[-0.06em]">
                Entre no seu <span className="text-gold">KAIROS</span>
              </h1>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-muted-foreground">
                Entenda onde você está, organize o que importa e decida para onde quer ir.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <GoogleButton />
              <Suspense>
                <LoginError searchParams={searchParams} />
              </Suspense>
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              Acesso restrito a contas autorizadas. Seus dados ficam protegidos e só você os enxerga.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
