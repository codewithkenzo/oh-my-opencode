import { z } from "zod"

export const zreadSearchArgs = z.object({
  repo: z.string().describe("GitHub repository in 'owner/repo' format (required)"),
  query: z.string().describe("Search query string (required)"),
  path: z.string().optional().describe("Optional subdirectory to search within (default: root)"),
})

export const zreadStructureArgs = z.object({
  repo: z.string().describe("GitHub repository in 'owner/repo' format (required)"),
  path: z.string().optional().describe("Optional subdirectory to start from (default: root)"),
})

export const zreadFileArgs = z.object({
  repo: z.string().describe("GitHub repository in 'owner/repo' format (required)"),
  path: z.string().describe("File path within the repo (required)"),
})

export type ZreadSearchResult = {
  results: Array<{
    file: string
    line?: number
    snippet: string
    relevance?: number
  }>
}

export type ZreadStructureResult = {
  name: string
  type: "file" | "directory"
  children?: ZreadStructureResult[]
}

export type ZreadFileResult = {
  path: string
  content: string
}

export type ZreadErrorResponse = {
  error: string
  code?: number
}
