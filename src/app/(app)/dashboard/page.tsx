import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

async function UserEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  return <p className="text-sm text-muted-foreground">{email}</p>;
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Suspense fallback={<p className="h-5" />}>
            <UserEmail />
          </Suspense>
        </div>
        <form action="/auth/sair" method="post">
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </header>

      <p className="text-muted-foreground">
        Login funcionando. Os painéis financeiros entram aqui na Fase 1.
      </p>
    </main>
  );
}
