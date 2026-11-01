import assert from "node:assert/strict";
import test from "node:test";
import { plans, selectTrial, getPlan } from "../app/admin/plans.ts";
test("school/private/municipal prices are annual-contract monthly equivalents", () => {
  assert.deepEqual(
    plans.map((p) => p.monthly),
    [100000, 200000, 800000],
  );
  assert.deepEqual(
    plans.map((p) => p.annual),
    [1200000, 2400000, 9600000],
  );
  for (const p of plans) assert.equal(p.annual, p.monthly * 12);
});
test("trial selection has no billing or contract state and rejects unknown plans", () => {
  const trial = selectTrial("school", "2026-11-01T01:00:00Z");
  assert.equal(getPlan(trial.planId).monthly, 100000);
  assert.equal(getPlan("unknown"), undefined);
  assert.throws(() => selectTrial("free", "now"));
  assert.equal("billing" in trial, false);
  assert.equal("contract" in trial, false);
});
