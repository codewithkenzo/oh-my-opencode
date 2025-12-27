import { tool } from "@opencode-ai/plugin/tool"

const WEBFETCH_DESCRIPTION = `Fetches content from a specified URL. Takes a URL and fetches the content, converting HTML to markdown when requested. Use this tool when you need to retrieve and analyze web content.

Usage notes:
  - IMPORTANT: if another tool is present that offers better web fetching capabilities, is more targeted to the task, or has fewer restrictions, prefer using that tool instead of this one.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large`

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes

export const webfetch = tool({
  description: WEBFETCH_DESCRIPTION,
  args: {
    url: tool.schema.string().describe("The URL to fetch content from"),
    timeout: tool.schema.number().optional().describe("Optional timeout in seconds (max 120)"),
  },
  execute: async (args) => {
    let url = args.url
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "Error: URL must start with http:// or https://"
    }

    if (url.startsWith("http://")) {
      url = url.replace("http://", "https://")
    }

    const timeout = Math.min((args.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return `Error: Request failed with status code ${response.status}`
      }

      const contentLength = response.headers.get("content-length")
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        return "Error: Response too large (exceeds 5MB limit)"
      }

      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
        return "Error: Response too large (exceeds 5MB limit)"
      }

      const content = new TextDecoder().decode(arrayBuffer)
      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("text/html")) {
        return convertHTMLToText(content)
      }

      return content
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

function convertHTMLToText(html: string): string {
  let text = html

  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")

  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")

  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/div>/gi, "\n")

  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")

  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n")
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")

  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**")
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "*$2*")

  text = text.replace(/<[^>]+>/g, "")

  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&mdash;/g, "—")
  text = text.replace(/&ndash;/g, "–")

  text = text.replace(/\n{3,}/g, "\n\n")
  text = text.trim()

  return text
}
