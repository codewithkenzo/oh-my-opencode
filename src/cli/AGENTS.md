# CLI KNOWLEDGE BASE

## OVERVIEW

CLI entry point: `bunx oh-my-opencode`. Interactive installer, doctor diagnostics, session runner. Uses Commander.js + @clack/prompts TUI.

## STRUCTURE

```
cli/
├── index.ts              # Commander.js entry, 5 subcommands
├── install.ts            # Interactive TUI installer (462 lines)
├── config-manager.ts     # JSONC parsing, multi-level merge (730 lines)
├── types.ts              # InstallArgs, InstallConfig, DetectedConfig
├── doctor/
│   ├── index.ts          # Doctor command entry
│   ├── runner.ts         # Check orchestration
│   ├── formatter.ts      # Colored output, symbols
│   ├── constants.ts      # Check IDs, categories, symbols
│   ├── types.ts          # CheckResult, CheckDefinition
│   └── checks/           # 9 check modules (8 core + version)
│       ├── opencode.ts   # OpenCode installation check
│       ├── plugin.ts     # Plugin registration check
│       ├── config.ts     # JSONC validity, Zod validation
│       ├── auth.ts       # Anthropic, OpenAI, Google
│       ├── dependencies.ts # AST-Grep, Comment Checker
│       ├── gh.ts         # GitHub CLI availability
│       ├── lsp.ts        # LSP server connectivity
│       ├── mcp.ts        # MCP server validation
│       └── version.ts    # OpenCode + plugin version
├── run/
│   ├── index.ts          # Run command entry
│   └── runner.ts         # Session launcher
└── get-local-version/
    ├── index.ts          # Version detection
    └── formatter.ts      # Version output
```

## CLI COMMANDS

| Command | Purpose |
|---------|---------|
| `install` | Interactive setup, subscription detection |
| `doctor` | 9 check modules / 14 runtime checks, `--verbose`, `--json`, `--category` |
| `run` | Launch OpenCode session with completion enforcement |
| `get-local-version` | Version detection, update checking |
| `version` | Print installed CLI version |

## DOCTOR CHECK CATEGORIES

| Module | Check File |
|--------|------------|
| OpenCode installation | `opencode.ts` |
| Plugin registration | `plugin.ts` |
| Configuration | `config.ts` |
| Authentication | `auth.ts` |
| Dependencies | `dependencies.ts` |
| GitHub CLI | `gh.ts` |
| LSP | `lsp.ts` |
| MCP | `mcp.ts` |
| Version | `version.ts` |

## HOW TO ADD CHECK

1. Create `src/cli/doctor/checks/my-check.ts`:
   ```typescript
   export function getMyCheckDefinition(): CheckDefinition {
     return {
       id: "my-check",
       name: "My Check",
       category: "configuration",
       check: async () => ({ status: "pass", message: "OK" })
     }
   }
   ```
2. Export from `checks/index.ts`
3. Add to `getAllCheckDefinitions()`

## TUI FRAMEWORK

- **@clack/prompts**: `select()`, `spinner()`, `intro()`, `outro()`, `note()`
- **picocolors**: Colored terminal output
- **Symbols**: ✓ (pass), ✗ (fail), ⚠ (warn), ○ (skip)

## CONFIG-MANAGER

- **JSONC**: Comments (`// ...`), block comments, trailing commas
- **Multi-source**: User (`~/.config/opencode/`) + Project (`.opencode/`)
- **Env override**: `OPENCODE_CONFIG_DIR` for profile isolation
- **Validation**: Zod schema with error aggregation

## ANTI-PATTERNS

- **Blocking in non-TTY**: Check `process.stdout.isTTY`
- **Direct JSON.parse**: Use `parseJsonc()` for config
- **Silent failures**: Always return warn/fail in doctor
- **Hardcoded paths**: Use `ConfigManager`
