import { defineConfig } from "vite";

// Browser tests exercise the exact built client bundle without booting the
// slower Cloudflare worker runtime. The worker is smoke-tested after build.
export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  preview: {
    host: "127.0.0.1",
    strictPort: true,
  },
});
