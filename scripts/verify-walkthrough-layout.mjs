import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
await mkdir("outputs/walkthrough-layout", { recursive: true });
try {
  for (const [width, height, scale] of [
    [1363, 688, 1],
    [1536, 600, 1],
    [768, 500, 1],
    [390, 640, 1],
    [360, 480, 1],
    [1363, 688, 1.25],
  ]) {
    const ctx = await b.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(12000);
    await p.goto(process.env.ADMIN_TEST_URL || "http://127.0.0.1:5174/");
    await p.getByRole("button", { name: "사용법 배우기", exact: true }).click();
    await p.locator('[data-guide="nav-1"]').click();
    await p.locator('.walkthrough-layer[data-tour-step="zone-name"]').waitFor();
    await p.getByRole("button", { name: "입력 확인", exact: true }).click();
    await p.locator(".guide-validation").waitFor();
    if (scale !== 1) {
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("Emulation.setPageScaleFactor", {
        pageScaleFactor: scale,
      });
    }
    const check = async () => {
      await p.waitForFunction(() => {
        const input = document.querySelector('[data-guide="zone-name"] input'),
          ring = document.querySelector("[data-guide-ring]"),
          card = document.querySelector(".guide-coach");
        if (!input || !ring || !card) return false;
        const a = input.getBoundingClientRect(),
          r = ring.getBoundingClientRect(),
          c = card.getBoundingClientRect(),
          v = visualViewport;
        const top = v?.offsetTop || 0,
          left = v?.offsetLeft || 0,
          w = v?.width || innerWidth,
          h = v?.height || innerHeight;
        const overlap =
          Math.max(0, Math.min(r.right, c.right) - Math.max(r.left, c.left)) *
          Math.max(0, Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top));
        const buttons = [
          ...card.querySelectorAll(".guide-actions button"),
        ].every((x) => {
          const t = x.getBoundingClientRect();
          return (
            t.top >= c.top &&
            t.bottom <= c.bottom + 1 &&
            t.top >= top &&
            t.bottom <= top + h
          );
        });
        return (
          Math.abs(r.left - (a.left - 6)) < 2 &&
          Math.abs(r.top - (a.top - 6)) < 2 &&
          a.bottom <= top + h &&
          a.top >= top &&
          c.top >= top &&
          c.bottom <= top + h &&
          c.left >= left &&
          c.right <= left + w + 1 &&
          overlap === 0 &&
          buttons
        );
      });
    };
    await check();
    await p.locator('[data-guide="zone-name"] input').fill("안녕");
    await p.locator(".guide-validation").waitFor({ state: "detached" });
    await check();
    await p.evaluate(() => window.scrollBy(0, 65));
    await check();
    await p.screenshot({
      path: `outputs/walkthrough-layout/fixed-${width}x${height}-${scale}.png`,
    });
    await p.setViewportSize({
      width: Math.max(360, width - 80),
      height: height - 60,
    });
    await check();
    console.log(
      `PASS ${width}x${height} scale=${scale}: exact input spotlight, coach/buttons fully visible, no overlap, stale error cleared, scroll/resize`,
    );
    await ctx.close();
  }
} finally {
  await b.close();
}
