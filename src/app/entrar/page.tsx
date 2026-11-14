import { ShieldCheckIcon } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { Hourglass } from "@/components/brand/hourglass";
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
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Foto e promessa da marca */}
      <section className="relative isolate h-60 overflow-hidden lg:h-auto">
        <Image
          src="/photos/login-montanhas.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 57vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/35" />
        <Hourglass className="pointer-events-none absolute -right-10 bottom-6 hidden h-[26rem] text-white opacity-[0.07] lg:block" />

        <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-10 lg:p-14">
          <BrandMark size={40} nameClassName="text-white" />
          <blockquote className="hidden max-w-xl lg:block">
            <p className="font-display text-5xl leading-[1.06] tracking-tight xl:text-6xl">
              O momento certo para cuidar do seu <em className="text-[#e6cc90]">dinheiro</em>, do seu{" "}
              <em className="text-[#e6cc90]">tempo</em> e da sua <em className="text-[#e6cc90]">rotina</em>.
            </p>
            <footer className="mt-6 text-sm text-white/70">
              Kairos, do grego: o instante oportuno.
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Acesso */}
      <section className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="mx-auto grid w-full max-w-sm gap-8">
          <div>
            <p className="eyebrow mb-4">Bem-vindo</p>
            <h1 className="font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl">
              Entre no seu <em className="text-gold">KAIROS</em>
            </h1>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
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
    </main>
  );
}
