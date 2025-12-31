import { tool } from "@opencode-ai/plugin/tool";
import * as api from "./client";
import * as format from "./formatters";
import type { OutputFormat } from "./types";

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
};

export const beads_ready = tool({
  description: "Get ready issues (issues with no blockers). Find work that can be started immediately.",
  args: {
    ...formatArg,
  },
  async execute({ format: fmt = "markdown" }) {
    try {
      const issues = await api.getReadyIssues();
      return format.formatIssues(issues, fmt as OutputFormat);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_list = tool({
  description: "List all Beads issues. Supports filtering by status, priority, type, and search.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status (e.g., todo, in_progress, done, blocked)"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type (e.g., task, bug, feature)"),
    search: tool.schema.string().optional().describe("Search in title/description"),
    ...formatArg,
  },
  async execute({ status, priority, type, search, format: fmt = "markdown" }) {
    try {
      const issues = await api.listIssues({ status, priority, type, search });
      return format.formatIssues(issues, fmt as OutputFormat);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_show = tool({
  description: "Show detailed information about a single Beads issue by ID.",
  args: {
    id: tool.schema.string().describe("Issue ID"),
    ...formatArg,
  },
  async execute({ id, format: fmt = "markdown" }) {
    try {
      const issue = await api.showIssue(id);
      if (!issue) {
        return `Error: Issue ${id} not found`;
      }
      return format.formatIssue(issue, fmt as OutputFormat);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_create = tool({
  description: "Create a new Beads issue. Priority: 0=critical, 1=high, 2=medium, 3=low, 4=nice-to-have.",
  args: {
    title: tool.schema.string().describe("Issue title (required)"),
    type: tool.schema.string().optional().describe("Issue type: task, bug, feature, question"),
    priority: tool.schema.number().min(0).max(4).optional().describe("Priority (0-4, default: 2)"),
    status: tool.schema.string().optional().describe("Initial status (default: todo)"),
    description: tool.schema.string().optional().describe("Issue description"),
  },
  async execute({ title, type, priority, status, description }) {
    try {
      const issue = await api.createIssue(title, { type, priority, status, description });
      if (!issue) {
        return `Error: Failed to create issue`;
      }
      const result = format.formatIssue(issue, "markdown");
      return `✓ Issue created!\n\n${result}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_update = tool({
  description: "Update an existing Beads issue status or fields.",
  args: {
    id: tool.schema.string().describe("Issue ID"),
    status: tool.schema.string().optional().describe("New status: todo, in_progress, done, blocked"),
    title: tool.schema.string().optional().describe("New title"),
    description: tool.schema.string().optional().describe("New description"),
    priority: tool.schema.number().min(0).max(4).optional().describe("New priority (0-4)"),
  },
  async execute({ id, status, title, description, priority }) {
    try {
      const issue = await api.updateIssue(id, { status, title, description, priority });
      if (!issue) {
        return `Error: Failed to update issue ${id}`;
      }
      const result = format.formatIssue(issue, "markdown");
      return `✓ Issue updated!\n\n${result}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_close = tool({
  description: "Close a Beads issue with a completion reason.",
  args: {
    id: tool.schema.string().describe("Issue ID"),
    reason: tool.schema.string().optional().describe("Reason for closing (e.g., done, duplicate, wontfix)"),
  },
  async execute({ id, reason = "done" }) {
    try {
      const success = await api.closeIssue(id, reason);
      if (!success) {
        return `Error: Failed to close issue ${id}`;
      }
      return `✓ Issue ${id} closed (reason: ${reason})`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_dep_add = tool({
  description: "Add a dependency between two Beads issues. Makes 'from' depend on 'to'.",
  args: {
    from: tool.schema.string().describe("Issue ID that depends (blocked by)"),
    to: tool.schema.string().describe("Issue ID that is depended on (blocks)"),
  },
  async execute({ from, to }) {
    try {
      const success = await api.addDependency(from, to);
      if (!success) {
        return `Error: Failed to add dependency ${from} -> ${to}`;
      }
      return `✓ Added dependency: ${from} depends on ${to}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_dep_remove = tool({
  description: "Remove a dependency between two Beads issues.",
  args: {
    from: tool.schema.string().describe("Issue ID that had dependency"),
    to: tool.schema.string().describe("Issue ID that was depended on"),
  },
  async execute({ from, to }) {
    try {
      const success = await api.removeDependency(from, to);
      if (!success) {
        return `Error: Failed to remove dependency ${from} -> ${to}`;
      }
      return `✓ Removed dependency: ${from} -> ${to}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_sync = tool({
  description: "Sync Beads database with git. Commit and push issues to remote. Run at session end.",
  args: {},
  async execute() {
    try {
      const output = await api.syncBeads();
      return `✓ Beads synced\n\n${output}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beads_status = tool({
  description: "Show Beads database overview with issue counts by status and priority.",
  args: {
    ...formatArg,
  },
  async execute({ format: fmt = "markdown" }) {
    try {
      const status = await api.getBeadsStatus();
      if (!status) {
        return `Error: Failed to get status`;
      }
      return format.formatStatus(status, fmt as OutputFormat);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

export const beadsTools = {
  beads_ready,
  beads_list,
  beads_show,
  beads_create,
  beads_update,
  beads_close,
  beads_dep_add,
  beads_dep_remove,
  beads_sync,
  beads_status,
};
