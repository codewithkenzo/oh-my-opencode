import { spawn } from "child_process"

const ALLOWED_COMMANDS = new Set([
  'echo', 'cat', 'ls', 'find', 'grep', 'wc', 'head', 'tail',
  'date', 'pwd', 'basename', 'dirname', 'realpath', 'whoami', 'uname', 'hostname',
  'git', 'node', 'bun', 'npm', 'pnpm'
])

const SHELL_METACHARACTERS = /[;|&$`\\()<>{}!\n\r]/

const SHELL_SECURITY = {
  TIMEOUT_MS: 5000,
  MAX_OUTPUT_BYTES: 1024 * 1024,
  MAX_COMMAND_LENGTH: 1000,
  MAX_COMMANDS_PER_SKILL: 10,
} as const

function isCommandAllowed(command: string): { allowed: boolean; binary: string; reason?: string } {
  const trimmed = command.trim()
  
  if (SHELL_METACHARACTERS.test(trimmed)) {
    return { allowed: false, binary: '', reason: 'shell metacharacters not permitted' }
  }
  
  const firstToken = trimmed.split(/\s+/)[0]
  const binary = firstToken.includes('/') 
    ? firstToken.split('/').pop() || ''
    : firstToken
  const allowed = ALLOWED_COMMANDS.has(binary)
  return { allowed, binary }
}

async function executeCommand(command: string, skillDir: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      cwd: skillDir,
      env: {
        PATH: '/usr/bin:/bin:/usr/local/bin',
        HOME: process.env.HOME,
        USER: process.env.USER,
      },
      timeout: SHELL_SECURITY.TIMEOUT_MS,
    })

    let stdout = ''
    let stderr = ''
    let resolved = false
    let timedOut = false
    let truncated = false

    const safeResolve = (value: string) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      resolve(value)
    }

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, SHELL_SECURITY.TIMEOUT_MS)

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
      if (stdout.length > SHELL_SECURITY.MAX_OUTPUT_BYTES) {
        stdout = stdout.slice(0, SHELL_SECURITY.MAX_OUTPUT_BYTES)
        truncated = true
        child.kill('SIGKILL')
      }
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
      if (stderr.length > SHELL_SECURITY.MAX_OUTPUT_BYTES) {
        stderr = stderr.slice(0, SHELL_SECURITY.MAX_OUTPUT_BYTES)
      }
    })

    child.on('close', (code) => {
      if (truncated) {
        safeResolve(stdout + '... (truncated)')
      } else if (timedOut) {
        safeResolve('[COMMAND_TIMEOUT: exceeded 5s]')
      } else if (code !== 0) {
        safeResolve(`[COMMAND_FAILED: ${code} - ${stderr.trim()}]`)
      } else {
        safeResolve(stdout.trim())
      }
    })

    child.on('error', (err) => {
      safeResolve(`[COMMAND_FAILED: ${err.message}]`)
    })
  })
}

/**
 * Preprocesses shell commands in skill content.
 * Syntax: !`command`
 * 
 * @param content The skill body content
 * @param skillDir The skill's resolved directory path (used as cwd)
 * @returns Content with shell expressions replaced by command output
 */
export async function preprocessShellCommands(
  content: string,
  skillDir: string
): Promise<string> {
  const regex = /!`([^`]+)`/g
  const matches = [...content.matchAll(regex)]
  
  if (matches.length === 0) return content
  if (matches.length > SHELL_SECURITY.MAX_COMMANDS_PER_SKILL) {
    console.warn(`[skill-loader] Too many shell commands (${matches.length} > ${SHELL_SECURITY.MAX_COMMANDS_PER_SKILL}), only processing first ${SHELL_SECURITY.MAX_COMMANDS_PER_SKILL}`)
  }
  
  const processLimit = Math.min(matches.length, SHELL_SECURITY.MAX_COMMANDS_PER_SKILL)
  const replacements: { index: number; length: number; replacement: string }[] = []
  
  for (let i = 0; i < processLimit; i++) {
    const match = matches[i]
    const fullMatch = match[0]
    const command = match[1]
    const matchIndex = match.index!
    
    let replacement: string
    
    if (command.length > SHELL_SECURITY.MAX_COMMAND_LENGTH) {
      replacement = '[COMMAND_BLOCKED: exceeds max length]'
    } else {
      const { allowed, binary, reason } = isCommandAllowed(command)
      if (!allowed) {
        const blockReason = reason || `${binary} not permitted`
        replacement = `[COMMAND_BLOCKED: ${blockReason}]`
      } else {
        replacement = await executeCommand(command, skillDir)
      }
    }
    
    replacements.push({ index: matchIndex, length: fullMatch.length, replacement })
  }
  
  let result = ''
  let lastIndex = 0
  for (const { index, length, replacement } of replacements) {
    result += content.slice(lastIndex, index) + replacement
    lastIndex = index + length
  }
  result += content.slice(lastIndex)
  
  return result
}

export async function executeShellBlock(
  shellConfig: Record<string, string>,
  skillDir: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const entries = Object.entries(shellConfig)
  
  if (entries.length > SHELL_SECURITY.MAX_COMMANDS_PER_SKILL) {
    console.warn(`[skill-loader] Shell block has too many commands (${entries.length} > ${SHELL_SECURITY.MAX_COMMANDS_PER_SKILL}), only processing first ${SHELL_SECURITY.MAX_COMMANDS_PER_SKILL}`)
  }
  
  const processLimit = Math.min(entries.length, SHELL_SECURITY.MAX_COMMANDS_PER_SKILL)
  
  for (let i = 0; i < processLimit; i++) {
    const [key, command] = entries[i]
    const cmd = command.replace(/^\$\((.*)\)$/, '$1').trim()
    
    if (cmd.length > SHELL_SECURITY.MAX_COMMAND_LENGTH) {
      results[key] = '[COMMAND_BLOCKED: exceeds max length]'
      continue
    }
    
    const { allowed, binary, reason } = isCommandAllowed(cmd)
    if (!allowed) {
      const blockReason = reason || `${binary} not permitted`
      results[key] = `[COMMAND_BLOCKED: ${blockReason}]`
    } else {
      results[key] = await executeCommand(cmd, skillDir)
    }
  }
  
  return results
}

export function substituteShellVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'), value)
  }
  return result
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Export for testing
export { isCommandAllowed, executeCommand, ALLOWED_COMMANDS, SHELL_SECURITY }
