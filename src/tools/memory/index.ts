import { execSync } from 'child_process'
import { tool } from '@opencode-ai/plugin/tool'

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

export const memory = tool({
  description: 'Search past memories and stored knowledge. Use to recall context from previous sessions, user preferences, learned patterns, or any previously stored information.',
  args: {
    reason: tool.schema.string().describe('Brief explanation of why you are calling this tool'),
  },
  execute: async (args, _context) => {
    try {
      const result = execSync(
        `bun ${MEMORY_CLI_PATH} query "${args.reason.replace(/"/g, '\\"')}" --limit=5`,
        { encoding: 'utf-8', timeout: 30000 }
      )
      const data = JSON.parse(result)
      if (data.error) return `Error: ${data.error}`
      if (!data.memories || data.memories.length === 0) return 'No relevant memories found.'
      return data.memories.map((m: any, i: number) => `[${i + 1}] ${m.content} (${m.collection})`).join('\n')
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const memory_tools = tool({
  description: 'Store important information for future sessions, or get memory statistics. Actions: add (store new memory), stats (get counts)',
  args: {
    reason: tool.schema.string().describe('Brief explanation of why you are calling this tool'),
  },
  execute: async (args, _context) => {
    try {
      const reason = args.reason.toLowerCase()

      if (reason.includes('stats') || reason.includes('statistics') || reason.includes('count')) {
        const result = execSync(`bun ${MEMORY_CLI_PATH} stats`, { encoding: 'utf-8', timeout: 30000 })
        return result.trim()
      }

      const result = execSync(
        `bun ${MEMORY_CLI_PATH} add "${args.reason.replace(/"/g, '\\"')}" --collection=semantic`,
        { encoding: 'utf-8', timeout: 30000 }
      )
      const data = JSON.parse(result)
      if (data.error) return `Error: ${data.error}`
      return `Memory stored with id: ${data.id}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})