import { tool } from "@opencode-ai/plugin"
import type { SupermemoryArgs, MemoryType, MemoryScope } from "./types"
import { TOOL_DESCRIPTION, MEMORY_TYPES, MEMORY_SCOPES, MODES } from "./constants"
import {
  isConfigured,
  getTags,
  stripPrivateContent,
  isFullyPrivate,
  supermemoryClient,
  getConfig,
} from "./client"

function formatSearchResults(
  query: string,
  scope: string | undefined,
  results: { results?: Array<{ id: string; memory?: string; chunk?: string; similarity: number }> },
  limit?: number
): string {
  const memoryResults = results.results || []
  return JSON.stringify({
    success: true,
    query,
    scope,
    count: memoryResults.length,
    results: memoryResults.slice(0, limit || 10).map((r) => ({
      id: r.id,
      content: r.memory || r.chunk,
      similarity: Math.round(r.similarity * 100),
    })),
  })
}

export function createSupermemoryTool(directory: string) {
  const tags = getTags(directory)

  return tool({
    description: TOOL_DESCRIPTION,
    args: {
      mode: tool.schema.enum(MODES).optional(),
      content: tool.schema.string().optional(),
      query: tool.schema.string().optional(),
      type: tool.schema.enum(MEMORY_TYPES).optional(),
      scope: tool.schema.enum(MEMORY_SCOPES).optional(),
      memoryId: tool.schema.string().optional(),
      limit: tool.schema.number().optional(),
    },
    async execute(args: SupermemoryArgs) {
      if (!isConfigured()) {
        return JSON.stringify({
          success: false,
          error: "SUPERMEMORY_API_KEY not set. Set it in your environment to use Supermemory.",
        })
      }

      const mode = args.mode || "help"

      try {
        switch (mode) {
          case "help": {
            return JSON.stringify({
              success: true,
              message: "Supermemory Usage Guide",
              commands: [
                { command: "add", description: "Store a new memory", args: ["content", "type?", "scope?"] },
                { command: "search", description: "Search memories", args: ["query", "scope?"] },
                { command: "profile", description: "View user profile", args: ["query?"] },
                { command: "list", description: "List recent memories", args: ["scope?", "limit?"] },
                { command: "forget", description: "Remove a memory", args: ["memoryId", "scope?"] },
              ],
              scopes: {
                user: "Cross-project preferences and knowledge",
                project: "Project-specific knowledge (default)",
              },
              types: MEMORY_TYPES,
            })
          }

          case "add": {
            if (!args.content) {
              return JSON.stringify({
                success: false,
                error: "content parameter is required for add mode",
              })
            }

            const sanitizedContent = stripPrivateContent(args.content)
            if (isFullyPrivate(args.content)) {
              return JSON.stringify({
                success: false,
                error: "Cannot store fully private content",
              })
            }

            const scope = args.scope || "project"
            const containerTag = scope === "user" ? tags.user : tags.project

            const result = await supermemoryClient.addMemory(
              sanitizedContent,
              containerTag,
              { type: args.type }
            )

            if (!result) {
              return JSON.stringify({
                success: false,
                error: "Failed to add memory",
              })
            }

            return JSON.stringify({
              success: true,
              message: `Memory added to ${scope} scope`,
              id: result.id,
              scope,
              type: args.type,
            })
          }

          case "search": {
            if (!args.query) {
              return JSON.stringify({
                success: false,
                error: "query parameter is required for search mode",
              })
            }

            const scope = args.scope

            if (scope === "user") {
              const results = await supermemoryClient.searchMemories(args.query, tags.user)
              return formatSearchResults(args.query, scope, results, args.limit)
            }

            if (scope === "project") {
              const results = await supermemoryClient.searchMemories(args.query, tags.project)
              return formatSearchResults(args.query, scope, results, args.limit)
            }

            const [userResults, projectResults] = await Promise.all([
              supermemoryClient.searchMemories(args.query, tags.user),
              supermemoryClient.searchMemories(args.query, tags.project),
            ])

            const combined = [
              ...(userResults.results || []).map((r) => ({ ...r, scope: "user" as const })),
              ...(projectResults.results || []).map((r) => ({ ...r, scope: "project" as const })),
            ].sort((a, b) => b.similarity - a.similarity)

            return JSON.stringify({
              success: true,
              query: args.query,
              count: combined.length,
              results: combined.slice(0, args.limit || 10).map((r) => ({
                id: r.id,
                content: r.memory || r.chunk,
                similarity: Math.round(r.similarity * 100),
                scope: r.scope,
              })),
            })
          }

          case "profile": {
            const profile = await supermemoryClient.getProfile(tags.user, args.query)

            if (!profile) {
              return JSON.stringify({
                success: false,
                error: "Failed to fetch profile",
              })
            }

            return JSON.stringify({
              success: true,
              profile: {
                static: profile.profile?.static || [],
                dynamic: profile.profile?.dynamic || [],
              },
            })
          }

          case "list": {
            const scope = args.scope || "project"
            const limit = args.limit || 20
            const containerTag = scope === "user" ? tags.user : tags.project

            const result = await supermemoryClient.listMemories(containerTag, limit)

            const memories = result.memories || []
            return JSON.stringify({
              success: true,
              scope,
              count: memories.length,
              memories: memories.map((m) => ({
                id: m.id,
                content: m.summary,
                createdAt: m.createdAt,
                metadata: m.metadata,
              })),
            })
          }

          case "forget": {
            if (!args.memoryId) {
              return JSON.stringify({
                success: false,
                error: "memoryId parameter is required for forget mode",
              })
            }

            const scope = args.scope || "project"
            const containerTag = scope === "user" ? tags.user : tags.project

            try {
              await supermemoryClient.forgetMemory(containerTag, args.memoryId)
              return JSON.stringify({
                success: true,
                message: `Memory ${args.memoryId} removed from ${scope} scope`,
              })
            } catch (forgetError) {
              return JSON.stringify({
                success: false,
                error: forgetError instanceof Error ? forgetError.message : "Failed to forget memory",
              })
            }
          }

          default:
            return JSON.stringify({
              success: false,
              error: `Unknown mode: ${mode}`,
            })
        }
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })
}
