export const SYNCTHING_STATUS_NAME = "syncthing_status"
export const SYNCTHING_STATUS_DESCRIPTION = `Show Syncthing system status, local device ID, and connection health.

Returns system info including uptime, memory usage, and discovery status.`

export const SYNCTHING_FOLDERS_NAME = "syncthing_folders"
export const SYNCTHING_FOLDERS_DESCRIPTION = `List all Syncthing folders with sync status, path, and shared devices.

Shows folder ID, label, path, paused state, and which devices share each folder.`

export const SYNCTHING_FOLDER_ADD_NAME = "syncthing_folder_add"
export const SYNCTHING_FOLDER_ADD_DESCRIPTION = `Add a new folder to Syncthing sync.

Creates a folder with the specified ID, path, and optional label. The folder starts syncing immediately unless paused.`

export const SYNCTHING_FOLDER_REMOVE_NAME = "syncthing_folder_remove"
export const SYNCTHING_FOLDER_REMOVE_DESCRIPTION = `Remove a folder from Syncthing sync.

Stops syncing the folder but does NOT delete files on disk.`

export const SYNCTHING_FOLDER_PAUSE_NAME = "syncthing_folder_pause"
export const SYNCTHING_FOLDER_PAUSE_DESCRIPTION = `Pause or resume syncing for a specific folder.

Paused folders stop syncing but retain their configuration.`

export const SYNCTHING_FOLDER_RESCAN_NAME = "syncthing_folder_rescan"
export const SYNCTHING_FOLDER_RESCAN_DESCRIPTION = `Trigger an immediate rescan of a folder.

Forces Syncthing to re-check all files for changes instead of waiting for the next scheduled scan.`

export const SYNCTHING_DEVICES_NAME = "syncthing_devices"
export const SYNCTHING_DEVICES_DESCRIPTION = `List all configured Syncthing devices.

Shows device ID, name, connection status, and which folders are shared.`

export const SYNCTHING_DEVICE_ADD_NAME = "syncthing_device_add"
export const SYNCTHING_DEVICE_ADD_DESCRIPTION = `Add a new device to Syncthing.

The device ID must be a valid Syncthing device ID (56 chars with hyphens).`

export const SYNCTHING_DEVICE_REMOVE_NAME = "syncthing_device_remove"
export const SYNCTHING_DEVICE_REMOVE_DESCRIPTION = `Remove a device from Syncthing.

Stops syncing with this device and removes it from all shared folders.`

export const SYNCTHING_SHARE_NAME = "syncthing_share"
export const SYNCTHING_SHARE_DESCRIPTION = `Share a folder with a device.

Adds a device to the folder's sharing list. The remote device must accept the share.`

export const SYNCTHING_UNSHARE_NAME = "syncthing_unshare"
export const SYNCTHING_UNSHARE_DESCRIPTION = `Remove a device from a folder's sharing.

Stops syncing this folder with the specified device.`

export const SYNCTHING_IGNORES_GET_NAME = "syncthing_ignores_get"
export const SYNCTHING_IGNORES_GET_DESCRIPTION = `Get the .stignore patterns for a folder.

Returns the list of ignore patterns currently configured for the folder.`

export const SYNCTHING_IGNORES_SET_NAME = "syncthing_ignores_set"
export const SYNCTHING_IGNORES_SET_DESCRIPTION = `Set the .stignore patterns for a folder.

Replaces all ignore patterns for the folder. Use standard .stignore syntax.`

export const SYNCTHING_VERSIONING_NAME = "syncthing_versioning"
export const SYNCTHING_VERSIONING_DESCRIPTION = `Configure file versioning for a folder.

Set versioning type (simple, staggered, trashcan, external) and parameters.`

export const SYNCTHING_CONNECTIONS_NAME = "syncthing_connections"
export const SYNCTHING_CONNECTIONS_DESCRIPTION = `Show active connections to other Syncthing devices.

Displays connection status, address, bytes transferred, and sync progress.`
