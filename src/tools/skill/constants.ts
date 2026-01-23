export const TOOL_NAME = "skill" as const

export const TOOL_DESCRIPTION_NO_SKILLS = "Load a skill to get detailed instructions for a specific task. No skills are currently available."

export const TOOL_DESCRIPTION_PREFIX = `Load a skill to get detailed instructions for a specific task.

Skills provide specialized knowledge and step-by-step guidance.
Use this when a task matches an available skill's description.`

/**
 * Fundamental skills that should ALWAYS be shown in the skill tool description.
 * These are core workflows that apply to most development tasks.
 * 
 * Criteria for inclusion:
 * - Used in 10%+ of development sessions
 * - Critical for agent orchestration
 * - Core development workflows
 */
export const FUNDAMENTAL_SKILLS = [
  // Core orchestration
  "git-master",
  "playwright",
  "systematic-debugging",
  "verification-before-completion",
  "test-driven-development",
  
  // Planning & execution
  "brainstorming",
  "writing-plans",
  "executing-plans",
  "subagent-driven-development",
  
  // Code review & quality
  "requesting-code-review",
  "receiving-code-review",
  "finishing-a-development-branch",
  
  // Research
  "research-tools",
  "context7",
  "docs-seeker",
] as const

export type FundamentalSkill = typeof FUNDAMENTAL_SKILLS[number]

/**
 * Skill categories for discovery via find_skills tool
 */
export const SKILL_CATEGORIES = {
  frontend: ["frontend-ui-ux", "frontend-stack", "component-stack", "motion-system", "tailwind-design-system", "react-dev", "react-useeffect"],
  backend: ["hono-api", "bun-hono-api", "drizzle-sqlite", "drizzle-orm-d1", "better-auth", "effect-ts-expert"],
  database: ["database-design", "database-schema-design", "sql-optimization-patterns", "database-query-optimization"],
  testing: ["testing-stack", "frontend-testing", "qa-test-planner", "tdd-workflow"],
  security: ["owasp-security", "api-security-best-practices", "vulnerability-scanning", "auth-implementation-patterns"],
  documentation: ["crafting-effective-readmes", "api-documentation-generator", "developer-onboarding"],
  devops: ["git-workflow", "github-actions-workflow", "docker-expert", "vercel-deployment"],
  ai: ["ai-sdk", "ai-sdk-core", "ai-sdk-ui", "prompt-engineering-patterns", "ai-agents-architect"],
  marketing: ["copywriting", "seo-audit", "social-content", "launch-strategy", "pricing-strategy"],
} as const

export type SkillCategory = keyof typeof SKILL_CATEGORIES
