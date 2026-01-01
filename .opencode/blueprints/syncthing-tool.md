# Blueprint: Syncthing Native Tool

## Summary

Native oh-my-opencode tool for managing Syncthing file synchronization. Provides folder management, device pairing, ignore patterns, versioning configuration, and sync status - all controllable by AI agents for seamless dotfile/config synchronization across machines.

## Acceptance Criteria

- [ ] List all synced folders with status, path, and shared devices
- [ ] Add new folders to sync with specified devices
- [ ] Remove folders from sync
- [ ] Pause/resume individual folders or entire sync
- [ ] Trigger manual rescan of folders
- [ ] List and manage connected devices
- [ ] Get/set ignore patterns for folders
- [ ] Configure file versioning (simple, staggered, trashcan)
- [ ] Show system status and connection health
- [ ] Works via CLI (no auth needed for local) with optional REST API support

## Technical Approach

### Chosen: CLI-First with REST Fallback

Use `syncthing cli` commands as primary interface:
- No authentication needed when running as same user
- Simpler implementation
- Outputs JSON, easy to parse

REST API as optional fallback for:
- Remote Syncthing instances
- When CLI unavailable

### Rejected Alternatives

| Alternative | Why Rejected |
|-------------|--------------|
| REST-only | Requires API key management, more complex auth |
| Direct config.xml editing | Dangerous, requires restart, race conditions |

## File Structure

```
src/tools/syncthing/
├── index.ts          # Barrel exports
├── types.ts          # Zod schemas for Folder, Device, Versioning, etc.
├── constants.ts      # Tool names, descriptions
├── client.ts         # CLI executor + optional REST client
├── formatters.ts     # Markdown table formatters for LLM output
├── tools.ts          # Tool definitions (syncthing_*)
└── utils.ts          # Helpers (parse device ID, validate paths)
```

## Tool Definitions

| Tool Name | Purpose | Key Params |
|-----------|---------|------------|
| `syncthing_status` | System status, connections, device ID | `format` |
| `syncthing_folders` | List all folders with sync status | `format` |
| `syncthing_folder_add` | Add folder to sync | `id`, `path`, `label`, `devices[]` |
| `syncthing_folder_remove` | Remove folder from sync | `id` |
| `syncthing_folder_pause` | Pause/resume folder | `id`, `paused` |
| `syncthing_folder_rescan` | Trigger rescan | `id` |
| `syncthing_devices` | List all devices | `format` |
| `syncthing_device_add` | Add device | `device_id`, `name` |
| `syncthing_device_remove` | Remove device | `device_id` |
| `syncthing_ignores_get` | Get .stignore patterns | `folder_id` |
| `syncthing_ignores_set` | Set .stignore patterns | `folder_id`, `patterns[]` |
| `syncthing_versioning` | Configure versioning | `folder_id`, `type`, `params` |
| `syncthing_share` | Share folder with device | `folder_id`, `device_id` |
| `syncthing_unshare` | Remove device from folder | `folder_id`, `device_id` |

## Zod Schemas

```typescript
// types.ts
import { z } from "zod"

export const OutputFormat = z.enum(["markdown", "json", "compact"])

export const DeviceIdSchema = z.string().regex(
  /^[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}-[A-Z0-9]{7}$/,
  "Invalid Syncthing device ID format"
)

export const FolderTypeSchema = z.enum(["sendreceive", "sendonly", "receiveonly"])

export const VersioningTypeSchema = z.enum(["simple", "staggered", "trashcan", "external", ""])

export const VersioningSchema = z.object({
  type: VersioningTypeSchema,
  params: z.record(z.string()).optional(),
  cleanupIntervalS: z.number().optional(),
  fsPath: z.string().optional(),
})

export const FolderDeviceSchema = z.object({
  deviceID: DeviceIdSchema,
  introducedBy: z.string().optional(),
  encryptionPassword: z.string().optional(),
})

export const FolderSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  type: FolderTypeSchema,
  paused: z.boolean(),
  devices: z.array(FolderDeviceSchema),
  rescanIntervalS: z.number(),
  fsWatcherEnabled: z.boolean(),
  ignorePerms: z.boolean(),
  versioning: VersioningSchema,
})

export const DeviceSchema = z.object({
  deviceID: DeviceIdSchema,
  name: z.string(),
  paused: z.boolean(),
  addresses: z.array(z.string()),
  autoAcceptFolders: z.boolean(),
  compression: z.string(),
})

export const SystemStatusSchema = z.object({
  myID: DeviceIdSchema,
  uptime: z.number(),
  startTime: z.string(),
  alloc: z.number(),
  goroutines: z.number(),
})

export const ConnectionSchema = z.object({
  connected: z.boolean(),
  paused: z.boolean(),
  address: z.string(),
  type: z.string(),
  inBytesTotal: z.number(),
  outBytesTotal: z.number(),
})
```

## Client Design

```typescript
// client.ts
interface SyncthingClient {
  // Folders
  listFolders(): Promise<Folder[]>
  addFolder(id: string, path: string, label: string): Promise<void>
  removeFolder(id: string): Promise<void>
  pauseFolder(id: string, paused: boolean): Promise<void>
  rescanFolder(id: string): Promise<void>
  
  // Devices
  listDevices(): Promise<Device[]>
  addDevice(deviceId: string, name: string): Promise<void>
  removeDevice(deviceId: string): Promise<void>
  
  // Sharing
  shareFolder(folderId: string, deviceId: string): Promise<void>
  unshareFolder(folderId: string, deviceId: string): Promise<void>
  
  // Ignores
  getIgnores(folderId: string): Promise<string[]>
  setIgnores(folderId: string, patterns: string[]): Promise<void>
  
  // Versioning
  setVersioning(folderId: string, type: VersioningType, params?: Record<string, string>): Promise<void>
  
  // Status
  getSystemStatus(): Promise<SystemStatus>
  getConnections(): Promise<Record<string, Connection>>
}

// CLI Implementation
class SyncthingCLIClient implements SyncthingClient {
  private async exec(args: string[]): Promise<string> {
    const result = await $`syncthing cli ${args}`.text()
    return result
  }
  
  async listFolders(): Promise<Folder[]> {
    const json = await this.exec(["config", "dump-json"])
    const config = JSON.parse(json)
    return config.folders
  }
  // ...
}

// Optional REST Implementation
class SyncthingRESTClient implements SyncthingClient {
  constructor(
    private baseUrl: string = "http://localhost:8384",
    private apiKey?: string
  ) {}
  // ...
}
```

## Error Handling

```typescript
export class SyncthingError extends Error {
  constructor(
    message: string,
    public code: "NOT_RUNNING" | "NOT_FOUND" | "INVALID_ID" | "CLI_ERROR" | "API_ERROR",
    public details?: unknown
  ) {
    super(message)
    this.name = "SyncthingError"
  }
}

// Check if Syncthing is running
async function ensureSyncthingRunning(): Promise<void> {
  try {
    await $`syncthing cli show system`.quiet()
  } catch {
    throw new SyncthingError(
      "Syncthing is not running. Start it with: syncthing serve",
      "NOT_RUNNING"
    )
  }
}
```

## Testing Approach

1. **Unit tests** for:
   - Zod schema validation
   - Formatters (markdown output)
   - Utils (device ID validation, path normalization)

2. **Integration tests** (require running Syncthing):
   - Full CRUD operations on test folder
   - Skip in CI unless Syncthing available

3. **Mock client** for tool tests:
   - Interface-based design enables easy mocking
   - Test tool logic without Syncthing dependency

```typescript
// Example test
describe("syncthing_folders", () => {
  it("formats folders as markdown table", async () => {
    const mockClient = {
      listFolders: async () => [{
        id: "test",
        label: "Test Folder", 
        path: "/tmp/test",
        paused: false,
        // ...
      }]
    }
    
    const result = await syncthingFolders({ format: "markdown" }, mockClient)
    expect(result).toContain("| test | Test Folder |")
  })
})
```

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Syncthing not installed | Medium | High | Check on first use, provide install instructions |
| Syncthing not running | High | High | Graceful error with start command |
| Different CLI versions | Low | Medium | Test with v1.27.0+ (current stable) |
| REST API auth complexity | Medium | Low | CLI-first approach avoids this |
| Race conditions on config | Low | Medium | Rely on Syncthing's own locking |

## Open Questions

- Should we support remote Syncthing instances via REST? (Initially: no, CLI only)
- Should we create a `syncthing_wizard` tool for guided setup? (Defer to v2)
- Config file location detection for different platforms?

## Tasks

| # | Task | Size | Agent | Skills |
|---|------|------|-------|--------|
| 1 | Create types.ts with Zod schemas | S | Daiku | zod-patterns |
| 2 | Create constants.ts with tool descriptions | S | Daiku | omo-dev |
| 3 | Create client.ts with CLI executor | M | Daiku | bun-hono-api |
| 4 | Create formatters.ts for markdown output | S | Daiku | - |
| 5 | Create tools.ts with all tool definitions | L | Daiku | omo-dev |
| 6 | Create index.ts barrel export | S | Daiku | - |
| 7 | Add to builtinTools in src/tools/index.ts | S | Daiku | omo-dev |
| 8 | Write unit tests for schemas/formatters | M | Daiku | testing-stack |
| 9 | Test manually with real Syncthing | M | Manual | syncthing |

## Research Sources

- Syncthing REST API: https://docs.syncthing.net/dev/rest.html
- Syncthing CLI: `syncthing cli --help`
- Existing tool patterns: src/tools/raindrop/, src/tools/beads/
- Shisho research task bg_cd7aee95
