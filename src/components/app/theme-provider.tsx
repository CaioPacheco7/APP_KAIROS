"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Tema claro/noturno. Segue o sistema por padrão; a escolha da pessoa fica
 * guardada neste navegador (localStorage).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
