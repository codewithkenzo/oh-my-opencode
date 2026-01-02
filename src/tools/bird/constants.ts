export const TOOL_PREFIX = "bird"

export const BIRD_TWEET_DESCRIPTION = `Post a new tweet to X/Twitter.

Supports text and optional media (up to 4 images or 1 video).
Uses browser cookies for auth - user must be logged into X.`

export const BIRD_REPLY_DESCRIPTION = `Reply to a tweet on X/Twitter.

Provide tweet ID or URL, plus reply text. Supports optional media.`

export const BIRD_READ_DESCRIPTION = `Fetch a tweet's content from X/Twitter.

Returns text, author, engagement stats. Supports Notes/Articles.
Accepts tweet ID or full URL.`

export const BIRD_SEARCH_DESCRIPTION = `Search tweets on X/Twitter.

Operators: from:user, to:user, since:YYYY-MM-DD, until:YYYY-MM-DD, filter:links, filter:images, -filter:retweets`

export const BIRD_MENTIONS_DESCRIPTION = `Get tweets mentioning a user.

Defaults to authenticated account. Specify user for others.`

export const BIRD_REPLIES_DESCRIPTION = `List replies to a specific tweet.

Returns all reply tweets for the given tweet ID or URL.`

export const BIRD_THREAD_DESCRIPTION = `Fetch full conversation thread.

Returns original tweet and all thread replies.`

export const BIRD_BOOKMARKS_DESCRIPTION = `List your bookmarked tweets.

Optionally filter by bookmark folder ID.`

export const BIRD_LIKES_DESCRIPTION = `List your liked tweets.

Returns recent tweets you've liked.`

export const BIRD_FOLLOWING_DESCRIPTION = `List users you (or another user) follow.

Provide user ID to check another user's following list.`

export const BIRD_FOLLOWERS_DESCRIPTION = `List users who follow you (or another user).

Provide user ID to check another user's followers.`

export const BIRD_WHOAMI_DESCRIPTION = `Check authenticated X/Twitter account.

Returns username and basic info of the account.`

export const BIRD_CHECK_DESCRIPTION = `Show available credentials and their sources.

Displays which auth methods are available (cookies, env vars, etc).`

export const ERROR_NOT_INSTALLED = "bird CLI not found. Install: bun add -g @steipete/bird"
export const ERROR_AUTH_FAILED = "Auth failed. Log into X/Twitter in browser and retry."
export const ERROR_RATE_LIMITED = "Rate limited by X. Wait and retry."
export const ERROR_NOT_FOUND = "Tweet not found or deleted."

export const DEFAULT_COUNT = 20
export const DEFAULT_TIMEOUT_MS = 30000
