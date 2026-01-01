# Syncthing Tool Architecture Blueprint

**Generated:** 2026-01-01
**Status:** Planning Phase
**Type:** Tool Architecture Blueprint

## Overview

Design and implement a native Syncthing tool for oh-my-opencode, following established patterns from Raindrop and Beads tools.

**Requirements:**
- CLI-first (simpler, no auth for local instances)
- Optional REST API support for remote instances
- Zod schemas for type safety
- Multiple granular tools (not one mega-tool)
- Mock-friendly for testing
- LLM-optimized output (markdown tables)
- Timeout-safe operations

## Architecture Principles

1. **Simplicity First**: Start with CLI, add REST later
2. **Type Safety**: All I/O validated with Zod
3. **Granular Tools**: One tool per operation
4. **Testable**: Mock interfaces, dependency injection
5. **Error Resilient**: Clear error types, graceful degradation

---

## 1. File Structure

\`\`\`
src/tools/syncthing/
├── index.ts              # Barrel exports
├── types.ts              # Zod schemas
├── client.ts             # Client abstraction (CLI/REST)
├── constants.ts           # Tool descriptions, names
├── tools.ts              # Tool implementations
├── formatters.ts         # Output formatting (markdown, json)
└── utils.ts              # Helper functions
\`\`\`

**Size:** SMALL (1-2 hours)

---

## 2. Tool List

### Core Tools (12 total)

| Tool Name | Purpose | Input Schema | Output Schema |
|------------|---------|--------------|---------------|
| \`syncthing_list_folders\` | List all shared folders | `{ device?: string }` | `Folder[]` |
| \`syncthing_add_folder\` | Add a new folder | `AddFolderInput` | `Folder` |
| \`syncthing_remove_folder\` | Remove a folder | `{ id: string }` | `{ success: boolean }` |
| \`syncthing_list_devices\` | List connected devices | \`{}\` | `Device[]` |
| \`syncthing_add_device\` | Add a remote device | `AddDeviceInput` | `Device` |
| \`syncthing_remove_device\` | Remove a device | `{ id: string }` | `{ success: boolean }` |
| \`syncthing_set_versioning\` | Configure folder versioning | `SetVersioningInput` | `Folder` |
| \`syncthing_add_ignore\` | Add ignore patterns to folder | `AddIgnoreInput` | `Folder` |
| \`syncthing_remove_ignore\` | Remove ignore patterns | `RemoveIgnoreInput` | `Folder` |
| \`syncthing_pause\` | Pause device/folder sync | `PauseInput` | `{ success: boolean }` |
| \`syncthing_resume\` | Resume device/folder sync | `ResumeInput` | `{ success: boolean }` |
| \`syncthing_rescan\` | Trigger folder rescan | `{ folderId?: string }` | `{ success: boolean }` |

---

## 3. Zod Schema Definitions

\`\`\`typescript
// === Output Format ===
export const OutputFormat = z.enum(["markdown", "json", "compact"]);
export type OutputFormat = z.infer<typeof OutputFormat>;

// === Folder ===
export const FolderSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  device: z.string(),
  type: z.enum(["sendreceive", "sendonly", "receiveonly"]),
  rescanIntervalS: z.number().optional(),
  fsWatcherEnabled: z.boolean().optional(),
  fsWatcherDelayS: z.number().optional(),
  ignorePerms: z.boolean().optional(),
  autoNormalize: z.boolean().optional(),
  minDiskFree: z.number().optional(),
  versioning: VersioningSchema.optional(),
  ignorePatterns: z.array(z.string()).optional(),
  paused: z.boolean().optional(),
  invalid: z.string().optional(),
});

export type Folder = z.infer<typeof FolderSchema>;

// === Device ===
export const DeviceSchema = z.object({
  deviceID: z.string(),
  name: z.string(),
  addresses: z.array(z.string()),
  compression: z.enum(["never", "metadata", "always"]),
  certName: z.string(),
  deviceName: z.string().optional(),
  introducer: z.boolean().optional(),
  introducedBy: z.string().optional(),
  paused: z.boolean().optional(),
});

export type Device = z.infer<typeof DeviceSchema>;

// === Versioning ===
export const VersioningSchema = z.object({
  type: z.enum(["none", "simple", "trashcan", "simple"]),
  params: z.object({
    keep: z.number().optional(),
  }).optional(),
});

export type Versioning = z.infer<typeof VersioningSchema>;

// === Ignore Pattern ===
export const IgnorePatternSchema = z.object({
  pattern: z.string(),
  comment: z.string().optional(),
});

export type IgnorePattern = z.infer<typeof IgnorePatternSchema>;

// === Input Schemas ===
export const AddFolderInputSchema = FolderSchema.omit({ id, invalid }).partial();

export const AddDeviceInputSchema = z.object({
  deviceID: z.string(),
  name: z.string(),
  addresses: z.array(z.string()).default([]),
  compression: z.enum(["never", "metadata", "always"]).default("metadata"),
});

export const SetVersioningInputSchema = z.object({
  folderId: z.string(),
  versioning: VersioningSchema,
});

export const AddIgnoreInputSchema = z.object({
  folderId: z.string(),
  patterns: z.array(z.string()),
});

export const RemoveIgnoreInputSchema = z.object({
  folderId: z.string(),
  patterns: z.array(z.string()),
});

export const PauseInputSchema = z.object({
  deviceId: z.string().optional(),
  folderId: z.string().optional(),
});

export const ResumeInputSchema = PauseInputSchema;

// === API Error ===
export class SyncthingError extends Error {
  constructor(
    message: string,
    public exitCode: number | null,
    public command: string | null,
    public type: "cli_error" | "api_error" | "not_found" | "timeout"
  ) {
    super(message);
    this.name = "SyncthingError";
  }
}
\`\`\`

**Effort:** TRIVIAL (<1hr)

---

## 4. Client Abstraction Design

### 4.1 Interface

\`\`\`typescript
interface SyncthingClient {
  listFolders(device?: string): Promise<Folder[]>;
  addFolder(folder: Omit<Folder, "id" | "invalid">): Promise<Folder>;
  removeFolder(id: string): Promise<boolean>;
  listDevices(): Promise<Device[]>;
  addDevice(device: Omit<Device, "introducedBy" | "paused">): Promise<Device>;
  removeDevice(id: string): Promise<boolean>;
  setVersioning(folderId: string, versioning: Versioning): Promise<Folder>;
  addIgnore(folderId: string, patterns: string[]): Promise<Folder>;
  removeIgnore(folderId: string, patterns: string[]): Promise<Folder>;
  pause(deviceId?: string, folderId?: string): Promise<boolean>;
  resume(deviceId?: string, folderId?: string): Promise<boolean>;
  rescan(folderId?: string): Promise<boolean>;
}
\`\`\`

### 4.2 CLI Client (Default)

\`\`\`typescript
class CLISyncthingClient implements SyncthingClient {
  private timeout: number;
  
  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }
  
  private async execCommand(args: string[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const proc = Bun.spawn(["syncthing", "cli", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const output = await proc.exited;
      clearTimeout(timeoutId);
      
      if (output.exitCode !== 0) {
        throw new SyncthingError(
          \`CLI command failed: syncthing cli \${args.join(" ")}\`,
          output.exitCode,
          \`syncthing cli \${args.join(" ")}\`,
          "cli_error"
        );
      }
      
      return new TextDecoder().decode(output.stdout);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new SyncthingError(
          \`Command timed out after \${this.timeout}ms\`,
          null,
          \`syncthing cli \${args.join(" ")}\`,
          "timeout"
        );
      }
      throw error;
    }
  }
  
  async listFolders(device?: string): Promise<Folder[]> {
    const args = device ? ["folders", "list", "--device", device] : ["folders", "list"];
    const output = await this.execCommand(args);
    return JSON.parse(output);
  }
  
  async addFolder(folder: Omit<Folder, "id" | "invalid">): Promise<Folder> {
    const args = ["folders", "add", ...this.folderToArgs(folder)];
    await this.execCommand(args);
    return this.listFolders().then(folders => 
      folders.find(f => f.path === folder.path)!
    );
  }
  
  // ... other implementations
}
\`\`\`

### 4.3 REST Client (Optional)

\`\`\`typescript
class RESTSyncthingClient implements SyncthingClient {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;
  
  constructor(
    baseURL: string,
    apiKey: string,
    timeout: number = 30000
  ) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(\`\${this.baseURL}\${endpoint}\`, {
        ...options,
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new SyncthingError(
          \`API error: \${response.status}\`,
          response.status,
          endpoint,
          "api_error"
        );
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new SyncthingError(
          \`Request timed out after \${this.timeout}ms\`,
          null,
          endpoint,
          "timeout"
        );
      }
      throw error;
    }
  }
  
  async listFolders(device?: string): Promise<Folder[]> {
    return this.request<Folder[]>("/rest/config/folders");
  }
  
  // ... other implementations
}
\`\`\`

### 4.4 Client Factory

\`\`\`typescript
interface ClientConfig {
  type: "cli" | "rest";
  cliTimeout?: number;
  restBaseUrl?: string;
  restApiKey?: string;
  restTimeout?: number;
}

function createClient(config: ClientConfig = { type: "cli" }): SyncthingClient {
  if (config.type === "cli") {
    return new CLISyncthingClient(config.cliTimeout);
  } else if (config.type === "rest" && config.restBaseUrl && config.restApiKey) {
    return new RESTSyncthingClient(
      config.restBaseUrl!,
      config.restApiKey!,
      config.restTimeout
    );
  }
  throw new SyncthingError(
    "Invalid client configuration",
    null,
    null,
    "not_found"
  );
}
\`\`\`

**Effort:** SMALL (1-2 hours)

---

## 5. Error Handling Strategy

### 5.1 Error Types

\`\`\`typescript
export enum SyncthingErrorType {
  CLI_ERROR = "cli_error",
  API_ERROR = "api_error",
  NOT_FOUND = "not_found",
  TIMEOUT = "timeout",
  VALIDATION_ERROR = "validation_error",
  PARSE_ERROR = "parse_error",
}

export class SyncthingError extends Error {
  constructor(
    message: string,
    public type: SyncthingErrorType,
    public exitCode: number | null = null,
    public command: string | null = null,
    public statusCode: number | null = null,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SyncthingError";
  }
}
\`\`\`

### 5.2 Error Recovery

| Error Type | Recovery Strategy |
|------------|------------------|
| CLI_NOT_FOUND | Inform user to install syncthing |
| CLI_TIMEOUT | Increase timeout via config, suggest checking Syncthing status |
| API_UNAUTHORIZED | Check API key, verify remote instance is reachable |
| API_TIMEOUT | Retry with backoff, check network connectivity |
| PARSE_ERROR | Show raw output for debugging, log error context |

### 5.3 Error Wrapping

All tool implementations wrap client errors:

\`\`\`typescript
async function syncthing_list_folders(
  input: Record<string, unknown>,
  context: Context
): Promise<string> {
  const client = createClient(context.config.syncthing);
  
  try {
    const folders = await client.listFolders(input.device);
    const formatter = context.format ?? "markdown";
    return formatFolders(folders, formatter);
  } catch (error) {
    if (error instanceof SyncthingError) {
      return \`Error: \${error.message}\\n\\nDetails: \${JSON.stringify({
        type: error.type,
        exitCode: error.exitCode,
        command: error.command,
      }, null, 2)}\`;
    }
    throw error;
  }
}
\`\`\`

**Effort:** TRIVIAL (<1hr)

---

## 6. Testing Approach

### 6.1 Unit Tests

\`\`\`typescript
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { CLISyncthingClient } from "./client";
import { FolderSchema, DeviceSchema } from "./types";

describe("CLISyncthingClient", () => {
  describe("listFolders", () => {
    it("should return folders array", async () => {
      const mockFolders = [
        {
          id: "abc123",
          label: "Documents",
          path: "/home/user/docs",
          device: "device1",
          type: "sendreceive",
        },
      ];
      
      mock.spawn.mockResolvedValue({
        exitCode: 0,
        stdout: new TextEncoder().encode(JSON.stringify(mockFolders)),
      });
      
      const client = new CLISyncthingClient(30000);
      const folders = await client.listFolders();
      
      expect(folders).toEqual(mockFolders);
      expect(FolderSchema.array().safeParse(folders).success).toBe(true);
    });
    
    it("should throw on non-zero exit code", async () => {
      mock.spawn.mockResolvedValue({
        exitCode: 1,
        stderr: new TextEncoder().encode("Error: device not found"),
      });
      
      const client = new CLISyncthingClient(30000);
      
      await expect(client.listFolders()).rejects.toThrow(SyncthingError);
    });
    
    it("should timeout after configured delay", async () => {
      mock.spawn.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 35000));
      });
      
      const client = new CLISyncthingClient(30000);
      
      await expect(client.listFolders()).rejects.toThrow(
        expect.objectContaining({ type: "timeout" })
      );
    });
  });
});
\`\`\`

### 6.2 Integration Tests

\`\`\`typescript
describe("Syncthing Integration", () => {
  it("should manage folder lifecycle", async () => {
    const client = new CLISyncthingClient(60000);
    
    // Add folder
    const folder = await client.addFolder({
      label: "Test",
      path: "/tmp/test",
      device: "device1",
      type: "sendreceive",
    });
    expect(folder.id).toBeDefined();
    
    // Set versioning
    const updated = await client.setVersioning(folder.id, {
      type: "simple",
      params: { keep: 5 },
    });
    expect(updated.versioning?.type).toBe("simple");
    
    // Add ignores
    const ignored = await client.addIgnore(folder.id, ["*.tmp", "*.log"]);
    expect(ignored.ignorePatterns).toContain("*.tmp");
    
    // Remove folder
    const removed = await client.removeFolder(folder.id);
    expect(removed).toBe(true);
  });
});
\`\`\`

### 6.3 Mock Interface

\`\`\`typescript
interface MockClient extends SyncthingClient {
  mockFolders?: Folder[];
  mockDevices?: Device[];
  mockErrors?: Map<string, Error>;
  
  listFolders(): Promise<Folder[]> {
    if (this.mockErrors?.get("listFolders")) {
      throw this.mockErrors.get("listFolders")!;
    }
    return Promise.resolve(this.mockFolders ?? []);
  }
  
  // ... implement all methods
}
\`\`\`

**Effort:** SMALL (1-2 hours)

---

## 7. Output Formatting

### 7.1 Markdown Formatter

\`\`\`typescript
export function formatFolders(folders: Folder[]): string {
  const table = [
    ["ID", "Label", "Path", "Device", "Type", "Paused"],
    ...folders.map(f => [
      f.id.slice(0, 8),
      f.label,
      f.path,
      f.device,
      f.type,
      f.paused ? "Yes" : "No",
    ]),
  ];
  
  return \`## Syncthing Folders (\${folders.length})

\`\`\`
| ${table.map(row => \`| \${row.join(" | ")}|\`).join("\\n")}
\`\`\`
\`;
}

export function formatDevices(devices: Device[]): string {
  const table = [
    ["Device ID", "Name", "Addresses", "Compression", "Paused"],
    ...devices.map(d => [
      d.deviceID.slice(0, 8),
      d.name,
      d.addresses.join(", "),
      d.compression,
      d.paused ? "Yes" : "No",
    ]),
  ];
  
  return \`## Syncthing Devices (\${devices.length})

\`\`\`
| ${table.map(row => \`| \${row.join(" | ")}|\`).join("\\n")}
\`\`\`
\`;
}
\`\`\`

### 7.2 JSON Formatter

\`\`\`typescript
export function formatAsJSON<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}
\`\`\`

### 7.3 Compact Formatter

\`\`\`typescript
export function formatAsCompact<T>(data: T): string {
  return JSON.stringify(data);
}
\`\`\`

**Effort:** TRIVIAL (<1hr)

---

## 8. Configuration

### 8.1 Config Schema

\`\`\`typescript
export const SyncthingConfigSchema = z.object({
  type: z.enum(["cli", "rest"]).default("cli"),
  cliTimeout: z.number().min(1000).max(300000).default(30000),
  restBaseUrl: z.string().url().optional(),
  restApiKey: z.string().optional(),
  restTimeout: z.number().min(1000).max(300000).default(30000),
});

export type SyncthingConfig = z.infer<typeof SyncthingConfigSchema>;
\`\`\`

### 8.2 Config Loading

Priority order:
1. \`oh-my-opencode.json\` (project)
2. \`~/.config/opencode/oh-my-opencode.json\` (user)

Example:

\`\`\`json
{
  "syncthing": {
    "type": "cli",
    "cliTimeout": 60000
  }
}
\`\`\`

**Effort:** TRIVIAL (<1hr)

---

## 9. Implementation Phases

### Phase 0: Bootstrap
**Agent:** Hayai - builder
**Effort:** TRIVIAL (<1hr)

- [ ] Create \`src/tools/syncthing/\` directory
- [ ] Create \`index.ts\`, \`types.ts\`, \`constants.ts\`, \`client.ts\`, \`tools.ts\`, \`formatters.ts\`, \`utils.ts\`
- [ ] Add to \`builtinTools\` in \`src/tools/index.ts\`

### Phase 1: Core Types & Client
**Agent:** Daiku - builder
**Effort:** SMALL (1-2 hours)

- [ ] Implement Zod schemas in \`types.ts\`
- [ ] Implement \`SyncthingClient\` interface
- [ ] Implement \`CLISyncthingClient\` with all methods
- [ ] Add timeout handling
- [ ] Add error handling
- [ ] Write unit tests for client

### Phase 2: Tool Implementations
**Agent:** Daiku - builder
**Effort:** MEDIUM (2-4 hours)

- [ ] Implement all 12 tools in \`tools.ts\`
- [ ] Add config integration
- [ ] Add formatters
- [ ] Add output validation
- [ ] Write unit tests for tools

### Phase 3: Formatters & Utils
**Agent:** Hayai - builder
**Effort:** SMALL (1-2 hours)

- [ ] Implement markdown formatters
- [ ] Implement JSON/compact formatters
- [ ] Add helper functions in \`utils.ts\`

### Phase 4: Testing & Polish
**Agent:** Tantei - debugger
**Effort:** MEDIUM (2-4 hours)

- [ ] Run all tests
- [ ] Fix any failing tests
- [ ] Test with real Syncthing instance (CLI)
- [ ] Verify output formatting
- [ ] Add error handling edge cases

### Phase 5: Documentation
**Agent:** Sakka - writer
**Effort:** TRIVIAL (<1hr)

- [ ] Update \`src/tools/AGENTS.md\` with Syncthing specifics
- [ ] Add usage examples
- [ ] Document configuration options

---

## 10. Agent Assignment

| Task | Agent | Why |
|-------|--------|-----|
| Phase 0 (Bootstrap) | Hayai - builder | Fast directory/file creation |
| Phase 1 (Core Types/Client) | Daiku - builder | Complex TypeScript, requires GLM 4.7 |
| Phase 2 (Tools) | Daiku - builder | Complex TypeScript, requires GLM 4.7 |
| Phase 3 (Formatters) | Hayai - builder | Simple formatting, Grok fast |
| Phase 4 (Testing) | Tantei - debugger | Error detection, visual verification |
| Phase 5 (Documentation) | Sakka - writer | Technical writing, Gemini Flash |

---

## 11. Anti-Patterns (Critical!)

❌ **DO NOT:**
- Use \`npm\` or \`yarn\` - Use \`bun\` only
- Use \`@types/node\` - Use \`bun-types\`
- Ignore timeout handling - All CLI operations must have timeouts
- Expose raw CLI output to agents - Always format for LLM consumption
- Create one mega-tool with all functionality - Granular tools only
- Skip Zod validation - All I/O must be schema-validated
- Direct file operations - Never mkdir/touch/rm/cp/mv in code

✅ **DO:**
- Use barrel exports in \`index.ts\`
- Follow Raindrop pattern for API client
- Include \`constants.ts\` with tool names/descriptions
- Add comprehensive unit tests
- Use AbortController for timeout handling
- Format outputs as markdown tables for LLM readability
- Export error class for external error handling

---

## 12. Effort Estimate

| Phase | Effort | Total |
|---------|----------|--------|
| Phase 0 | TRIVIAL (<1hr) | |
| Phase 1 | SMALL (1-2hr) | |
| Phase 2 | MEDIUM (2-4hr) | |
| Phase 3 | SMALL (1-2hr) | |
| Phase 4 | MEDIUM (2-4hr) | |
| Phase 5 | TRIVIAL (<1hr) | |
| **TOTAL** | | **7-14 hours** |

---

## 13. Deliverables Checklist

- [x] File structure defined
- [x] Tool list specified
- [x] Zod schemas designed
- [x] Client abstraction designed
- [x] Error handling strategy
- [x] Testing approach defined
- [x] Agent assignments
- [x] Implementation phases planned
- [x] Anti-patterns documented
- [ ] **IMPLEMENTATION COMPLETE** (Phase 0-5)
- [ ] **TESTS PASSING** (All tests green)
- [ ] **INTEGRATED** (Added to builtinTools)

---

## 14. Next Steps

1. **Create AGENTS.md** in \`src/tools/syncthing/\` for tool-specific context
2. **Start Phase 0** - Bootstrap directory structure
3. **Execute Phase 1** - Core types and CLI client
4. **Proceed sequentially** through phases 2-5
5. **Update src/tools/AGENTS.md** with Syncthing-specific notes

**CRITICAL:** Complete each phase fully before moving to the next. Do not skip ahead.

---

## Appendix A: CLI Command Reference

| Operation | CLI Command | REST Endpoint |
|------------|--------------|---------------|
| List folders | \`syncthing cli folders list\` | \`GET /rest/config/folders\` |
| Add folder | \`syncthing cli folders add ...\` | \`POST /rest/config/folders\` |
| Remove folder | \`syncthing cli folders remove <id>\` | \`DELETE /rest/config/folders/<id>\` |
| List devices | \`syncthing cli devices list\` | \`GET /rest/config/devices\` |
| Add device | \`syncthing cli devices add ...\` | \`POST /rest/config/devices\` |
| Remove device | \`syncthing cli devices remove <id>\` | \`DELETE /rest/config/devices/<id>\` |
| Set versioning | \`syncthing cli folders show <id> --json\` + edit config | \`PUT /rest/config/folders/<id>\` |
| Add ignore | Edit config directly | \`PUT /rest/config/folders/<id>\` |
| Pause | \`syncthing cli pause <device/folder>\` | \`PUT /rest/system/pause\` |
| Resume | \`syncthing cli resume <device/folder>\` | \`PUT /rest/system/resume\` |
| Rescan | \`syncthing cli scan <folder>\` | \`POST /rest/db/scan\` |

---

## Appendix B: Configuration Examples

### CLI Mode (Default)

\`\`\`json
{
  "syncthing": {
    "type": "cli",
    "cliTimeout": 60000
  }
}
\`\`\`

### REST Mode (Remote Instance)

\`\`\`json
{
  "syncthing": {
    "type": "rest",
    "restBaseUrl": "https://syncthing.example.com:8384",
    "restApiKey": "${SYNCTHING_API_KEY}",
    "restTimeout": 30000
  }
}
\`\`\`

---

**Blueprint Status:** ✅ COMPLETE - Ready for implementation

**Last Updated:** 2026-01-01
**Author:** Kenja - advisor
