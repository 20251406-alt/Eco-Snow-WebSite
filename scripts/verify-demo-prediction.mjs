import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() =>
  localStorage.setItem("ecosnow-onboarding-v1", '{"status":"dismissed"}'),
);
const p = await ctx.newPage();
p.setDefaultTimeout(12000);
const url = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5177/";
const snapshot = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("ecosnow-admin-v1")));
const nav = async (name) => {
  if (await p.getByRole("button", { name: "메뉴", exact: true }).isVisible())
    await p.getByRole("button", { name: "메뉴", exact: true }).click();
  await p
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
};
try {
  await mkdir("outputs/demo-prediction", { recursive: true });
  await p.goto(url + "?demo=1");
  const bench = p.locator(".demo-workbench");
  await bench
    .getByRole("heading", {
      name: "현재 적설 기반 필요 살포량 예상",
      exact: true,
    })
    .waitFor();
  const result = bench.locator(".demo-prediction-result");
  assert.match(await result.innerText(), /2.4 kg/);
  await bench.getByRole("button", { name: "얕은 적설", exact: true }).click();
  assert.match(await result.innerText(), /1.8 kg/);
  await bench
    .getByRole("button", { name: "많이 쌓인 눈", exact: true })
    .click();
  assert.match(await result.innerText(), /3 kg/);
  await bench.getByLabel("실제 처리 면적 (㎡)", { exact: true }).fill("60");
  assert.match(await result.innerText(), /1.5 kg/);
  await bench.getByRole("button", { name: "미측정 확인", exact: true }).click();
  assert.match(await result.innerText(), /추가 정보 필요/);
  assert.equal(await result.getByRole("button").isDisabled(), true);
  await bench
    .getByRole("button", { name: "기준 밖 조건", exact: true })
    .click();
  assert.match(await result.innerText(), /산정 보류/);
  await bench.getByRole("button", { name: "보통 적설", exact: true }).click();
  await bench.getByLabel("실제 처리 면적 (㎡)", { exact: true }).fill("120");
  await p.screenshot({
    path: "outputs/demo-prediction/desktop.png",
    fullPage: false,
  });
  const originalCount = (await snapshot()).works.length;
  await result
    .getByRole("button", { name: "이 예상량으로 데모 작업 시작" })
    .click();
  let data = await snapshot(),
    work = data.works.at(-1);
  assert.equal(data.works.length, originalCount + 1);
  assert.equal(work.calculation.kg, 2.4);
  assert.equal(work.stage, "현장 확인");
  assert.equal(work.demo, true);
  const actual = p
    .locator("section")
    .filter({
      has: p.getByRole("heading", {
        name: "3. 실제 작업·추가 살포",
        exact: true,
      }),
    });
  assert.equal(
    await actual.getByLabel("실제 사용량 (kg)", { exact: true }).inputValue(),
    "2.4",
  );
  await actual.getByRole("button", { name: "실제 사용 기록 추가" }).click();
  await actual.getByLabel("실제 사용량 (kg)", { exact: true }).fill("1");
  await actual.getByRole("button", { name: "실제 사용 기록 추가" }).click();
  await p.getByRole("button", { name: "작업 완료·후속 확인으로" }).click();
  await p.getByRole("button", { name: "후속 관찰 저장", exact: true }).click();
  await p
    .getByRole("button", { name: "후속 확인 대기로 전환", exact: true })
    .click();
  await p
    .getByRole("button", { name: "후속 확인 완료·기록 마침", exact: true })
    .click();
  work = (await snapshot()).works.at(-1);
  assert.equal(work.stage, "기록 완료");
  assert.equal(
    work.applications.reduce((n, a) => n + a.kg, 0),
    3.4,
  );
  assert.ok(work.followup.manualReason);
  await nav("작업 이력");
  assert.match(
    await p.locator(".desktop-history tbody tr").first().innerText(),
    /3.4 kg/,
  );
  await nav("기관 성장·보상");
  await p
    .getByRole("heading", { name: "기록 완료부터 단계·혜택까지 체험" })
    .waitFor();
  const raw = await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1"));
  for (const n of [1, 2, 3, 4]) {
    await p
      .getByRole("button", { name: `${n}단계 결과 보기`, exact: true })
      .click();
    assert.match(
      await p.locator(".calculation h3").innerText(),
      new RegExp(`${n}단계`),
    );
  }
  assert.match(
    await p.locator(".badge").innerText(),
    /공인 환경인증이 아닙니다/,
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
    raw,
  );
  await nav("홈 대시보드");
  await p.setViewportSize({ width: 390, height: 900 });
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.screenshot({
    path: "outputs/demo-prediction/mobile.png",
    fullPage: false,
  });
  await p.reload();
  await p.locator(".demo-workbench").waitFor();
  assert.equal((await snapshot()).works.at(-1).id, work.id);
  console.log(
    "PASS depth/area forecasts, missing/out-of-range holds, saved prediction snapshot, actual/additional applications, followup completion, latest history, 1–4 reward simulations without record mutation, mobile and reload",
  );
} finally {
  await b.close();
}
