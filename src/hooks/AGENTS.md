# HOOKS KNOWLEDGE BASE

## OVERVIEW

41 hook directories intercept/modify agent behavior (38 configurable in `HookNameSchema` + 3 internal directory hooks). Events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, onSummarize.

## STRUCTURE

```
hooks/
├── atlas/                      # Main orchestration & delegation (785 lines)
├── agent-usage-reminder/       # Reminds to use explorer/researcher agents
├── anthropic-context-window-limit-recovery/  # Auto-summarize at token limit
├── anthropic-effort/           # Sets effort=max for Anthropic models
├── auto-slash-command/         # Detects /command patterns
├── auto-update-checker/        # Startup update checks
├── background-notification/    # OS notification on task completion
├── claude-code-hooks/          # settings.json hook compat layer (13 files)
├── comment-checker/            # Prevents AI slop/excessive comments
├── compaction-context-injector/ # Preserves context on summarize
├── context-window-monitor/     # Reminds agents of remaining headroom
├── delegate-task-retry/        # Retries failed delegated tasks
├── directory-agents-injector/  # Auto-injects AGENTS.md files
├── directory-readme-injector/  # Auto-injects README.md files
├── edit-error-recovery/        # Recovers from tool failures
├── hashline-edit-diff-enhancer/ # Shows diffs for hashline Edit tool
├── hashline-read-enhancer/     # Enhances Read tool with hashline format
├── interactive-bash-session/   # Tmux lifecycle integration
├── keyword-detector/           # ultrawork/search/analyze modes
├── memory-persistence/         # Persists memory snapshots
├── non-interactive-env/        # Enforces non-interactive command safety
├── prometheus-md-only/         # Restricts Prometheus markdown output
├── question-label-truncator/   # Truncates verbose question labels
├── ralph-loop/                 # Self-referential dev loop until done
├── rm-to-trash/                # Safer rm behavior via trash semantics
├── rules-injector/             # Conditional rules from .claude/rules/
├── runtime-fallback/           # Auto-retry with fallback models on errors (13 files)
├── session-recovery/           # Auto-recovers from crashes
├── skill-auto-invoke/          # Warns/auto-invokes skills by intent
├── skill-invocation-filter/    # Internal skill invocation guard
├── start-work/                 # /start-work bootstrap integration
├── task-resume-info/           # Appends resume guidance after tasks
├── think-mode/                 # Dynamic thinking budget
├── thinking-block-validator/   # Ensures valid <thinking> format
├── ticket-enforcement/         # Ticket workflow guardrails
├── todo-continuation-enforcer/ # Force TODO completion
├── todo-ticket-bridge/         # Sync todo state with ticket workflow
├── tool-output-truncator/      # Prevents context bloat
├── unstable-agent-babysitter/  # Monitors hung background agents
├── verification-before-completion/ # Forces verification evidence
├── write-existing-file-guard/  # Warns when Write overwrites existing files
├── session-notification.ts     # File-based session desktop notifications
├── empty-task-response-detector.ts # File-based empty subagent output detector
└── session-notification-utils.ts   # Shared utilities for session notifications
```

## HOOK EVENTS

| Event | Timing | Can Block | Use Case |
|-------|--------|-----------|----------|
| PreToolUse | Before tool | Yes | Validate/modify inputs, inject context |
| PostToolUse | After tool | No | Append warnings, truncate output |
| UserPromptSubmit | On prompt | Yes | Keyword detection, mode switching |
| Stop | Session idle | No | Auto-continue (todo-continuation, ralph-loop) |
| onSummarize | Compaction | No | Preserve critical state |

## EXECUTION ORDER

**chat.message**: skillAutoInvoke → keywordDetector → runtimeFallback → claudeCodeHooks → autoSlashCommand → startWork → ralphLoop

**tool.execute.before**: claudeCodeHooks → nonInteractiveEnv → commentChecker → directoryAgentsInjector → directoryReadmeInjector → rulesInjector → prometheusMdOnly → questionLabelTruncator → hashlineReadEnhancer → hashlineEditDiffEnhancer → writeExistingFileGuard → rmToTrash → ticketEnforcement → anthropicEffort → atlas

**tool.execute.after**: claudeCodeHooks → toolOutputTruncator → contextWindowMonitor → commentChecker → directoryAgentsInjector → directoryReadmeInjector → rulesInjector → emptyTaskResponseDetector → agentUsageReminder → interactiveBashSession → editErrorRecovery → delegateTaskRetry → atlas → hashlineReadEnhancer → hashlineEditDiffEnhancer → taskResumeInfo → todoTicketBridge → verificationBeforeCompletion → ticketEnforcement

## HOW TO ADD

1. Create `src/hooks/name/` with `index.ts` exporting `createMyHook(ctx)`
2. Implement event handlers: `"tool.execute.before"`, `"tool.execute.after"`, etc.
3. Add hook name to `HookNameSchema` in `src/config/schema.ts`
4. Register in `src/index.ts`:
   ```typescript
   const myHook = isHookEnabled("my-hook") ? createMyHook(ctx) : null
   // Add to event handlers
   ```

## PATTERNS

- **Session-scoped state**: `Map<sessionID, Set<string>>` for tracking per-session
- **Conditional execution**: Check `input.tool` before processing
- **Output modification**: `output.output += "\n${REMINDER}"` to append context
- **Async state**: Use promises for CLI path resolution, cache results

## ANTI-PATTERNS

- **Blocking non-critical**: Use PostToolUse warnings instead of PreToolUse blocks
- **Heavy computation**: Keep PreToolUse light - slows every tool call
- **Redundant injection**: Track injected files to prevent duplicates
- **Verbose output**: Keep hook messages technical, brief
