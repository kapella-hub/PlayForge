import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlayForge — Interactive Football Playbook",
    short_name: "PlayForge",
    description: "Build, animate, and share football plays.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a14",
    theme_color: "#6366f1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
