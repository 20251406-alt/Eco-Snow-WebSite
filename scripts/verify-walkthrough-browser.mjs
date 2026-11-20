import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const url = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5174/";
await mkdir("outputs/walkthrough", { recursive: true });
const inputs = {
  "application-time": "2026-01-15T10:00",
  "followup-time": "2026-01-15T11:00",
  "zone-name": "연습 정문 보행로",
  "zone-location": "가상 학교 정문",
  "zone-area": "120",
  "zone-boundary": "연습 A~B",
  "zone-use": "보행로",
  "observation-depth": "2",
  "observation-area": "120",
  "observation-temperature": "-3",
  "observation-time": "2026-01-15T09:00",
  "observation-manual": "연습용 수동 측정",
  "application-kg": "2.5",
  "followup-remaining": "그늘에 잔설 있음",
  "followup-removal": "삽으로 추가 제거",
  "followup-manual": "연습용 수동 확인",
  "product-name": "연습 제품",
  "product-batch": "PRACTICE-02",
};
async function run(width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(url + "?demo=1");
    await page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: /처음 사용/ }) })
      .waitFor();
    await page
      .getByRole("button", { name: "나중에 하기", exact: true })
      .click();
    const raw = await page.evaluate(() =>
      localStorage.getItem("ecosnow-admin-v1"),
    );
    assert.ok(raw);
    await page.reload();
    await page
      .getByRole("button", { name: "사용법 안내", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "나중에 하기", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "사용법 안내", exact: true })
      .click();
    const seen = [];
    let previous = "";
    for (let n = 0; n < 55; n++) {
      if (
        await page
          .getByRole("heading", { name: "잘하셨습니다!", exact: true })
          .isVisible()
      )
        break;
      const layer = page.locator(".walkthrough-layer");
      await layer.waitFor();
      const id = await layer.getAttribute("data-tour-step");
      assert.notEqual(id, previous, `stuck at ${id}`);
      previous = id;
      seen.push(id);
      await page.locator("[data-guide-ring]").waitFor();
      const targetId = id === "finish-work" ? "followup-next" : id;
      const target = page.locator(`[data-guide="${targetId}"]:visible`).first();
      await target.waitFor();
      await page.waitForFunction((selector) => {
        const el = [...document.querySelectorAll(selector)].find(
          (e) => e.getClientRects().length,
        );
        const ring = document.querySelector("[data-guide-ring]");
        if (!el || !ring) return false;
        const control =
          el.querySelector("input:not([type=checkbox]),select,textarea") || el;
        const a = control.getBoundingClientRect(),
          b = ring.getBoundingClientRect();
        return (
          a.left >= b.left - 1 &&
          a.right <= b.right + 1 &&
          a.top >= b.top - 1 &&
          a.bottom <= b.bottom + 1
        );
      }, `[data-guide="${targetId}"]`);
      const overlap = await page.evaluate(() => {
        const a = document
            .querySelector("[data-guide-ring]")
            .getBoundingClientRect(),
          b = document.querySelector(".guide-coach")?.getBoundingClientRect();
        return b
          ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
              Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
          : 0;
      });
      assert.equal(overlap, 0, `coach overlaps target ${id}`);
      if (id === "zone-name") {
        await page
          .getByRole("button", { name: "입력 확인", exact: true })
          .click();
        assert.equal(await layer.getAttribute("data-tour-step"), id);
        await page.locator(".guide-validation").waitFor();
        await page.screenshot({
          path: `outputs/walkthrough/spotlight-${width}.png`,
        });
      }
      if (inputs[id]) {
        await target.locator("input,textarea").fill(inputs[id]);
        await page
          .getByRole("button", { name: "입력 확인", exact: true })
          .click();
      } else if (id === "observation-state")
        await target.locator("select").selectOption("적설");
      else if (id === "observation-removal")
        await target.locator("select").selectOption("일부 제거");
      else if (id === "observation-range")
        await target.locator("input").check();
      else if (id === "criterion-select")
        await target.locator("select").selectOption({ index: 1 });
      else if (id === "report-title" || id === "growth-title")
        await page
          .getByRole("button", { name: "확인했습니다", exact: true })
          .click();
      else await target.click();
      await page.waitForFunction(
        (old) =>
          !document.querySelector(".walkthrough-layer") ||
          document
            .querySelector(".walkthrough-layer")
            .getAttribute("data-tour-step") !== old,
        id,
      );
    }
    await page
      .getByRole("heading", { name: "잘하셨습니다!", exact: true })
      .waitFor();
    const practice = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("ecosnow-walkthrough-practice-v1")),
    );
    assert.equal(practice.works[0].stage, "기록 완료");
    assert.equal(practice.works[0].applications[0].kg, 2.5);
    assert.ok(practice.works.every((w) => w.demo));
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
      raw,
    );
    await page.getByRole("button", { name: "시작하기", exact: true }).click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
      raw,
    );
    assert.equal(
      await page.getByLabel("현재 기관").inputValue(),
      "ecosnow-demo-organization-v1",
    );
    // Exit, back, restart, and skipping never mutate real records.
    await page
      .getByRole("button", { name: "사용법 안내", exact: true })
      .click();
    await page.locator("[data-guide-ring]").waitFor();
    await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
    await page.getByRole("button", { name: "이전 단계", exact: true }).click();
    await page.locator("[data-guide-ring]").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".walkthrough-layer").count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
      raw,
    );
    await page.reload();
    await page
      .getByRole("button", { name: "사용법 안내", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "나중에 하기", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}px: ${seen.length} actual steps, input validation, actual saves and completion, target alignment, safe practice, replay/back/skip/exit, welcome persistence`,
    );
  } catch (e) {
    await page
      .screenshot({
        path: `outputs/walkthrough/failure-${width}.png`,
        fullPage: false,
      })
      .catch(() => {});
    console.log(
      "Failure step:",
      await page
        .locator(".walkthrough-layer")
        .getAttribute("data-tour-step")
        .catch(() => null),
    );
    console.log(
      "App status:",
      await page.getByRole("status").allTextContents(),
    );
    throw e;
  } finally {
    await context.close();
  }
}
try {
  for (const w of [1440, 768, 390, 360]) await run(w);
} finally {
  await browser.close();
}
