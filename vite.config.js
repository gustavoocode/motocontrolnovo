import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/MotoControl/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "MotoControl",
        short_name: "MotoControl",
        lang: "pt-BR",
        display: "standalone",
        start_url: "./",
        background_color: "#121315",
        theme_color: "#121315",
      },
    }),
  ],
});
