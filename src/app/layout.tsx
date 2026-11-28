import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/app/theme-provider";
import { OfflineBanner } from "@/components/shell/offline-banner";
import { ServiceWorkerRegister } from "@/components/shell/sw-register";
import { Toaster } from "@/components/ui/sonner";
import { privacyBootScript } from "@/lib/privacy";
import "./globals.css";

/** Manrope (variável): toda a interface, títulos e números. */
const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAIROS",
  applicationName: "KAIROS",
  description:
    "Finanças, rotina e objetivos em um só lugar. Entenda onde você está e decida para onde quer ir.",
  // instalado na tela inicial do iPhone: abre em tela cheia, com a barra de status sobre a cena
  appleWebApp: { capable: true, title: "KAIROS", statusBarStyle: "black-translucent" },
  // valores como "3.200,00" não podem virar link de telefone no iPhone
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ab8e76" },
    { media: "(prefers-color-scheme: dark)", color: "#060606" },
  ],
  // ocupa a tela toda (entalhe e barra de gestos ficam por conta do env(safe-area-inset-*))
  viewportFit: "cover",
  // Android: com o teclado aberto a tela encolhe, então o formulário fica acima dele
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} h-full antialiased`}>
      <head>
        {/* "ocultar valores" salvo neste aparelho, aplicado antes da primeira pintura */}
        <script dangerouslySetInnerHTML={{ __html: privacyBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <OfflineBanner />
          <ServiceWorkerRegister />
          {children}
          {/* no celular, os avisos ficam acima da doca fixa */}
          <Toaster position="bottom-right" mobileOffset={{ bottom: 92 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
