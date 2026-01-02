import { $ } from "bun"
import {
  SyncthingError,
  SyncthingConfigSchema,
  SystemStatusSchema,
  ConnectionsResponseSchema,
  type SyncthingConfig,
  type SystemStatus,
  type ConnectionsResponse,
  type Folder,
  type Device,
} from "./types"

async function execCli(args: string[]): Promise<string> {
  try {
    const result = await $`syncthing cli ${args}`.text()
    return result.trim()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("not found") || message.includes("No such file")) {
      throw new SyncthingError(
        "Syncthing CLI not found. Install with: pacman -S syncthing",
        "NOT_RUNNING"
      )
    }
    if (message.includes("connection refused") || message.includes("dial")) {
      throw new SyncthingError(
        "Syncthing is not running. Start with: syncthing serve",
        "NOT_RUNNING"
      )
    }
    throw new SyncthingError(`CLI error: ${message}`, "CLI_ERROR", error)
  }
}

async function execCliJson<T>(args: string[], schema: { parse: (data: unknown) => T }): Promise<T> {
  const output = await execCli(args)
  try {
    const data = JSON.parse(output)
    return schema.parse(data)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyncthingError(`Failed to parse JSON: ${output.slice(0, 100)}`, "PARSE_ERROR", error)
    }
    throw error
  }
}

export async function getConfig(): Promise<SyncthingConfig> {
  return execCliJson(["config", "dump-json"], SyncthingConfigSchema)
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return execCliJson(["show", "system"], SystemStatusSchema)
}

export async function getConnections(): Promise<ConnectionsResponse> {
  return execCliJson(["show", "connections"], ConnectionsResponseSchema)
}

export async function listFolders(): Promise<Folder[]> {
  const config = await getConfig()
  return config.folders
}

export async function listDevices(): Promise<Device[]> {
  const config = await getConfig()
  return config.devices
}

export async function addFolder(id: string, path: string, label?: string): Promise<void> {
  const args = ["config", "folders", "add", "--id", id, "--path", path]
  if (label) {
    args.push("--label", label)
  }
  await execCli(args)
}

export async function removeFolder(id: string): Promise<void> {
  await execCli(["config", "folders", id, "delete"])
}

export async function pauseFolder(id: string, paused: boolean): Promise<void> {
  await execCli(["config", "folders", id, "paused", "set", paused.toString()])
}

export async function rescanFolder(id: string): Promise<void> {
  const apiKey = await getApiKey()
  const guiAddress = await getGuiAddress()
  const url = `http://${guiAddress}/rest/db/scan?folder=${encodeURIComponent(id)}`
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
  })
  
  if (!response.ok) {
    throw new SyncthingError(`Rescan failed: ${response.status} ${response.statusText}`, "API_ERROR")
  }
}

async function getApiKey(): Promise<string> {
  try {
    const result = await $`syncthing cli config gui apikey get`.text()
    return result.trim()
  } catch {
    throw new SyncthingError("Failed to get API key", "CLI_ERROR")
  }
}

async function getGuiAddress(): Promise<string> {
  try {
    const status = await getSystemStatus()
    return status.guiAddressUsed || "127.0.0.1:8384"
  } catch {
    return "127.0.0.1:8384"
  }
}

export async function addDevice(deviceId: string, name?: string): Promise<void> {
  const args = ["config", "devices", "add", "--device-id", deviceId]
  if (name) {
    args.push("--name", name)
  }
  await execCli(args)
}

export async function removeDevice(deviceId: string): Promise<void> {
  await execCli(["config", "devices", deviceId, "delete"])
}

export async function shareFolder(folderId: string, deviceId: string): Promise<void> {
  await execCli(["config", "folders", folderId, "devices", "add", "--device-id", deviceId])
}

export async function unshareFolder(folderId: string, deviceId: string): Promise<void> {
  await execCli(["config", "folders", folderId, "devices", deviceId, "delete"])
}

export async function getIgnores(folderId: string): Promise<string[]> {
  const config = await getConfig()
  const folder = config.folders.find((f) => f.id === folderId)
  if (!folder) {
    return []
  }

  let folderPath = folder.path
  if (folderPath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    folderPath = folderPath.replace("~", home)
  }

  const stignorePath = `${folderPath}/.stignore`
  const file = Bun.file(stignorePath)
  if (!(await file.exists())) {
    return []
  }
  
  const content = await file.text()
  return content.split("\n").filter((line) => line.trim() && !line.startsWith("//") && !line.startsWith("#"))
}

export async function setIgnores(folderId: string, patterns: string[]): Promise<void> {
  const config = await getConfig()
  const folder = config.folders.find((f) => f.id === folderId)
  if (!folder) {
    throw new SyncthingError(`Folder '${folderId}' not found`, "NOT_FOUND")
  }

  let folderPath = folder.path
  if (folderPath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    folderPath = folderPath.replace("~", home)
  }

  const stignorePath = `${folderPath}/.stignore`
  const content = patterns.join("\n") + (patterns.length > 0 ? "\n" : "")
  await Bun.write(stignorePath, content)
}

export async function setVersioning(
  folderId: string,
  type: string,
  params?: Record<string, string>
): Promise<void> {
  const cliType = type === "none" ? "" : type
  await execCli(["config", "folders", folderId, "versioning", "type", "set", cliType])
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      await execCli(["config", "folders", folderId, "versioning", "params", "set", key, value])
    }
  }
}

export async function isRunning(): Promise<boolean> {
  try {
    await execCli(["show", "version"])
    return true
  } catch {
    return false
  }
}
