---
name: demo-skill
description: Demo skill showcasing all skill loader features
allowed-tools:
  - Read
  - Bash
  - Edit
  - Glob
  - Grep
disallowed-tools:
  - WebFetch
user-invocable: true
model-invocable: true
shell:
  project_root: $(pwd)
  git_branch: $(git branch --show-current)
  node_version: $(node --version)
  current_date: $(date +%Y-%m-%d)
  username: $(whoami)
---

# Demo Skill - Feature Showcase

This skill demonstrates ALL the new skill loader features.

## Session Context

- **Session ID**: `$OPENCODE_SESSION_ID`
- **Project Root**: `{{project_root}}`
- **Git Branch**: `{{git_branch}}`
- **Node Version**: `{{node_version}}`
- **Current Date**: `{{current_date}}`
- **Username**: `{{username}}`

## Instructions

When this skill is invoked, you should:

1. **Confirm the variables above are substituted** - you should see actual values, not placeholders
2. **Check the supporting files** - there should be merged content from `references/` below
3. **Verify tool restrictions** - you have Read, Bash, Edit, Glob, Grep but NOT WebFetch

## Usage Examples

```bash
# The session ID should be a real UUID like:
# ses_abc123def456

# The project root should be an absolute path like:
# /home/kenzo/dev/oh-my-opencode-v3

# The git branch should show the current branch:
# dev or main or feat/skill-loader-extension
```

## What To Test

When you invoke `/demo-skill`, tell me:
1. What is my session ID?
2. What is the project root?
3. What git branch am I on?
4. What's today's date?
5. What username am I running as?
6. Can you see the API reference content below?
7. Can you see the patterns content below?
