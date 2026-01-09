import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { spawn } from "bun"
import { z } from "zod"
import { GLARE_DESCRIPTION, RELAY_URL, FRAMEWORK_DETECT_SCRIPT, FRAMEWORK_STATE_SCRIPTS, COMPONENT_TREE_SCRIPTS, TANSTACK_QUERY_SCRIPT, ROUTER_STATE_SCRIPTS } from "./constants"
import type { GlareArgs, Framework } from "./types"
import { log } from "../../shared/logger"
import { homedir } from "os"

const SKILL_DIR = join(homedir(), ".opencode", "skill", "glare")

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
    // JSON parsing failed, will throw custom error below
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
    // Relay not running, return false
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

  const scriptPath = join(SKILL_DIR, "scripts", "start-relay.sh")
  if (!existsSync(scriptPath)) {
    return `Error: glare skill not installed at ${SKILL_DIR}`
  }

  log("[glare] Starting relay server...")

  spawn({
    cmd: ["bash", scriptPath],
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

async function ensurePage(): Promise<void> {
  const pagesRes = await fetch(`${RELAY_URL}/pages`, { signal: AbortSignal.timeout(5000) })
  const pages = await pagesRes.json() as { pages: Array<{ name: string }> }
  
  if (pages.pages.length === 0) {
    await fetch(`${RELAY_URL}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "glare" }),
      signal: AbortSignal.timeout(5000),
    })
  }
}

async function getPageUrl(): Promise<string> {
  try {
    const result = await relayPost("/evaluate", { expression: "window.location.href" }) as { result: { result: { value: string } } }
    return result.result?.result?.value || "about:blank"
  } catch {
    // Page evaluation failed, return default
    return "about:blank"
  }
}

function isBlankPage(url: string): boolean {
  return url === "about:blank" || url.startsWith("about:") || url === ""
}

export const glare: ToolDefinition = tool({
  description: GLARE_DESCRIPTION,
  args: {
    action: tool.schema
      .enum(["screenshot", "navigate", "snapshot", "info", "start", "console", "styles", "network", "eval", "source", "click", "detect", "state", "tree", "queries", "routes", "markdown"])
      .describe("Action to perform"),
    url: tool.schema.string().optional().describe("URL to navigate to"),
    output_path: tool.schema.string().optional().describe("Screenshot output path"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    script: tool.schema.string().optional().describe("JavaScript to execute"),
    level: tool.schema.enum(["error", "warn", "all"]).optional().describe("Console verbosity: error (errors only), warn (errors+warnings), all (default)"),
    framework: tool.schema.enum(["next", "nuxt", "react", "vue", "tanstack", "unknown"]).optional().describe("Framework for state/tree/routes actions (auto-detected if not specified)"),
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
          if (!info.extensionConnected) {
            return "Not connected"
          }
          try {
            await ensurePage()
            const result = await relayPost("/evaluate", { expression: "window.location.href" }) as { result: { result: { value: string } } }
            const url = result.result?.result?.value
            return url ? `Connected (${url})` : "Connected"
          } catch {
            // URL evaluation failed, but extension is connected
            return "Connected"
          }
        }

        case "screenshot": {
          await ensurePage()
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
          await ensurePage()

          await relayPost("/cdp/execute", {
            method: "Page.navigate",
            params: { url: args.url },
          })

          return `Navigating to ${args.url}. Use screenshot to verify.`
        }

        case "eval": {
          if (!args.script) return "Error: script parameter required"
          await ensurePage()

          const result = await relayPost("/evaluate", {
            expression: args.script,
          }) as { result: { result: { value: unknown } } }

          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "source": {
          await ensurePage()
          const sourceUrl = await getPageUrl()
          if (isBlankPage(sourceUrl)) {
            return `Error: Page is on ${sourceUrl}. Use 'glare navigate url="https://..."' first.`
          }
          const html = await relayGet("/source")
          return html.length > 50000
            ? html.substring(0, 50000) + "\n\n[Truncated...]"
            : html
        }

        case "snapshot": {
          await ensurePage()
          const snapshotUrl = await getPageUrl()
          if (isBlankPage(snapshotUrl)) {
            return `Error: Page is on ${snapshotUrl}. Use 'glare navigate url="https://..."' first.`
          }
          const result = await relayPost("/cdp/execute", {
            method: "Accessibility.getFullAXTree",
            params: {},
          })
          return JSON.stringify(result, null, 2)
        }

        case "styles": {
          if (!args.selector) return "Error: selector parameter required"
          await ensurePage()

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
          await ensurePage()

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
          await ensurePage()
          const level = args.level ?? "all"
          const filterCode = level === "error" 
            ? `.filter(l => l.level === 'error')` 
            : level === "warn" 
              ? `.filter(l => l.level === 'error' || l.level === 'warn' || l.level === 'warning')` 
              : ""
          const script = `(() => {
            if (!window.__devBrowserLogs) window.__devBrowserLogs = [];
            return window.__devBrowserLogs${filterCode}.slice(-50);
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "network": {
          await ensurePage()
          const script = `(() => {
            if (!window.__devBrowserRequests) window.__devBrowserRequests = [];
            return window.__devBrowserRequests.slice(-20);
          })()`
          const result = await relayPost("/evaluate", { expression: script }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "detect": {
          await ensurePage()
          const detectUrl = await getPageUrl()
          if (isBlankPage(detectUrl)) {
            return `Error: Page is on ${detectUrl}. Use 'glare navigate url="https://..."' first.`
          }
          const result = await relayPost("/evaluate", { expression: FRAMEWORK_DETECT_SCRIPT }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "state": {
          await ensurePage()
          const stateUrl = await getPageUrl()
          if (isBlankPage(stateUrl)) {
            return `Error: Page is on ${stateUrl}. Use 'glare navigate url="https://..."' first.`
          }
          let fw = args.framework as Framework | undefined
          if (!fw) {
            const detectResult = await relayPost("/evaluate", { expression: FRAMEWORK_DETECT_SCRIPT }) as { result: { result: { value: { primary: string } } } }
            fw = (detectResult.result?.result?.value?.primary || "unknown") as Framework
          }
          const stateScript = FRAMEWORK_STATE_SCRIPTS[fw] || FRAMEWORK_STATE_SCRIPTS.unknown
          const result = await relayPost("/evaluate", { expression: stateScript }) as { result: { result: { value: unknown } } }
          return JSON.stringify({ framework: fw, ...result.result?.result?.value as object }, null, 2)
        }

        case "tree": {
          await ensurePage()
          const treeUrl = await getPageUrl()
          if (isBlankPage(treeUrl)) {
            return `Error: Page is on ${treeUrl}. Use 'glare navigate url="https://..."' first.`
          }
          let fw = args.framework as Framework | undefined
          if (!fw || !["react", "vue"].includes(fw)) {
            const detectResult = await relayPost("/evaluate", { expression: FRAMEWORK_DETECT_SCRIPT }) as { result: { result: { value: { frameworks: string[] } } } }
            const detected = detectResult.result?.result?.value?.frameworks || []
            fw = detected.includes("react") ? "react" : detected.includes("vue") ? "vue" : "unknown"
          }
          const treeScript = COMPONENT_TREE_SCRIPTS[fw as string] || COMPONENT_TREE_SCRIPTS.unknown
          const result = await relayPost("/evaluate", { expression: treeScript }) as { result: { result: { value: unknown } } }
          return JSON.stringify({ framework: fw, ...result.result?.result?.value as object }, null, 2)
        }

        case "queries": {
          await ensurePage()
          const queriesUrl = await getPageUrl()
          if (isBlankPage(queriesUrl)) {
            return `Error: Page is on ${queriesUrl}. Use 'glare navigate url="https://..."' first.`
          }
          const result = await relayPost("/evaluate", { expression: TANSTACK_QUERY_SCRIPT }) as { result: { result: { value: unknown } } }
          return JSON.stringify(result.result?.result?.value ?? result, null, 2)
        }

        case "routes": {
          await ensurePage()
          const routesUrl = await getPageUrl()
          if (isBlankPage(routesUrl)) {
            return `Error: Page is on ${routesUrl}. Use 'glare navigate url="https://..."' first.`
          }
          let fw = args.framework as Framework | undefined
          if (!fw || !["next", "nuxt", "tanstack"].includes(fw)) {
            const detectResult = await relayPost("/evaluate", { expression: FRAMEWORK_DETECT_SCRIPT }) as { result: { result: { value: { frameworks: string[] } } } }
            const detected = detectResult.result?.result?.value?.frameworks || []
            fw = detected.includes("next") ? "next" : detected.includes("nuxt") ? "nuxt" : detected.includes("tanstack") ? "tanstack" : "unknown"
          }
          const routeScript = ROUTER_STATE_SCRIPTS[fw as string] || ROUTER_STATE_SCRIPTS.unknown
          const result = await relayPost("/evaluate", { expression: routeScript }) as { result: { result: { value: unknown } } }
          return JSON.stringify({ framework: fw, ...result.result?.result?.value as object }, null, 2)
        }

        case "markdown": {
          await ensurePage()
          const markdownUrl = await getPageUrl()
          if (isBlankPage(markdownUrl)) {
            return `Error: Page is on ${markdownUrl}. Use 'glare navigate url="https://..."' first.`
          }
          const html = await relayGet("/source")
          const TurndownService = (await import("turndown")).default
          const turndownService = new TurndownService({
            headingStyle: "atx",
            hr: "---",
            bulletListMarker: "-",
            codeBlockStyle: "fenced",
            emDelimiter: "*",
          })
          turndownService.remove(["script", "style", "meta", "link", "noscript"])
          const markdown = turndownService.turndown(html)
          return markdown.length > 50000
            ? markdown.substring(0, 50000) + "\n\n[Truncated...]"
            : markdown
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
