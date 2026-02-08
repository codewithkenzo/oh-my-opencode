# Oh My OpenCode Overview

Learn about Oh My OpenCode, a plugin that transforms OpenCode into the best agent harness.

---

## TL;DR

> **Musashi strongly recommends Opus 4.5 for orchestration quality. Using weaker defaults may degrade results on complex tasks.**

**Feeling lazy?** Just include `ultrawork` (or `ulw`) in your prompt. That's it. The agent figures out the rest.

**Need precision?** Press **Tab** to enter Musashi - plan mode, create a work plan through an interview process, then run `/start-work` for Musashi - boulder execution.

---

## What Oh My OpenCode Does for You

- **Build features from descriptions**: Just tell the agent what you want. It makes a plan, writes the code, and ensures it works. Automatically. You don't have to care about the details.
- **Debug and fix issues**: Describe a bug or paste an error. The agent analyzes your codebase, identifies the problem, and implements a fix.
- **Navigate any codebase**: Ask anything about your codebase. The agent maintains awareness of your entire project structure.
- **Automate tedious tasks**: Fix lint issues, resolve merge conflicts, write release notes - all in a single command.

---

## Two Ways to Work

### Option 1: Ultrawork Mode (For Quick Work)

If you're feeling lazy, just include **`ultrawork`** (or **`ulw`**) in your prompt:

```
ulw add authentication to my Next.js app
```

The agent will automatically:
1. Map your codebase to understand existing patterns
2. Research best practices via specialized agents
3. Implement the feature following your conventions
4. Verify with diagnostics and tests
5. Keep working until complete

This is the "just do it" mode. Full automatic mode.
The agent is already smart enough, so it explores the codebase and make plans itself.
**You don't have to think that deep. Agent will think that deep.**

### Option 2: Musashi - plan Mode (For Precise Work)

For complex or critical tasks, press **Tab** to switch to Musashi - plan mode.

**How it works:**

1. **Musashi - plan interviews you** - Acts as your planning consultant, asking clarifying questions while researching your codebase to scope work correctly.

2. **Plan generation** - Based on the interview, Musashi - plan generates a detailed work plan with tasks, acceptance criteria, and guardrails. Consultant/review passes are handled inside Musashi - plan mode.

3. **Run `/start-work`** - Musashi - boulder takes over:
   - Distributes tasks to specialized sub-agents
   - Verifies each task completion independently
   - Accumulates learnings across tasks
   - Tracks progress across sessions (resume anytime)

**When to use Musashi - plan:**
- Multi-day or multi-session projects
- Critical production changes
- Complex refactoring spanning many files
- When you want a documented decision trail

---

## Critical Usage Guidelines

### Always Use Musashi - plan + Musashi - boulder Together

**Do NOT start orchestration without `/start-work`.**

Execution orchestration is designed to run plans created by Musashi - plan. Starting without a plan leads to unstable outcomes.

**Correct workflow:**
```
1. Press Tab → Enter Musashi - plan mode
2. Describe work → Musashi - plan interviews you
3. Confirm plan → Review `.sisyphus/plans/*.md`
4. Run `/start-work` → Musashi - boulder executes
```

**Musashi - plan and Musashi - boulder are a pair. Always use them together.**

---

## Next Steps

- [Understanding the Orchestration System](./understanding-orchestration-system.md) - Deep dive into Musashi - plan → Musashi - boulder → category-routed execution workflow
- [Ultrawork Manifesto](../ultrawork-manifesto.md) - Philosophy and principles behind Oh My OpenCode
- [Installation Guide](./installation.md) - Detailed installation instructions
- [Configuration Guide](../configurations.md) - Customize agents, models, and behaviors
- [Features Reference](../features.md) - Complete feature documentation
