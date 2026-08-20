import { describe, expect, it } from "vitest";
import { computeReadStatus } from "./scheduleReadStatus";

describe("computeReadStatus", () => {
  const candidateIds = ["c1", "c2", "c3"];

  it("returns responded when the member answered every candidate", () => {
    expect(
      computeReadStatus(
        { hasViewed: true, respondedCandidateIds: ["c1", "c2", "c3"] },
        candidateIds
      )
    ).toBe("responded");
  });

  it("returns viewed_no_response when only some candidates were answered", () => {
    expect(
      computeReadStatus(
        { hasViewed: true, respondedCandidateIds: ["c1"] },
        candidateIds
      )
    ).toBe("viewed_no_response");
  });

  it("returns viewed_no_response when the poll was opened but nothing was answered", () => {
    expect(
      computeReadStatus({ hasViewed: true, respondedCandidateIds: [] }, candidateIds)
    ).toBe("viewed_no_response");
  });

  it("returns unread when the poll was never opened", () => {
    expect(
      computeReadStatus({ hasViewed: false, respondedCandidateIds: [] }, candidateIds)
    ).toBe("unread");
  });

  it("treats a poll with zero candidates as never fully responded", () => {
    expect(computeReadStatus({ hasViewed: false, respondedCandidateIds: [] }, [])).toBe(
      "unread"
    );
    expect(computeReadStatus({ hasViewed: true, respondedCandidateIds: [] }, [])).toBe(
      "viewed_no_response"
    );
  });
});
