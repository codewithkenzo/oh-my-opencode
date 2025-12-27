export interface BrowserDebuggerArgs {
  action: "screenshot" | "navigate" | "snapshot" | "info" | "start" | "console" | "styles" | "network" | "eval" | "source" | "click"
  url?: string
  page_name?: string
  output_path?: string
  selector?: string
  script?: string
}
