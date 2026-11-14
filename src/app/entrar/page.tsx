import Image from "next/image";
import { Suspense } from "react";
import { GoogleButton } from "./google-button";

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  if (!erro) return null;

  return (
    <p role="alert" className="text-sm text-destructive">
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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <Image
          src="/brand/icone-card.png"
          alt="KAIROS"
          width={96}
          height={96}
          priority
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-[0.25em]">KAIROS</h1>
          <p className="text-sm text-muted-foreground">
            Entenda onde você está, organize o que importa e decida para onde
            quer ir.
          </p>
        </div>

        <div className="w-full space-y-3">
          <GoogleButton />
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
