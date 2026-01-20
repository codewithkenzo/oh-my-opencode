export type BrowserAction = 
  | "open"
  | "snapshot"
  | "screenshot"
  | "click"
  | "fill"
  | "close"

export interface BrowserOpenArgs {
  url: string
  cdp_port?: number
}

export interface BrowserSnapshotArgs {
  interactive?: boolean
  cdp_port?: number
}

export interface BrowserScreenshotArgs {
  output_path?: string
  cdp_port?: number
}

export interface BrowserClickArgs {
  ref?: number
  selector?: string
  cdp_port?: number
}

export interface BrowserFillArgs {
  ref?: number
  selector?: string
  text: string
  cdp_port?: number
}

export interface BrowserCloseArgs {
  cdp_port?: number
}
