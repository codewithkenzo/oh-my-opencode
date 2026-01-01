import { tool } from "@opencode-ai/plugin/tool"
import * as client from "./client"
import * as formatters from "./formatters"
import { OutputFormat, SyncthingError, type Connection } from "./types"
import * as constants from "./constants"

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
}

export const syncthing_status = tool({
  description: constants.SYNCTHING_STATUS_DESCRIPTION,
  args: {
    ...formatArg,
  },
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

export const syncthing_folders = tool({
  description: constants.SYNCTHING_FOLDERS_DESCRIPTION,
  args: {
    ...formatArg,
  },
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

export const syncthing_folder_add = tool({
  description: constants.SYNCTHING_FOLDER_ADD_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Unique folder identifier (e.g., 'my-project')"),
    path: tool.schema.string().describe("Absolute path to the folder"),
    label: tool.schema.string().optional().describe("Human-readable label"),
  },
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

export const syncthing_folder_remove = tool({
  description: constants.SYNCTHING_FOLDER_REMOVE_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID to remove"),
  },
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

export const syncthing_folder_pause = tool({
  description: constants.SYNCTHING_FOLDER_PAUSE_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID"),
    paused: tool.schema.boolean().describe("true to pause, false to resume"),
  },
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

export const syncthing_folder_rescan = tool({
  description: constants.SYNCTHING_FOLDER_RESCAN_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID to rescan"),
  },
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

export const syncthing_devices = tool({
  description: constants.SYNCTHING_DEVICES_DESCRIPTION,
  args: {
    ...formatArg,
  },
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

export const syncthing_device_add = tool({
  description: constants.SYNCTHING_DEVICE_ADD_DESCRIPTION,
  args: {
    device_id: tool.schema.string().describe("Syncthing device ID (56 chars with hyphens)"),
    name: tool.schema.string().optional().describe("Friendly name for the device"),
  },
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

export const syncthing_device_remove = tool({
  description: constants.SYNCTHING_DEVICE_REMOVE_DESCRIPTION,
  args: {
    device_id: tool.schema.string().describe("Device ID to remove"),
  },
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

export const syncthing_share = tool({
  description: constants.SYNCTHING_SHARE_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID to share"),
    device_id: tool.schema.string().describe("Device ID to share with"),
  },
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

export const syncthing_unshare = tool({
  description: constants.SYNCTHING_UNSHARE_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
    device_id: tool.schema.string().describe("Device ID to remove from sharing"),
  },
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

export const syncthing_ignores_get = tool({
  description: constants.SYNCTHING_IGNORES_GET_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
  },
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

export const syncthing_versioning = tool({
  description: constants.SYNCTHING_VERSIONING_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
    type: tool.schema
      .enum(["simple", "staggered", "trashcan", "external", ""])
      .describe("Versioning type (simple, staggered, trashcan, external, or empty to disable)"),
    max_age: tool.schema.string().optional().describe("Max age in seconds (for staggered)"),
    clean_interval: tool.schema.string().optional().describe("Cleanup interval in seconds"),
  },
  async execute({ folder_id, type, max_age, clean_interval }) {
    try {
      const params: Record<string, string> = {}
      if (max_age) params.maxAge = max_age
      if (clean_interval) params.cleanInterval = clean_interval
      await client.setVersioning(folder_id, type, Object.keys(params).length > 0 ? params : undefined)
      return `Versioning for '${folder_id}' set to '${type || "disabled"}'`
    } catch (error) {
      if (error instanceof SyncthingError) return `Error: ${error.message}`
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

export const syncthing_connections = tool({
  description: constants.SYNCTHING_CONNECTIONS_DESCRIPTION,
  args: {
    ...formatArg,
  },
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

export const syncthingTools = {
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
  syncthing_versioning,
  syncthing_connections,
}
