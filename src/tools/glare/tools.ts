import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { spawn } from "bun"
import { z } from "zod"
import { GLARE_DESCRIPTION, RELAY_URL } from "./constants"
import type { GlareArgs } from "./types"
import { log } from "../../shared/logger"
import { getUserConfigDir } from "../../shared/config-path"

const SKILL_DIR = join(getUserConfigDir(), "opencode", "skill", "glare")

const RelayInfoSchema = z.object({
  mode: z.string(),
  extensionConnected: z.boolean(),
  wsEndpoint: z.string(),
})

const RelayErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
})

async function fetchRelayTyped<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const response = await fetch(`${RELAY_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(10000),
  })
  
  const text = await response.text()
  
  if (!response.ok) {
    try {
      const errorData = JSON.parse(text)
      const parsed = RelayErrorSchema.safeParse(errorData)
      if (parsed.success) {
        throw new Error(`Relay error: ${parsed.data.error}${parsed.data.message ? ` - ${parsed.data.message}` : ""}`)
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Relay error:")) throw e
    }
    throw new Error(`Relay error: ${response.status} ${text}`)
  }
  
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON response from relay: ${text.substring(0, 100)}`)
  }
  
  const result = schema.safeParse(data)
  if (!result.success) {
    log("[glare] Schema validation failed:", result.error.issues)
    throw new Error(`Invalid relay response: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")}`)
  }
  
  return result.data
}

async function isRelayRunning(): Promise<boolean> {
  try {
    await fetch(RELAY_URL, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

async function startRelayServer(): Promise<string> {
  if (await isRelayRunning()) {
    const info = await fetchRelayTyped("/", RelayInfoSchema)
    return `Relay already running.
- Mode: ${info.mode}
- Extension Connected: ${info.extensionConnected}
- WebSocket: ${info.wsEndpoint}`
  }

  const scriptPath = join(SKILL_DIR, "scripts", "start-relay.ts")
  if (!existsSync(scriptPath)) {
    return `Error: glare skill not installed at ${SKILL_DIR}`
  }

  log("[glare] Starting relay server...")

  spawn({
    cmd: ["npx", "tsx", scriptPath],
    cwd: SKILL_DIR,
    env: { ...process.env, HOST: "0.0.0.0", PORT: "9222" },
    stdout: "ignore",
    stderr: "ignore",
  })

  await new Promise(resolve => setTimeout(resolve, 2000))

  if (await isRelayRunning()) {
    const info = await fetchRelayTyped("/", RelayInfoSchema)
    return `Relay started successfully.
- Mode: ${info.mode}
- Extension Connected: ${info.extensionConnected}
- WebSocket: ${info.wsEndpoint}

Connect your browser extension to ws://localhost:9222/cdp`
  }

  return "Error: Failed to start relay server. Check that glare skill is properly installed."
}

async function relayPost(path: string, body: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetch(`${RELAY_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Relay error: ${response.status} ${text}`)
  }

  return response.json()
}

async function relayGet(path: string): Promise<string> {
  const response = await fetch(`${RELAY_URL}${path}`, {
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Relay error: ${response.status} ${text}`)
  }

  return response.text()
}

export const glare = tool({
  description: GLARE_DESCRIPTION,
  args: {
    action: tool.schema
      .enum(["screenshot", "navigate", "snapshot", "info", "start", "console", "styles", "network", "eval", "source", "click"])
      .describe("Action to perform"),
    url: tool.schema.string().optional().describe("URL to navigate to"),
    output_path: tool.schema.string().optional().describe("Screenshot output path"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    script: tool.schema.string().optional().describe("JavaScript to execute"),
  },
  async execute(args: GlareArgs) {
    log(`[glare] Action: ${args.action}`)

    if (args.action === "start") {
      return await startRelayServer()
    }

    if (!(await isRelayRunning())) {
      return "Error: Browser relay not running. Use action='start' first."
    }

    try {
      switch (args.action) {
        case "info": {
          const info = await fetchRelayTyped("/", RelayInfoSchema)
          return `Relay Status:
- Mode: ${info.mode}
- Extension Connected: ${info.extensionConnected}
- WebSocket: ${info.wsEndpoint}`
        }

        case "screenshot": {
          const outputPath = args.output_path ?? "tmp/screenshot.png"
          const dir = dirname(outputPath)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

          const result = await relayPost("/screenshot", { fullPage: true }) as { data: string }

          const buffer = Buffer.from(result.data, "base64")
          writeFileSync(outputPath, buffer)

          return `Screenshot saved to ${outputPath}. Use look_at tool to analyze.`
        }

        case "navigate": {
          if (!args.url) return "Error: url parameter required"

          await relayPost("/cdp/execute", {
            method: "Page.navigate",
            params: { url: args.url },
          })

          return `Navigating to ${args.url}. Use screenshot to verify.`
        }

        case "eval": {
          if (!args.script) return "Error: script parameter required"

          const result = await relayPost("/evaluate", {
            expression: args.script,
          }) as { result: { result: { value: unknown } } }

          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "source": {
          const html = await relayGet("/source")
          return html.length > 50000
            ? html.substring(0, 50000) + "\n\n[Truncated...]"
            : html
        }

        case "snapshot": {
          const result = await relayPost("/cdp/execute", {
            method: "Accessibility.getFullAXTree",
            params: {},
          })
          return JSON.stringify(result, null, 2)
        }

        case "styles": {
          if (!args.selector) return "Error: selector parameter required"

          const script = `(() => {
            const el = document.querySelector("${args.selector}");
            if (!el) return { error: "Element not found" };
            const s = window.getComputedStyle(el);
            return {
              display: s.display, position: s.position,
              width: s.width, height: s.height,
              padding: s.padding, margin: s.margin,
              color: s.color, backgroundColor: s.backgroundColor,
              fontSize: s.fontSize, flexDirection: s.flexDirection,
              border: s.border, borderRadius: s.borderRadius
            };
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "click": {
          if (!args.selector) return "Error: selector parameter required"

          const script = `(() => {
            const el = document.querySelector("${args.selector}");
            if (!el) return { error: "Element not found" };
            el.click();
            return { clicked: "${args.selector}" };
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "console": {
          const script = `(() => {
            if (!window.__devBrowserLogs) window.__devBrowserLogs = [];
            return window.__devBrowserLogs.slice(-50);
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "network": {
          const script = `(() => {
            if (!window.__devBrowserRequests) window.__devBrowserRequests = [];
            return window.__devBrowserRequests.slice(-20);
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        default:
          return `Unknown action: ${args.action}`
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `Error: ${message}`
    }
  },
})
