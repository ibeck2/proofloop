import { describe, it, expect } from "vitest";
import { isChatMessagingEnabled } from "./chatMessagesEnabled";

describe("isChatMessagingEnabled", () => {
  it("returns true only for the exact string 'true'", () => {
    expect(isChatMessagingEnabled("true")).toBe(true);
  });

  it("fails closed when unset", () => {
    expect(isChatMessagingEnabled(undefined)).toBe(false);
  });

  it("fails closed for any other value (typo-safe)", () => {
    expect(isChatMessagingEnabled("True")).toBe(false);
    expect(isChatMessagingEnabled("1")).toBe(false);
    expect(isChatMessagingEnabled("")).toBe(false);
    expect(isChatMessagingEnabled("false")).toBe(false);
  });
});
