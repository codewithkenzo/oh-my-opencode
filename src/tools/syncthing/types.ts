import { z } from "zod"

// === Output Format ===
export const OutputFormat = z.enum(["markdown", "json", "compact"])
export type OutputFormat = z.infer<typeof OutputFormat>

// === Device ID ===
export const DeviceIdSchema = z.string().regex(
  /^[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}$/,
  "Invalid Syncthing device ID format (expected: XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX)"
)
export type DeviceId = z.infer<typeof DeviceIdSchema>

// === Folder Type ===
export const FolderTypeSchema = z.enum(["sendreceive", "sendonly", "receiveonly"])
export type FolderType = z.infer<typeof FolderTypeSchema>

// === Versioning ===
export const VersioningTypeSchema = z.enum(["simple", "staggered", "trashcan", "external", "none"])
export type VersioningType = z.infer<typeof VersioningTypeSchema>

export const VersioningSchema = z.object({
  type: VersioningTypeSchema,
  params: z.record(z.string(), z.string()).optional(),
  cleanupIntervalS: z.number().optional(),
  fsPath: z.string().optional(),
  fsType: z.string().optional(),
})
export type Versioning = z.infer<typeof VersioningSchema>

// === Folder Device (device sharing a folder) ===
export const FolderDeviceSchema = z.object({
  deviceID: z.string(),
  introducedBy: z.string().optional(),
  encryptionPassword: z.string().optional(),
})
export type FolderDevice = z.infer<typeof FolderDeviceSchema>

// === Min Disk Free ===
export const MinDiskFreeSchema = z.object({
  value: z.number(),
  unit: z.string(),
})

// === Folder ===
export const FolderSchema = z.object({
  id: z.string(),
  label: z.string(),
  filesystemType: z.string().optional(),
  path: z.string(),
  type: FolderTypeSchema,
  devices: z.array(FolderDeviceSchema),
  rescanIntervalS: z.number(),
  fsWatcherEnabled: z.boolean(),
  fsWatcherDelayS: z.number().optional(),
  fsWatcherTimeoutS: z.number().optional(),
  ignorePerms: z.boolean(),
  autoNormalize: z.boolean().optional(),
  minDiskFree: MinDiskFreeSchema.optional(),
  versioning: VersioningSchema,
  copiers: z.number().optional(),
  pullerMaxPendingKiB: z.number().optional(),
  hashers: z.number().optional(),
  order: z.string().optional(),
  ignoreDelete: z.boolean().optional(),
  scanProgressIntervalS: z.number().optional(),
  pullerPauseS: z.number().optional(),
  pullerDelayS: z.number().optional(),
  maxConflicts: z.number().optional(),
  disableSparseFiles: z.boolean().optional(),
  paused: z.boolean(),
  markerName: z.string().optional(),
  copyOwnershipFromParent: z.boolean().optional(),
  modTimeWindowS: z.number().optional(),
  maxConcurrentWrites: z.number().optional(),
  disableFsync: z.boolean().optional(),
  blockPullOrder: z.string().optional(),
  copyRangeMethod: z.string().optional(),
  caseSensitiveFS: z.boolean().optional(),
  junctionsAsDirs: z.boolean().optional(),
  syncOwnership: z.boolean().optional(),
  sendOwnership: z.boolean().optional(),
  syncXattrs: z.boolean().optional(),
  sendXattrs: z.boolean().optional(),
  xattrFilter: z.object({
    entries: z.array(z.unknown()).optional(),
    maxSingleEntrySize: z.number().optional(),
    maxTotalSize: z.number().optional(),
  }).optional(),
})
export type Folder = z.infer<typeof FolderSchema>

// === Device ===
export const DeviceSchema = z.object({
  deviceID: z.string(),
  name: z.string(),
  addresses: z.array(z.string()).optional(),
  compression: z.string().optional(),
  certName: z.string().optional(),
  introducer: z.boolean().optional(),
  skipIntroductionRemovals: z.boolean().optional(),
  introducedBy: z.string().optional(),
  paused: z.boolean().optional(),
  allowedNetworks: z.array(z.string()).optional(),
  autoAcceptFolders: z.boolean().optional(),
  maxSendKbps: z.number().optional(),
  maxRecvKbps: z.number().optional(),
  ignoredFolders: z.array(z.object({
    time: z.string().optional(),
    id: z.string(),
    label: z.string().optional(),
  })).optional(),
  maxRequestKiB: z.number().optional(),
  untrusted: z.boolean().optional(),
  remoteGUIPort: z.number().optional(),
  numConnections: z.number().optional(),
})
export type Device = z.infer<typeof DeviceSchema>

// === System Status ===
export const SystemStatusSchema = z.object({
  myID: z.string(),
  alloc: z.number().optional(),
  connectionServiceStatus: z.record(z.string(), z.unknown()).optional(),
  cpuPercent: z.number().optional(),
  discoveryEnabled: z.boolean().optional(),
  discoveryErrors: z.record(z.string(), z.string()).optional(),
  discoveryMethods: z.number().optional(),
  discoveryStatus: z.record(z.string(), z.unknown()).optional(),
  goroutines: z.number().optional(),
  guiAddressOverridden: z.boolean().optional(),
  guiAddressUsed: z.string().optional(),
  lastDialStatus: z.record(z.string(), z.unknown()).optional(),
  pathSeparator: z.string().optional(),
  startTime: z.string().optional(),
  sys: z.number().optional(),
  tilde: z.string().optional(),
  uptime: z.number().optional(),
  urVersionMax: z.number().optional(),
})
export type SystemStatus = z.infer<typeof SystemStatusSchema>

// === Connection ===
export const ConnectionSchema = z.object({
  connected: z.boolean(),
  paused: z.boolean(),
  at: z.string().optional(),
  inBytesTotal: z.number().optional(),
  outBytesTotal: z.number().optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  clientVersion: z.string().optional(),
  crypto: z.string().optional(),
  primary: z.object({}).passthrough().optional(),
})
export type Connection = z.infer<typeof ConnectionSchema>

export const ConnectionsResponseSchema = z.object({
  connections: z.record(z.string(), ConnectionSchema),
  total: z.object({
    at: z.string().optional(),
    inBytesTotal: z.number().optional(),
    outBytesTotal: z.number().optional(),
  }).optional(),
})
export type ConnectionsResponse = z.infer<typeof ConnectionsResponseSchema>

// === Full Config ===
export const SyncthingConfigSchema = z.object({
  version: z.number(),
  folders: z.array(FolderSchema),
  devices: z.array(DeviceSchema),
  gui: z.object({}).passthrough().optional(),
  ldap: z.object({}).passthrough().optional(),
  options: z.object({}).passthrough().optional(),
  ignoredDevices: z.array(z.unknown()).optional(),
  defaults: z.object({}).passthrough().optional(),
})
export type SyncthingConfig = z.infer<typeof SyncthingConfigSchema>

// === Error Types ===
export type SyncthingErrorCode = 
  | "NOT_RUNNING"
  | "NOT_FOUND"
  | "INVALID_ID"
  | "CLI_ERROR"
  | "API_ERROR"
  | "PARSE_ERROR"

export class SyncthingError extends Error {
  constructor(
    message: string,
    public code: SyncthingErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = "SyncthingError"
  }
}

// === Ignores ===
export const IgnoresResponseSchema = z.object({
  ignore: z.array(z.string()).nullable(),
  expanded: z.array(z.string()).optional(),
})
export type IgnoresResponse = z.infer<typeof IgnoresResponseSchema>
