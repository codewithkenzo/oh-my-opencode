import type { BeadsIssue, BeadsStatus, OutputFormat } from "./types";

export function formatIssue(issue: BeadsIssue, fmt: OutputFormat = "markdown"): string {
  if (fmt === "json") {
    return JSON.stringify(issue, null, 2);
  }
  if (fmt === "compact") {
    return `[${issue.id}] ${issue.title} (${issue.status})`;
  }

  let md = `## ${issue.title}\n`;
  md += `**ID**: ${issue.id}\n`;
  md += `**Status**: ${issue.status}\n`;
  if (issue.priority) md += `**Priority**: ${issue.priority}\n`;
  if (issue.type) md += `**Type**: ${issue.type}\n`;
  if (issue.description) md += `**Description**: ${issue.description}\n`;
  if (issue.blockers && issue.blockers.length > 0) {
    md += `**Blockers**: ${issue.blockers.map((b) => `#${b}`).join(", ")}\n`;
  }
  if (issue.dependencies && issue.dependencies.length > 0) {
    md += `**Dependencies**: ${issue.dependencies.map((d) => `#${d}`).join(", ")}\n`;
  }
  return md;
}

export function formatIssues(issues: BeadsIssue[], fmt: OutputFormat = "markdown"): string {
  if (fmt === "json") {
    return JSON.stringify(issues, null, 2);
  }
  if (fmt === "compact") {
    return issues.map((i) => `[${i.id}] ${i.title} (${i.status})`).join("\n");
  }

  if (issues.length === 0) {
    return "No issues found.";
  }

  let md = issues.map((issue) => {
    let line = `- **[${issue.id}]** ${issue.title}`;
    if (issue.status) line += ` \`${issue.status}\``;
    if (issue.priority) line += ` (p${issue.priority})`;
    return line;
  }).join("\n");

  return md;
}

export function formatStatus(status: BeadsStatus, fmt: OutputFormat = "markdown"): string {
  if (fmt === "json") {
    return JSON.stringify(status, null, 2);
  }
  if (fmt === "compact") {
    return `Total: ${status.total}`;
  }

  let md = `# Beads Status\n\n`;
  md += `**Total Issues**: ${status.total}\n\n`;

  if (status.byStatus) {
    md += `## By Status\n`;
    Object.entries(status.byStatus).forEach(([s, count]) => {
      md += `- ${s}: ${count}\n`;
    });
    md += "\n";
  }

  if (status.byPriority) {
    md += `## By Priority\n`;
    Object.entries(status.byPriority).forEach(([p, count]) => {
      md += `- P${p}: ${count}\n`;
    });
  }

  return md;
}
