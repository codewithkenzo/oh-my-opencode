import { tool } from "@opencode-ai/plugin/tool"
import * as constants from "./constants"

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
}

export const syncthing_statusDef = {
  description: constants.SYNCTHING_STATUS_DESCRIPTION,
  args: {
    ...formatArg,
  },
}

export const syncthing_foldersDef = {
  description: constants.SYNCTHING_FOLDERS_DESCRIPTION,
  args: {
    ...formatArg,
  },
}

export const syncthing_folder_addDef = {
  description: constants.SYNCTHING_FOLDER_ADD_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Unique folder identifier (e.g., 'my-project')"),
    path: tool.schema.string().describe("Absolute path to the folder"),
    label: tool.schema.string().optional().describe("Human-readable label"),
  },
}

export const syncthing_folder_removeDef = {
  description: constants.SYNCTHING_FOLDER_REMOVE_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID to remove"),
  },
}

export const syncthing_folder_pauseDef = {
  description: constants.SYNCTHING_FOLDER_PAUSE_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID"),
    paused: tool.schema.boolean().describe("true to pause, false to resume"),
  },
}

export const syncthing_folder_rescanDef = {
  description: constants.SYNCTHING_FOLDER_RESCAN_DESCRIPTION,
  args: {
    id: tool.schema.string().describe("Folder ID to rescan"),
  },
}

export const syncthing_devicesDef = {
  description: constants.SYNCTHING_DEVICES_DESCRIPTION,
  args: {
    ...formatArg,
  },
}

export const syncthing_device_addDef = {
  description: constants.SYNCTHING_DEVICE_ADD_DESCRIPTION,
  args: {
    device_id: tool.schema.string().describe("Syncthing device ID (56 chars with hyphens)"),
    name: tool.schema.string().optional().describe("Friendly name for the device"),
  },
}

export const syncthing_device_removeDef = {
  description: constants.SYNCTHING_DEVICE_REMOVE_DESCRIPTION,
  args: {
    device_id: tool.schema.string().describe("Device ID to remove"),
  },
}

export const syncthing_shareDef = {
  description: constants.SYNCTHING_SHARE_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID to share"),
    device_id: tool.schema.string().describe("Device ID to share with"),
  },
}

export const syncthing_unshareDef = {
  description: constants.SYNCTHING_UNSHARE_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
    device_id: tool.schema.string().describe("Device ID to remove from sharing"),
  },
}

export const syncthing_ignores_getDef = {
  description: constants.SYNCTHING_IGNORES_GET_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
  },
}

export const syncthing_ignores_setDef = {
  description: constants.SYNCTHING_IGNORES_SET_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
    patterns: tool.schema.array(tool.schema.string()).describe("Array of .stignore patterns (e.g., ['*.key', 'node_modules', '!important.txt'])"),
  },
}

export const syncthing_versioningDef = {
  description: constants.SYNCTHING_VERSIONING_DESCRIPTION,
  args: {
    folder_id: tool.schema.string().describe("Folder ID"),
    type: tool.schema
      .enum(["simple", "staggered", "trashcan", "external", "none"])
      .describe("Versioning type (simple, staggered, trashcan, external, or none to disable)"),
    max_age: tool.schema.string().optional().describe("Max age in seconds (for staggered)"),
    clean_interval: tool.schema.string().optional().describe("Cleanup interval in seconds"),
  },
}

export const syncthing_connectionsDef = {
  description: constants.SYNCTHING_CONNECTIONS_DESCRIPTION,
  args: {
    ...formatArg,
  },
}

export const syncthingToolDefs = {
  syncthing_status: syncthing_statusDef,
  syncthing_folders: syncthing_foldersDef,
  syncthing_folder_add: syncthing_folder_addDef,
  syncthing_folder_remove: syncthing_folder_removeDef,
  syncthing_folder_pause: syncthing_folder_pauseDef,
  syncthing_folder_rescan: syncthing_folder_rescanDef,
  syncthing_devices: syncthing_devicesDef,
  syncthing_device_add: syncthing_device_addDef,
  syncthing_device_remove: syncthing_device_removeDef,
  syncthing_share: syncthing_shareDef,
  syncthing_unshare: syncthing_unshareDef,
  syncthing_ignores_get: syncthing_ignores_getDef,
  syncthing_ignores_set: syncthing_ignores_setDef,
  syncthing_versioning: syncthing_versioningDef,
  syncthing_connections: syncthing_connectionsDef,
}
