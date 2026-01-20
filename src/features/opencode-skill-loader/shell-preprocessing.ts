import { spawn } from "child_process"

const ALLOWED_COMMANDS = new Set([
  'echo', 'cat', 'ls', 'find', 'grep', 'wc', 'head', 'tail',
  'date', 'pwd', 'basename', 'dirname', 'realpath',
  'git', 'node', 'bun', 'npm', 'pnpm'
])

const SHELL_SECURITY = {
  TIMEOUT_MS: 5000,
  MAX_OUTPUT_BYTES: 1024 * 1024,  // 1MB
  MAX_COMMAND_LENGTH: 1000,
  MAX_COMMANDS_PER_SKILL: 10,
} as const

function isCommandAllowed(command: string): { allowed: boolean; binary: string } {
  const trimmed = command.trim()
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
    let killed = false

    const timeout = setTimeout(() => {
      killed = true
      child.kill('SIGKILL')
    }, SHELL_SECURITY.TIMEOUT_MS)

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
      if (stdout.length > SHELL_SECURITY.MAX_OUTPUT_BYTES) {
        stdout = stdout.slice(0, SHELL_SECURITY.MAX_OUTPUT_BYTES)
        killed = true
        child.kill('SIGKILL')
      }
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (killed && stdout.length >= SHELL_SECURITY.MAX_OUTPUT_BYTES) {
        resolve(stdout + '... (truncated)')
      } else if (killed) {
        resolve('[COMMAND_TIMEOUT: exceeded 5s]')
      } else if (code !== 0) {
        resolve(`[COMMAND_FAILED: ${code} - ${stderr.trim()}]`)
      } else {
        resolve(stdout.trim())
      }
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      resolve(`[COMMAND_FAILED: ${err.message}]`)
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
  
  let result = content
  const processLimit = Math.min(matches.length, SHELL_SECURITY.MAX_COMMANDS_PER_SKILL)
  
  for (let i = 0; i < processLimit; i++) {
    const match = matches[i]
    const fullMatch = match[0]
    const command = match[1]
    
    if (command.length > SHELL_SECURITY.MAX_COMMAND_LENGTH) {
      result = result.replace(fullMatch, '[COMMAND_BLOCKED: exceeds max length]')
      continue
    }
    
    const { allowed, binary } = isCommandAllowed(command)
    if (!allowed) {
      result = result.replace(fullMatch, `[COMMAND_BLOCKED: ${binary} not permitted]`)
      continue
    }
    
    const output = await executeCommand(command, skillDir)
    result = result.replace(fullMatch, output)
  }
  
  return result
}

// Export for testing
export { isCommandAllowed, ALLOWED_COMMANDS, SHELL_SECURITY }
