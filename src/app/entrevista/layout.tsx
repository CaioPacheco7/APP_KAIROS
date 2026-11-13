export const metadata = { title: "Bem-vindo · KAIROS" };

export default function EntrevistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
