"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SCENES, sceneFor, type SceneId } from "@/lib/navigation";

type Layer = { scene: SceneId; loaded: boolean };

/** Quanto dura a troca de cena (o mesmo valor do `duration-700` abaixo). */
const FADE_MS = 700;

/**
 * Foto de fundo fixa, uma por módulo, com o filtro quente do vidro.
 * Ao trocar de módulo, a cena nova entra por cima da anterior quando termina
 * de carregar (sem piscar a cor de fundo) e a antiga sai em seguida.
 */
export function Scenery() {
  const scene = sceneFor(usePathname());
  // A primeira cena aparece direto (o navegador pinta conforme carrega);
  // só as trocas seguintes usam o esmaecimento.
  const [layers, setLayers] = useState<Layer[]>([{ scene, loaded: true }]);

  // Ajuste de estado durante a renderização (padrão do React para "derivar de
  // uma prop que mudou"): a cena nova vai para o topo da pilha.
  if (layers[layers.length - 1].scene !== scene) {
    const existing = layers.find((l) => l.scene === scene);
    setLayers([...layers.filter((l) => l.scene !== scene), existing ?? { scene, loaded: false }]);
  }

  // Quando a cena do topo já está visível, as de baixo podem sair.
  const top = layers[layers.length - 1];
  useEffect(() => {
    if (!top.loaded || layers.length === 1) return;
    const timer = window.setTimeout(() => setLayers((current) => current.slice(-1)), FADE_MS + 100);
    return () => window.clearTimeout(timer);
  }, [top.loaded, layers.length]);

  const markLoaded = (id: SceneId) =>
    setLayers((current) => current.map((l) => (l.scene === id ? { ...l, loaded: true } : l)));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-(--glass-base)">
      {layers.map((layer, index) => (
        <Image
          key={layer.scene}
          src={SCENES[layer.scene].src}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority={index === 0 ? "high" : "auto"}
          onLoad={() => markLoaded(layer.scene)}
          className="object-cover transition-opacity duration-700 ease-out [filter:sepia(.22)_saturate(.78)_brightness(var(--bright-light))] dark:[filter:grayscale(1)_brightness(var(--bright-dark))_contrast(1.05)]"
          style={
            {
              objectPosition: SCENES[layer.scene].position,
              opacity: layer.loaded ? 1 : 0,
              "--bright-light": SCENES[layer.scene].bright.light,
              "--bright-dark": SCENES[layer.scene].bright.dark,
            } as React.CSSProperties
          }
        />
      ))}
      {/* véu: quente no claro; preto neutro no noturno (o noturno é preto de verdade) */}
      <div className="absolute inset-0 bg-[linear-gradient(116deg,rgb(73_48_37/35%),transparent_43%,rgb(162_101_63/24%)_76%,transparent_100%),linear-gradient(0deg,rgb(53_33_25/34%),transparent_58%)] dark:bg-[linear-gradient(116deg,rgb(0_0_0/55%),rgb(0_0_0/25%)_45%,rgb(0_0_0/50%)_100%),linear-gradient(0deg,rgb(0_0_0/55%),transparent_60%)]" />
    </div>
  );
}
