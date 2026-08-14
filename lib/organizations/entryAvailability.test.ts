import { describe, expect, it } from "vitest";
import { resolveEntryAvailability } from "./entryAvailability";

describe("resolveEntryAvailability", () => {
  it("returns available for claimed organizations", () => {
    expect(resolveEntryAvailability("claimed")).toBe("available");
  });

  it("returns unclaimed for unclaimed organizations", () => {
    expect(resolveEntryAvailability("unclaimed")).toBe("unclaimed");
  });

  it("returns frozen for frozen organizations", () => {
    expect(resolveEntryAvailability("frozen")).toBe("frozen");
  });

  it("returns unclaimed when claim status is not yet known (null)", () => {
    expect(resolveEntryAvailability(null)).toBe("unclaimed");
  });
});
