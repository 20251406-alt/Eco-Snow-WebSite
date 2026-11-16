import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFileSync } from "node:fs";
const source = readFileSync(
  new URL("../app/admin/walkthrough-model.ts", import.meta.url),
  "utf8",
).replace(
  '"./domain"',
  JSON.stringify(new URL("../app/admin/domain.ts", import.meta.url).href),
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  createPracticeStore,
  guideSteps,
  PRACTICE_ORG,
  PRACTICE_KEY,
  GUIDE_KEY,
} = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("onboarding isolates practice data and never seeds real performance", () => {
  const d = createPracticeStore();
  assert.equal(d.organizations[0].id, PRACTICE_ORG);
  assert.equal(d.zones.length, 0);
  assert.equal(d.works.length, 0);
  assert.equal(d.criteria[0].verified, false);
  for (let menu = 0; menu < 8; menu++) {
    const s = createPracticeStore(menu);
    assert.ok(s.works.every((w) => w.demo));
    assert.ok(s.organizations.every((o) => o.id === PRACTICE_ORG));
  }
  assert.notEqual(PRACTICE_KEY, "ecosnow-admin-v1");
  assert.notEqual(GUIDE_KEY, PRACTICE_KEY);
});
test("every menu has concrete UI targets, explicit actions, and unique step IDs", () => {
  for (const menu of [-1, 0, 1, 2, 3, 4, 5, 6, 7]) {
    const steps = guideSteps(menu);
    assert.ok(steps.length >= 2);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
    for (const s of steps) {
      assert.match(s.target, /^\[data-guide="[a-z0-9-]+"\]$/);
      assert.ok(s.description && s.action);
      if (s.kind === "click") assert.equal(typeof s.complete, "function");
      if (s.kind === "input" || s.kind === "change")
        assert.equal(typeof s.validate, "function");
    }
  }
});
