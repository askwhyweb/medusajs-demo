import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const repoRoot = "/srv"
const storefrontDir = path.join(repoRoot, "apps/storefront")
const runtimeDir = process.env.RUNTIME_DIR ?? "/runtime"
const runtimeEnvPath = path.join(runtimeDir, "storefront.env")

function parseEnvFile(filePath) {
  const contents = fs.readFileSync(filePath, "utf8")
  const parsed = {}

  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)
    parsed[key] = value
  }

  return parsed
}

async function waitForRuntimeEnv() {
  for (;;) {
    if (fs.existsSync(runtimeEnvPath)) {
      return
    }

    console.log("Waiting for backend seed output...")
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

function run(command, args, env) {
  const child = spawn(command, args, {
    stdio: "inherit",
    cwd: repoRoot,
    env,
  })

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1)
      return
    }

    process.exit(code ?? 0)
  })
}

async function main() {
  await waitForRuntimeEnv()

  const env = {
    ...process.env,
    ...parseEnvFile(runtimeEnvPath),
    RUNTIME_DIR: runtimeDir,
  }

  run("pnpm", ["--dir", storefrontDir, "dev"], env)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
