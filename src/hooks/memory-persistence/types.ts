import type { MemoryScope, MemoryType as SupermemoryType } from "../../tools/supermemory/types"

/**
 * Memory persistence configuration
 */
export interface MemoryPersistenceConfig {
  /** Enable memory persistence hook */
  enabled: boolean
  /** Recall relevant memories on session start */
  recall_on_start: boolean
  /** Persist working state before compaction */
  persist_on_compact: boolean
  /** Extract learnable patterns on session end */
  extract_patterns: boolean
  /** Maximum memories to recall per session */
  recall_limit: number
  /** Minimum messages for pattern extraction */
  min_session_length: number
  /** Minimum confidence for storing patterns (0-1) */
  pattern_confidence_threshold: number
}

/**
 * Memory types for persistence system
 * Extends supermemory types with session-specific type
 */
export type MemoryPersistenceType =
  | "session-context"
  | SupermemoryType

/**
 * Session state captured before compaction
 */
export interface SessionState {
  /** Current work in progress */
  currentWork: string
  /** Key decisions made this session */
  decisions: string[]
  /** Known blockers or issues */
  blockers: string[]
  /** Suggested next steps */
  nextSteps: string[]
  /** When state was captured */
  timestamp: string
  /** Session identifier */
  sessionId: string
}

/**
 * Pattern extracted from session
 */
export interface ExtractedPattern {
  /** Pattern category */
  category: PatternCategory
  /** Description of the pattern */
  description: string
  /** Context where pattern applies */
  context: string
  /** Solution or action taken */
  solution: string
  /** Confidence score (0-1) */
  confidence: number
  /** Scope: user-level or project-level */
  scope: MemoryScope
}

/**
 * Categories of extractable patterns
 */
export type PatternCategory =
  | "error_resolution"
  | "debugging_technique"
  | "workaround"
  | "user_correction"
  | "preference"
  | "workflow"

/**
 * Memory recalled from Supermemory
 */
export interface RecalledMemory {
  /** Unique identifier */
  id: string
  /** Memory content */
  content: string
  /** Memory type */
  type: MemoryPersistenceType
  /** Similarity score */
  similarity: number
  /** When memory was created */
  createdAt?: string
}

/**
 * Context provided to memory persistence handlers
 */
export interface MemoryPersistenceContext {
  /** Project directory path */
  directory: string
  /** Plugin configuration */
  config: MemoryPersistenceConfig
  /** Supermemory API key */
  apiKey?: string
}

/**
 * Result of memory recall operation
 */
export interface RecallResult {
  /** Recalled memories */
  memories: RecalledMemory[]
  /** Formatted XML for context injection */
  formattedContext: string
  /** Time taken in ms */
  timing: number
}

/**
 * Result of pattern extraction operation
 */
export interface ExtractionResult {
  /** Extracted patterns */
  patterns: ExtractedPattern[]
  /** Number of patterns stored */
  storedCount: number
  /** Skipped (below threshold) */
  skippedCount: number
}
