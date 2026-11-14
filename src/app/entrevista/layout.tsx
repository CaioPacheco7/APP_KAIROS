import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";

export const metadata = { title: "Bem-vindo · KAIROS" };

const POINTS = [
  "Poucas perguntas, cerca de 2 minutos",
  "Seu mês montado, com contas fixas e vencimentos",
  "Um semáforo que avisa se o mês está saudável",
];

export default function EntrevistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Foto + o que você ganha */}
      <aside className="relative isolate hidden overflow-hidden lg:block">
        <Image
          src="/photos/entrevista-mesa.jpg"
          alt=""
          fill
          priority
          sizes="42vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <BrandMark size={38} nameClassName="text-white" />
          <div>
            <p className="font-display text-5xl leading-[1.06] tracking-tight">
              Vamos montar o <em className="text-[#e6cc90]">seu mês</em>.
            </p>
            <ul className="mt-8 grid gap-3.5 text-sm text-white/85">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                    <CheckIcon className="size-3.5" aria-hidden />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="relative flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-xl">{children}</div>
      </section>
    </main>
  );
}
