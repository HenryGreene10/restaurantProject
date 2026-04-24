import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  const tenantDomainSuffix =
    env.VITE_TENANT_DOMAIN_SUFFIX ?? env.TENANT_DOMAIN_SUFFIX ?? ""

  return {
    define: {
      "import.meta.env.VITE_TENANT_DOMAIN_SUFFIX": JSON.stringify(tenantDomainSuffix),
    },
    server: {
      port: 5175,
      host: "127.0.0.1",
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
