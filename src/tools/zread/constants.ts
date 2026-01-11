export const API_URL = "https://api.z.ai/api/mcp/zread/mcp"

export const TOOL_DESCRIPTION_SEARCH = `Search documentation, issues, and commits in a GitHub repository using Z.AI's Zread API.

Searches across repo docs, code comments, recent issues, PRs, and contributor info.
Useful for understanding how a library works, finding solutions to problems, or learning about a project.

Requires ZAI_API_KEY environment variable.

Params:
- repo: GitHub repository in "owner/repo" format (required)
- query: Search query string (required)
- language: Response language - "en" or "zh" (default: "en")`

export const TOOL_DESCRIPTION_FILE = `Read the full content of a specific file from a GitHub repository using Z.AI's Zread API.

Read specific files without cloning. Great for examining implementations, configs, or documentation.

Requires ZAI_API_KEY environment variable.

Params:
- repo: GitHub repository in "owner/repo" format (required)
- path: File path within the repo (required)`

export const TOOL_DESCRIPTION_STRUCTURE = `Get the directory structure of a GitHub repository using Z.AI's Zread API.

View repo layout at any level - entire repo or specific subdirectories.
Great for understanding project organization before diving into files.

Requires ZAI_API_KEY environment variable.

Params:
- repo: GitHub repository in "owner/repo" format (required)
- path: Optional subdirectory to start from (default: root)`
