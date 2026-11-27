import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/app/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** Manrope (variável): toda a interface, títulos e números. */
const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAIROS",
  description:
    "Finanças, rotina e objetivos em um só lugar. Entenda onde você está e decida para onde quer ir.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ab8e76" },
    { media: "(prefers-color-scheme: dark)", color: "#060606" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          {/* no celular, os avisos ficam acima da doca fixa */}
          <Toaster position="bottom-right" mobileOffset={{ bottom: 92 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
