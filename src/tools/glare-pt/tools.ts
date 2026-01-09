import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { browserManager } from "./client"
import { listAvailableBrowsers } from "./browsers"
import { GLARE_DESCRIPTION } from "./constants"
import type { BrowserType } from "./types"

export const glarePt: ToolDefinition = tool({
  description: GLARE_DESCRIPTION,
  args: {
    action: tool.schema
      .enum([
        "connect", "disconnect", "status", "profiles",
        "navigate", "screenshot", "click", "type",
        "eval", "content", "wait", "auth"
      ])
      .describe("Action to perform"),

    browser: tool.schema
      .enum(["chrome", "chromium", "comet", "edge", "brave"])
      .describe("Browser to use. Run action=profiles to see available options."),
    profile: tool.schema
      .string()
      .describe("Browser profile name (e.g., \"Default\", \"Profile 1\"). Run action=profiles to see available options."),
    headless: tool.schema
      .boolean()
      .optional()
      .describe("Run headless (default: false for auth, true otherwise)"),

    url: tool.schema.string().optional().describe("URL to navigate to"),
    selector: tool.schema.string().optional().describe("CSS selector"),
    text: tool.schema.string().optional().describe("Text to type"),
    script: tool.schema.string().optional().describe("JavaScript to execute"),

    output_path: tool.schema.string().optional().describe("Screenshot output path"),
    format: tool.schema
      .enum(["text", "html", "markdown"])
      .optional()
      .describe("Content format (default: text)"),
    timeout: tool.schema
      .number()
      .optional()
      .describe("Timeout in ms (default: 30000)"),
  },

  async execute(args) {
    const timeout = args.timeout ?? 30000

    try {
      switch (args.action) {
        case "connect": {
          await browserManager.connect({
            browser: args.browser as BrowserType,
            profile: args.profile,
            headless: args.headless ?? false,
          })

          const config = browserManager.getConfig()
          return `Connected to ${config?.browser} (profile: ${config?.profile ?? "Default"})`
        }

        case "disconnect": {
          await browserManager.disconnect()
          return "Browser disconnected"
        }

        case "status": {
          if (!browserManager.isConnected()) {
            return "Not connected. Use action=\"connect\" to start."
          }

          const config = browserManager.getConfig()
          const page = await browserManager.getPage()
          const url = page.url()

          return `Connected: ${config?.browser} (profile: ${config?.profile ?? "Default"})\nCurrent URL: ${url}`
        }

        case "profiles": {
          const browsers = listAvailableBrowsers()
          if (browsers.length === 0) {
            return "No supported browsers found."
          }

          let result = "Available browsers and profiles:\n\n"
          for (const browser of browsers) {
            result += `**${browser.name}**\n`
            result += `  Path: ${browser.executablePath}\n`
            result += `  Profiles: ${browser.profiles.join(", ")}\n\n`
          }
          return result
        }

        case "auth": {
          if (!args.url) {
            return "Error: url parameter required for auth action"
          }

          await browserManager.connect({
            browser: args.browser as BrowserType,
            profile: args.profile,
            headless: false,
          })

          const page = await browserManager.getPage()
          await page.goto(args.url, { waitUntil: "networkidle2", timeout })

          return `Browser opened to ${args.url}

1. Log in manually in the browser window
2. Complete any 2FA if prompted
3. Session is saved automatically to your profile
4. Use action="navigate" for future visits (already authenticated)`
        }

        case "navigate": {
          if (!args.url) return "Error: url parameter required"

          if (!browserManager.isConnected()) {
            await browserManager.connect({
              browser: args.browser as BrowserType,
              profile: args.profile,
              headless: args.headless,
            })
          }

          const page = await browserManager.getPage()
          await page.goto(args.url, { waitUntil: "networkidle2", timeout })

          return `Navigated to ${args.url}`
        }

        case "click": {
          if (!args.selector) return "Error: selector parameter required"

          const page = await browserManager.getPage()
          await page.waitForSelector(args.selector, { timeout })
          await page.click(args.selector)

          return `Clicked: ${args.selector}`
        }

        case "type": {
          if (!args.selector) return "Error: selector parameter required"
          if (!args.text) return "Error: text parameter required"

          const page = await browserManager.getPage()
          await page.waitForSelector(args.selector, { timeout })
          await page.type(args.selector, args.text)

          return `Typed "${args.text}" into ${args.selector}`
        }

        case "wait": {
          const page = await browserManager.getPage()

          if (args.selector) {
            await page.waitForSelector(args.selector, { timeout })
            return `Element found: ${args.selector}`
          } else {
            const waitTime = args.timeout ?? 1000
            await new Promise(resolve => setTimeout(resolve, waitTime))
            return `Waited ${waitTime}ms`
          }
        }

        case "screenshot": {
          const page = await browserManager.getPage()
          const outputPath = args.output_path ?? "tmp/glare-screenshot.png"

          const dir = dirname(outputPath)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

          if (args.selector) {
            const element = await page.$(args.selector)
            if (!element) return `Error: Element not found: ${args.selector}`
            await element.screenshot({ path: outputPath })
          } else {
            await page.screenshot({ path: outputPath, fullPage: true })
          }

          return `Screenshot saved to ${outputPath}. Use look_at tool to analyze.`
        }

        case "content": {
          const page = await browserManager.getPage()
          const format = args.format ?? "text"

          let content: string

          if (format === "html") {
            content = await page.content()
          } else if (format === "markdown") {
            const html = await page.content()
            const TurndownService = (await import("turndown")).default
            const turndown = new TurndownService({
              headingStyle: "atx",
              codeBlockStyle: "fenced",
            })
            turndown.remove(["script", "style", "noscript"])
            content = turndown.turndown(html)
          } else {
            content = await page.evaluate("document.body.innerText") as string
          }

          if (content.length > 50000) {
            content = content.substring(0, 50000) + "\n\n[Truncated...]"
          }

          return content
        }

        case "eval": {
          if (!args.script) return "Error: script parameter required"

          const page = await browserManager.getPage()
          const result = await page.evaluate(args.script)

          return JSON.stringify(result, null, 2)
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
