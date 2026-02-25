import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable sourcemaps in production (saves 2MB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "clsx"],
          "vendor-state": ["zustand"],
          "vendor-graph": ["reactflow", "dagre"],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit for vendor chunks
    minify: "esbuild", // Use esbuild (faster, no extra dependency)
  },
});
