import { splitMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Um valor em reais: some no modo "ocultar valores". */
export function Money({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("money", className)}>{children}</span>;
}

/** Texto com valores no meio ("Sobram R$ 50,00 por dia"): só os valores somem no modo "ocultar valores". */
export function MoneyText({ children }: { children: string }) {
  return (
    <>
      {splitMoney(children).map((part, i) =>
        part.money ? (
          <span key={i} className="money">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
