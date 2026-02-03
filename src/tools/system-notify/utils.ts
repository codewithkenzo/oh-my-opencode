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
    } catch (err) {
      // /proc/version may not exist on all Linux systems
    }
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

async function notifyLinux(title: string, message: string, imagePath?: string): Promise<boolean> {
  const args = [title, message]
  if (imagePath) {
    args.unshift("-i", imagePath)
  }
  return execCommand("notify-send", args)
}

async function notifyMac(title: string, message: string): Promise<boolean> {
  const escapedTitle = title.replace(/"/g, '\\"')
  const escapedMessage = message.replace(/"/g, '\\"')
  const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`
  return execCommand("osascript", ["-e", script])
}

async function notifyWSL(title: string, message: string, imagePath?: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  
  let psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  if (imagePath) {
    const winPath = convertToWindowsPath(imagePath)
    psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}' -HeroImage '${winPath}'`
  }
  
  const burntToast = await execCommand("powershell.exe", ["-NoProfile", "-Command", psCommand])
  if (burntToast) return true
  
  const fullMessage = `${title}: ${message}`.replace(/"/g, "'")
  return execCommand("msg.exe", ["%USERNAME%", "/TIME:10", fullMessage])
}

async function notifyWindows(title: string, message: string, imagePath?: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  
  let psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  if (imagePath) {
    psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}' -HeroImage '${imagePath}'`
  }
  
  return execCommand("powershell", ["-NoProfile", "-Command", psCommand])
}

export interface SendNotificationOptions {
  title: string
  message: string
  imagePath?: string
  pathToOpen?: string
}

export async function sendSystemNotification(options: SendNotificationOptions): Promise<boolean> {
  const plat = detectPlatform()
  const { title, message, imagePath, pathToOpen } = options
  
  let success = false
  switch (plat) {
    case "linux":
      success = await notifyLinux(title, message, imagePath)
      break
    case "darwin":
      success = await notifyMac(title, message)
      break
    case "wsl":
      success = await notifyWSL(title, message, imagePath)
      break
    case "win32":
      success = await notifyWindows(title, message, imagePath)
      break
    default:
      return false
  }
  
  if (pathToOpen && success) {
    await openPath(pathToOpen, plat)
  }
  
  return success
}
