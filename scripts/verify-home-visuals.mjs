import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext();
await ctx.addInitScript(() =>
  localStorage.setItem("ecosnow-onboarding-v1", '{"status":"dismissed"}'),
);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5178/";
try {
  await mkdir("outputs/home-visuals", { recursive: true });
  await page.goto(url + "?demo=1");
  await page.locator(".usage-chart").waitFor();
  const before = await page.evaluate(() =>
    localStorage.getItem("ecosnow-admin-v1"),
  );
  await page.locator(".usage-chart [role=button]").first().focus();
  await page.keyboard.press("Enter");
  await page
    .locator(".trend-panel [role=status]")
    .filter({ hasText: /안내량.*실제/ })
    .waitFor();
  await page.locator(".zone-bar").first().click();
  assert.equal(
    await page.locator(".zone-bar").first().getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
    before,
  );
  for (const width of [1440, 1280, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `outputs/home-visuals/home-${width}.png`,
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${width}`,
    );
    for (const sel of [
      ".visual-kpis",
      ".usage-chart",
      ".donut-wrap",
      ".zone-chart",
    ]) {
      const r = await page.locator(sel).boundingBox();
      assert(
        r && r.x >= 0 && r.x + r.width <= width + 1,
        `${sel} clips at ${width}`,
      );
    }
  }
  await page
    .getByRole("button", { name: "조건 바꿔 살포량 예상", exact: true })
    .click();
  await page
    .locator("#demo-dosage")
    .getByRole("heading", {
      name: "현재 적설 기반 필요 살포량 예상",
      exact: true,
    })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Home graphs: interactive selection, no data mutation, five responsive widths, dosage link passed",
  );
  const fresh = await browser.newContext();
  const noWorks = JSON.parse(before);
  noWorks.works = [];
  noWorks.prior = [];
  await fresh.addInitScript(
    (d) => localStorage.setItem("ecosnow-admin-v1", JSON.stringify(d)),
    noWorks,
  );
  await fresh.addInitScript(() =>
    localStorage.setItem("ecosnow-onboarding-v1", '{"status":"dismissed"}'),
  );
  const empty = await fresh.newPage();
  await empty.goto(url);
  await empty.locator(".home-visuals").waitFor();
  assert.equal(await empty.locator(".usage-chart").count(), 0);
  await fresh.close();
} finally {
  await browser.close();
}
