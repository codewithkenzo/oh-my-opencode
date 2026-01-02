import { tool } from "@opencode-ai/plugin/tool"
import * as client from "./client"
import * as formatters from "./formatters"
import { BirdError } from "./types"
import * as constants from "./constants"

const formatArg = {
  format: tool.schema
    .enum(["markdown", "json", "compact"])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
}

const cookieSourceArg = {
  cookie_source: tool.schema
    .enum(["safari", "chrome", "firefox"])
    .optional()
    .describe("Browser cookie source for authentication"),
}

function handleError(error: unknown): string {
  const message = error instanceof BirdError 
    ? error.message 
    : (error instanceof Error ? error.message : String(error))
  return JSON.stringify({ success: false, error: message })
}

export const bird_tweet = tool({
  description: constants.BIRD_TWEET_DESCRIPTION,
  args: {
    text: tool.schema.string().describe("Tweet text content (up to 280 chars, or longer for Notes)"),
    media: tool.schema.array(tool.schema.string()).optional().describe("Paths to media files (up to 4 images or 1 video)"),
    alt: tool.schema.array(tool.schema.string()).optional().describe("Alt text for each media file"),
    ...cookieSourceArg,
  },
  async execute({ text, media, alt, cookie_source }) {
    try {
      const result = await client.tweet(text, { media, alt, cookieSource: cookie_source })
      return JSON.stringify({ success: true, message: "Tweet posted", data: result })
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_reply = tool({
  description: constants.BIRD_REPLY_DESCRIPTION,
  args: {
    tweet_id: tool.schema.string().describe("Tweet ID or URL to reply to"),
    text: tool.schema.string().describe("Reply text content"),
    media: tool.schema.array(tool.schema.string()).optional().describe("Paths to media files"),
    alt: tool.schema.array(tool.schema.string()).optional().describe("Alt text for each media file"),
    ...cookieSourceArg,
  },
  async execute({ tweet_id, text, media, alt, cookie_source }) {
    try {
      const result = await client.reply(tweet_id, text, { media, alt, cookieSource: cookie_source })
      return JSON.stringify({ success: true, message: "Reply posted", data: result })
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_read = tool({
  description: constants.BIRD_READ_DESCRIPTION,
  args: {
    tweet_id: tool.schema.string().describe("Tweet ID or URL to read"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ tweet_id, format = "markdown", cookie_source }) {
    try {
      const tweet = await client.read(tweet_id, { cookieSource: cookie_source })
      return formatters.formatTweet(tweet, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_search = tool({
  description: constants.BIRD_SEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Search query (supports X operators like from:user, since:date)"),
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ query, count = 20, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.search(query, count, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_mentions = tool({
  description: constants.BIRD_MENTIONS_DESCRIPTION,
  args: {
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    user: tool.schema.string().optional().describe("Username to check mentions for (default: authenticated user)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ count = 20, user, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.mentions(count, user, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_replies = tool({
  description: constants.BIRD_REPLIES_DESCRIPTION,
  args: {
    tweet_id: tool.schema.string().describe("Tweet ID or URL to get replies for"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ tweet_id, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.replies(tweet_id, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_thread = tool({
  description: constants.BIRD_THREAD_DESCRIPTION,
  args: {
    tweet_id: tool.schema.string().describe("Tweet ID or URL to get thread for"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ tweet_id, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.thread(tweet_id, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_bookmarks = tool({
  description: constants.BIRD_BOOKMARKS_DESCRIPTION,
  args: {
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    folder_id: tool.schema.string().optional().describe("Bookmark folder ID (from x.com/i/bookmarks/<folder-id>)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ count = 20, folder_id, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.bookmarks(count, folder_id, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_likes = tool({
  description: constants.BIRD_LIKES_DESCRIPTION,
  args: {
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ count = 20, format = "markdown", cookie_source }) {
    try {
      const tweets = await client.likes(count, { cookieSource: cookie_source })
      return formatters.formatTweets(tweets, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_following = tool({
  description: constants.BIRD_FOLLOWING_DESCRIPTION,
  args: {
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    user_id: tool.schema.string().optional().describe("User ID to check following for (default: authenticated user)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ count = 20, user_id, format = "markdown", cookie_source }) {
    try {
      const users = await client.following(count, user_id, { cookieSource: cookie_source })
      return formatters.formatUsers(users, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_followers = tool({
  description: constants.BIRD_FOLLOWERS_DESCRIPTION,
  args: {
    count: tool.schema.number().optional().describe("Number of results (default: 20)"),
    user_id: tool.schema.string().optional().describe("User ID to check followers for (default: authenticated user)"),
    ...formatArg,
    ...cookieSourceArg,
  },
  async execute({ count = 20, user_id, format = "markdown", cookie_source }) {
    try {
      const users = await client.followers(count, user_id, { cookieSource: cookie_source })
      return formatters.formatUsers(users, format)
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_whoami = tool({
  description: constants.BIRD_WHOAMI_DESCRIPTION,
  args: {
    ...cookieSourceArg,
  },
  async execute({ cookie_source }) {
    try {
      const result = await client.whoami({ cookieSource: cookie_source })
      return JSON.stringify({ success: true, data: result })
    } catch (error) {
      return handleError(error)
    }
  },
})

export const bird_check = tool({
  description: constants.BIRD_CHECK_DESCRIPTION,
  args: {
    ...cookieSourceArg,
  },
  async execute({ cookie_source }) {
    try {
      const result = await client.check({ cookieSource: cookie_source })
      return JSON.stringify({ success: true, data: result })
    } catch (error) {
      return handleError(error)
    }
  },
})

export const birdTools = {
  bird_tweet,
  bird_reply,
  bird_read,
  bird_search,
  bird_mentions,
  bird_replies,
  bird_thread,
  bird_bookmarks,
  bird_likes,
  bird_following,
  bird_followers,
  bird_whoami,
  bird_check,
}
