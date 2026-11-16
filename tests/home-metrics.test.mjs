import test from "node:test";
import assert from "node:assert/strict";
import { homeMetrics } from "../app/admin/home-metrics.ts";
import { emptyStore } from "../app/admin/domain.ts";
const fixture = () => ({
  ...emptyStore(),
  zones: [{ id: "z", orgId: "a", area: 120 }],
  settings: { a: { season: { start: "2026-01-01", end: "2026-03-31" } } },
  works: [],
});
const work = (id, kg, at = "2026-01-15") => ({
  id,
  orgId: "a",
  zone: { id: "z" },
  demo: false,
  stage: "기록 완료",
  createdAt: at,
  observation: { capturedAt: at },
  calculation: { kg, inputs: { capturedAt: at } },
  applications: [{ id: "app-" + id, kg: kg / 2, at }],
});
test("latest per-zone estimate differs from summed monthly work estimates; missing months stay null", () => {
  const d = fixture();
  d.works = [work("old", 2), work("new", 4, "2026-02-15")];
  const m = homeMetrics(d, "a");
  assert.equal(m.expected, 4);
  assert.equal(m.actual, 3);
  assert.deepEqual(
    m.months.map((x) => x.expected),
    [2, 4, null],
  );
  assert.deepEqual(
    m.months.map((x) => x.actual),
    [1, 2, null],
  );
  assert.equal(m.pending, 0);
});
test("isolate organizations, demos, periods and duplicate work/application IDs", () => {
  const d = fixture(),
    w = work("one", 4);
  w.applications.push({ ...w.applications[0] });
  d.works = [
    w,
    w,
    { ...work("demo", 10), demo: true },
    { ...work("other", 20), orgId: "b" },
    work("outside", 30, "2025-12-01"),
  ];
  assert.equal(homeMetrics(d, "a").actual, 2);
  assert.equal(homeMetrics(d, "a", true).actual, 7);
  assert.equal(homeMetrics(d, "a").works, 2);
});
test("explicit zero usage remains zero; empty records yield no invented amounts", () => {
  const d = fixture();
  assert.equal(homeMetrics(d, "a").actual, null);
  d.works = [work("zero", 0)];
  assert.equal(homeMetrics(d, "a").actual, 0);
  assert.equal(homeMetrics(d, "a").months[0].actual, 0);
});
