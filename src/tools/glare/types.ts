export type GlareAction = 
  | "screenshot" | "navigate" | "snapshot" | "info" | "start" 
  | "console" | "styles" | "network" | "eval" | "source" | "click"
  | "detect" | "state" | "tree" | "queries" | "routes" | "markdown"

export type Framework = "next" | "nuxt" | "react" | "vue" | "tanstack" | "tanstack-start" | "unknown"

export interface GlareArgs {
  action: GlareAction
  url?: string
  page_name?: string
  output_path?: string
  selector?: string
  script?: string
  level?: "error" | "warn" | "all"
  framework?: Framework
}
