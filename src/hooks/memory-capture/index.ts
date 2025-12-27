import { execSync } from "child_process"
import type { PluginInput } from "@opencode-ai/plugin"
import { showToast } from "../../shared"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

type MemoryCollection = "rules" | "solutions" | "preferences" | "errors"

interface SessionContext {
  filesModified: Set<string>
  errorsEncountered: Map<string, number>
  successfulFixes: Array<{ error: string; fix: string }>
  projectPath: string | null
}

const sessionContexts = new Map<string, SessionContext>()

function getSession(sessionID: string): SessionContext {
  if (!sessionContexts.has(sessionID)) {
    sessionContexts.set(sessionID, {
      filesModified: new Set(),
      errorsEncountered: new Map(),
      successfulFixes: [],
      projectPath: null
    })
  }
  return sessionContexts.get(sessionID)!
}

function storeMemory(content: string, collection: MemoryCollection, ctx?: PluginInput): void {
  if (!content || content.length < 20 || content.length > 250) return
  
  try {
    const sanitized = content
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${sanitized}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 5000, stdio: "pipe" }
    )
    
    if (ctx) {
      showToast(ctx, { 
        title: "Memory Stored", 
        message: `${collection}: ${sanitized.slice(0, 40)}...`,
        variant: "info" 
      })
    }
  } catch {}
}

function extractExplicitRule(content: string): string | null {
  const lowerContent = content.toLowerCase()
  
  const explicitPatterns = [
    /(?:^|\.\s+)(always\s+(?:use|prefer|do|check|run|verify)\s+[^.]{15,80})/i,
    /(?:^|\.\s+)(never\s+(?:use|do|run|call|commit)\s+[^.]{15,80})/i,
    /(?:^|\.\s+)(from now on[,:]?\s+[^.]{15,80})/i,
    /(?:^|\.\s+)(remember[:]?\s+[^.]{15,80})/i,
    /(?:^|\.\s+)(prefer\s+\w+\s+(?:over|instead of)\s+\w+[^.]{0,50})/i,
  ]
  
  if (!lowerContent.includes("always") && 
      !lowerContent.includes("never") && 
      !lowerContent.includes("from now on") &&
      !lowerContent.includes("remember") &&
      !lowerContent.includes("prefer")) {
    return null
  }
  
  for (const pattern of explicitPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const rule = match[1].trim()
      if (rule.length >= 20 && rule.length <= 150) {
        return rule
      }
    }
  }
  return null
}

function extractPreference(content: string): string | null {
  const preferencePatterns = [
    /i (?:like|prefer|want)\s+(?:to use|using)?\s*([^.]{15,60})/i,
    /(?:use|call it|name it)\s+["']([^"']{3,30})["']/i,
  ]
  
  for (const pattern of preferencePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return `User prefers: ${match[1].trim()}`
    }
  }
  return null
}

export function createMemoryCaptureHook(input: PluginInput) {
  const recentErrors = new Map<string, number>()
  
  return {
    "chat.message": async (
      _input: { sessionID: string },
      output: { message?: { role?: string }; parts: Array<{ type: string; text?: string }> }
    ): Promise<void> => {
      const role = output.message?.role
      if (role !== "user") return

      const content = output.parts
        .filter(p => p.type === "text" && p.text)
        .map(p => p.text!)
        .join(" ")

      if (!content || content.length < 25) return
      if (content.includes("[COMPACTION") || content.includes("[SYSTEM")) return

      const rule = extractExplicitRule(content)
      if (rule) {
        storeMemory(rule, "rules", input)
      }

      const preference = extractPreference(content)
      if (preference) {
        storeMemory(preference, "preferences", input)
      }
    },

    "tool.execute.after": async (
      _input: { sessionID: string; tool: string; args?: Record<string, unknown> },
      output: { output?: string }
    ): Promise<void> => {
      const session = getSession(_input.sessionID)
      const toolName = _input.tool
      const toolOutput = output.output || ""

      if (toolName === "edit" || toolName === "write" || toolName === "multiedit") {
        const filePath = (_input.args as Record<string, unknown>)?.filePath as string
        if (filePath) {
          session.filesModified.add(filePath)
          
          const lastError = [...session.errorsEncountered.keys()].pop()
          if (lastError && !toolOutput.includes("Error")) {
            const errorKey = lastError.slice(0, 50)
            const now = Date.now()
            const lastTime = recentErrors.get(errorKey) || 0
            
            if (now - lastTime > 300000) {
              recentErrors.set(errorKey, now)
              const solution = `Fixed "${errorKey}" by editing ${filePath.split('/').pop()}`
              storeMemory(solution, "solutions", input)
              session.errorsEncountered.delete(lastError)
            }
          }
        }
      }

      const isError = toolOutput.includes("Error:") || 
                     toolOutput.includes("error:") ||
                     toolOutput.includes("ENOENT") ||
                     toolOutput.includes("TypeError") ||
                     toolOutput.includes("SyntaxError")

      if (isError && toolOutput.length < 150) {
        const errorKey = `${toolName}: ${toolOutput.slice(0, 80)}`
        const existing = session.errorsEncountered.get(errorKey) || 0
        session.errorsEncountered.set(errorKey, existing + 1)
        
        if (existing === 0) {
          const errorSig = toolOutput.match(/(?:Error|error|ENOENT|TypeError|SyntaxError)[^.]{10,60}/)?.[0]
          if (errorSig) {
            storeMemory(`${toolName} error: ${errorSig}`, "errors")
          }
        }
      }
    },

    event: async (eventInput: { event: { type: string; properties?: Record<string, unknown> } }): Promise<void> => {
      const { event } = eventInput
      const props = event.properties

      if (event.type === "session.deleted" || event.type === "session.end") {
        const sessionID = (props?.sessionID ?? (props?.info as { id?: string })?.id) as string
        if (sessionID) {
          sessionContexts.delete(sessionID)
        }
      }
    },
  }
}
