import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { platform } from "node:os"
import type { Platform } from "./types"

const TIMEOUT_MS = 10000

export function detectPlatform(): Platform {
  const os = platform()
  if (os === "darwin") return "darwin"
  if (os === "win32") return "win32"
  if (os === "linux") {
    try {
      const release = readFileSync("/proc/version", "utf8")
      if (release.toLowerCase().includes("microsoft")) return "wsl"
    } catch {}
    return "linux"
  }
  return "unsupported"
}

export function execCommand(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: "ignore", timeout: TIMEOUT_MS })
    proc.on("close", (code) => resolve(code === 0))
    proc.on("error", () => resolve(false))
  })
}

export async function openPath(path: string, plat: Platform): Promise<boolean> {
  if (!path) return false

  const isUrl = path.startsWith("http://") || path.startsWith("https://")

  switch (plat) {
    case "linux":
      return execCommand("xdg-open", [path])

    case "darwin":
      return execCommand("open", [path])

    case "wsl":
      if (isUrl) {
        return execCommand("wslview", [path])
      }
      return execCommand("wslview", [path])

    case "win32":
      if (isUrl) {
        return execCommand("cmd", ["/c", "start", "", path])
      }
      return execCommand("cmd", ["/c", "start", "", path])

    default:
      return false
  }
}

export function convertToWindowsPath(wslPath: string): string {
  if (wslPath.startsWith("/mnt/")) {
    const parts = wslPath.slice(5).split("/")
    const drive = parts[0].toUpperCase()
    const rest = parts.slice(1).join("\\")
    return `${drive}:\\${rest}`
  }
  return wslPath
}
