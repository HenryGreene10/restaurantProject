import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  const tenantDomainSuffix =
    env.VITE_TENANT_DOMAIN_SUFFIX ?? env.TENANT_DOMAIN_SUFFIX ?? ""

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_TENANT_DOMAIN_SUFFIX": JSON.stringify(tenantDomainSuffix),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  }
})
