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
const { guideSteps, createPracticeStore, PRACTICE_ORG, PRACTICE_KEY } =
  await import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
test("all scenarios use stable real targets and action gates", () => {
  for (const menu of [-1, 0, 1, 2, 3, 4, 5, 6, 7]) {
    const steps = guideSteps(menu);
    assert.ok(steps.length > 1);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
    for (const s of steps) {
      assert.match(s.target, /^\[data-guide="[a-z0-9-]+"\]$/);
      assert.ok(s.title && s.description && s.action);
      assert.ok(s.complete || s.validate || s.kind === "read");
    }
  }
});
test("practice seed has no actual institution data and is independently created", () => {
  const one = createPracticeStore(),
    two = createPracticeStore();
  assert.equal(one.organizations[0].id, PRACTICE_ORG);
  assert.notEqual(one.products[0].id, two.products[0].id);
  assert.equal(one.zones.length, 0);
  assert.equal(one.products.length, 1);
  assert.equal(one.criteria[0].verified, false);
  assert.notEqual(PRACTICE_KEY, "ecosnow-admin-v1");
  const history = createPracticeStore(3);
  assert.equal(history.works[0].stage, "기록 완료");
  assert.ok(history.works.every((w) => w.demo && w.orgId === PRACTICE_ORG));
});
test("state changes are required for save and completion steps", () => {
  const data = createPracticeStore(2);
  const state = { data, view: 2, fieldStep: 0, settingGroup: 0 };
  const steps = guideSteps();
  assert.equal(
    steps.find((s) => s.id === "application-save").complete(state),
    false,
  );
  assert.equal(
    steps.find((s) => s.id === "finish-work").complete(state),
    false,
  );
  assert.equal(steps.find((s) => s.id === "calculate").complete(state), false);
  const work = createPracticeStore(3).works[0];
  assert.equal(
    steps.find((s) => s.id === "finish-work").complete({ ...state, work }),
    true,
  );
});
