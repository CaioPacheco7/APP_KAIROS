import type { MetadataRoute } from "next";
import { appManifest } from "@/lib/app-manifest";

/** /manifest.webmanifest: instalar o KAIROS na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return appManifest();
}
