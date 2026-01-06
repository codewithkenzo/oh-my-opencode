export function unescapeZreadOutput(text: string): string {
  if (!text) return ""

  let result = text
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1)
  }

  return result
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`
  }
  return `Error: ${String(error)}`
}
