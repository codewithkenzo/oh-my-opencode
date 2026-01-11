import puppeteer, { Browser, Page } from "puppeteer-core"
import { findBrowser, listAvailableBrowsers, isWSL, wslToWindowsPath } from "./browsers"
import type { BrowserConfig } from "./types"
import { DEFAULT_PORT } from "./constants"

const STEALTH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-infobars",
  "--disable-extensions-except=",
  "--disable-plugins-discovery",
  "--disable-dev-shm-usage",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--disable-features=TranslateUI",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-sync",
  "--metrics-recording-only",
  "--no-pings",
  "--password-store=basic",
  "--use-mock-keychain",
]

class BrowserManager {
  private browser: Browser | null = null
  private config: BrowserConfig | null = null

  async connect(config: BrowserConfig = { browser: "auto" }): Promise<Browser> {
    if (this.browser?.isConnected() && this.configMatches(config)) {
      return this.browser
    }

    if (this.browser) {
      await this.disconnect()
    }

    const port = config.port ?? DEFAULT_PORT

    try {
      this.browser = await puppeteer.connect({
        browserURL: `http://localhost:${port}`,
      })
      this.config = config
      return this.browser
    } catch {}

    const browserInfo = findBrowser(config.browser)
    if (!browserInfo) {
      const available = listAvailableBrowsers()
      throw new Error(
        `Browser "${config.browser}" not found. Available: ${available.map(b => b.name).join(", ") || "none"}`
      )
    }

    const userDataDirWsl = config.userDataDir ?? browserInfo.userDataDir
    const userDataDir = isWSL() ? wslToWindowsPath(userDataDirWsl) : userDataDirWsl
    const profileDir = config.profile ?? "Default"

    try {
      this.browser = await puppeteer.launch({
        executablePath: browserInfo.executablePath,
        headless: config.headless === true,
        userDataDir,
        args: [
          `--remote-debugging-port=${port}`,
          `--profile-directory=${profileDir}`,
          ...STEALTH_ARGS,
        ],
        ignoreDefaultArgs: ["--enable-automation"],
      })

      this.config = config
      return this.browser
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      
      if (msg.includes("existing browser session") || msg.includes("user data directory")) {
        throw new Error(
          `Browser "${config.browser}" is already running with this profile. ` +
          `Close the existing browser window first, OR start ${config.browser} manually with: ` +
          `--remote-debugging-port=${port} then retry connect.`
        )
      }
      
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close()
      } catch {}
      this.browser = null
      this.config = null
    }
  }

  async getPage(): Promise<Page> {
    if (!this.browser?.isConnected()) {
      throw new Error("Browser not connected. Use action=\"connect\" first.")
    }

    const pages = await this.browser.pages()
    if (pages.length > 0) {
      return pages[0]
    }

    return await this.browser.newPage()
  }

  isConnected(): boolean {
    return this.browser?.isConnected() ?? false
  }

  getConfig(): BrowserConfig | null {
    return this.config
  }

  private configMatches(config: BrowserConfig): boolean {
    if (!this.config) return false
    return (
      this.config.browser === config.browser &&
      this.config.profile === config.profile &&
      this.config.userDataDir === config.userDataDir
    )
  }
}

export const browserManager = new BrowserManager()
