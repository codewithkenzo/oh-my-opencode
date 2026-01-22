import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { parseJsonc, getUserConfigDir } from "../../shared"
import type { BrowserConfig } from "../../config/schema"
import {
  type BrowserBackend,
  type BrowserAdapter,
  createBrowserAdapter,
  resolveCdpPort,
  clearBrowserSession,
  formatRef,
} from "./adapters"
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

function getBrowserConfig(): { backend: BrowserBackend; cdpPort?: number; wslAutoLaunch: boolean } {
  const defaultConfig = { backend: "agent-browser" as BrowserBackend, wslAutoLaunch: true }
  
  try {
    const userConfigPath = join(getUserConfigDir(), "opencode", "oh-my-opencode.json")
    const projectConfigPath = join(process.cwd(), ".opencode", "oh-my-opencode.json")
    
    let browserConfig: BrowserConfig | undefined
    
    // Check project config first, then user config (to match load priority, though simple override here)
    // Actually standard is user base + project override.
    // We'll check project first, if found use it. If not, check user.
    // This is a simplified lookup since we don't have deep merge here.
    
    if (existsSync(projectConfigPath)) {
        const content = readFileSync(projectConfigPath, "utf-8")
        const config = parseJsonc<{ browser?: BrowserConfig }>(content)
        if (config?.browser) browserConfig = config.browser
    }
    
    if (!browserConfig && existsSync(userConfigPath)) {
        const content = readFileSync(userConfigPath, "utf-8")
        const config = parseJsonc<{ browser?: BrowserConfig }>(content)
        if (config?.browser) browserConfig = config.browser
    }
    
    return {
      backend: browserConfig?.backend ?? "agent-browser",
      cdpPort: browserConfig?.cdp_port,
      wslAutoLaunch: browserConfig?.wsl_auto_launch ?? true,
    }
  } catch {
    return defaultConfig
  }
}

async function getAdapter(explicitCdpPort?: number): Promise<{ adapter: BrowserAdapter; mode: string }> {
  const { backend, cdpPort: configCdpPort, wslAutoLaunch } = getBrowserConfig()
  const resolvedPort = await resolveCdpPort(explicitCdpPort ?? configCdpPort, wslAutoLaunch)
  const adapter = createBrowserAdapter(backend, resolvedPort)
  const mode = resolvedPort ? `CDP:${resolvedPort}` : backend
  return { adapter, mode }
}

function getTarget(ref?: number, selector?: string): string | null {
  const { backend } = getBrowserConfig()
  if (ref !== undefined) return formatRef(ref, backend)
  if (selector) return selector
  return null
}

export const browser_open: ToolDefinition = tool({
  description: BROWSER_OPEN_DESCRIPTION,
  args: {
    url: tool.schema.string().describe("URL to navigate to"),
    cdp_port: tool.schema.number().optional().describe("CDP port for connecting to existing Chrome (e.g., 9222). On WSL, auto-launches Windows Chrome if not specified."),
  },
  execute: async ({ url, cdp_port }) => {
    try {
      const { adapter, mode } = await getAdapter(cdp_port)
      const result = await adapter.open(url)
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.snapshot(interactive)
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
      const { adapter } = await getAdapter(cdp_port)
      const result = await adapter.screenshot(output_path)
      return `${result}\n\nUse look_at(file_path="${output_path}", goal="...") to analyze`
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
      const target = getTarget(ref, selector)
      if (!target) return "Error: Provide either ref or selector"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.click(target)
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
      const target = getTarget(ref, selector)
      if (!target) return "Error: Provide either ref or selector"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.fill(target, text)
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
      const { adapter } = await getAdapter(cdp_port)
      const result = await adapter.close()
      clearBrowserSession()
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.back()
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.forward()
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.reload()
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.getUrl()
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.getTitle()
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
      const target = getTarget(ref, selector)
      if (!target) return "Error: Provide either ref or selector"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.type(target, text, delay)
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.press(key)
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
      const target = getTarget(ref, selector)
      if (!target) return "Error: Provide either ref or selector"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.hover(target)
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.scroll(direction, amount)
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
      const target = getTarget(ref, selector)
      if (!target) return "Error: Provide either ref or selector"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.select(target, value)
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
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.eval(script)
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
      if (!selector && !timeout) return "Error: Provide either selector or timeout"
      const { adapter } = await getAdapter(cdp_port)
      return await adapter.wait(selector ?? timeout!)
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
