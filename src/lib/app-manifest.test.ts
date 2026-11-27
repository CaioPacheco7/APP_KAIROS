import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "./navigation";
import { appManifest, installMode } from "./app-manifest";

describe("manifesto do app instalável", () => {
  const m = appManifest();

  it("tem o mínimo que os celulares pedem para instalar", () => {
    expect(m.name).toBe("KAIROS");
    expect(m.short_name?.length).toBeLessThanOrEqual(12);
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const sizes = (m.icons ?? []).filter((i) => i.purpose !== "maskable").map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect((m.icons ?? []).some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
  });

  it("os ícones existem em public/", () => {
    for (const icon of m.icons ?? []) {
      expect(fs.existsSync(path.join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("cada atalho leva a uma tela que existe", () => {
    const known = new Set(DESTINATIONS.map((d) => d.href));
    for (const s of m.shortcuts ?? []) expect(known.has(s.url)).toBe(true);
  });
});

describe("convite para instalar", () => {
  const base = { standalone: false, touch: true, dismissed: false, canPrompt: false };
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
  const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

  it("iPhone: explica o menu Compartilhar", () => {
    expect(installMode({ ...base, userAgent: IPHONE })).toBe("ios");
  });
  it("Android com o navegador oferecendo: botão Instalar", () => {
    expect(installMode({ ...base, canPrompt: true, userAgent: ANDROID })).toBe("prompt");
  });
  it("não aparece no app instalado, no computador, ou depois de dispensado", () => {
    expect(installMode({ ...base, standalone: true, userAgent: IPHONE })).toBe("hidden");
    expect(installMode({ ...base, touch: false, canPrompt: true, userAgent: DESKTOP })).toBe("hidden");
    expect(installMode({ ...base, dismissed: true, userAgent: IPHONE })).toBe("hidden");
    expect(installMode({ ...base, userAgent: ANDROID })).toBe("hidden");
  });
});
