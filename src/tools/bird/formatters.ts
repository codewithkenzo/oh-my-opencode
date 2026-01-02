import type { Tweet, User, OutputFormat } from "./types"

export function formatTweetMarkdown(tweet: Tweet): string {
  const lines = [
    `## @${tweet.author.username} (${tweet.author.name})`,
    "",
    tweet.text,
    "",
    `Date: ${tweet.createdAt ?? "Unknown date"}`,
    `Replies: ${tweet.replyCount ?? 0} | Retweets: ${tweet.retweetCount ?? 0} | Likes: ${tweet.likeCount ?? 0}`,
    "",
    `ID: ${tweet.id}`,
  ]

  if (tweet.conversationId && tweet.conversationId !== tweet.id) {
    lines.push(`Thread: ${tweet.conversationId}`)
  }
  if (tweet.inReplyToStatusId) {
    lines.push(`Reply to: ${tweet.inReplyToStatusId}`)
  }

  return lines.join("\n")
}

export function formatTweetCompact(tweet: Tweet): string {
  return `@${tweet.author.username}: ${tweet.text.slice(0, 100)}${tweet.text.length > 100 ? "..." : ""} [${tweet.id}]`
}

export function formatTweetsMarkdown(tweets: Tweet[]): string {
  if (tweets.length === 0) return "No tweets found."
  return tweets.map((t, i) => `### ${i + 1}. ${formatTweetCompact(t)}\n${formatTweetMarkdown(t)}`).join("\n\n---\n\n")
}

export function formatTweetsCompact(tweets: Tweet[]): string {
  if (tweets.length === 0) return "No tweets found."
  return tweets.map(formatTweetCompact).join("\n")
}

export function formatUserMarkdown(user: User): string {
  const lines = [
    `## @${user.username} (${user.name})`,
    "",
    user.description ?? "(No bio)",
    "",
    `Followers: ${user.followersCount ?? 0} | Following: ${user.followingCount ?? 0}`,
  ]

  if (user.isBlueVerified) lines.push("[Verified]")
  if (user.createdAt) lines.push(`Joined: ${user.createdAt}`)
  lines.push(`ID: ${user.id}`)

  return lines.join("\n")
}

export function formatUserCompact(user: User): string {
  const verified = user.isBlueVerified ? " [V]" : ""
  return `@${user.username}${verified} (${user.followersCount ?? 0} followers) [${user.id}]`
}

export function formatUsersMarkdown(users: User[]): string {
  if (users.length === 0) return "No users found."
  return users.map(formatUserMarkdown).join("\n\n---\n\n")
}

export function formatUsersCompact(users: User[]): string {
  if (users.length === 0) return "No users found."
  return users.map(formatUserCompact).join("\n")
}

export function formatTweet(tweet: Tweet, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(tweet, null, 2)
  if (format === "compact") return formatTweetCompact(tweet)
  return formatTweetMarkdown(tweet)
}

export function formatTweets(tweets: Tweet[], format: OutputFormat): string {
  if (format === "json") return JSON.stringify(tweets, null, 2)
  if (format === "compact") return formatTweetsCompact(tweets)
  return formatTweetsMarkdown(tweets)
}

export function formatUsers(users: User[], format: OutputFormat): string {
  if (format === "json") return JSON.stringify(users, null, 2)
  if (format === "compact") return formatUsersCompact(users)
  return formatUsersMarkdown(users)
}
