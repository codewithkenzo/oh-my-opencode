import { spawn, execSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

export type BrowserBackend = "agent-browser" | "browser"

export interface BrowserAdapter {
  open(url: string): Promise<string>
  snapshot(interactive?: boolean): Promise<string>
  screenshot(outputPath: string): Promise<string>
  click(target: string): Promise<string>
  fill(target: string, text: string): Promise<string>
  type(target: string, text: string, delay?: number): Promise<string>
  press(key: string): Promise<string>
  hover(target: string): Promise<string>
  scroll(direction: string, amount?: number): Promise<string>
  select(target: string, value: string): Promise<string>
  eval(script: string): Promise<string>
  wait(selectorOrTimeout: string | number): Promise<string>
  back(): Promise<string>
  forward(): Promise<string>
  reload(): Promise<string>
  getUrl(): Promise<string>
  getTitle(): Promise<string>
  close(): Promise<string>
}

let activeCdpPort: number | undefined
let chromeProcess: ReturnType<typeof spawn> | undefined

function isWSL(): boolean {
  try {
    const release = execSync("uname -r", { encoding: "utf-8" }).toLowerCase()
    return release.includes("microsoft") || release.includes("wsl")
  } catch {
    return false
  }
}

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

async function launchWindowsChrome(port: number = 9222): Promise<number> {
  if (await isCdpPortActive(port)) {
    return port
  }

  const chromePaths = [
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `/mnt/c/Users/${process.env.USER}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  ]

  let chromePath: string | undefined
  for (const p of chromePaths) {
    if (existsSync(p)) {
      chromePath = p
      break
    }
  }

  if (!chromePath) {
    throw new Error("Chrome not found on Windows. Install Chrome or provide cdp_port manually.")
  }

  const winPath = chromePath.replace(/^\/mnt\/([a-z])\//, (_, drive) => `${drive.toUpperCase()}:\\`).replace(/\//g, "\\")
  
  const proc = spawn("cmd.exe", ["/c", "start", "", winPath, `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check"], {
    detached: true,
    stdio: "ignore",
  })
  proc.unref()
  
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

export async function resolveCdpPort(cdpPort?: number, wslAutoLaunch = true): Promise<number | undefined> {
  if (cdpPort !== undefined) {
    if (await isCdpPortActive(cdpPort)) {
      activeCdpPort = cdpPort
      return cdpPort
    }
    throw new Error(`CDP port ${cdpPort} not responding. Start Chrome with --remote-debugging-port=${cdpPort}`)
  }
  
  if (activeCdpPort && await isCdpPortActive(activeCdpPort)) {
    return activeCdpPort
  }
  
  if (wslAutoLaunch && isWSL()) {
    try {
      return await launchWindowsChrome(9222)
    } catch {
      // Fall through to bundled mode
    }
  }
  
  return undefined
}

export function clearBrowserSession(): void {
  activeCdpPort = undefined
  if (chromeProcess) {
    chromeProcess.kill()
    chromeProcess = undefined
  }
}

function runCli(binary: string, args: string[], cdpPort?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmdArgs = cdpPort ? ["--cdp", String(cdpPort), ...args] : args
    
    const proc = spawn(binary, cmdArgs, {
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
        reject(new Error(stderr.trim() || `${binary} exited with code ${code}`))
      }
    })
    
    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error(`${binary} not found. Install with: ${binary === "agent-browser" ? "bun add -g agent-browser" : "curl -fsSL https://raw.githubusercontent.com/camhahu/browser/main/packages/cli/install.sh | bash"}`))
      } else {
        reject(err)
      }
    })
  })
}

export function createAgentBrowserAdapter(cdpPort?: number): BrowserAdapter {
  const run = (args: string[]) => runCli("agent-browser", args, cdpPort)
  
  return {
    open: (url) => run(["open", url]),
    snapshot: (interactive) => run(interactive ? ["snapshot", "-i"] : ["snapshot"]),
    screenshot: async (outputPath) => {
      const fullPath = resolve(process.cwd(), outputPath)
      const dir = dirname(fullPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      await run(["screenshot", fullPath])
      return `Screenshot saved: ${fullPath}`
    },
    click: (target) => run(["click", target]),
    fill: (target, text) => run(["fill", target, text]),
    type: (target, text, delay) => delay ? run(["type", target, text, "--delay", String(delay)]) : run(["type", target, text]),
    press: (key) => run(["press", key]),
    hover: (target) => run(["hover", target]),
    scroll: (direction, amount) => amount ? run(["scroll", direction, String(amount)]) : run(["scroll", direction]),
    select: (target, value) => run(["select", target, value]),
    eval: (script) => run(["eval", script]),
    wait: (selectorOrTimeout) => run(["wait", String(selectorOrTimeout)]),
    back: () => run(["back"]),
    forward: () => run(["forward"]),
    reload: () => run(["reload"]),
    getUrl: () => run(["get", "url"]),
    getTitle: () => run(["get", "title"]),
    close: () => run(["close"]),
  }
}

export function createCamhahuBrowserAdapter(cdpPort?: number): BrowserAdapter {
  const run = (args: string[]) => runCli("browser", args, cdpPort)
  
  return {
    open: (url) => run(["open", url]),
    snapshot: (interactive) => run(interactive ? ["outline"] : ["outline", "-a"]),
    screenshot: async (outputPath) => {
      const fullPath = resolve(process.cwd(), outputPath)
      const dir = dirname(fullPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      await run(["screenshot", fullPath])
      return `Screenshot saved: ${fullPath}`
    },
    click: (target) => run(["click", target]),
    fill: (target, text) => run(["type", text, target]),
    type: (target, text) => run(["type", text, target]),
    press: (key) => run(["type", key]),
    hover: (target) => run(["hover", target]),
    scroll: (direction, _amount) => {
      const target = direction === "down" ? "bottom" : direction === "up" ? "top" : direction
      return run(["scroll", target])
    },
    select: (target, value) => run(["select", target, value]),
    eval: (script) => run(["eval", script]),
    wait: (selectorOrTimeout) => run(["wait", String(selectorOrTimeout)]),
    back: () => run(["back"]),
    forward: () => run(["forward"]),
    reload: () => run(["refresh"]),
    getUrl: () => run(["url"]),
    getTitle: () => run(["title"]),
    close: () => run(["stop"]),
  }
}

export function createBrowserAdapter(backend: BrowserBackend, cdpPort?: number): BrowserAdapter {
  return backend === "browser" 
    ? createCamhahuBrowserAdapter(cdpPort)
    : createAgentBrowserAdapter(cdpPort)
}

export function formatRef(ref: number, backend: BrowserBackend): string {
  return backend === "browser" ? `l${ref}` : `@e${ref}`
}
