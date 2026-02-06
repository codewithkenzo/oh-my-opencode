# FEATURES KNOWLEDGE BASE

## OVERVIEW

14 feature modules: background agents, skill loader, builtin skills/commands, Claude Code compatibility layer, 5 loaders.

## STRUCTURE

```
features/
├── background-agent/           # Task lifecycle (1335 lines)
│   ├── manager.ts              # Launch → poll → complete
│   ├── concurrency.ts          # Per-provider limits
│   └── types.ts                # BackgroundTask, LaunchInput
├── skill-mcp-manager/          # MCP client lifecycle (520 lines)
│   ├── manager.ts              # Lazy loading, cleanup
│   └── types.ts                # SkillMcpConfig
├── builtin-skills/             # 7 workflow skills + core skills
│   └── skills.ts               # 1203 lines
├── builtin-commands/           # ralph-loop, refactor, init-deep, start-work
│   ├── commands.ts             # Command registry
│   └── templates/              # Command templates
├── opencode-skill-loader/      # Skill discovery from 6 directories
│   ├── loader.ts               # Core discovery logic
│   ├── supporting-files.ts     # Non-markdown inlining (<50KB)
│   ├── skill-content.ts        # Skill content resolution
│   ├── substitution.ts         # Variable substitution
│   ├── shell-preprocessing.ts  # Shell command preprocessing
│   ├── filtering.ts            # Skill filtering logic
│   ├── types.ts                # SkillMetadata, LoadedSkill
│   └── utils.ts                # Loader utilities
├── claude-code-agent-loader/   # ~/.claude/agents/*.md
├── claude-code-command-loader/ # ~/.claude/commands/*.md
├── claude-code-mcp-loader/     # .mcp.json
├── claude-code-plugin-loader/  # installed_plugins.json
├── claude-code-session-state/  # Session persistence
├── context-injector/           # AGENTS.md/README.md injection
├── boulder-state/              # Todo state persistence
├── hook-message-injector/      # Message injection
└── task-toast-manager/         # Background task notifications
```

## LOADER PRIORITY

| Type | Priority (highest first) |
|------|--------------------------|
| Commands | `.opencode/command/` > `~/.config/opencode/command/` > `.claude/commands/` |
| Skills | `.opencode/skills/` > `~/.config/opencode/skills/` > `.claude/skills/` |
| MCPs | `.claude/.mcp.json` > `.mcp.json` > `~/.claude/.mcp.json` |

## BACKGROUND AGENT

- **Lifecycle**: `launch` → `poll` (2s) → `complete`
- **Stability**: 3 consecutive polls = idle
- **Concurrency**: Per-provider/model limits
- **Cleanup**: 30m TTL, 3m stale timeout

## SKILL LOADER

- **Discovery**: 6 directories (project, user, plugin, opencode, opencode-project, claude)
- **Injection**: SKILL.md + all files in references/ (recursive depth 3, <50KB per file)
- **Limits**: Max 25 files per skill, 10MB total
- **Features**: Variable substitution, shell preprocessing, frontmatter parsing

## SKILL MCP

- **Lazy**: Clients created on first call
- **Transports**: stdio, http (SSE/Streamable)
- **Lifecycle**: 5m idle cleanup

## ANTI-PATTERNS

- **Sequential delegation**: Use `delegate_task` parallel
- **Trust self-reports**: ALWAYS verify
- **Main thread blocks**: No heavy I/O in loader init
