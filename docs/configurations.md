# Oh-My-OpenCode Configuration

Highly opinionated, but adjustable to taste.

## Config File Locations

Config file locations (priority order):
1. `.opencode/oh-my-opencode.json` (project)
2. User config (platform-specific):

| Platform        | User Config Path                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| **Windows**     | `~/.config/opencode/oh-my-opencode.json` (preferred) or `%APPDATA%\opencode\oh-my-opencode.json` (fallback) |
| **macOS/Linux** | `~/.config/opencode/oh-my-opencode.json`                                                                    |

Schema autocomplete supported:

```json
{
  "$schema": "https://raw.githubusercontent.com/codewithkenzo/oh-my-opencode/master/assets/oh-my-opencode.schema.json"
}
```

## JSONC Support

The `oh-my-opencode` configuration file supports JSONC (JSON with Comments):
- Line comments: `// comment`
- Block comments: `/* comment */`
- Trailing commas: `{ "key": "value", }`

When both `oh-my-opencode.jsonc` and `oh-my-opencode.json` files exist, `.jsonc` takes priority.

**Example with comments:**

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/codewithkenzo/oh-my-opencode/master/assets/oh-my-opencode.schema.json",

  /* Agent overrides - customize models for specific tasks */
  "agents": {
    "K9 - advisor": {
      "model": "openai/gpt-5.2"  // Strategic reasoning
    },
    "X1 - explorer": {
      "model": "anthropic/claude-haiku-4-5"  // Fast exploration
    },
  },
}
```

## Google Auth

**Recommended**: For Google Gemini authentication, install the [`opencode-antigravity-auth`](https://github.com/NoeFabris/opencode-antigravity-auth) plugin. It provides multi-account load balancing, more models (including Claude via Antigravity), and active maintenance. See [Installation > Google Gemini](../README.md#google-gemini-antigravity-oauth).

## Agents

Override built-in agent settings:

```json
{
  "agents": {
    "X1 - explorer": {
      "model": "anthropic/claude-haiku-4-5",
      "temperature": 0.5
    },
    "T4 - frontend builder": {
      "disable": true
    }
  }
}
```

Each agent supports: `model`, `temperature`, `top_p`, `prompt`, `prompt_append`, `tools`, `disable`, `description`, `mode`, `color`, `permission`.

Use `prompt_append` to add extra instructions without replacing the default system prompt:

```json
{
  "agents": {
    "R2 - researcher": {
      "prompt_append": "Always use the elisp-dev-mcp for Emacs Lisp documentation lookups."
    }
  }
}
```

You can also override settings for `Musashi` (the primary orchestrator), `Musashi - boulder`, and `Musashi - plan` using the same options.

### Permission Options

Fine-grained control over what agents can do:

```json
{
  "agents": {
    "X1 - explorer": {
      "permission": {
        "edit": "deny",
        "bash": "ask",
        "webfetch": "allow"
      }
    }
  }
}
```

| Permission           | Description                            | Values                                                                      |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `edit`               | File editing permission                | `ask` / `allow` / `deny`                                                    |
| `bash`               | Bash command execution                 | `ask` / `allow` / `deny` or per-command: `{ "git": "allow", "rm": "deny" }` |
| `webfetch`           | Web request permission                 | `ask` / `allow` / `deny`                                                    |
| `doom_loop`          | Allow infinite loop detection override | `ask` / `allow` / `deny`                                                    |
| `external_directory` | Access files outside project root      | `ask` / `allow` / `deny`                                                    |

Or disable via `disabled_agents` in `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`:

```json
{
  "disabled_agents": ["K9 - advisor", "T4 - frontend builder"]
}
```

Available agents: `Musashi`, `Musashi - boulder`, `Musashi - plan`, `K9 - advisor`, `X1 - explorer`, `R2 - researcher`, `T4 - frontend builder`, `D5 - backend builder`

## Built-in Skills

Oh My OpenCode includes built-in skills that provide additional capabilities:

- **playwright**: Browser automation with Playwright MCP. Use for web scraping, testing, screenshots, and browser interactions.
- **git-master**: Git expert for atomic commits, rebase/squash, and history search (blame, bisect, log -S). STRONGLY RECOMMENDED: Use with `delegate_task(category='quick', skills=['git-master'], ...)` to save context.

Disable built-in skills via `disabled_skills` in `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`:

```json
{
  "disabled_skills": ["playwright"]
}
```

Available built-in skills: `playwright`, `git-master`

## Git Master

Configure git-master skill behavior:

```json
{
  "git_master": {
    "commit_footer": true,
    "include_co_authored_by": true
  }
}
```

| Option                   | Default | Description                                                                      |
| ------------------------ | ------- | -------------------------------------------------------------------------------- |
| `commit_footer`          | `true`  | Adds "Ultraworked with Musashi" footer to commit messages.                      |
| `include_co_authored_by` | `true`  | Adds `Co-authored-by: Musashi <clio-agent@sisyphuslabs.ai>` trailer to commits. |

## Musashi Orchestration (`sisyphus_agent` key)

When enabled (default), Musashi orchestration provides the 8-agent architecture:

- **Musashi**: Primary orchestrator agent (`anthropic/claude-opus-4-5`)
- **Musashi - boulder**: Master orchestrator via `delegate_task()` (`anthropic/claude-sonnet-4-5`)
- **Musashi - plan**: Planning mode for interview/plan/review (`anthropic/claude-opus-4-5`)
- **K9 - advisor**: Read-only strategic consultant (`openai/gpt-5.2`)
- **X1 - explorer**: Fast codebase exploration (`anthropic/claude-haiku-4-5`)
- **R2 - researcher**: Multi-repo/docs/GitHub research (`glm-4.7`)
- **T4 - frontend builder**: Category-routed frontend specialist (user configured model)
- **D5 - backend builder**: Category-routed backend/general specialist (user configured model)

**Configuration Options:**

```json
{
  "sisyphus_agent": {
    "disabled": false,
    "default_builder_enabled": false,
    "planner_enabled": true,
    "replace_plan": true
  }
}
```

**Example: Keep orchestration enabled (default):**

```json
{
  "sisyphus_agent": {
    "default_builder_enabled": false
  }
}
```

This keeps Musashi orchestration active while preserving the default build-agent demotion behavior.

**Example: Disable all Musashi orchestration:**

```json
{
  "sisyphus_agent": {
    "disabled": true
  }
}
```

You can also customize Musashi architecture agents like other agents:

```json
{
  "agents": {
    "Musashi": {
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.1
    },
    "Musashi - boulder": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "Musashi - plan": {
      "model": "anthropic/claude-opus-4-5"
    },
    "K9 - advisor": {
      "model": "openai/gpt-5.2"
    }
  }
}
```

| Option                    | Default | Description                                                                                                                            |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`                | `false` | When `true`, disables Musashi orchestration and restores OpenCode default build/plan behavior.                                          |
| `default_builder_enabled` | `false` | When `true`, enables OpenCode-Builder agent (same as OpenCode build, renamed due to SDK limitations). Disabled by default.             |
| `planner_enabled`         | `true`  | When `true`, enables `Musashi - plan` planning mode. Enabled by default.                                     |
| `replace_plan`            | `true`  | When `true`, routes planning through Musashi planning flow. Set to `false` to keep default OpenCode plan behavior available. |

## Background Tasks

Configure concurrency limits for background agent tasks. This controls how many parallel background agents can run simultaneously.

```json
{
  "background_task": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 3,
      "openai": 5,
      "google": 10
    },
    "modelConcurrency": {
      "anthropic/claude-opus-4-5": 2,
      "google/gemini-3-flash": 10
    }
  }
}
```

| Option                | Default | Description                                                                                                             |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `defaultConcurrency`  | -       | Default maximum concurrent background tasks for all providers/models                                                    |
| `providerConcurrency` | -       | Per-provider concurrency limits. Keys are provider names (e.g., `anthropic`, `openai`, `google`)                        |
| `modelConcurrency`    | -       | Per-model concurrency limits. Keys are full model names (e.g., `anthropic/claude-opus-4-5`). Overrides provider limits. |

**Priority Order**: `modelConcurrency` > `providerConcurrency` > `defaultConcurrency`

**Use Cases**:
- Limit expensive models (e.g., Opus) to prevent cost spikes
- Allow more concurrent tasks for fast/cheap models (e.g., Gemini Flash)
- Respect provider rate limits by setting provider-level caps

## Categories

Categories enable domain-specific task delegation via the `delegate_task` tool. Instead of using a fixed single worker, categories route work to `T4 - frontend builder` or `D5 - backend builder` with auto-injected skill bundles.

**Default Categories:**

| Category | Routed Agent | Auto Skills |
| -------- | ------------ | ----------- |
| `visual-engineering` | `T4 - frontend builder` | `frontend-ui-ux`, `frontend-stack`, `component-stack` |
| `ultrabrain` | `D5 - backend builder` | `blueprint-architect`, `effect-ts-expert` |
| `artistry` | `T4 - frontend builder` | creative/design skill stack |
| `quick` | `D5 - backend builder` | `git-master`, `git-workflow` |
| `most-capable` | `D5 - backend builder` | `blueprint-architect`, `testing-stack` |
| `writing` | `D5 - backend builder` | `kenzo-agents-md`, `research-tools` |
| `general` | `D5 - backend builder` | `linearis`, `git-workflow`, `research-tools` |

**Usage:**

```
// Via delegate_task tool
delegate_task(category="visual-engineering", prompt="Create a responsive dashboard component")
delegate_task(category="ultrabrain", prompt="Design the payment processing flow")

// Or target a specific agent directly
delegate_task(agent="K9 - advisor", prompt="Review this architecture")
```

**Custom Categories:**

Add custom categories in `oh-my-opencode.json`:

```json
{
  "categories": {
    "data-science": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.2,
      "prompt_append": "Focus on data analysis, ML pipelines, and statistical methods."
    },
    "visual": {
      "model": "google/gemini-3-pro-preview",
      "prompt_append": "Use shadcn/ui components and Tailwind CSS."
    }
  }
}
```

Each category supports: `model`, `temperature`, `top_p`, `maxTokens`, `thinking`, `reasoningEffort`, `textVerbosity`, `tools`, `prompt_append`.

## Hooks

Disable specific built-in hooks via `disabled_hooks` in `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`:

```json
{
  "disabled_hooks": ["comment-checker", "agent-usage-reminder"]
}
```

Available hooks: `todo-continuation-enforcer`, `context-window-monitor`, `session-recovery`, `session-notification`, `comment-checker`, `tool-output-truncator`, `directory-agents-injector`, `directory-readme-injector`, `empty-task-response-detector`, `think-mode`, `anthropic-context-window-limit-recovery`, `rules-injector`, `background-notification`, `auto-update-checker`, `startup-toast`, `keyword-detector`, `agent-usage-reminder`, `non-interactive-env`, `interactive-bash-session`, `compaction-context-injector`, `thinking-block-validator`, `claude-code-hooks`, `ralph-loop`

**Note on `auto-update-checker` and `startup-toast`**: The `startup-toast` hook is a sub-feature of `auto-update-checker`. To disable only the startup toast notification while keeping update checking enabled, add `"startup-toast"` to `disabled_hooks`. To disable all update checking features (including the toast), add `"auto-update-checker"` to `disabled_hooks`.

## MCPs

Exa, Context7 and grep.app MCP enabled by default.

- **websearch**: Real-time web search powered by [Exa AI](https://exa.ai) - searches the web and returns relevant content
- **context7**: Fetches up-to-date official documentation for libraries
- **grep_app**: Ultra-fast code search across millions of public GitHub repositories via [grep.app](https://grep.app)

Don't want them? Disable via `disabled_mcps` in `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`:

```json
{
  "disabled_mcps": ["websearch", "context7", "grep_app"]
}
```

## LSP

OpenCode provides LSP tools for analysis.
Oh My OpenCode adds refactoring tools (rename, code actions).
All OpenCode LSP configs and custom settings (from opencode.json) are supported, plus additional Oh My OpenCode-specific settings.

Add LSP servers via the `lsp` option in `~/.config/opencode/oh-my-opencode.json` or `.opencode/oh-my-opencode.json`:

```json
{
  "lsp": {
    "typescript-language-server": {
      "command": ["typescript-language-server", "--stdio"],
      "extensions": [".ts", ".tsx"],
      "priority": 10
    },
    "pylsp": {
      "disabled": true
    }
  }
}
```

Each server supports: `command`, `extensions`, `priority`, `env`, `initialization`, `disabled`.

## Experimental

Opt-in experimental features that may change or be removed in future versions. Use with caution.

```json
{
  "experimental": {
    "truncate_all_tool_outputs": true,
    "aggressive_truncation": true,
    "auto_resume": true
  }
}
```

| Option                      | Default | Description                                                                                                                                                                                   |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `truncate_all_tool_outputs` | `false` | Truncates ALL tool outputs instead of just whitelisted tools (Grep, Glob, LSP, AST-grep). Tool output truncator is enabled by default - disable via `disabled_hooks`.                         |
| `aggressive_truncation`     | `false` | When token limit is exceeded, aggressively truncates tool outputs to fit within limits. More aggressive than the default truncation behavior. Falls back to summarize/revert if insufficient. |
| `auto_resume`               | `false` | Automatically resumes session after successful recovery from thinking block errors or thinking disabled violations. Extracts the last user message and continues.                             |

**Warning**: These features are experimental and may cause unexpected behavior. Enable only if you understand the implications.

## Environment Variables

| Variable              | Description                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCODE_CONFIG_DIR` | Override the OpenCode configuration directory. Useful for profile isolation with tools like [OCX](https://github.com/kdcokenny/ocx) ghost mode. |
