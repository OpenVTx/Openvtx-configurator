import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

let base = "/";

if (process.env.DEPLOYMENT === "gh-pages-nigthly") {
  base = "/nightly/";
}

// https://vitejs.dev/config/
export default defineConfig({
  base: base,
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
