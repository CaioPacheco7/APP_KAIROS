import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { iconButtonClass } from "@/components/shell/styles";

export const metadata = { title: "Bem-vindo · KAIROS" };

const POINTS = [
  "Poucas perguntas, cerca de 2 minutos",
  "Seu mês montado, com contas fixas e vencimentos",
  "Um semáforo que avisa se o mês está saudável",
];

export default function EntrevistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      {/* Cena de Finanças, com o filtro quente do app */}
      <Image
        src="/photos/login-montanhas.jpg"
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="-z-20 object-cover [filter:sepia(.22)_saturate(.78)_brightness(1)] dark:[filter:sepia(.15)_saturate(.75)_brightness(.62)]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(30_20_14/70%),rgb(30_20_14/34%)_42%,transparent_78%)]" />

      <div className="mx-auto grid min-h-screen w-full max-w-[1380px] content-center gap-8 px-3 py-6 md:w-[calc(100%-74px)] md:px-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        {/* O que você ganha */}
        <aside className="hidden text-white lg:block">
          <BrandMark size={38} nameClassName="text-white" />
          <p className="mt-10 text-[clamp(2.4rem,3.8vw,3.4rem)] leading-[1.04] font-extrabold tracking-[-0.055em]">
            Vamos montar o <span className="text-[#f0d9a6]">seu mês</span>.
          </p>
          <ul className="mt-8 grid gap-3.5 text-sm font-semibold text-white/85">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <CheckIcon className="size-3.5" aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </aside>

        <section className="glass-stage relative rounded-[28px] px-5 py-10 sm:px-10">
          <div className="absolute top-4 right-4">
            <ThemeToggle className={iconButtonClass} />
          </div>
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
