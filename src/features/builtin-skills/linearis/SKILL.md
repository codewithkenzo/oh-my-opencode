---
name: linearis
description: (opencode - Skill) Linear CLI tool for issue tracking. Use for creating, listing, updating issues, projects, and cycles. Optimized for LLMs with JSON output.
---

# Linearis Skill

Linearis is a high-performance CLI tool for Linear.app that outputs structured JSON data. It is designed for LLM agents.

## Usage

Always use `npx linearis` to execute commands.

### Common Commands

**Issues**
- List issues: `npx linearis issues list -l 10`
- Read issue: `npx linearis issues read ABC-123`
- Create issue: `npx linearis issues create "Title" --team ABC --description "Desc"`
- Update issue: `npx linearis issues update ABC-123 --status "In Progress"`
- Search: `npx linearis issues search "query" --team ABC`

**Projects & Cycles**
- List projects: `npx linearis projects list`
- List cycles: `npx linearis cycles list --team ABC`
- Read cycle: `npx linearis cycles read "Sprint 1" --team ABC`

**Users & Teams**
- List users: `npx linearis users list`
- List teams: `npx linearis teams list`

### Output Format

All commands output structured JSON. You can parse this with `jq` or read it directly.

### Best Practices

1. **IDs**: Use `ABC-123` format for issues.
2. **Context**: If team/project is ambiguous, the tool will error. Be specific with `--team` or `--project` flags.
3. **Embeds**: `issues read` includes file embeds. Use `npx linearis embeds download <url>` to fetch them.

## Authentication

Authentication is handled via `~/.linear_api_token` or `LINEAR_API_TOKEN` env var.
If authentication fails, ask the user to provide a Linear API token.
