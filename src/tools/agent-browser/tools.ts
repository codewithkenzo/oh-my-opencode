import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { parseJsonc, getUserConfigDir } from "../../shared"
import type { BrowserAutomationConfig } from "../../config/schema"
import {
  type BrowserBackend,
  type BrowserAdapter,
  createBrowserAdapter,
  resolveCdpPort,
  clearBrowserSession,
  formatRef,
} from "./adapters"
import {
  browserOpenDef,
  browserSnapshotDef,
  browserScreenshotDef,
  browserClickDef,
  browserFillDef,
  browserCloseDef,
  browserBackDef,
  browserForwardDef,
  browserReloadDef,
  browserGetUrlDef,
  browserGetTitleDef,
  browserTypeDef,
  browserPressDef,
  browserHoverDef,
  browserScrollDef,
  browserSelectDef,
  browserEvalDef,
  browserWaitDef,
} from "./def"

function getBrowserConfig(): { backend: BrowserBackend; cdpPort?: number; wslAutoLaunch: boolean } {
  const defaultConfig = { backend: "agent-browser" as BrowserBackend, wslAutoLaunch: true }
  
  try {
    const userConfigPath = join(getUserConfigDir(), "opencode", "oh-my-opencode.json")
    const projectConfigPath = join(process.cwd(), ".opencode", "oh-my-opencode.json")
    
    let browserConfig: BrowserAutomationConfig | undefined
    
    // Check project config first, then user config (to match load priority, though simple override here)
    // Actually standard is user base + project override.
    // We'll check project first, if found use it. If not, check user.
    // This is a simplified lookup since we don't have deep merge here.
    
    if (existsSync(projectConfigPath)) {
        const content = readFileSync(projectConfigPath, "utf-8")
        const config = parseJsonc<{ browser_automation_engine?: BrowserAutomationConfig }>(content)
        if (config?.browser_automation_engine) browserConfig = config.browser_automation_engine
    }
    
    if (!browserConfig && existsSync(userConfigPath)) {
        const content = readFileSync(userConfigPath, "utf-8")
        const config = parseJsonc<{ browser_automation_engine?: BrowserAutomationConfig }>(content)
        if (config?.browser_automation_engine) browserConfig = config.browser_automation_engine
    }
    
    return {
      backend: browserConfig?.provider ?? "agent-browser",
      cdpPort: undefined,
      wslAutoLaunch: true,
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
  ...browserOpenDef,
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
  ...browserSnapshotDef,
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
  ...browserScreenshotDef,
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
  ...browserClickDef,
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
  ...browserFillDef,
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
  ...browserCloseDef,
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
  ...browserBackDef,
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
  ...browserForwardDef,
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
  ...browserReloadDef,
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
  ...browserGetUrlDef,
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
  ...browserGetTitleDef,
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
  ...browserTypeDef,
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
  ...browserPressDef,
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
  ...browserHoverDef,
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
  ...browserScrollDef,
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
  ...browserSelectDef,
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
  ...browserEvalDef,
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
  ...browserWaitDef,
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
