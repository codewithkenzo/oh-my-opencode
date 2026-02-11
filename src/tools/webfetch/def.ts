import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const WEBFETCH_DESCRIPTION = `Fetches content from a specified URL. Takes a URL and fetches the content, converting HTML to markdown when requested. Use this tool when you need to retrieve and analyze web content.

Usage notes:
  - IMPORTANT: if another tool is present that offers better web fetching capabilities, is more targeted to the task, or has fewer restrictions, prefer using that tool instead of this one.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large`

const webfetchDef: { description: string; args: ToolDefinition["args"] } = {
  description: WEBFETCH_DESCRIPTION,
  args: {
    url: tool.schema.string().describe("The URL to fetch content from"),
    timeout: tool.schema.number().optional().describe("Optional timeout in seconds (max 120)"),
  },
}

export const webfetchToolDefs = {
  webfetch: webfetchDef,
}
