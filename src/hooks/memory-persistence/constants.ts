import type { MemoryPersistenceConfig, PatternCategory } from "./types"

/**
 * Hook name for registration
 */
export const HOOK_NAME = "memory-persistence"

/**
 * Default configuration values
 */
export const DEFAULT_MEMORY_CONFIG: MemoryPersistenceConfig = {
  enabled: true,
  recall_on_start: true,
  persist_on_compact: true,
  extract_patterns: true,
  recall_limit: 5,
  min_session_length: 5,
  pattern_confidence_threshold: 0.7,
  error_lookback_window: 10,
}

/**
 * Memory types used by this hook
 */
export const MEMORY_TYPES = [
  "session-context",
  "error-solution",
  "learned-pattern",
  "preference",
  "architecture",
] as const

/**
 * TTL in days for different memory types
 */
export const MEMORY_TTL_DAYS: Record<string, number> = {
  "session-context": 7,
  "error-solution": 30,
  "learned-pattern": 90,
  preference: 365,
  architecture: 180,
}

/**
 * Signals that indicate user correction
 * Used for pattern extraction
 */
export const CORRECTION_SIGNALS = [
  "no",
  "stop",
  "don't",
  "instead",
  "actually",
  "wait",
  "wrong",
  "not what i",
  "that's not",
  "try again",
] as const

/**
 * Explicit signals to remember something
 */
export const REMEMBER_SIGNALS = [
  "remember this",
  "add to rules",
  "save this",
  "note this",
  "keep in mind",
  "always do",
  "never do",
  "from now on",
] as const

/**
 * Pattern categories with their detection signals
 */
export const PATTERN_SIGNALS: Record<PatternCategory, string[]> = {
  error_resolution: ["error", "fix", "resolved", "solved", "working now"],
  debugging_technique: ["debug", "found the issue", "root cause", "traced"],
  workaround: ["workaround", "temporary fix", "for now", "until"],
  user_correction: CORRECTION_SIGNALS as unknown as string[],
  preference: ["prefer", "always use", "never use", "my style"],
  workflow: ["workflow", "process", "steps", "routine"],
}

/**
 * Minimum similarity score for memory recall
 */
export const MIN_SIMILARITY_SCORE = 0.6

/**
 * Maximum content length for a single memory
 */
export const MAX_MEMORY_CONTENT_LENGTH = 4000

/**
 * XML tags for context injection
 */
export const CONTEXT_TAGS = {
  wrapper: "recalled-memories",
  memory: "memory",
  type: "type",
  content: "content",
  similarity: "similarity",
} as const

/**
 * Session prefix for memory storage keys
 */
export const SESSION_MEMORY_PREFIX = "session:"
