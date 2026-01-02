import { z } from "zod"

export const OutputFormat = z.enum(["markdown", "json", "compact"])
export type OutputFormat = z.infer<typeof OutputFormat>

export const CookieSourceSchema = z.enum(["safari", "chrome", "firefox"])
export type CookieSource = z.infer<typeof CookieSourceSchema>

export const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.object({
    username: z.string(),
    name: z.string(),
  }),
  authorId: z.string().optional(),
  createdAt: z.string().optional(),
  replyCount: z.number().optional(),
  retweetCount: z.number().optional(),
  likeCount: z.number().optional(),
  conversationId: z.string().optional(),
  inReplyToStatusId: z.string().optional(),
  quotedTweet: z.unknown().optional(),
})
export type Tweet = z.infer<typeof TweetSchema>

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  description: z.string().optional(),
  followersCount: z.number().optional(),
  followingCount: z.number().optional(),
  isBlueVerified: z.boolean().optional(),
  profileImageUrl: z.string().optional(),
  createdAt: z.string().optional(),
})
export type User = z.infer<typeof UserSchema>

export type BirdErrorCode =
  | "NOT_INSTALLED"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CLI_ERROR"
  | "PARSE_ERROR"

export class BirdError extends Error {
  constructor(
    message: string,
    public code: BirdErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = "BirdError"
  }
}
