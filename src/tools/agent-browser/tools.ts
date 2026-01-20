import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { spawn, execSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import {
  BROWSER_OPEN_DESCRIPTION,
  BROWSER_SNAPSHOT_DESCRIPTION,
  BROWSER_SCREENSHOT_DESCRIPTION,
  BROWSER_CLICK_DESCRIPTION,
  BROWSER_FILL_DESCRIPTION,
  BROWSER_CLOSE_DESCRIPTION,
  BROWSER_BACK_DESCRIPTION,
  BROWSER_FORWARD_DESCRIPTION,
  BROWSER_RELOAD_DESCRIPTION,
  BROWSER_GET_URL_DESCRIPTION,
  BROWSER_GET_TITLE_DESCRIPTION,
  BROWSER_TYPE_DESCRIPTION,
  BROWSER_PRESS_DESCRIPTION,
  BROWSER_HOVER_DESCRIPTION,
  BROWSER_SCROLL_DESCRIPTION,
  BROWSER_SELECT_DESCRIPTION,
  BROWSER_EVAL_DESCRIPTION,
  BROWSER_WAIT_DESCRIPTION,
} from "./constants"

// Browser session state
let activeCdpPort: number | undefined
let chromeProcess: ReturnType<typeof spawn> | undefined

/**
 * Detect if running in WSL
 */
function isWSL(): boolean {
  try {
    const release = execSync("uname -r", { encoding: "utf-8" }).toLowerCase()
    return release.includes("microsoft") || release.includes("wsl")
  } catch {
    return false
  }
}

/**
 * Check if a CDP port is responding
 */
async function isCdpPortActive(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Launch Chrome on Windows with remote debugging enabled (from WSL)
 */
async function launchWindowsChrome(port: number = 9222): Promise<number> {
  // Check if already running
  if (await isCdpPortActive(port)) {
    return port
  }

  // Try common Chrome paths on Windows
  const chromePaths = [
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Users/${USER}/AppData/Local/Google/Chrome/Application/chrome.exe",
  ]

  let chromePath: string | undefined
  for (const p of chromePaths) {
    const expanded = p.replace("${USER}", process.env.USER || "")
    if (existsSync(expanded)) {
      chromePath = expanded
      break
    }
  }

  if (!chromePath) {
    throw new Error("Chrome not found on Windows. Install Chrome or provide cdp_port manually.")
  }

  // Launch Chrome with remote debugging
  const winPath = chromePath.replace(/^\/mnt\/([a-z])\//, (_, drive) => `${drive.toUpperCase()}:\\`).replace(/\//g, "\\")
  
  // Use cmd.exe to launch Chrome in background
  const proc = spawn("cmd.exe", ["/c", "start", "", winPath, `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check"], {
    detached: true,
    stdio: "ignore",
  })
  proc.unref()
  
  // Wait for CDP to become available
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 200))
    if (await isCdpPortActive(port)) {
      activeCdpPort = port
      return port
    }
  }
  
  throw new Error(`Chrome launched but CDP port ${port} not responding after 6s`)
}

/**
 * Get or create a CDP port for browser operations
 * Priority: explicit cdp_port > active session > auto-launch on WSL
 */
async function resolveCdpPort(cdpPort?: number): Promise<number | undefined> {
  // Explicit port provided
  if (cdpPort !== undefined) {
    if (await isCdpPortActive(cdpPort)) {
      activeCdpPort = cdpPort
      return cdpPort
    }
    throw new Error(`CDP port ${cdpPort} not responding. Start Chrome with --remote-debugging-port=${cdpPort}`)
  }
  
  // Active session exists
  if (activeCdpPort && await isCdpPortActive(activeCdpPort)) {
    return activeCdpPort
  }
  
  // On WSL, try to auto-launch Windows Chrome
  if (isWSL()) {
    try {
      return await launchWindowsChrome(9222)
    } catch {
      // Fall through to bundled mode
    }
  }
  
  // No CDP - will use bundled Playwright via agent-browser
  return undefined
}

async function runAgentBrowser(args: string[], cdpPort?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmdArgs = cdpPort ? ["--cdp", String(cdpPort), ...args] : args
    
    const proc = spawn("agent-browser", cmdArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    })
    
    let stdout = ""
    let stderr = ""
    
    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })
    
    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })
    
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || "Success")
      } else {
        reject(new Error(stderr.trim() || `agent-browser exited with code ${code}`))
      }
    })
    
    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("agent-browser not found. Install with: bun add -g agent-browser"))
      } else {
        reject(err)
      }
    })
  })
}

export const browser_open: ToolDefinition = tool({
  description: BROWSER_OPEN_DESCRIPTION,
  args: {
    url: tool.schema.string().describe("URL to navigate to"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222). On WSL, auto-launches Windows Chrome if not specified."),
  },
  execute: async ({ url, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const result = await runAgentBrowser(["open", url], resolvedPort)
      const mode = resolvedPort ? `CDP:${resolvedPort}` : "bundled"
      return `[${mode}] Navigated to: ${url}\n${result}`
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_snapshot: ToolDefinition = tool({
  description: BROWSER_SNAPSHOT_DESCRIPTION,
  args: {
    interactive: tool.schema.boolean().optional().describe("Include ref IDs for click/fill interactions"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
  execute: async ({ interactive, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const args = interactive ? ["snapshot", "-i"] : ["snapshot"]
      return await runAgentBrowser(args, resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_screenshot: ToolDefinition = tool({
  description: BROWSER_SCREENSHOT_DESCRIPTION,
  args: {
    output_path: tool.schema.string().optional().describe("Path to save screenshot (default: tmp/screenshot.png)"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
  execute: async ({ output_path = "tmp/screenshot.png", cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const fullPath = resolve(process.cwd(), output_path)
      const dir = dirname(fullPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      
      await runAgentBrowser(["screenshot", fullPath], resolvedPort)
      return `Screenshot saved: ${fullPath}\n\nUse look_at(file_path="${fullPath}", goal="...") to analyze`
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_click: ToolDefinition = tool({
  description: BROWSER_CLICK_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector to click"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
  execute: async ({ ref, selector, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      if (ref !== undefined) {
        return await runAgentBrowser(["click", `@e${ref}`], resolvedPort)
      } else if (selector) {
        return await runAgentBrowser(["click", selector], resolvedPort)
      } else {
        return "Error: Provide either ref or selector"
      }
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_fill: ToolDefinition = tool({
  description: BROWSER_FILL_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector for input"),
    text: tool.schema.string().describe("Text to fill into the input"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222)"),
  },
  execute: async ({ ref, selector, text, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      if (ref !== undefined) {
        return await runAgentBrowser(["fill", `@e${ref}`, text], resolvedPort)
      } else if (selector) {
        return await runAgentBrowser(["fill", selector, text], resolvedPort)
      } else {
        return "Error: Provide either ref or selector"
      }
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_close: ToolDefinition = tool({
  description: BROWSER_CLOSE_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port (ignored for CDP connections)"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const result = await runAgentBrowser(["close"], resolvedPort)
      // Clear session state
      activeCdpPort = undefined
      if (chromeProcess) {
        chromeProcess.kill()
        chromeProcess = undefined
      }
      return result
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_back: ToolDefinition = tool({
  description: BROWSER_BACK_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["back"], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_forward: ToolDefinition = tool({
  description: BROWSER_FORWARD_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["forward"], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_reload: ToolDefinition = tool({
  description: BROWSER_RELOAD_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["reload"], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_get_url: ToolDefinition = tool({
  description: BROWSER_GET_URL_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["get", "url"], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_get_title: ToolDefinition = tool({
  description: BROWSER_GET_TITLE_DESCRIPTION,
  args: {
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["get", "title"], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_type: ToolDefinition = tool({
  description: BROWSER_TYPE_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    text: tool.schema.string().describe("Text to type"),
    delay: tool.schema.number().optional().describe("Delay between keystrokes in ms"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ ref, selector, text, delay, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const target = ref !== undefined ? `@e${ref}` : selector
      if (!target) return "Error: Provide either ref or selector"
      const args = delay ? ["type", target, text, "--delay", String(delay)] : ["type", target, text]
      return await runAgentBrowser(args, resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_press: ToolDefinition = tool({
  description: BROWSER_PRESS_DESCRIPTION,
  args: {
    key: tool.schema.string().describe("Key to press (e.g., Enter, Tab, Control+a)"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ key, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["press", key], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_hover: ToolDefinition = tool({
  description: BROWSER_HOVER_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ ref, selector, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const target = ref !== undefined ? `@e${ref}` : selector
      if (!target) return "Error: Provide either ref or selector"
      return await runAgentBrowser(["hover", target], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_scroll: ToolDefinition = tool({
  description: BROWSER_SCROLL_DESCRIPTION,
  args: {
    direction: tool.schema.string().describe("Direction: up, down, left, right"),
    amount: tool.schema.number().optional().describe("Pixels to scroll (default: 300)"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ direction, amount, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const args = amount ? ["scroll", direction, String(amount)] : ["scroll", direction]
      return await runAgentBrowser(args, resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_select: ToolDefinition = tool({
  description: BROWSER_SELECT_DESCRIPTION,
  args: {
    ref: tool.schema.number().optional().describe("Element ref ID from snapshot"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    value: tool.schema.string().describe("Option value to select"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ ref, selector, value, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      const target = ref !== undefined ? `@e${ref}` : selector
      if (!target) return "Error: Provide either ref or selector"
      return await runAgentBrowser(["select", target, value], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_eval: ToolDefinition = tool({
  description: BROWSER_EVAL_DESCRIPTION,
  args: {
    script: tool.schema.string().describe("JavaScript code to execute"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ script, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      return await runAgentBrowser(["eval", script], resolvedPort)
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browser_wait: ToolDefinition = tool({
  description: BROWSER_WAIT_DESCRIPTION,
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to wait for"),
    timeout: tool.schema.number().optional().describe("Timeout in milliseconds"),
    cdp_port: tool.schema.number().optional().describe("CDP port"),
  },
  execute: async ({ selector, timeout, cdp_port }) => {
    try {
      const resolvedPort = await resolveCdpPort(cdp_port)
      if (selector) {
        return await runAgentBrowser(["wait", selector], resolvedPort)
      } else if (timeout) {
        return await runAgentBrowser(["wait", String(timeout)], resolvedPort)
      } else {
        return "Error: Provide either selector or timeout"
      }
    } catch (err) {
      return `Error: ${(err as Error).message}`
    }
  },
})

export const browserTools: Record<string, ToolDefinition> = {
  browser_open,
  browser_snapshot,
  browser_screenshot,
  browser_click,
  browser_fill,
  browser_close,
  browser_back,
  browser_forward,
  browser_reload,
  browser_get_url,
  browser_get_title,
  browser_type,
  browser_press,
  browser_hover,
  browser_scroll,
  browser_select,
  browser_eval,
  browser_wait,
}
