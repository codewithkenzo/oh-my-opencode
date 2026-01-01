export const TOOL_NAME = "supermemory"

export const TOOL_DESCRIPTION = `Manage and query the Supermemory persistent memory system. Use 'search' to find relevant memories, 'add' to store new knowledge, 'profile' to view user profile, 'list' to see recent memories, 'forget' to remove a memory.`

export const SUPERMEMORY_API_URL = "https://api.supermemory.ai"

export const TIMEOUT_MS = 30000

export const INTEGRATION_TIMEOUT_MS = 5000

export const DEFAULT_CONFIG = {
  similarityThreshold: 0.6,
  maxMemories: 5,
  maxProjectMemories: 10,
  maxProfileItems: 5,
  injectProfile: true,
  containerTagPrefix: "opencode",
  filterPrompt: "You are a stateful coding agent. Remember all the information, including but not limited to user's coding preferences, tech stack, behaviours, workflows, and any other relevant details.",
} as const

export const MEMORY_TYPES = [
  "project-config",
  "architecture", 
  "error-solution",
  "preference",
  "learned-pattern",
  "conversation",
] as const

export const MEMORY_SCOPES = ["user", "project"] as const

export const MODES = ["add", "search", "profile", "list", "forget", "help"] as const
