export const HOOK_NAME = "skill-enforcer"

export const SKILL_PATTERNS: Record<string, { globs: string[]; skills: string[] }> = {
  "frontend": {
    globs: ["**/*.tsx", "**/*.jsx", "**/components/**"],
    skills: ["frontend-stack", "animate-ui-expert"]
  },
  "animation": {
    globs: ["**/motion/**", "**/animation*/**"],
    skills: ["animation-expert"]
  },
  "api": {
    globs: ["**/api/**", "**/routes/**", "**/server/**"],
    skills: ["hono-api"]
  },
  "database": {
    globs: ["**/db/**", "**/schema*", "**/drizzle*"],
    skills: ["drizzle-orm"]
  },
  "effect": {
    globs: ["**/*.effect.ts", "**/effect/**"],
    skills: ["effect-ts-expert"]
  },
  "testing": {
    globs: ["**/*.test.ts", "**/*.spec.ts", "**/tests/**"],
    skills: ["tdd-typescript"]
  },
  "debugging": {
    globs: [],
    skills: ["systematic-debugging"]
  }
}

export const ERROR_TRIGGERS = [
  "Error:", "error:", "failed", "FAIL", "TypeError", "ReferenceError"
]

export const REMINDER_TEMPLATE = `
[SKILL RECOMMENDATION]
Based on the files you're working with, consider loading these skills for better context:
{{skills}}
Use: skill(name="{{first_skill}}")
`
