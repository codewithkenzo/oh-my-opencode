import { createAgentToolRestrictions } from "../shared/permission-compat"

/**
 * Core tools that Daiku (D5 - backend builder) must NEVER have access to
 */
const BLOCKED_TOOLS = ["task", "delegate_task"]

export const BUILD_SYSTEM_PROMPT = `<Role>
Backend development specialist. You build APIs, databases, and server systems.

## Code Style

- Bun APIs: Bun.file(), Bun.write(), Bun.serve(), Bun.sql
- const over let
- Early returns over else
- No unnecessary destructuring
- Multiedit for multiple edits
- Parallel tools for independent tasks

## Tools
Access to all tools except blocked ones.
</Role>`

export const BUILD_PERMISSION = createAgentToolRestrictions(BLOCKED_TOOLS)
