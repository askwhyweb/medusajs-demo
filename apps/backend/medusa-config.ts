import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseName: process.env.DB_NAME,
    databaseDriverOptions: {
      connection: {
        ssl: false,
      },
      ssl: false,
      sslmode: "disable",
    },
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.WORKER_MODE as
      | "shared"
      | "worker"
      | "server"
      | undefined) || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    cookieOptions: {
      sameSite: "lax",
      secure: false,
    },
  },
  modules: [
    {
      resolve: "./src/modules/store-settings",
    },
    {
      // Local file storage for admin uploads (product images, etc.). The provider
      // writes to `<cwd>/static`, which the framework also serves at `/static`.
      // scripts/backend-start.mjs symlinks that directory onto the persistent
      // `runtime-data` volume so uploaded images survive container rebuilds.
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: `${
                process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
              }/static`,
            },
          },
        ],
      },
    },
  ],
  admin: {
    path: "/app",
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    storefrontUrl:
      process.env.MEDUSA_STOREFRONT_URL || "http://localhost:8000",
    vite: () => ({
      server: {
        host: "0.0.0.0",
        allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
        hmr: {
          port: 5173,
          clientPort: 5173,
        },
      },
    }),
  },
})
