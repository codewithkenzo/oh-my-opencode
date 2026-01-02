import { BirdError, type Tweet, type User } from "./types"
import * as constants from "./constants"

/**
 * Sanitize CLI output for safe transmission through Antigravity/Gemini API.
 * 
 * Bird CLI outputs Unicode characters that crash OpenCode:
 * - Emojis: ℹ️ (info), ✅ (checkmark), 📍 (pin) - 4-byte UTF-8
 * - Box drawing: ─ (U+2500) - 3-byte UTF-8
 * - ANSI escape codes from kleur
 * 
 * These cause "Failed to process error response" in OpenCode core.
 * Solution: Strip ALL non-ASCII, keep only printable ASCII + newlines.
 */
function sanitizeOutput(str: string): string {
  return str
    // ANSI escape codes
    .replace(/\x1b\[[0-9;]*m/g, '')           // Standard color codes
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')  // Cursor/screen control
    .replace(/\x1b\][^\x07]*\x07/g, '')       // OSC sequences
    // Unicode problematic characters
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')   // Emojis (Misc Symbols, Emoticons, etc.)
    .replace(/[\u{2600}-\u{26FF}]/gu, '')     // Misc symbols (✅, ℹ️, etc.)
    .replace(/[\u{2700}-\u{27BF}]/gu, '')     // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')     // Variation selectors (emoji modifiers)
    .replace(/[\u2500-\u257F]/g, '-')         // Box drawing → dash
    .replace(/[\u2580-\u259F]/g, '#')         // Block elements → hash
    // Final cleanup: keep only printable ASCII + newline + tab
    .replace(/[^\x20-\x7E\n\t]/g, '')
}

interface ExecOptions {
  timeout?: number
  cookieSource?: string
}

async function execBird(args: string[], options: ExecOptions = {}): Promise<string> {
  const timeout = options.timeout ?? constants.DEFAULT_TIMEOUT_MS
  const cmdArgs = [...args]

  if (options.cookieSource) {
    cmdArgs.push("--cookie-source", options.cookieSource)
  }
  cmdArgs.push("--plain")

  try {
    const proc = Bun.spawn(["bunx", "@steipete/bird", ...cmdArgs], {
      stdout: "pipe",
      stderr: "pipe",
    })

    const timeoutId = setTimeout(() => proc.kill(), timeout)

    const exitCode = await proc.exited
    clearTimeout(timeoutId)

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    if (exitCode !== 0) {
      const errorMsg = sanitizeOutput(stderr || stdout || `Exit code ${exitCode}`)
      throw new Error(errorMsg)
    }

    const output = sanitizeOutput(stdout.trim())
    return output || '{"success": true}'
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes("not found") || msg.includes("command not found")) {
      throw new BirdError(constants.ERROR_NOT_INSTALLED, "NOT_INSTALLED", error)
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
      throw new BirdError(constants.ERROR_RATE_LIMITED, "RATE_LIMITED", error)
    }
    if (msg.includes("401") || msg.includes("403") || msg.includes("auth") || msg.includes("cookie")) {
      throw new BirdError(constants.ERROR_AUTH_FAILED, "AUTH_FAILED", error)
    }
    if (msg.includes("404") || msg.includes("not found")) {
      throw new BirdError(constants.ERROR_NOT_FOUND, "NOT_FOUND", error)
    }

    throw new BirdError(`CLI error: ${msg}`, "CLI_ERROR", error)
  }
}

async function execBirdJson<T>(args: string[], options: ExecOptions = {}): Promise<T> {
  const output = await execBird([...args, "--json"], options)
  try {
    return JSON.parse(output) as T
  } catch {
    throw new BirdError(`Failed to parse JSON: ${sanitizeOutput(output).slice(0, 200)}`, "PARSE_ERROR")
  }
}

export async function tweet(
  text: string,
  options?: { media?: string[]; alt?: string[]; cookieSource?: string }
): Promise<string> {
  const args = ["tweet", text]
  if (options?.media) {
    for (let i = 0; i < options.media.length; i++) {
      args.push("--media", options.media[i])
      if (options.alt?.[i]) {
        args.push("--alt", options.alt[i])
      }
    }
  }
  return execBird(args, { cookieSource: options?.cookieSource })
}

export async function reply(
  tweetIdOrUrl: string,
  text: string,
  options?: { media?: string[]; alt?: string[]; cookieSource?: string }
): Promise<string> {
  const args = ["reply", tweetIdOrUrl, text]
  if (options?.media) {
    for (let i = 0; i < options.media.length; i++) {
      args.push("--media", options.media[i])
      if (options.alt?.[i]) {
        args.push("--alt", options.alt[i])
      }
    }
  }
  return execBird(args, { cookieSource: options?.cookieSource })
}

export async function read(
  tweetIdOrUrl: string,
  options?: { cookieSource?: string }
): Promise<Tweet> {
  return execBirdJson<Tweet>(["read", tweetIdOrUrl], options)
}

export async function search(
  query: string,
  count: number = constants.DEFAULT_COUNT,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  return execBirdJson<Tweet[]>(["search", query, "-n", String(count)], options)
}

export async function mentions(
  count: number = constants.DEFAULT_COUNT,
  user?: string,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  const args = ["mentions", "-n", String(count)]
  if (user) args.push("--user", user)
  return execBirdJson<Tweet[]>(args, options)
}

export async function replies(
  tweetIdOrUrl: string,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  return execBirdJson<Tweet[]>(["replies", tweetIdOrUrl], options)
}

export async function thread(
  tweetIdOrUrl: string,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  return execBirdJson<Tweet[]>(["thread", tweetIdOrUrl], options)
}

export async function bookmarks(
  count: number = constants.DEFAULT_COUNT,
  folderId?: string,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  const args = ["bookmarks", "-n", String(count)]
  if (folderId) args.push("--folder-id", folderId)
  return execBirdJson<Tweet[]>(args, options)
}

export async function likes(
  count: number = constants.DEFAULT_COUNT,
  options?: { cookieSource?: string }
): Promise<Tweet[]> {
  return execBirdJson<Tweet[]>(["likes", "-n", String(count)], options)
}

export async function following(
  count: number = constants.DEFAULT_COUNT,
  userId?: string,
  options?: { cookieSource?: string }
): Promise<User[]> {
  const args = ["following", "-n", String(count)]
  if (userId) args.push("--user", userId)
  return execBirdJson<User[]>(args, options)
}

export async function followers(
  count: number = constants.DEFAULT_COUNT,
  userId?: string,
  options?: { cookieSource?: string }
): Promise<User[]> {
  const args = ["followers", "-n", String(count)]
  if (userId) args.push("--user", userId)
  return execBirdJson<User[]>(args, options)
}

export async function whoami(options?: { cookieSource?: string }): Promise<string> {
  return execBird(["whoami"], options)
}

export async function check(options?: { cookieSource?: string }): Promise<string> {
  return execBird(["check"], options)
}
