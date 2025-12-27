import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { spawn } from "bun"
import { z } from "zod"
import { BROWSER_DEBUGGER_DESCRIPTION, RELAY_URL } from "./constants"
import type { BrowserDebuggerArgs } from "./types"
import { log } from "../../shared/logger"
import { getUserConfigDir } from "../../shared/config-path"

const SKILL_DIR = join(getUserConfigDir(), "opencode", "skill", "browser-debugger")

const RelayInfoSchema = z.object({
  mode: z.string(),
  extensionConnected: z.boolean(),
  wsEndpoint: z.string(),
})

const PageInfoSchema = z.object({
  targetId: z.string(),
  url: z.string().optional(),
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
    log("[browser-debugger] Schema validation failed:", result.error.issues)
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
    return `Error: browser-debugger skill not installed at ${SKILL_DIR}`
  }

  log("[browser-debugger] Starting relay server...")

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

  return "Error: Failed to start relay server. Check that browser-debugger skill is properly installed."
}

function generateScript(action: string, pageName: string, args: BrowserDebuggerArgs): string {
  const baseImport = `import { connect, waitForPageLoad } from "@/client.js";`
  
  switch (action) {
    case "console":
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => logs.push({ type: 'error', text: err.message }));

await new Promise(r => setTimeout(r, 1000));
console.log(JSON.stringify(logs, null, 2));
await client.disconnect();`

    case "styles":
      if (!args.selector) return "// Error: selector required"
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

const styles = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return { error: 'Element not found: ' + sel };
  const computed = window.getComputedStyle(el);
  return {
    display: computed.display,
    position: computed.position,
    width: computed.width,
    height: computed.height,
    padding: computed.padding,
    margin: computed.margin,
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily,
    flexDirection: computed.flexDirection,
    gap: computed.gap,
    border: computed.border,
    borderRadius: computed.borderRadius,
    boxShadow: computed.boxShadow,
  };
}, "${args.selector}");

console.log(JSON.stringify(styles, null, 2));
await client.disconnect();`

    case "network":
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

const requests = [];
page.on('request', req => requests.push({ 
  method: req.method(), 
  url: req.url().substring(0, 100),
  resourceType: req.resourceType()
}));
page.on('response', res => {
  const req = requests.find(r => res.url().startsWith(r.url.substring(0, 50)));
  if (req) req.status = res.status();
});

await new Promise(r => setTimeout(r, 2000));
console.log(JSON.stringify(requests.slice(-20), null, 2));
await client.disconnect();`

    case "eval":
      if (!args.script) return "// Error: script required"
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

const result = await page.evaluate(() => {
  ${args.script}
});

console.log(JSON.stringify(result, null, 2));
await client.disconnect();`

    case "source":
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

const html = await page.content();
console.log(html);
await client.disconnect();`

    case "click":
      if (!args.selector) return "// Error: selector required"
      return `${baseImport}
const client = await connect();
const page = await client.page("${pageName}");

await page.click("${args.selector}");
await waitForPageLoad(page);
console.log("Clicked: ${args.selector}");
await client.disconnect();`

    default:
      return "// Unknown action"
  }
}

export const browser_debugger = tool({
  description: BROWSER_DEBUGGER_DESCRIPTION,
  args: {
    action: tool.schema
      .enum(["screenshot", "navigate", "snapshot", "info", "start", "console", "styles", "network", "eval", "source", "click"])
      .describe("Action to perform"),
    url: tool.schema.string().optional().describe("URL to navigate to (for navigate action)"),
    page_name: tool.schema.string().optional().describe("Page identifier (default: 'debug')"),
    output_path: tool.schema.string().optional().describe("Screenshot output path (default: tmp/screenshot.png)"),
    selector: tool.schema.string().optional().describe("CSS selector (for styles/click action)"),
    script: tool.schema.string().optional().describe("JavaScript to execute (for eval action)"),
  },
  async execute(args: BrowserDebuggerArgs) {
    log(`[browser-debugger] Action: ${args.action}`)

    if (args.action === "start") {
      return await startRelayServer()
    }

    if (!(await isRelayRunning())) {
      return "Error: Browser relay not running. Use action='start' to start the relay server."
    }

    const pageName = args.page_name ?? "debug"

    try {
      switch (args.action) {
        case "info": {
          const info = await fetchRelayTyped("/", RelayInfoSchema)
          return `Relay Status:
- Mode: ${info.mode}
- Extension Connected: ${info.extensionConnected}
- WebSocket: ${info.wsEndpoint}`
        }

        case "navigate": {
          if (!args.url) {
            return "Error: url parameter required for navigate action"
          }

          const pageInfo = await fetchRelayTyped("/pages", PageInfoSchema, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: pageName }),
          })

          log(`[browser-debugger] Got page: ${pageInfo.targetId}`)
          return `Page "${pageName}" ready. Use screenshot action to capture.

Note: Navigation happens via the browser extension. Open ${args.url} in the connected browser.`
        }

        case "snapshot": {
          const script = `import { connect } from "@/client.js";
const client = await connect();
const snapshot = await client.getAISnapshot("${pageName}");
console.log(snapshot);
await client.disconnect();`

          return `Run this to get ARIA snapshot:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\``
        }

        case "screenshot": {
          const outputPath = args.output_path ?? "tmp/screenshot.png"
          const dir = dirname(outputPath)
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
          }

          const script = `import { connect, waitForPageLoad } from "@/client.js";
const client = await connect();
const page = await client.page("${pageName}");
await waitForPageLoad(page);
await page.screenshot({ path: "${outputPath}", fullPage: true });
console.log("Screenshot saved to ${outputPath}");
await client.disconnect();`

          return `Run this to capture screenshot:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Then use look_at tool to analyze: \`look_at(file_path="${outputPath}", goal="...")\``
        }

        case "console": {
          const script = generateScript("console", pageName, args)
          return `Run this to capture console logs:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

This captures console.log, console.error, console.warn, and page errors.`
        }

        case "styles": {
          if (!args.selector) {
            return "Error: selector parameter required for styles action. Example: selector='.my-button'"
          }
          const script = generateScript("styles", pageName, args)
          return `Run this to get computed styles for "${args.selector}":

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Returns: display, position, width, height, padding, margin, colors, fonts, flex, border, shadows.`
        }

        case "network": {
          const script = generateScript("network", pageName, args)
          return `Run this to capture network requests:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Returns last 20 requests with method, URL, type, and status.`
        }

        case "eval": {
          if (!args.script) {
            return "Error: script parameter required for eval action. Example: script='return document.title'"
          }
          const script = generateScript("eval", pageName, args)
          return `Run this to evaluate JavaScript:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Your script runs in browser context with access to document, window, etc.`
        }

        case "source": {
          const script = generateScript("source", pageName, args)
          return `Run this to get page HTML source:

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Returns full HTML including head and body. Useful for copying website designs.`
        }

        case "click": {
          if (!args.selector) {
            return "Error: selector parameter required for click action. Example: selector='button.submit'"
          }
          const script = generateScript("click", pageName, args)
          return `Run this to click element "${args.selector}":

\`\`\`bash
cd ~/.opencode/skill/browser-debugger && npx tsx <<'EOF'
${script}
EOF
\`\`\`

Clicks the element and waits for page load. Use screenshot after to see result.`
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
