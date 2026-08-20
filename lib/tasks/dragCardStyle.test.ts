import { describe, expect, it } from "vitest";
import { buildDragCardStyle, SHORT_DROP_DURATION_MS } from "./dragCardStyle";

describe("buildDragCardStyle", () => {
  const draggableStyle = {
    transform: "translate(10px, 20px)",
    transition: "transform 0.33s cubic-bezier(0.2,1,0.1,1)",
  };

  it("keeps the library's draggableStyle when not drop-animating", () => {
    const result = buildDragCardStyle(draggableStyle, { isDropAnimating: false, dropAnimation: null }, undefined);
    expect(result).toEqual(draggableStyle);
  });

  it("merges extraStyle on top of draggableStyle without dropping either", () => {
    const result = buildDragCardStyle(
      draggableStyle,
      { isDropAnimating: false, dropAnimation: null },
      { borderLeftColor: "#7391AF" }
    );
    expect(result).toEqual({
      transform: "translate(10px, 20px)",
      transition: "transform 0.33s cubic-bezier(0.2,1,0.1,1)",
      borderLeftColor: "#7391AF",
    });
  });

  it("shortens the transition duration while drop-animating, keeping the library's curve", () => {
    const result = buildDragCardStyle(
      draggableStyle,
      {
        isDropAnimating: true,
        dropAnimation: {
          duration: 0.33,
          curve: "cubic-bezier(0.2,1,0.1,1)",
          moveTo: { x: 0, y: 0 },
          opacity: null,
          scale: null,
        },
      },
      { borderLeftColor: "#7391AF" }
    );
    expect(result?.transition).toBe(
      `all ${SHORT_DROP_DURATION_MS}ms cubic-bezier(0.2,1,0.1,1)`
    );
    expect(result?.transform).toBe("translate(10px, 20px)");
    expect(result?.borderLeftColor).toBe("#7391AF");
  });

  it("returns undefined when both style sources are absent", () => {
    const result = buildDragCardStyle(undefined, { isDropAnimating: false, dropAnimation: null }, undefined);
    expect(result).toBeUndefined();
  });
});
