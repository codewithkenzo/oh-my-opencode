import { createHash } from "node:crypto"
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import type {
  SupermemoryConfig,
  MemoriesResponse,
  ListMemoriesResponse,
  ProfileResponse,
  AddMemoryResponse,
  MemoryType,
} from "./types"
import { DEFAULT_CONFIG, TIMEOUT_MS, SUPERMEMORY_API_URL } from "./constants"
import { log } from "../../shared/logger"

const CONFIG_DIR = join(homedir(), ".config", "opencode")
const CONFIG_FILES = [
  join(CONFIG_DIR, "supermemory.jsonc"),
  join(CONFIG_DIR, "supermemory.json"),
]

let cachedConfig: SupermemoryConfig | null = null
let cachedApiKey: string | undefined

function loadConfig(): SupermemoryConfig {
  if (cachedConfig) return cachedConfig
  
  for (const path of CONFIG_FILES) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8")
        const json = content
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
        cachedConfig = JSON.parse(json) as SupermemoryConfig
        return cachedConfig
      } catch {
        // Invalid config, continue
      }
    }
  }
  cachedConfig = {}
  return cachedConfig
}

export function getApiKey(): string | undefined {
  if (cachedApiKey !== undefined) return cachedApiKey
  const config = loadConfig()
  cachedApiKey = config.apiKey ?? process.env.SUPERMEMORY_API_KEY
  return cachedApiKey
}

export function getConfig(): Required<Omit<SupermemoryConfig, "apiKey">> & { apiKey?: string } {
  const config = loadConfig()
  return {
    apiKey: getApiKey(),
    similarityThreshold: config.similarityThreshold ?? DEFAULT_CONFIG.similarityThreshold,
    maxMemories: config.maxMemories ?? DEFAULT_CONFIG.maxMemories,
    maxProjectMemories: config.maxProjectMemories ?? DEFAULT_CONFIG.maxProjectMemories,
    maxProfileItems: config.maxProfileItems ?? DEFAULT_CONFIG.maxProfileItems,
    injectProfile: config.injectProfile ?? DEFAULT_CONFIG.injectProfile,
    containerTagPrefix: config.containerTagPrefix ?? DEFAULT_CONFIG.containerTagPrefix,
    filterPrompt: config.filterPrompt ?? DEFAULT_CONFIG.filterPrompt,
  }
}

export function isConfigured(): boolean {
  return !!getApiKey()
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16)
}

function getGitEmail(): string | null {
  try {
    const email = execSync("git config user.email", { encoding: "utf-8" }).trim()
    return email || null
  } catch {
    return null
  }
}

export function getUserTag(): string {
  const config = getConfig()
  const email = getGitEmail()
  if (email) {
    return `${config.containerTagPrefix}_user_${sha256(email)}`
  }
  const fallback = process.env.USER || process.env.USERNAME || "anonymous"
  return `${config.containerTagPrefix}_user_${sha256(fallback)}`
}

export function getProjectTag(directory: string): string {
  const config = getConfig()
  return `${config.containerTagPrefix}_project_${sha256(directory)}`
}

export function getTags(directory: string): { user: string; project: string } {
  return {
    user: getUserTag(),
    project: getProjectTag(directory),
  }
}

export function stripPrivateContent(content: string): string {
  return content.replace(/<private>[\s\S]*?<\/private>/gi, "[REDACTED]")
}

export function isFullyPrivate(content: string): boolean {
  const stripped = stripPrivateContent(content).trim()
  return stripped === "[REDACTED]" || stripped === ""
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

export class SupermemoryClient {
  private sdkClient: any = null

  private async getClient(): Promise<any> {
    if (this.sdkClient) return this.sdkClient
    
    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error("SUPERMEMORY_API_KEY not set")
    }

    try {
      const sdkModule = await import("supermemory")
      const Supermemory = sdkModule.default
      this.sdkClient = new Supermemory({ apiKey })
      
      const config = getConfig()
      this.sdkClient.settings.update({
        shouldLLMFilter: true,
        filterPrompt: config.filterPrompt,
      })
      
      return this.sdkClient
    } catch (err) {
      log("[supermemory] failed to initialize SDK", { error: String(err) })
      throw err
    }
  }

  async searchMemories(query: string, containerTag: string): Promise<MemoriesResponse> {
    log("[supermemory] searchMemories", { containerTag })
    try {
      const client = await this.getClient()
      const config = getConfig()
      const result = await withTimeout(
        client.search.memories({
          q: query,
          containerTag,
          threshold: config.similarityThreshold,
          limit: config.maxMemories,
          searchMode: "hybrid",
        }),
        TIMEOUT_MS
      ) as MemoriesResponse
      log("[supermemory] searchMemories success", { count: result.results?.length || 0 })
      return result
    } catch (error) {
      log("[supermemory] searchMemories error", { error: String(error) })
      return { results: [], total: 0, timing: 0 }
    }
  }

  async getProfile(containerTag: string, query?: string): Promise<ProfileResponse | null> {
    log("[supermemory] getProfile", { containerTag })
    try {
      const client = await this.getClient()
      const result = await withTimeout(
        client.profile({
          containerTag,
          q: query,
        }),
        TIMEOUT_MS
      ) as ProfileResponse
      log("[supermemory] getProfile success", { hasProfile: !!result?.profile })
      return result
    } catch (error) {
      log("[supermemory] getProfile error", { error: String(error) })
      return null
    }
  }

  async addMemory(
    content: string,
    containerTag: string,
    metadata?: { type?: MemoryType; [key: string]: unknown }
  ): Promise<AddMemoryResponse | null> {
    log("[supermemory] addMemory", { containerTag })
    try {
      const client = await this.getClient()
      const result = await withTimeout(
        client.memories.add({
          content,
          containerTag,
          metadata: metadata as Record<string, string | number | boolean | string[]>,
        }),
        TIMEOUT_MS
      ) as AddMemoryResponse
      log("[supermemory] addMemory success", { id: result?.id })
      return result
    } catch (error) {
      log("[supermemory] addMemory error", { error: String(error) })
      return null
    }
  }

  async forgetMemory(containerTag: string, memoryId?: string): Promise<boolean> {
    log("[supermemory] forgetMemory", { containerTag, memoryId })
    try {
      const client = await this.getClient()
      await withTimeout(
        client.memories.forget({
          containerTag,
          id: memoryId,
        }),
        TIMEOUT_MS
      )
      log("[supermemory] forgetMemory success")
      return true
    } catch (error) {
      log("[supermemory] forgetMemory error", { error: String(error) })
      return false
    }
  }

  async listMemories(containerTag: string, limit = 20): Promise<ListMemoriesResponse> {
    log("[supermemory] listMemories", { containerTag, limit })
    try {
      const client = await this.getClient()
      const result = await withTimeout(
        client.memories.list({
          containerTags: [containerTag],
          limit,
          order: "desc",
          sort: "createdAt",
        }),
        TIMEOUT_MS
      ) as ListMemoriesResponse
      log("[supermemory] listMemories success", { count: result.memories?.length || 0 })
      return result
    } catch (error) {
      log("[supermemory] listMemories error", { error: String(error) })
      return { memories: [], pagination: { currentPage: 1, totalItems: 0, totalPages: 0 } }
    }
  }
}

export const supermemoryClient = new SupermemoryClient()
