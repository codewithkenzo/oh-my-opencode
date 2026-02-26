export const TEST_PATTERNS = [
  /bun\s+test/,
  /vitest/,
  /jest/,
  /pytest/,
  /npm\s+test/,
  /yarn\s+test/,
]

export const TYPECHECK_PATTERNS = [
  /bun\s+run\s+typecheck/,
  /tsc\s+--noEmit/,
  /tsc\b/,
  /npx\s+tsc/,
]

export const WARN_MESSAGE = (missing: string[]) =>
  `⚠️ Verification incomplete. Missing: ${missing.join(", ")}. Run tests and typecheck before claiming done.`

export const BLOCK_MESSAGE = (missing: string[]) =>
  `🚫 Cannot complete without verification. Missing: ${missing.join(", ")}. Run the required checks first.`
