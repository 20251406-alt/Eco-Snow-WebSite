import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const out = process.env.UI_CAPTURE_DIR || "outputs/ui-review";
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await b.newContext();
const p = await context.newPage();
p.setDefaultTimeout(10000);
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const url = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5174/";
const nav = async (name) => {
  if (await p.getByRole("button", { name: "메뉴", exact: true }).isVisible())
    await p.getByRole("button", { name: "메뉴", exact: true }).click();
  await p
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
  await p.waitForFunction(
    () =>
      innerWidth >= 768 ||
      document.querySelector(".sidebar").getBoundingClientRect().right <= 0,
  );
};
const state = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("ecosnow-admin-v1")));
const section = (title) =>
  p
    .locator("section")
    .filter({ has: p.getByRole("heading", { name: title, exact: true }) });
try {
  await p.goto(url + "?demo=1");
  await p.getByRole("button", { name: "데모 데이터로 둘러보기" }).waitFor();
  const before = await state();
  await p.evaluate(async () => {
    localStorage.setItem("ecosnow-cameras", "legacy-camera-record-preserved");
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("ecosnow-photos-v1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(
        new Blob(["photo-preservation-check"]),
        "legacy-photo",
      );
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
  });
  await nav("요금제·구독");
  assert.equal(await p.locator(".price-card").count(), 3);
  assert.deepEqual(
    await p.locator(".price-card .annual-price strong").allTextContents(),
    ["1,200,000원", "2,400,000원", "9,600,000원"],
  );
  await p
    .locator(".price-card")
    .filter({
      has: p.getByRole("heading", { name: "학교·소규모 기관", exact: true }),
    })
    .getByRole("button", { name: "이 플랜으로 체험" })
    .click();
  await p
    .getByRole("status")
    .filter({ hasText: "실제 결제나 계약은 발생하지 않습니다" })
    .waitFor();
  const chosen = await state();
  assert.deepEqual(chosen.works, before.works);
  assert.deepEqual(chosen.prior, before.prior);
  assert.equal(
    chosen.subscriptions["ecosnow-demo-organization-v1"].planId,
    "school",
  );
  await p.reload();
  await p.getByRole("button", { name: "데모 데이터로 둘러보기" }).waitFor();
  assert.match(await p.locator(".plan-pill").innerText(), /학교/);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ecosnow-cameras")),
    "legacy-camera-record-preserved",
  );
  assert.equal(
    await p.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("ecosnow-photos-v1", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const blob = await new Promise((resolve, reject) => {
        const r = db
          .transaction("photos")
          .objectStore("photos")
          .get("legacy-photo");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return blob.text();
    }),
    "photo-preservation-check",
  );

  // Confirm settings sections keep unsaved form values mounted.
  await nav("기관 설정");
  await p
    .getByRole("group", { name: "기관 설정 분류" })
    .getByRole("button", { name: "제품·제조 배치", exact: true })
    .click();
  await p.getByLabel("제품명", { exact: true }).fill("저장 전 임시 제품명");
  await p
    .getByRole("group", { name: "기관 설정 분류" })
    .getByRole("button", { name: "보상 정책", exact: true })
    .click();
  await p
    .getByRole("group", { name: "기관 설정 분류" })
    .getByRole("button", { name: "제품·제조 배치", exact: true })
    .click();
  assert.equal(
    await p.getByLabel("제품명", { exact: true }).inputValue(),
    "저장 전 임시 제품명",
  );
  // Second institution: no implicit subscription from product inquiry.
  await p
    .getByRole("group", { name: "기관 설정 분류" })
    .getByRole("button", { name: "기관 기본 정보", exact: true })
    .click();
  await section("기관·관리자 등록")
    .getByLabel("기관명", { exact: true })
    .fill("요금제 검증 기관");
  await section("기관·관리자 등록")
    .getByLabel("관리자", { exact: true })
    .fill("검증 담당자");
  await section("기관·관리자 등록")
    .getByRole("button", { name: "기관 등록", exact: true })
    .click();
  const otherId = await p.getByLabel("현재 기관 (로컬 구분)").inputValue();
  await nav("요금제·구독");
  assert.match(
    await p.locator(".plan-current").innerText(),
    /체험 플랜을 선택/,
  );
  await p.getByRole("button", { name: "제품 도입 문의", exact: true }).click();
  await p.getByLabel("문의 내용").fill("가상 제품 문의 — 자동 전송 없음");
  await p.getByRole("button", { name: "문의 초안 저장", exact: true }).click();
  assert.equal((await state()).subscriptions[otherId], undefined);
  await nav("홈 대시보드");
  await nav("요금제·구독");
  assert.equal(
    await p.getByLabel("문의 내용").inputValue(),
    "가상 제품 문의 — 자동 전송 없음",
  );
  await p
    .locator(".price-card")
    .filter({
      has: p.getByRole("heading", { name: "아파트·민간기관", exact: true }),
    })
    .getByRole("button", { name: "이 플랜으로 체험" })
    .click();
  assert.equal((await state()).subscriptions[otherId].planId, "private");
  await p
    .getByLabel("현재 기관 (로컬 구분)")
    .selectOption("ecosnow-demo-organization-v1");
  assert.match(
    await p.locator(".plan-current").innerText(),
    /학교·소규모 기관 체험/,
  );
  const all = await state(),
    workId = all.works[0].id;
  // Each requested viewport and each primary screen. No document overflow.
  for (const width of [360, 390, 768, 1280, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const [name, slug] of [
      ["홈 대시보드", "home"],
      ["현장 확인·정량 살포", "field"],
      ["작업 이력", "history"],
      ["절약 리포트", "report"],
      ["요금제·구독", "pricing"],
    ]) {
      await nav(name);
      if (slug === "field")
        await p.getByLabel("작성 중·기존 작업 열기").selectOption(workId);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({
        path: `${out}/${slug}-${width}.png`,
        fullPage: slug === "pricing" || slug === "field",
      });
      const extent = await p.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: innerWidth,
      }));
      assert.ok(
        extent.doc <= extent.win,
        `${slug} at ${width}px overflows ${JSON.stringify(extent)}`,
      );
      if (slug === "pricing") {
        const cards = await p.locator(".price-card").evaluateAll((nodes) =>
          nodes.map((n) => ({
            h: n.getBoundingClientRect().height,
            w: n.getBoundingClientRect().width,
          })),
        );
        if (width >= 1280)
          assert.ok(
            Math.max(...cards.map((c) => c.h)) -
              Math.min(...cards.map((c) => c.h)) <
              2,
            "price card heights differ",
          );
      }
    }
  }
  // Drawer keyboard focus trap and Escape; visible focus indicator.
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "메뉴", exact: true }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("dialog", { name: "주 메뉴" }).waitFor();
  await p.keyboard.press("Tab");
  assert.equal(
    await p
      .locator(".drawer-open")
      .evaluate((el) => el.contains(document.activeElement)),
    true,
  );
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "메뉴", exact: true }).waitFor();
  await nav("현장 확인·정량 살포");
  await p
    .getByLabel("관리 구역", { exact: true })
    .selectOption(all.zones[0].id);
  await p.getByRole("button", { name: "관찰 확인·산정으로" }).click();
  await p.getByRole("status").filter({ hasText: "추가 정보 필요" }).waitFor();
  assert.ok((await p.locator("[aria-invalid=true]").count()) > 0);
  // Captured errors are genuine JS failures, not expected validation messages.
  assert.deepEqual(errors, []);
  console.log(
    "PASS: pricing totals, scoped plan persistence, existing data preserved, product inquiry without plan side effects, draft retention, 25 viewport captures, no page overflow, card heights, drawer keyboard, validation hold",
  );
} catch (e) {
  await p
    .screenshot({
      path: `out/failed.png`.replace("out/", out + "/"),
      fullPage: false,
    })
    .catch(() => {});
  throw e;
} finally {
  await b.close();
}
