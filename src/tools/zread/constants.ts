export const TOOL_SEARCH = "zread_search"

export const TOOL_STRUCTURE = "zread_structure"

export const TOOL_FILE = "zread_file"

export const TOOL_DESCRIPTION_SEARCH = "Search documentation, code, and comments in a GitHub repo using ZAI's Zread API.\n\nAPI endpoint: https://api.z.ai/api/mcp/zread/mcp\nAuth: ZAI_API_KEY environment variable\n\nSearch across repo content including docs, code comments, and file contents.\nUseful for finding specific implementations, patterns, or understanding project structure.\n\nParams:\n- repo: GitHub repository in \"owner/repo\" format (required)\n- query: Search query string (required)\n- path: Optional subdirectory to search within (default: root)\n\nExample: Search for \"authentication\" in \"facebook/react\""

export const TOOL_DESCRIPTION_STRUCTURE = "Get directory tree structure of a GitHub repo using ZAI's Zread API.\n\nAPI endpoint: https://api.z.ai/api/mcp/zread/mcp\nAuth: ZAI_API_KEY environment variable\n\nView repo structure at any level - entire repo or specific subdirectories.\nGreat for understanding project layout without cloning.\n\nParams:\n- repo: GitHub repository in \"owner/repo\" format (required)\n- path: Optional subdirectory to start from (default: root)\n\nExample: Get structure of \"src/components\" in \"facebook/react\""

export const TOOL_DESCRIPTION_FILE = "Read single file contents from a GitHub repo using ZAI's Zread API.\n\nAPI endpoint: https://api.z.ai/api/mcp/zread/mcp\nAuth: ZAI_API_KEY environment variable\n\nRead specific files from a repo without cloning the entire repository.\nUseful for examining specific implementation files, configs, or documentation.\n\nParams:\n- repo: GitHub repository in \"owner/repo\" format (required)\n- path: File path within the repo (required)\n\nExample: Read \"src/utils/api.ts\" from \"facebook/react\""

export const API_URL = "https://api.z.ai/api/mcp/zread/mcp"
export const API_URL_SSE = "https://api.z.ai/api/mcp/zread/sse"
