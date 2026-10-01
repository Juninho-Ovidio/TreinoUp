import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TreinoUp",
    short_name: "TreinoUp",
    description: "Treino e dieta: alimentos, macros, água, peso, treinos e progresso.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f5",
    theme_color: "#e8a33d",
    lang: "pt-BR",
    categories: ["health", "fitness", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Adicionar alimento", url: "/alimentos/buscar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Diário", url: "/diario", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
