import assert from "node:assert/strict";
import test from "node:test";
import { calculateSalting } from "../app/salting.ts";

test("converts area and user-supplied grams per square metre to kilograms", () => {
  assert.equal(calculateSalting("2", "120", "20"), 2.4);
  assert.equal(calculateSalting("3.5", "12.5", "15"), 0.1875);
  assert.equal(calculateSalting("10", "120", "20"), 2.4);
});

test("no snow means no post-snow application", () => {
  assert.equal(calculateSalting("0", "120", "20"), 0);
});

test("rejects missing, negative, zero-area, nonfinite and overflowing inputs", () => {
  for (const args of [["", "120", "20"], ["2", "", "20"], ["2", "120", ""],
    ["-1", "120", "20"], ["2", "0", "20"], ["2", "120", "0"],
    ["2", "-1", "20"], ["2", "120", "-1"], ["NaN", "120", "20"],
    ["2", "Infinity", "20"], ["2", "1e308", "1e308"]]) {
    assert.equal(calculateSalting(...args), null, JSON.stringify(args));
  }
});
