import { describe, expect, it } from "vitest";
import { groupWallMarkerLabels } from "./wallMarkerLabels";

describe("groupWallMarkerLabels", () => {
  const annualMax = 1_600_000;

  it("groups markers whose gap is below the crowd threshold into one label", () => {
    const markers = [
      { val: 1_230_000, label: "123万" },
      { val: 1_300_000, label: "130万" },
      { val: 1_500_000, label: "150万" },
    ];

    const groups = groupWallMarkerLabels(markers, annualMax);

    expect(groups).toHaveLength(2);
    expect(groups[0].text).toBe("123万/130万");
    expect(groups[1].text).toBe("150万");
  });

  it("keeps markers separate when their gap is at or above the crowd threshold", () => {
    const markers = [
      { val: 200_000, label: "20万" },
      { val: 600_000, label: "60万" },
      { val: 1_400_000, label: "140万" },
    ];

    const groups = groupWallMarkerLabels(markers, annualMax);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.text)).toEqual(["20万", "60万", "140万"]);
  });

  it("returns a single group for a single marker", () => {
    const groups = groupWallMarkerLabels([{ val: 1_230_000, label: "123万" }], annualMax);

    expect(groups).toEqual([{ positionPct: (1_230_000 / annualMax) * 100, text: "123万" }]);
  });

  it("returns an empty array for no markers", () => {
    expect(groupWallMarkerLabels([], annualMax)).toEqual([]);
  });
});
