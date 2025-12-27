import type { PluginInput } from "@opencode-ai/plugin"

export type ToastVariant = "info" | "warning" | "error" | "success"

export interface ToastOptions {
  title: string
  message: string
  variant?: ToastVariant
  duration?: number
}

const DEFAULT_DURATION = 4000
const MAX_MESSAGE_LENGTH = 200

export function showToast(
  ctx: PluginInput,
  options: ToastOptions
): void {
  try {
    const { title, message, variant = "info", duration = DEFAULT_DURATION } = options
    
    ctx.client.tui?.showToast?.({
      body: {
        title,
        message: message.slice(0, MAX_MESSAGE_LENGTH),
        variant,
        duration,
      },
    }).catch(() => {})
  } catch {
    // Silently ignore toast failures - non-critical
  }
}

export function showSimpleToast(
  ctx: PluginInput,
  title: string,
  message: string,
  variant: ToastVariant = "info"
): void {
  showToast(ctx, { title, message, variant })
}
