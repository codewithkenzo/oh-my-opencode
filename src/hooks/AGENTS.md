# HOOKS KNOWLEDGE BASE

## OVERVIEW

35 lifecycle hooks intercepting/modifying agent behavior. Events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, onSummarize, PreCompact.

## STRUCTURE

29 directories + 6 standalone files:

```
hooks/
├── atlas/                        # Main orchestration (773 lines)
├── sisyphus-orchestrator/        # Musashi orchestrator hook
├── anthropic-context-window-limit-recovery/  # Auto-summarize
├── background-compaction/        # Background compaction trigger
├── memory-persistence/           # Supermemory persistence (recall/persist/extract)
├── skill-invocation-filter/      # Skill invocation filtering
├── ralph-loop/                   # Self-referential dev loop
├── claude-code-hooks/            # settings.json compat layer - see AGENTS.md
├── comment-checker/              # Prevents AI slop comments
├── auto-slash-command/           # Detects /command patterns
├── rules-injector/               # Conditional rules injection
├── directory-agents-injector/    # Auto-injects AGENTS.md
├── directory-readme-injector/    # Auto-injects README.md
├── edit-error-recovery/          # Recovers from edit failures
├── thinking-block-validator/     # Ensures valid thinking blocks
├── session-recovery/             # Auto-recovers from crashes
├── think-mode/                   # Dynamic thinking budget
├── keyword-detector/             # ultrawork/search/analyze modes
├── background-notification/      # OS notification on completion
├── prometheus-md-only/           # Planner read-only mode
├── agent-usage-reminder/         # Specialized agent hints
├── auto-update-checker/          # Plugin update check
├── compaction-context-injector/  # Injects context on compaction
├── delegate-task-retry/          # Retries failed delegations
├── interactive-bash-session/     # Tmux session management
├── non-interactive-env/          # Non-TTY environment handling
├── start-work/                   # Work session starter
├── task-resume-info/             # Resume info for cancelled tasks
├── question-label-truncator/     # Auto-truncates question labels >30 chars
├── context-window-monitor.ts     # Reminds of context headroom
├── empty-task-response-detector.ts # Detects empty task responses
├── session-notification.ts       # Session notification handling
├── session-notification-utils.ts # Notification utilities
├── todo-continuation-enforcer.ts # Force TODO completion (489 lines)
├── tool-output-truncator.ts      # Prevents context bloat
└── index.ts                      # Hook aggregation + registration
```

## HOOK EVENTS

| Event | Timing | Can Block | Use Case |
|-------|--------|-----------|----------|
| PreToolUse | Before tool | Yes | Validate/modify inputs |
| PostToolUse | After tool | No | Append warnings, truncate |
| UserPromptSubmit | On prompt | Yes | Keyword detection |
| Stop | Session idle | No | Auto-continue |
| onSummarize | Compaction | No | Preserve state |
| PreCompact | Before compaction | No | Inject context |

## EXECUTION ORDER

**chat.message**: keywordDetector → claudeCodeHooks → autoSlashCommand → startWork → ralphLoop

**tool.execute.before**: claudeCodeHooks → nonInteractiveEnv → commentChecker → directoryAgentsInjector → rulesInjector

**tool.execute.after**: editErrorRecovery → delegateTaskRetry → commentChecker → toolOutputTruncator → claudeCodeHooks

## v4-SPECIFIC HOOKS

| Hook | Purpose | Sprint |
|------|---------|--------|
| sisyphus-orchestrator | Musashi orchestrator behavior | Existing (ported from fork) |
| background-compaction | Trigger background compaction | Existing (ported from fork) |
| memory-persistence | Supermemory recall/persist on session events | Existing (ported from fork) |
| skill-invocation-filter | Filter skill invocations by metadata | Existing (ported from fork) |

## HOW TO ADD

1. Create `src/hooks/name/` with `index.ts` exporting `createMyHook(ctx)`
2. Add hook name to `HookNameSchema` in `src/config/schema.ts`
3. Register in `src/index.ts`:
   ```typescript
   const myHook = isHookEnabled("my-hook") ? createMyHook(ctx) : null
   ```

## PATTERNS

- **Session-scoped state**: `Map<sessionID, Set<string>>`
- **Conditional execution**: Check `input.tool` before processing
- **Output modification**: `output.output += "\n${REMINDER}"`

## ANTI-PATTERNS

- **Blocking non-critical**: Use PostToolUse warnings instead
- **Heavy computation**: Keep PreToolUse light
- **Redundant injection**: Track injected files
