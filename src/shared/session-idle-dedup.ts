/**
 * Session idle event deduplication.
 *
 * OpenCode fires both `session.status {type:"idle"}` and `session.idle` events.
 * This module deduplicates them with a 500ms window so hooks only fire once.
 */

const DEDUP_WINDOW_MS = 500;
const PRUNE_INTERVAL_MS = 60_000;
const MAX_AGE_MS = 30_000;

/** Map of sessionID -> timestamp of last synthetic idle emission */
const recentSyntheticIdles = new Map<string, number>();

let pruneTimer: ReturnType<typeof setInterval> | null = null;

function ensurePruning(): void {
  if (pruneTimer) return;

  pruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of recentSyntheticIdles) {
      if (now - ts > MAX_AGE_MS) {
        recentSyntheticIdles.delete(key);
      }
    }

    if (recentSyntheticIdles.size === 0 && pruneTimer) {
      clearInterval(pruneTimer);
      pruneTimer = null;
    }
  }, PRUNE_INTERVAL_MS);

  // Don't block process exit
  if (pruneTimer && typeof pruneTimer === "object" && "unref" in pruneTimer) {
    pruneTimer.unref();
  }
}

export interface NormalizedEvent {
  type: string;
  properties?: Record<string, unknown>;
}

/**
 * Normalize session status/idle events with dedup.
 *
 * Returns the event to dispatch (possibly converted), or null if it should be suppressed.
 *
 * - `session.status {type:"idle"}` -> converted to `session.idle` with dedup tracking
 * - `session.idle` -> suppressed if a synthetic idle was emitted within 500ms for same session
 * - All other events -> passed through unchanged
 */
export function normalizeSessionIdleEvent(
  event: NormalizedEvent
): NormalizedEvent | null {
  // Convert session.status {type:"idle"} to session.idle
  if (event.type === "session.status") {
    const props = event.properties;
    if (props && props.type === "idle") {
      const sessionID =
        typeof props.sessionID === "string" ? props.sessionID : undefined;

      if (sessionID) {
        recentSyntheticIdles.set(sessionID, Date.now());
        ensurePruning();
      }

      return {
        type: "session.idle",
        properties: event.properties,
      };
    }
    return event;
  }

  // Dedup real session.idle if synthetic was recently emitted
  if (event.type === "session.idle") {
    const sessionID =
      typeof event.properties?.sessionID === "string"
        ? event.properties.sessionID
        : undefined;

    if (sessionID) {
      const lastSynthetic = recentSyntheticIdles.get(sessionID);
      if (
        typeof lastSynthetic === "number" &&
        Date.now() - lastSynthetic < DEDUP_WINDOW_MS
      ) {
        return null; // Suppress duplicate
      }
    }
    return event;
  }

  return event;
}

/** Reset state (for testing) */
export function resetSessionIdleDedup(): void {
  recentSyntheticIdles.clear();
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}
