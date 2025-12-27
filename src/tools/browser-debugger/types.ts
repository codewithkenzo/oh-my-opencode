export interface BrowserDebuggerArgs {
  action: "screenshot" | "navigate" | "snapshot" | "info"
  url?: string
  page_name?: string
  output_path?: string
}
