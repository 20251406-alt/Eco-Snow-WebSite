import test from "node:test";
import assert from "node:assert/strict";
import { placeCoach } from "../app/admin/walkthrough-layout.ts";
const overlap = (a, b) =>
  Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  ) *
  Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  );
test("reported short desktop screen uses side space and preserves entire coach", () => {
  const target = { left: 295, top: 340, width: 500, height: 52 },
    v = { left: 0, top: 0, width: 1363, height: 688 };
  const p = placeCoach(target, v, 430);
  assert.equal(p.side, "right");
  assert.equal(overlap({ ...p, height: 430 }, target), 0);
  assert.ok(p.top + 430 <= v.height - 12);
});
test("small and zoomed visual viewports keep coach inside bounds without covering target", () => {
  for (const v of [
    { left: 0, top: 0, width: 390, height: 480 },
    { left: 0, top: 0, width: 768, height: 500 },
    { left: 20, top: 80, width: 310, height: 420 },
    { left: 0, top: 0, width: 1090.4, height: 550.4 },
  ]) {
    const target = {
      left: v.left + 28,
      top: v.top + 150,
      width: Math.min(450, v.width - 56),
      height: 48,
    };
    const p = placeCoach(target, v, 460),
      height = Math.min(460, p.maxHeight);
    assert.ok(p.left >= v.left);
    assert.ok(p.left + p.width <= v.left + v.width);
    assert.ok(p.top >= v.top);
    assert.ok(p.top + height <= v.top + v.height);
    assert.equal(overlap({ ...p, height }, target), 0);
  }
});
