import type { CommandDefinition } from "../claude-code-command-loader"
import type { BuiltinCommandName, BuiltinCommands } from "./types"
import { INIT_DEEP_TEMPLATE } from "./templates/init-deep"
import { RALPH_LOOP_TEMPLATE, CANCEL_RALPH_TEMPLATE } from "./templates/ralph-loop"
import { REFACTOR_TEMPLATE } from "./templates/refactor"
import { START_WORK_TEMPLATE } from "./templates/start-work"

const BUILTIN_COMMAND_DEFINITIONS: Record<BuiltinCommandName, Omit<CommandDefinition, "name">> = {
  "init-deep": {
    description: "(builtin) Initialize hierarchical AGENTS.md knowledge base",
    template: `<command-instruction>
${INIT_DEEP_TEMPLATE}
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`,
    argumentHint: "[--create-new] [--max-depth=N]",
  },
   "ralph-loop": {
     description: "(builtin) Start self-referential development loop until completion",
     template: `<command-instruction>
${RALPH_LOOP_TEMPLATE}
</command-instruction>

<user-task>
$ARGUMENTS
</user-task>`,
     argumentHint: '"task description" [--completion-promise=TEXT] [--max-iterations=N]',
   },
   "ulw-loop": {
     description: "(builtin) Start ultrawork loop - continues until completion with ultrawork mode",
     template: `<command-instruction>
${RALPH_LOOP_TEMPLATE}
</command-instruction>

<user-task>
$ARGUMENTS
</user-task>`,
     argumentHint: '"task description" [--completion-promise=TEXT] [--max-iterations=N]',
   },
  "cancel-ralph": {
    description: "(builtin) Cancel active Ralph Loop",
    template: `<command-instruction>
${CANCEL_RALPH_TEMPLATE}
</command-instruction>`,
  },
  refactor: {
    description:
      "(builtin) Intelligent refactoring command with LSP, AST-grep, architecture analysis, codemap, and TDD verification.",
    template: `<command-instruction>
${REFACTOR_TEMPLATE}
</command-instruction>`,
    argumentHint: "<refactoring-target> [--scope=<file|module|project>] [--strategy=<safe|aggressive>]",
  },
  "start-work": {
    description: "(builtin) Start Musashi work session from plan",
    agent: "Musashi - boulder",
    template: `<command-instruction>
${START_WORK_TEMPLATE}
</command-instruction>

<session-context>
Session ID: $SESSION_ID
Timestamp: $TIMESTAMP
</session-context>

<user-request>
$ARGUMENTS
</user-request>`,
    argumentHint: "[plan-name]",
  },
  "security-scan": {
    description: "(builtin) Trigger B3 security specialist review",
    agent: "B3 - security",
    template: `<command-instruction>
Perform a comprehensive security assessment of the specified target.

## Assessment Protocol

1. **OWASP Top 10 Checklist**: Evaluate all categories systematically
2. **AST-grep Patterns**: Run vulnerability detection patterns for the target language
3. **Dependency Audit**: Check for known CVEs in dependencies
4. **Authentication/Authorization**: Review auth flows and access control
5. **Input Validation**: Identify injection vectors and sanitization gaps

## Output Format

Produce a structured security assessment report:
- Executive summary with risk score (Critical/High/Medium/Low)
- Detailed findings with evidence (file:line references)
- Remediation recommendations with code examples
- Compliance notes (OWASP, CWE references)

## Constraints

- READ-ONLY assessment - do NOT modify code
- Use AST-grep for pattern matching, LSP for navigation
- Focus on actionable findings, not theoretical risks
</command-instruction>

<scan-target>
$ARGUMENTS
</scan-target>`,
    argumentHint: "<file|directory|module> [--focus=<auth|api|input|all>]",
  },
  "memory-search": {
    description: "(builtin) Search supermemory for past decisions and context",
    template: `<command-instruction>
Search supermemory for relevant context using the provided query.

## Search Protocol

1. **Query Analysis**: Parse the search query for key concepts
2. **Memory Search**: Search across all memory scopes (project, user, global)
3. **Relevance Ranking**: Sort results by recency and relevance
4. **Context Extraction**: Extract relevant snippets with metadata

## Output Format

Return matching memories with:
- Memory ID and scope (project/user/global)
- Memory type (decision, pattern, preference, context)
- Timestamp and relevance score
- Extracted content with surrounding context

## Usage

This command helps recall:
- Past architectural decisions and rationale
- Established patterns and conventions
- User preferences and workflow history
- Previous debugging sessions and solutions
</command-instruction>

<search-query>
$ARGUMENTS
</search-query>`,
    argumentHint: '"search query" [--scope=<project|user|global>] [--limit=N]',
  },
}

export function loadBuiltinCommands(
  disabledCommands?: BuiltinCommandName[]
): BuiltinCommands {
  const disabled = new Set(disabledCommands ?? [])
  const commands: BuiltinCommands = {}

  for (const [name, definition] of Object.entries(BUILTIN_COMMAND_DEFINITIONS)) {
    if (!disabled.has(name as BuiltinCommandName)) {
      const { argumentHint: _argumentHint, ...openCodeCompatible } = definition
      commands[name] = openCodeCompatible as CommandDefinition
    }
  }

  return commands
}

/**
 * Get builtin commands as CommandInfo array for slashcommand tool discovery.
 * This allows builtin commands to appear in slash command listings and be invocable.
 */
export interface BuiltinCommandInfo {
  name: string
  metadata: {
    name: string
    description: string
    argumentHint?: string
    model?: string
    agent?: string
    subtask?: boolean
  }
  content: string
  scope: "builtin"
}

export function getBuiltinCommandsAsInfoArray(
  disabledCommands?: BuiltinCommandName[]
): BuiltinCommandInfo[] {
  const disabled = new Set(disabledCommands ?? [])
  const commands: BuiltinCommandInfo[] = []

  for (const [name, definition] of Object.entries(BUILTIN_COMMAND_DEFINITIONS)) {
    if (!disabled.has(name as BuiltinCommandName)) {
      commands.push({
        name,
        metadata: {
          name,
          description: definition.description || "",
          argumentHint: definition.argumentHint,
          model: definition.model,
          agent: definition.agent,
          subtask: definition.subtask,
        },
        content: definition.template,
        scope: "builtin",
      })
    }
  }

  return commands
}
