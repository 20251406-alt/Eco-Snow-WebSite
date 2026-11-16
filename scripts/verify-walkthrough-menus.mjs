import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
await ctx.addInitScript(() =>
  localStorage.setItem("ecosnow-onboarding-v1", '{"status":"dismissed"}'),
);
const p = await ctx.newPage();
p.setDefaultTimeout(10000);
const url = process.env.ADMIN_TEST_URL || "http://127.0.0.1:5174/";
const values = {
  "application-time": "2026-01-15T10:00",
  "followup-time": "2026-01-15T11:00",
  "zone-name": "연습 구역",
  "zone-location": "가상 위치",
  "zone-area": "120",
  "zone-boundary": "가상 A~B",
  "zone-use": "보행로",
  "observation-depth": "2",
  "observation-area": "120",
  "observation-temperature": "-3",
  "observation-time": "2026-01-15T09:00",
  "observation-manual": "연습 수동 관찰",
  "application-kg": "2.5",
  "followup-remaining": "잔설 일부",
  "followup-removal": "삽 사용",
  "followup-manual": "수동 확인",
  "product-name": "연습 제품",
  "product-batch": "PRACTICE-02",
};
try {
  await p.goto(url + "?demo=1");
  await p.getByRole("button", { name: "사용법 안내", exact: true }).waitFor();
  const raw = await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1"));
  for (const menu of [
    "관리 구역",
    "현장 확인·정량 살포",
    "작업 이력",
    "절약 리포트",
    "기관 성장·보상",
    "요금제·구독",
    "기관 설정",
  ]) {
    await p
      .getByRole("navigation")
      .getByRole("button", { name: menu, exact: true })
      .click();
    await p
      .getByRole("button", { name: "이 기능 사용법 배우기", exact: true })
      .click();
    let count = 0;
    for (; count < 40; count++) {
      if (
        await p
          .getByRole("heading", { name: "잘하셨습니다!", exact: true })
          .isVisible()
      )
        break;
      await p.locator("[data-guide-ring]").waitFor();
      const layer = p.locator(".walkthrough-layer");
      const id = await layer.getAttribute("data-tour-step");
      const target = p
        .locator(
          `[data-guide="${id === "finish-work" ? "followup-next" : id}"]:visible`,
        )
        .first();
      await target.waitFor();
      if (values[id]) {
        await target.locator("input,textarea").fill(values[id]);
        await p.getByRole("button", { name: "입력 확인", exact: true }).click();
      } else if (id === "observation-state")
        await target.locator("select").selectOption("적설");
      else if (id === "observation-removal")
        await target.locator("select").selectOption("일부 제거");
      else if (id === "observation-range")
        await target.locator("input").check();
      else if (id === "criterion-select")
        await target.locator("select").selectOption({ index: 1 });
      else if (["report-title", "growth-title"].includes(id))
        await p
          .getByRole("button", { name: "확인했습니다", exact: true })
          .click();
      else await target.click();
      await p.waitForFunction(
        (old) =>
          !document.querySelector(".walkthrough-layer") ||
          document.querySelector(".walkthrough-layer").dataset.tourStep !== old,
        id,
      );
    }
    await p
      .getByRole("heading", { name: "잘하셨습니다!", exact: true })
      .waitFor();
    assert.equal(
      JSON.parse(
        await p.evaluate(() => localStorage.getItem("ecosnow-onboarding-v1")),
      ).status,
      "completed",
    );
    await p.getByRole("button", { name: "시작하기", exact: true }).click();
    assert.equal(
      await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
      raw,
    );
    console.log("PASS module", menu, count);
  }
  await p
    .getByRole("navigation")
    .getByRole("button", { name: "기관 설정", exact: true })
    .click();
  await p
    .getByRole("group", { name: "기관 설정 분류" })
    .getByRole("button", { name: "제품·제조 배치", exact: true })
    .click();
  await p.getByLabel("제품명", { exact: true }).fill("저장 전 원래 작성 내용");
  await p
    .getByRole("button", { name: "이 기능 사용법 배우기", exact: true })
    .click();
  await p.locator("[data-guide-ring]").waitFor();
  await p.setViewportSize({ width: 390, height: 650 });
  await p.waitForFunction(() =>
    document.querySelector(".sidebar").classList.contains("drawer-open"),
  );
  await p.waitForFunction(() => {
    const a = document
      .querySelector('[data-guide="nav-7"]')
      .getBoundingClientRect();
    return a.left >= 0 && a.right <= innerWidth;
  });
  await p.keyboard.press("Escape");
  assert.equal(
    await p.getByLabel("제품명", { exact: true }).inputValue(),
    "저장 전 원래 작성 내용",
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
    raw,
  );
  console.log("PASS resize navigation and restore unsaved real form");
  await p.setViewportSize({ width: 1440, height: 900 });
  await p
    .getByRole("navigation")
    .getByRole("button", { name: "관리 구역", exact: true })
    .click();
  await p
    .locator(".list-row")
    .first()
    .getByRole("button", { name: "수정", exact: true })
    .click();
  await p.getByLabel("구역명", { exact: true }).fill("저장 전 구역 수정 내용");
  await p
    .getByRole("button", { name: "이 기능 사용법 배우기", exact: true })
    .click();
  await p.locator("[data-guide-ring]").waitFor();
  await p.keyboard.press("Escape");
  await p
    .getByRole("heading", { name: "관리 구역 수정", exact: true })
    .waitFor();
  assert.equal(
    await p.getByLabel("구역명", { exact: true }).inputValue(),
    "저장 전 구역 수정 내용",
  );
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
    raw,
  );
  await p.getByRole("button", { name: "사용법 안내", exact: true }).click();
  await p.locator("[data-guide-ring]").waitFor();
  const external = await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ecosnow-admin-v1"));
    d.audit.push({
      at: new Date().toISOString(),
      orgId: d.organizations[0].id,
      action: "테스트 다른 탭 변경",
    });
    const raw = JSON.stringify(d);
    localStorage.setItem("ecosnow-admin-v1", raw);
    return raw;
  });
  await p.keyboard.press("Escape");
  await p.getByRole("status").filter({ hasText: "다른 탭" }).waitFor();
  await p.getByRole("button", { name: "구역 저장", exact: true }).click();
  await p.getByRole("status").filter({ hasText: "저장 실패" }).waitFor();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
    external,
  );
  console.log(
    "PASS editing-zone identity restored and concurrent real-data overwrite blocked",
  );
} finally {
  await browser.close();
}
