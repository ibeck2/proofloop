import { describe, expect, it } from "vitest";
import { responseBadgeClass, responseLabel } from "./scheduleResponse";

describe("responseLabel", () => {
  it("converts yes/maybe/no to ○/△/×", () => {
    expect(responseLabel("yes")).toBe("○");
    expect(responseLabel("maybe")).toBe("△");
    expect(responseLabel("no")).toBe("×");
  });

  it("returns a dash for null, undefined, or unknown values", () => {
    expect(responseLabel(null)).toBe("—");
    expect(responseLabel(undefined)).toBe("—");
    expect(responseLabel("unknown")).toBe("—");
  });
});

describe("responseBadgeClass", () => {
  it("returns a distinct class per response value", () => {
    expect(responseBadgeClass("yes")).not.toBe(responseBadgeClass("maybe"));
    expect(responseBadgeClass("maybe")).not.toBe(responseBadgeClass("no"));
  });

  it("falls back to the default class for unknown values", () => {
    expect(responseBadgeClass(null)).toBe(responseBadgeClass("unknown"));
  });
});
