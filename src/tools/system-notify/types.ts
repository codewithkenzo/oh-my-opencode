export type Platform = "darwin" | "linux" | "win32" | "wsl" | "unsupported"

export interface NotifyArgs {
  message: string
  title?: string
  image_path?: string
  open_path?: string
}

export interface NotifyResult {
  success: boolean
  opened?: boolean
}
