import { existsSync, readdirSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import type { BrowserType, BrowserInfo } from "./types"

let cachedWindowsUser: string | null = null
let cachedIsWSL: boolean | null = null

export const isWSL = (): boolean => {
  if (cachedIsWSL !== null) return cachedIsWSL
  try {
    const proc = Bun.spawnSync(["cat", "/proc/version"])
    const version = proc.stdout.toString()
    cachedIsWSL = version.toLowerCase().includes("microsoft")
    return cachedIsWSL
  } catch {
    cachedIsWSL = false
    return false
  }
}

export const getWindowsUser = (): string => {
  if (cachedWindowsUser) return cachedWindowsUser
  
  try {
    const result = Bun.spawnSync(["cmd.exe", "/c", "echo %USERNAME%"])
    cachedWindowsUser = result.stdout.toString().trim()
    return cachedWindowsUser
  } catch {
    return "User"
  }
}

export const wslToWindowsPath = (wslPath: string): string => {
  if (!wslPath.startsWith("/mnt/")) return wslPath
  const match = wslPath.match(/^\/mnt\/([a-z])\/(.*)$/)
  if (!match) return wslPath
  const [, drive, rest] = match
  return `${drive.toUpperCase()}:\\${rest.replace(/\//g, "\\")}`
}

interface BrowserPaths {
  linux: { executable: string; userData: string }
  windows: { executable: string; userData: string }
}

const getBrowserPaths = (): Record<string, BrowserPaths> => {
  const winUser = getWindowsUser()
  
  return {
    chrome: {
      linux: {
        executable: "/usr/bin/google-chrome",
        userData: join(homedir(), ".config/google-chrome"),
      },
      windows: {
        executable: "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
        userData: `/mnt/c/Users/${winUser}/AppData/Local/Google/Chrome/User Data`,
      },
    },
    chromium: {
      linux: {
        executable: "/usr/bin/chromium-browser",
        userData: join(homedir(), ".config/chromium"),
      },
      windows: {
        executable: "/mnt/c/Program Files/Chromium/Application/chrome.exe",
        userData: `/mnt/c/Users/${winUser}/AppData/Local/Chromium/User Data`,
      },
    },
    comet: {
      linux: {
        executable: join(homedir(), ".local/share/perplexity/comet/comet"),
        userData: join(homedir(), ".config/perplexity/comet"),
      },
      windows: {
        executable: `/mnt/c/Users/${winUser}/AppData/Local/Perplexity/Comet/Application/comet.exe`,
        userData: `/mnt/c/Users/${winUser}/AppData/Local/Perplexity/Comet/User Data`,
      },
    },
    edge: {
      linux: {
        executable: "/usr/bin/microsoft-edge",
        userData: join(homedir(), ".config/microsoft-edge"),
      },
      windows: {
        executable: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        userData: `/mnt/c/Users/${winUser}/AppData/Local/Microsoft/Edge/User Data`,
      },
    },
    brave: {
      linux: {
        executable: "/usr/bin/brave-browser",
        userData: join(homedir(), ".config/BraveSoftware/Brave-Browser"),
      },
      windows: {
        executable: "/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
        userData: `/mnt/c/Users/${winUser}/AppData/Local/BraveSoftware/Brave-Browser/User Data`,
      },
    },
  }
}

export function findBrowser(type: BrowserType): BrowserInfo | null {
  if (type === "auto") {
    for (const browser of ["chrome", "chromium", "comet", "edge", "brave"]) {
      const info = findBrowser(browser as BrowserType)
      if (info) return info
    }
    return null
  }

  const BROWSER_PATHS = getBrowserPaths()
  const paths = BROWSER_PATHS[type]
  if (!paths) return null

  const platform = isWSL() ? "windows" : "linux"
  const { executable, userData } = paths[platform]

  if (!existsSync(executable)) return null

  const profiles: string[] = []
  if (existsSync(userData)) {
    try {
      const entries = readdirSync(userData, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name === "Default" || entry.name.startsWith("Profile ")) {
            profiles.push(entry.name)
          }
        }
      }
    } catch {}
  }

  return {
    name: type,
    executablePath: executable,
    userDataDir: userData,
    profiles: profiles.length > 0 ? profiles : ["Default"],
  }
}

export function listAvailableBrowsers(): BrowserInfo[] {
  const browsers: BrowserInfo[] = []
  for (const type of ["chrome", "chromium", "comet", "edge", "brave"]) {
    const info = findBrowser(type as BrowserType)
    if (info) browsers.push(info)
  }
  return browsers
}
