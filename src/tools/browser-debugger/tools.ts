import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync } from "fs"
import { dirname } from "path"
import { BROWSER_DEBUGGER_DESCRIPTION, RELAY_URL } from "./constants"
import type { BrowserDebuggerArgs } from "./types"
import { log } from "../../shared/logger"

interface RelayInfo {
  mode: string
  extensionConnected: boolean
  wsEndpoint: string
}

interface PageInfo {
  targetId: string
  url?: string
}

async function fetchRelay<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${RELAY_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw new Error(`Relay error: ${response.status} ${await response.text()}`)
  }
  return response.json() as Promise<T>
}

async function isRelayRunning(): Promise<boolean> {
  try {
    await fetch(RELAY_URL, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

export const browser_debugger = tool({
  description: BROWSER_DEBUGGER_DESCRIPTION,
  args: {
    action: tool.schema
      .enum(["screenshot", "navigate", "snapshot", "info"])
      .describe("Action to perform"),
    url: tool.schema.string().optional().describe("URL to navigate to (for navigate action)"),
    page_name: tool.schema.string().optional().describe("Page identifier (default: 'debug')"),
    output_path: tool.schema.string().optional().describe("Screenshot output path (default: tmp/screenshot.png)"),
  },
  async execute(args: BrowserDebuggerArgs) {
    log(`[browser-debugger] Action: ${args.action}`)

    if (!(await isRelayRunning())) {
      return "Error: Browser relay not running. The relay should auto-start on session creation if browser-debugger skill is installed."
    }

    const pageName = args.page_name ?? "debug"

    try {
      switch (args.action) {
        case "info": {
          const info = await fetchRelay<RelayInfo>("/")
          return `Relay Status:
- Mode: ${info.mode}
- Extension Connected: ${info.extensionConnected}
- WebSocket: ${info.wsEndpoint}`
        }

        case "navigate": {
          if (!args.url) {
            return "Error: url parameter required for navigate action"
          }

          const pageInfo = await fetchRelay<PageInfo>("/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: pageName }),
          })

          log(`[browser-debugger] Got page: ${pageInfo.targetId}`)
          return `Page "${pageName}" ready. Use screenshot action to capture.

Note: Navigation happens via the browser extension. Open ${args.url} in the connected browser.`
        }

        case "snapshot": {
          await fetchRelay("/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: pageName }),
          })

          return `ARIA snapshot requires Playwright connection. Use the browser-debugger skill scripts for full functionality:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
import { connect } from "@/client.js";
const client = await connect();
const snapshot = await client.getAISnapshot("${pageName}");
console.log(snapshot);
await client.disconnect();
EOF
\`\`\``
        }

        case "screenshot": {
          const outputPath = args.output_path ?? "tmp/screenshot.png"
          const dir = dirname(outputPath)
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
          }

          return `Screenshot requires Playwright connection. Use the browser-debugger skill scripts:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";
const client = await connect();
const page = await client.page("${pageName}");
await waitForPageLoad(page);
await page.screenshot({ path: "${outputPath}", fullPage: true });
console.log("Screenshot saved to ${outputPath}");
await client.disconnect();
EOF
\`\`\`

Then use look_at tool to analyze: \`look_at(file_path="${outputPath}", goal="...")\``
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
