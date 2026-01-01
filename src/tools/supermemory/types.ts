export type MemoryScope = "user" | "project"

export type MemoryType =
  | "project-config"
  | "architecture"
  | "error-solution"
  | "preference"
  | "learned-pattern"
  | "conversation"

export type SupermemoryMode = "add" | "search" | "profile" | "list" | "forget" | "help"

export interface SupermemoryArgs {
  mode?: SupermemoryMode
  content?: string
  query?: string
  type?: MemoryType
  scope?: MemoryScope
  memoryId?: string
  limit?: number
}

export interface SupermemoryConfig {
  apiKey?: string
  similarityThreshold?: number
  maxMemories?: number
  maxProjectMemories?: number
  maxProfileItems?: number
  injectProfile?: boolean
  containerTagPrefix?: string
  filterPrompt?: string
}

export interface MemoryResult {
  id: string
  memory?: string
  chunk?: string
  similarity: number
  title?: string
  metadata?: Record<string, unknown>
}

export interface MemoriesResponse {
  results?: MemoryResult[]
  total?: number
  timing?: number
}

export interface MemoryItem {
  id: string
  summary?: string
  content?: string
  createdAt?: string
  metadata?: Record<string, unknown>
}

export interface ListMemoriesResponse {
  memories?: MemoryItem[]
  pagination?: {
    currentPage: number
    totalItems: number
    totalPages: number
  }
}

export interface ProfileResponse {
  profile?: {
    static: string[]
    dynamic: string[]
  }
}

export interface AddMemoryResponse {
  id: string
}
