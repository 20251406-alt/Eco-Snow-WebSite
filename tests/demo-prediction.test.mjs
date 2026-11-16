import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { emptyStore } from "../app/admin/domain.ts";
const compile = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const domain = JSON.stringify(
  new URL("../app/admin/domain.ts", import.meta.url).href,
);
const demoSource = readFileSync(
  new URL("../app/admin/demo.ts", import.meta.url),
  "utf8",
).replace('"./domain"', domain);
const demoURL = compile(demoSource);
const { withDemo } = await import(demoURL);
const predictionSource = readFileSync(
  new URL("../app/admin/demo-prediction.ts", import.meta.url),
  "utf8",
)
  .replace('"./domain"', domain)
  .replace('"./demo"', JSON.stringify(demoURL));
const { predictDemoAmount, demoTimeAfter } = await import(
  compile(predictionSource)
);
const input = {
  area: "120",
  depth: "2",
  temperature: "-3",
  removal: "일부 제거",
  state: "적설",
};
test("current depth selects explicit dummy band; area scales required amount", () => {
  const d = withDemo(emptyStore()),
    z = d.zones[0];
  assert.equal(predictDemoAmount(d, z, input).kg, 2.4);
  assert.equal(predictDemoAmount(d, z, { ...input, depth: "0.8" }).kg, 1.8);
  assert.equal(predictDemoAmount(d, z, { ...input, depth: "4" }).kg, 3);
  assert.equal(predictDemoAmount(d, z, { ...input, area: "60" }).kg, 1.2);
  assert.equal(predictDemoAmount(d, z, input).inputs.source, "데모");
});
test("missing, conflicting and out-of-range inputs do not invent amounts", () => {
  const d = withDemo(emptyStore()),
    z = d.zones[0];
  for (const patch of [
    { temperature: "" },
    { depth: "8" },
    { area: "0" },
    { area: "-1" },
    { area: "1e309" },
    { depth: "0" },
    { state: "얼음" },
    { removal: "미제거" },
  ])
    assert.equal(
      predictDemoAmount(d, z, { ...input, ...patch }).kg,
      null,
      JSON.stringify(patch),
    );
  assert.equal(predictDemoAmount(d, { ...z, orgId: "real" }, input), null);
});
test("demo timestamps preserve observation -> application -> followup order", () => {
  assert.equal(demoTimeAfter("2026-01-15T09:00"), "2026-01-15T09:30");
  assert.equal(demoTimeAfter("2026-01-15T23:45"), "2026-01-16T00:15");
});
