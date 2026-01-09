export type BrowserType = "chrome" | "chromium" | "comet" | "edge" | "brave" | "auto"

export interface BrowserConfig {
  browser: BrowserType
  profile?: string
  userDataDir?: string
  headless?: boolean | "new"
  port?: number
}

export interface BrowserInfo {
  name: string
  executablePath: string
  userDataDir: string
  profiles: string[]
}

export type GlareAction =
  | "connect"
  | "disconnect"
  | "status"
  | "navigate"
  | "screenshot"
  | "click"
  | "type"
  | "eval"
  | "content"
  | "wait"
  | "auth"
  | "profiles"
