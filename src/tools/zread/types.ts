export interface McpResponse {
  jsonrpc?: string
  id?: number
  result?: {
    content?: Array<{ type: string; text?: string }>
    tools?: Array<{ name: string; description: string }>
  }
  error?: {
    code: number
    message: string
  }
}

export interface ZreadSearchArgs {
  repo: string
  query: string
  language?: string
}

export interface ZreadFileArgs {
  repo: string
  path: string
}

export interface ZreadStructureArgs {
  repo: string
  path?: string
}
