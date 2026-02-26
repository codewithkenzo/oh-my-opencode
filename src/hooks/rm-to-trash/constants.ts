/** Patterns that are always allowed (build cleanup, package manager internals) */
export const SAFE_RM_PATTERNS = [
  /\brm\s+(-rf?\s+)?node_modules\b/,
  /\brm\s+(-rf?\s+)?dist\b/,
  /\brm\s+(-rf?\s+)?\.cache\b/,
  /\brm\s+(-rf?\s+)?\.turbo\b/,
  /\brm\s+(-rf?\s+)?coverage\b/,
  /\brm\s+(-rf?\s+)?\.next\b/,
  /\brm\s+(-rf?\s+)?build\b/,
  /\brm\s+(-rf?\s+)?tmp\b/,
]

/** Patterns that are ALWAYS blocked regardless of enforcement level */
export const DANGEROUS_RM_PATTERNS = [
  /\brm\s+(-rf?\s+)?\/\s*$/,
  /\brm\s+(-rf?\s+)?\/\s+/,
  /\brm\s+(-rf?\s+)?~\s*$/,
  /\brm\s+(-rf?\s+)?~\//,
  /\brm\s+(-rf?\s+)?\$HOME\b/,
]

export const TRASH_ALTERNATIVES: Record<string, string> = {
  linux: "trash-put",
  darwin: "trash",
}

export const WARN_MESSAGE = (cmd: string, trashCmd: string) =>
  `⚠️ rm detected: \`${cmd}\`\nConsider using \`${trashCmd}\` instead for safe deletion. Files can be recovered from trash.`

export const BLOCK_MESSAGE = (cmd: string) =>
  `🚫 Dangerous rm command blocked: \`${cmd}\`\nThis pattern could cause catastrophic data loss.`
