import { beforeEach, describe, expect, test } from "bun:test";
import {
  normalizeSessionIdleEvent,
  resetSessionIdleDedup,
} from "./session-idle-dedup";

describe("session idle dedup", () => {
  beforeEach(() => {
    resetSessionIdleDedup();
  });

  test("converts session.status idle to session.idle", () => {
    // #given
    const event = {
      type: "session.status",
      properties: { type: "idle", sessionID: "ses_1" },
    };

    // #when
    const result = normalizeSessionIdleEvent(event);

    // #then
    expect(result).not.toBeNull();
    expect(result?.type).toBe("session.idle");
    expect(result?.properties).toEqual({ type: "idle", sessionID: "ses_1" });
  });

  test("suppresses real session.idle within dedup window", () => {
    // #given - synthetic idle was just emitted
    normalizeSessionIdleEvent({
      type: "session.status",
      properties: { type: "idle", sessionID: "ses_1" },
    });

    // #when - real idle arrives immediately after
    const result = normalizeSessionIdleEvent({
      type: "session.idle",
      properties: { sessionID: "ses_1" },
    });

    // #then
    expect(result).toBeNull();
  });

  test("allows real session.idle for different session", () => {
    // #given - synthetic idle for ses_1
    normalizeSessionIdleEvent({
      type: "session.status",
      properties: { type: "idle", sessionID: "ses_1" },
    });

    // #when - real idle for ses_2
    const result = normalizeSessionIdleEvent({
      type: "session.idle",
      properties: { sessionID: "ses_2" },
    });

    // #then
    expect(result).not.toBeNull();
    expect(result?.type).toBe("session.idle");
  });

  test("passes through non-idle session.status events", () => {
    // #given
    const event = {
      type: "session.status",
      properties: { type: "busy", sessionID: "ses_1" },
    };

    // #when
    const result = normalizeSessionIdleEvent(event);

    // #then
    expect(result).not.toBeNull();
    expect(result?.type).toBe("session.status");
  });

  test("passes through unrelated events", () => {
    // #given
    const event = { type: "message.part.updated", properties: { sessionID: "ses_1" } };

    // #when
    const result = normalizeSessionIdleEvent(event);

    // #then
    expect(result).not.toBeNull();
    expect(result?.type).toBe("message.part.updated");
  });

  test("allows real session.idle when no synthetic was emitted", () => {
    // #given - no prior synthetic idle

    // #when
    const result = normalizeSessionIdleEvent({
      type: "session.idle",
      properties: { sessionID: "ses_1" },
    });

    // #then
    expect(result).not.toBeNull();
    expect(result?.type).toBe("session.idle");
  });
});
