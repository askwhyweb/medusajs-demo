import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const repoRoot = "/srv"
const backendDir = path.join(repoRoot, "apps/backend")
const backendBuildDir = path.join(backendDir, ".medusa/server")
const runtimeDir = process.env.RUNTIME_DIR ?? "/runtime"

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function writeBackendEnv() {
  const backendEnvPath = path.join(backendDir, ".env")
  const envLines = [
    `DATABASE_URL=${requireEnv(
      "DATABASE_URL",
      "postgres://medusa:medusa@postgres:5432/medusa_demo"
    )}`,
    `DB_NAME=${requireEnv("DB_NAME", "medusa_demo")}`,
    `REDIS_URL=${requireEnv("REDIS_URL", "redis://redis:6379")}`,
    `STORE_CORS=${requireEnv(
      "STORE_CORS",
      "http://localhost:8000,http://127.0.0.1:8000"
    )}`,
    `ADMIN_CORS=${requireEnv(
      "ADMIN_CORS",
      "http://localhost:9000,http://127.0.0.1:9000"
    )}`,
    `AUTH_CORS=${requireEnv(
      "AUTH_CORS",
      "http://localhost:8000,http://127.0.0.1:8000,http://localhost:9000,http://127.0.0.1:9000"
    )}`,
    `JWT_SECRET=${requireEnv("JWT_SECRET", "change-me")}`,
    `COOKIE_SECRET=${requireEnv("COOKIE_SECRET", "change-me")}`,
    `MEDUSA_BACKEND_URL=${requireEnv(
      "MEDUSA_BACKEND_URL",
      "http://localhost:9000"
    )}`,
    `MEDUSA_STOREFRONT_URL=${requireEnv(
      "MEDUSA_STOREFRONT_URL",
      "http://localhost:8000"
    )}`,
    `MEDUSA_INTERNAL_BACKEND_URL=${requireEnv(
      "MEDUSA_INTERNAL_BACKEND_URL",
      "http://backend:9000"
    )}`,
    `MEDUSA_INTERNAL_STOREFRONT_URL=${requireEnv(
      "MEDUSA_INTERNAL_STOREFRONT_URL",
      "http://storefront:8000"
    )}`,
    `WORKER_MODE=${requireEnv("WORKER_MODE", "shared")}`,
    `ADMIN_EMAIL=${requireEnv("ADMIN_EMAIL", "admin@medusa.local")}`,
    `ADMIN_PASSWORD=${requireEnv("ADMIN_PASSWORD", "MedusaDemo123!")}`,
    `RUNTIME_DIR=${runtimeDir}`,
  ]

  fs.mkdirSync(path.dirname(backendEnvPath), { recursive: true })
  fs.writeFileSync(backendEnvPath, `${envLines.join("\n")}\n`, "utf8")
}

function writeProductionEnv() {
  const sourceEnvPath = path.join(backendDir, ".env")
  const productionEnvPath = path.join(backendBuildDir, ".env.production")

  fs.mkdirSync(path.dirname(productionEnvPath), { recursive: true })
  fs.copyFileSync(sourceEnvPath, productionEnvPath)
}

function linkBuiltNodeModules() {
  const buildNodeModulesPath = path.join(backendBuildDir, "node_modules")
  const workspaceNodeModulesPath = path.join(backendDir, "node_modules")

  fs.rmSync(buildNodeModulesPath, { recursive: true, force: true })
  fs.symlinkSync(workspaceNodeModulesPath, buildNodeModulesPath, "dir")
}

// The local file provider stores uploads in `<cwd>/static` and the framework serves
// that same directory at `/static`. `<cwd>` is the freshly built `.medusa/server`,
// which is wiped on every container rebuild, so admin-uploaded images would vanish.
// Symlink `static` onto the persistent runtime volume so uploads survive rebuilds.
function linkStaticUploads() {
  const persistentUploadsDir = path.join(runtimeDir, "uploads")
  const staticDir = path.join(backendBuildDir, "static")

  fs.mkdirSync(persistentUploadsDir, { recursive: true })
  fs.rmSync(staticDir, { recursive: true, force: true })
  fs.symlinkSync(persistentUploadsDir, staticDir, "dir")
}

function patchVariantCreateRoute() {
  const pnpmDir = path.join(repoRoot, "node_modules", ".pnpm")

  if (!fs.existsSync(pnpmDir)) {
    throw new Error("Unable to locate pnpm store for Medusa route patching")
  }

  const medusaPackageDir = fs
    .readdirSync(pnpmDir)
    .find((entry) => entry.startsWith("@medusajs+medusa@"))

  if (!medusaPackageDir) {
    throw new Error("Unable to locate the installed @medusajs/medusa package")
  }

  const routePath = path.join(
    pnpmDir,
    medusaPackageDir,
    "node_modules",
    "@medusajs",
    "medusa",
    "dist",
    "api",
    "admin",
    "products",
    "[id]",
    "variants",
    "route.js"
  )

  if (!fs.existsSync(routePath)) {
    throw new Error(`Unable to locate admin variant route at ${routePath}`)
  }

  const routeSource = fs.readFileSync(routePath, "utf8")
  if (
    routeSource.includes("normalizeVariantOptionsFallback") ||
    routeSource.includes(
      "const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);"
    )
  ) {
    return
  }

  const sourceWithUtilsImport = routeSource.replace(
    'const http_1 = require("@medusajs/framework/http");',
    'const http_1 = require("@medusajs/framework/http");\nconst utils_1 = require("@medusajs/framework/utils");'
  )

  const patchedSource = sourceWithUtilsImport.replace(
    /const POST = async \(req, res\) => \{[\s\S]*?exports\.POST = POST;/,
    `const POST = async (req, res) => {
    // normalizeVariantOptionsFallback keeps admin variant creation from 500ing when
    // the admin client submits an empty options map.
    const productId = req.params.id;
    const { additional_data, ...rest } = req.validatedBody;
    const productModule = req.scope.resolve(utils_1.Modules.PRODUCT);
    const product = await productModule.retrieveProduct(productId, {
        relations: ["options", "options.values"],
    });
    const fallbackValue = typeof rest.title === "string" && rest.title.trim().length > 0
        ? rest.title.trim()
        : "Default";
    let productOptions = product?.options ?? [];
    if (!productOptions.length) {
        const createdOptions = await productModule.createProductOptions({
            product_id: productId,
            title: "Configuration",
            values: [fallbackValue],
        });
        productOptions = Array.isArray(createdOptions)
            ? createdOptions
            : [createdOptions];
    }
    const options = productOptions.reduce((acc, option) => {
        const title = option.title?.trim();
        if (!title) {
            return acc;
        }
        const requestedValue = rest.options?.[title]?.trim();
        if (requestedValue) {
            acc[title] = requestedValue;
            return acc;
        }
        const rawValue = option.values?.[0]?.value;
        const existingValue = typeof rawValue === "string"
            ? rawValue.trim()
            : typeof rawValue?.value === "string"
                ? rawValue.value.trim()
                : "";
        acc[title] = existingValue || fallbackValue;
        return acc;
    }, {});
    if (Object.keys(options).length === 0) {
        options.Configuration = fallbackValue;
    }
    const input = [
        {
            ...rest,
            product_id: productId,
            options,
        },
    ];
    await (0, core_flows_1.createProductVariantsWorkflow)(req.scope).run({
        input: { product_variants: input, additional_data },
    });
    const productResponse = await (0, http_1.refetchEntity)({
        entity: "product",
        idOrFilter: productId,
        scope: req.scope,
        fields: (0, helpers_1.remapKeysForProduct)(req.queryConfig.fields ?? []),
    });
    res.status(200).json({ product: (0, helpers_1.remapProductResponse)(productResponse) });
};
exports.POST = POST;`
  )

  if (patchedSource === routeSource) {
    throw new Error("Failed to patch Medusa admin variant route")
  }

  fs.writeFileSync(routePath, patchedSource, "utf8")
}

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: options.stdio ?? "inherit",
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
  })
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, options)

    child.on("error", reject)
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited due to signal ${signal}`))
        return
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`))
        return
      }

      resolve()
    })
  })
}

async function waitForBackendHealth(timeoutMs = 10 * 60 * 1000) {
  const startedAt = Date.now()

  for (;;) {
    try {
      const response = await fetch("http://127.0.0.1:9000/health")

      if (response.ok) {
        return
      }
    } catch {}

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for the Medusa backend health check")
    }

    console.log("Waiting for Medusa backend health...")
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

async function ensureAdminUser() {
  const adminEmail = requireEnv("ADMIN_EMAIL", "admin@medusa.local")
  const adminPassword = requireEnv("ADMIN_PASSWORD", "MedusaDemo123!")

  const loginResponse = await fetch("http://127.0.0.1:9000/auth/user/emailpass", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  })

  if (loginResponse.ok) {
    console.log(`Admin user ${adminEmail} is already provisioned.`)
    return
  }

  if (loginResponse.status !== 401) {
    throw new Error(
      `Unexpected admin auth check response: ${loginResponse.status}`
    )
  }

  console.log(`Provisioning admin user ${adminEmail}...`)
  await run("pnpm", [
    "--dir",
    backendBuildDir,
    "user",
    "--email",
    adminEmail,
    "--password",
    adminPassword,
  ])

  const verifyResponse = await fetch(
    "http://127.0.0.1:9000/auth/user/emailpass",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    }
  )

  if (!verifyResponse.ok) {
    throw new Error("Admin user provisioning completed, but login still failed")
  }
}

async function main() {
  writeBackendEnv()

  // Medusa's Docker guide uses db:setup so the database, migrations, and links
  // are prepared in one repeatable step before the dev server starts.
  await run("pnpm", ["--dir", backendDir, "db:setup", "--no-interactive"])

  await run("pnpm", ["--dir", backendDir, "seed"])

  // Build the admin and backend bundle before starting the server so the
  // browser never lands on a half-optimized Vite dev graph after login.
  await run("pnpm", ["--dir", backendDir, "build"])

  writeProductionEnv()
  linkBuiltNodeModules()
  linkStaticUploads()
  patchVariantCreateRoute()

  const start = spawnCommand("pnpm", ["--dir", backendBuildDir, "start"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
    stdio: "inherit",
  })

  const startExited = new Promise((resolve, reject) => {
    start.on("error", reject)
    start.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`pnpm start exited due to signal ${signal}`))
        return
      }

      if (code !== 0) {
        reject(new Error(`pnpm start exited with code ${code}`))
        return
      }

      resolve()
    })
  })

  await waitForBackendHealth()
  await ensureAdminUser()

  await startExited
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
