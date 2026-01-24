import type { ExtractedPattern, ExtractionResult, MemoryPersistenceConfig } from "./types"
import { CORRECTION_SIGNALS, REMEMBER_SIGNALS, PATTERN_SIGNALS, MAX_MEMORY_CONTENT_LENGTH } from "./constants"
import { supermemoryClient, getTags, stripPrivateContent, isConfigured } from "../../tools/supermemory/client"
import { log } from "../../shared/logger"

interface MessageLike {
  role: string
  content: string
}

export async function extractPatterns(
  sessionId: string,
  directory: string,
  config: MemoryPersistenceConfig,
  messages: MessageLike[]
): Promise<ExtractionResult> {
  const emptyResult: ExtractionResult = {
    patterns: [],
    storedCount: 0,
    skippedCount: 0,
  }

  if (!config.extract_patterns || !isConfigured()) {
    return emptyResult
  }

  if (messages.length < config.min_session_length) {
    log("[memory-persistence] skip extraction - session too short", {
      sessionId,
      messageCount: messages.length,
      minRequired: config.min_session_length,
    })
    return emptyResult
  }

  try {
    const patterns = detectPatterns(messages, config.pattern_confidence_threshold, config.error_lookback_window)

    if (patterns.length === 0) {
      return emptyResult
    }

    const tags = getTags(directory)
    let storedCount = 0
    let skippedCount = 0

    for (const pattern of patterns) {
      const content = formatPatternForStorage(pattern)
      const sanitizedContent = stripPrivateContent(content)

      if (sanitizedContent.trim() === "[REDACTED]" || sanitizedContent.length < 20) {
        skippedCount++
        continue
      }

      const containerTag = pattern.scope === "project" ? tags.project : tags.user
      const truncatedContent = sanitizedContent.slice(0, MAX_MEMORY_CONTENT_LENGTH)

      const result = await supermemoryClient.addMemory(truncatedContent, containerTag, {
        type: "learned-pattern",
        category: pattern.category,
        confidence: pattern.confidence,
        sessionId,
      })

      if (result?.id) {
        storedCount++
      } else {
        skippedCount++
      }
    }

    log("[memory-persistence] extracted patterns", {
      sessionId,
      detected: patterns.length,
      stored: storedCount,
      skipped: skippedCount,
    })

    return {
      patterns,
      storedCount,
      skippedCount,
    }
  } catch (error) {
    log("[memory-persistence] extraction error", { sessionId, error: String(error) })
    return emptyResult
  }
}

function detectPatterns(messages: MessageLike[], minConfidence: number, errorLookbackWindow: number): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const prevMessage = i > 0 ? messages[i - 1] : null
    const content = message.content.toLowerCase()

    if (message.role === "user") {
      const correction = detectUserCorrection(content, prevMessage)
      if (correction && correction.confidence >= minConfidence) {
        patterns.push(correction)
      }

      const explicit = detectExplicitRemember(message.content)
      if (explicit && explicit.confidence >= minConfidence) {
        patterns.push(explicit)
      }
    }

    if (message.role === "assistant") {
      const errorFix = detectErrorResolution(messages, i, errorLookbackWindow)
      if (errorFix && errorFix.confidence >= minConfidence) {
        patterns.push(errorFix)
      }
    }
  }

  return deduplicatePatterns(patterns)
}

function detectUserCorrection(content: string, prevMessage: MessageLike | null): ExtractedPattern | null {
  const correctionSignal = CORRECTION_SIGNALS.find((signal) => content.includes(signal))

  if (!correctionSignal) {
    return null
  }

  const confidence = calculateCorrectionConfidence(content, correctionSignal)

  return {
    category: "user_correction",
    description: `User corrected agent behavior`,
    context: prevMessage?.content.slice(0, 200) || "",
    solution: content.slice(0, 500),
    confidence,
    scope: "user",
  }
}

function detectExplicitRemember(content: string): ExtractedPattern | null {
  const lowerContent = content.toLowerCase()
  const rememberSignal = REMEMBER_SIGNALS.find((signal) => lowerContent.includes(signal))

  if (!rememberSignal) {
    return null
  }

  return {
    category: "preference",
    description: "User explicitly requested to remember",
    context: rememberSignal,
    solution: content.slice(0, 500),
    confidence: 0.9,
    scope: "user",
  }
}

function detectErrorResolution(messages: MessageLike[], index: number, lookbackWindow: number): ExtractedPattern | null {
  const message = messages[index]
  const content = message.content.toLowerCase()

  const hasErrorSignal = PATTERN_SIGNALS.error_resolution.some((signal) => content.includes(signal))

  if (!hasErrorSignal) {
    return null
  }

  let errorContext = ""
  for (let i = index - 1; i >= Math.max(0, index - lookbackWindow); i--) {
    const prev = messages[i]
    if (prev.content.toLowerCase().includes("error") || prev.content.toLowerCase().includes("failed")) {
      errorContext = prev.content.slice(0, 300)
      break
    }
  }

  if (!errorContext) {
    return null
  }

  return {
    category: "error_resolution",
    description: "Error was resolved in this session",
    context: errorContext,
    solution: message.content.slice(0, 500),
    confidence: 0.75,
    scope: "project",
  }
}

function calculateCorrectionConfidence(content: string, _signal: string): number {
  let confidence = 0.6

  if (content.includes("always") || content.includes("never")) {
    confidence += 0.15
  }

  if (content.includes("instead") || content.includes("rather")) {
    confidence += 0.1
  }

  if (content.length > 50) {
    confidence += 0.1
  }

  return Math.min(confidence, 0.95)
}

function formatPatternForStorage(pattern: ExtractedPattern): string {
  return `[${pattern.category}] ${pattern.description}

Context: ${pattern.context}

Solution/Action: ${pattern.solution}

Confidence: ${(pattern.confidence * 100).toFixed(0)}%`
}

function deduplicatePatterns(patterns: ExtractedPattern[]): ExtractedPattern[] {
  const seen = new Set<string>()
  return patterns.filter((p) => {
    const key = `${p.category}:${p.solution.slice(0, 100)}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
