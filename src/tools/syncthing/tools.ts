import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import * as client from "./client"
import {
  syncthing_connectionsDef,
  syncthing_device_addDef,
  syncthing_device_removeDef,
  syncthing_devicesDef,
  syncthing_folder_addDef,
  syncthing_folder_pauseDef,
  syncthing_folder_removeDef,
  syncthing_folder_rescanDef,
  syncthing_foldersDef,
  syncthing_ignores_getDef,
  syncthing_ignores_setDef,
  syncthing_shareDef,
  syncthing_statusDef,
  syncthing_unshareDef,
  syncthing_versioningDef,
} from "./def"
import * as formatters from "./formatters"
import { SyncthingError, type Connection } from "./types"

export const syncthing_status: ToolDefinition = tool({
  ...syncthing_statusDef,
  async execute({ format: fmt = "markdown" }) {
    try {
      const status = await client.getSystemStatus()
      if (fmt === "json") return JSON.stringify(status, null, 2)
      if (fmt === "compact") return formatters.formatStatusCompact(status)
      return formatters.formatStatusMarkdown(status)
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_folders: ToolDefinition = tool({
  ...syncthing_foldersDef,
  async execute({ format: fmt = "markdown" }) {
    try {
      const folders = await client.listFolders()
      if (fmt === "json") return JSON.stringify(folders, null, 2)
      if (fmt === "compact") return formatters.formatFoldersCompact(folders)
      return formatters.formatFoldersMarkdown(folders)
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_folder_add: ToolDefinition = tool({
  ...syncthing_folder_addDef,
  async execute({ id, path, label }) {
    try {
      await client.addFolder(id, path, label)
      return `Folder '${id}' added successfully at ${path}`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_folder_remove: ToolDefinition = tool({
  ...syncthing_folder_removeDef,
  async execute({ id }) {
    try {
      await client.removeFolder(id)
      return `Folder '${id}' removed from sync (files on disk unchanged)`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_folder_pause: ToolDefinition = tool({
  ...syncthing_folder_pauseDef,
  async execute({ id, paused }) {
    try {
      await client.pauseFolder(id, paused)
      return `Folder '${id}' ${paused ? "paused" : "resumed"}`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_folder_rescan: ToolDefinition = tool({
  ...syncthing_folder_rescanDef,
  async execute({ id }) {
    try {
      await client.rescanFolder(id)
      return `Rescan triggered for folder '${id}'`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_devices: ToolDefinition = tool({
  ...syncthing_devicesDef,
  async execute({ format: fmt = "markdown" }) {
    try {
      const devices = await client.listDevices()
      if (fmt === "json") return JSON.stringify(devices, null, 2)
      if (fmt === "compact") return formatters.formatDevicesCompact(devices)
      return formatters.formatDevicesMarkdown(devices)
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_device_add: ToolDefinition = tool({
  ...syncthing_device_addDef,
  async execute({ device_id, name }) {
    try {
      await client.addDevice(device_id, name)
      return `Device '${device_id.slice(0, 7)}...' added${name ? ` as '${name}'` : ""}`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_device_remove: ToolDefinition = tool({
  ...syncthing_device_removeDef,
  async execute({ device_id }) {
    try {
      await client.removeDevice(device_id)
      return `Device '${device_id.slice(0, 7)}...' removed`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_share: ToolDefinition = tool({
  ...syncthing_shareDef,
  async execute({ folder_id, device_id }) {
    try {
      await client.shareFolder(folder_id, device_id)
      return `Folder '${folder_id}' now shared with device '${device_id.slice(0, 7)}...'`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_unshare: ToolDefinition = tool({
  ...syncthing_unshareDef,
  async execute({ folder_id, device_id }) {
    try {
      await client.unshareFolder(folder_id, device_id)
      return `Device '${device_id.slice(0, 7)}...' removed from folder '${folder_id}'`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_ignores_get: ToolDefinition = tool({
  ...syncthing_ignores_getDef,
  async execute({ folder_id }) {
    try {
      const patterns = await client.getIgnores(folder_id)
      return formatters.formatIgnoresMarkdown(patterns)
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_ignores_set: ToolDefinition = tool({
  ...syncthing_ignores_setDef,
  async execute({ folder_id, patterns }) {
    try {
      await client.setIgnores(folder_id, patterns)
      return `Set ${patterns.length} ignore pattern(s) for folder '${folder_id}':\n${patterns.map(p => `  - ${p}`).join("\n")}`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_versioning: ToolDefinition = tool({
  ...syncthing_versioningDef,
  async execute({ folder_id, type, max_age, clean_interval }) {
    try {
      const params: Record<string, string> = {}
      if (max_age) params.maxAge = max_age
      if (clean_interval) params.cleanInterval = clean_interval
      await client.setVersioning(folder_id, type, Object.keys(params).length > 0 ? params : undefined)
      return `Versioning for '${folder_id}' set to '${type === "none" ? "disabled" : type}'`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_connections: ToolDefinition = tool({
  ...syncthing_connectionsDef,
  async execute({ format: fmt = "markdown" }) {
    try {
      const response = await client.getConnections()
      if (fmt === "json") return JSON.stringify(response, null, 2)
      if (fmt === "compact") return formatters.formatConnectionsCompact(response.connections as Record<string, Connection>)
      return formatters.formatConnectionsMarkdown(response.connections as Record<string, Connection>)
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthingTools: Record<string, ToolDefinition> = {
  syncthing_status,
  syncthing_folders,
  syncthing_folder_add,
  syncthing_folder_remove,
  syncthing_folder_pause,
  syncthing_folder_rescan,
  syncthing_devices,
  syncthing_device_add,
  syncthing_device_remove,
  syncthing_share,
  syncthing_unshare,
  syncthing_ignores_get,
  syncthing_ignores_set,
  syncthing_versioning,
  syncthing_connections,
}
