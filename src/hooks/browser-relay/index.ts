import { spawn, type Subprocess } from "bun"
import { existsSync } from "fs"
import { join } from "path"
import { log } from "../../shared/logger"
import { getUserConfigDir } from "../../shared/config-path"

const RELAY_PORT = 9222
const SKILL_DIR = join(getUserConfigDir(), "opencode", "skill", "browser-debugger")

let relayProcess: Subprocess | null = null
let isStarting = false

async function isRelayRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${RELAY_PORT}`, { 
      signal: AbortSignal.timeout(1000) 
    })
    return response.ok
  } catch {
    return false
  }
}

async function startRelay(): Promise<boolean> {
  if (isStarting) return false
  if (await isRelayRunning()) {
    log("[browser-relay] Relay already running")
    return true
  }

  const scriptPath = join(SKILL_DIR, "scripts", "start-relay.ts")
  if (!existsSync(scriptPath)) {
    log("[browser-relay] Relay script not found:", scriptPath)
    return false
  }

  isStarting = true
  log("[browser-relay] Starting relay server...")

  try {
    relayProcess = spawn({
      cmd: ["npx", "tsx", scriptPath],
      cwd: SKILL_DIR,
      env: { ...process.env, HOST: "0.0.0.0", PORT: String(RELAY_PORT) },
      stdout: "ignore",
      stderr: "ignore",
    })

    await new Promise(resolve => setTimeout(resolve, 2000))

    if (await isRelayRunning()) {
      log("[browser-relay] Relay started successfully")
      isStarting = false
      return true
    }

    log("[browser-relay] Relay failed to start")
    isStarting = false
    return false
  } catch (error) {
    log("[browser-relay] Error starting relay:", error)
    isStarting = false
    return false
  }
}

export function createBrowserRelayHook() {
  let hasStarted = false

  return {
    event: async (input: { event: { type: string } }) => {
      if (hasStarted) return
      if (input.event.type !== "session.created") return

      hasStarted = true

      if (!existsSync(SKILL_DIR)) {
        log("[browser-relay] browser-debugger skill not installed")
        return
      }

      await startRelay()
    },
  }
}

export function stopBrowserRelay() {
  if (relayProcess) {
    relayProcess.kill()
    relayProcess = null
    log("[browser-relay] Relay stopped")
  }
}
