import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // sourcemap: true,
  },
  resolve: {
    alias: {
      "node-fetch": "isomorphic-fetch",
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
