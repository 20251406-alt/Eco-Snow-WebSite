import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const portal = process.env.ADMIN_TEST_URL || "http://localhost:5193";
const driver = process.env.REPORT_TEST_URL || "http://localhost:5180";
try {
  const staff = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const citizen = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await staff.addInitScript(() =>
    localStorage.setItem("ecosnow-onboarding-v1", '{"status":"dismissed"}'),
  );
  await citizen.goto(driver);
  assert.equal(new URL(citizen.url()).pathname, "/");
  await citizen.getByRole("checkbox").check();
  await citizen.getByRole("button", { name: "익명으로 시작하기" }).click();
  await citizen.getByRole("navigation", { name: "사용자 메뉴" }).waitFor();
  assert.equal(
    await citizen.getByRole("link", { name: "관리자 로그인" }).count(),
    0,
  );
  const submit = await citizen.evaluate(async () => {
    const snapshot = await fetch("/api/snapshot").then((r) => r.json());
    const response = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        request_id: crypto.randomUUID(),
        region_id: snapshot.regions[0].id,
        type: "snow",
        answer: true,
        method: "manual",
        simulation: true,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    return { ...(await response.json()), name: snapshot.regions[0].name };
  });
  await staff.goto(portal + "/?demo=1&tab=reports");
  const nav = staff.getByRole("navigation", { name: "관리자 메뉴" });
  assert.equal(await nav.getByRole("button").count(), 6);
  assert.equal(await staff.locator("iframe").count(), 0);
  await staff.getByRole("button", { name: "공유 제보 로그인" }).click();
  await staff.getByRole("heading", { name: "기관 관리자 로그인" }).waitFor();
  await staff.getByLabel("이메일", { exact: true }).fill("local@ecosnow.test");
  await staff
    .getByLabel("비밀번호", { exact: true })
    .fill(process.env.LOCAL_ADMIN_PASSWORD || "local-demo-only");
  await staff.getByRole("button", { name: "로그인", exact: true }).click();
  await staff
    .locator(".native-report-list")
    .getByRole("button", { name: new RegExp(submit.name) })
    .first()
    .click();
  await staff
    .getByLabel("검토 메모")
    .fill("기관용 네이티브 지도 E2E 시연 테스트");
  await staff.getByRole("button", { name: "승인", exact: true }).click();
  await staff
    .getByText(/· 승인 완료/)
    .first()
    .waitFor();
  await citizen
    .getByRole("navigation")
    .getByRole("button", { name: "보상", exact: true })
    .click();
  await citizen
    .getByRole("button", { name: /캐시 상자.*개봉/ })
    .first()
    .waitFor();
  await citizen
    .getByRole("region", { name: "나의 제보 성장" })
    .getByText(/승인 제보 1건/)
    .waitFor();
  await citizen.reload();
  await citizen
    .getByRole("region", { name: "나의 제보 성장" })
    .getByText(/승인 제보 1건/)
    .waitFor();
  const after = await citizen.evaluate(() =>
    fetch("/api/snapshot").then((r) => r.json()),
  );
  assert.equal(
    after.reports.find((r) => r.id === submit.id)?.status,
    "approved",
  );
  assert.equal(after.boxes.length, 1);
  const approvedId = submit.id;
  const blocked = await citizen.evaluate(async (id) => {
    const result = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review",
        id,
        status: "approved",
        note: "권한 확인",
      }),
    });
    return result.status;
  }, approvedId);
  assert.equal(blocked, 400);
  await staff.reload();
  await staff.getByRole("button", { name: "로그아웃" }).waitFor();
  await nav.getByRole("button", { name: "홈", exact: true }).click();
  assert.equal(await staff.locator(".native-kpis article").count(), 4);
  await mkdir("outputs/native-reports", { recursive: true });
  await staff.screenshot({
    path: "outputs/native-reports/institution.png",
    fullPage: true,
  });
  await citizen.screenshot({
    path: "outputs/native-reports/driver.png",
    fullPage: true,
  });
  for (const page of [staff, citizen])
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  console.log(
    "PASS driver root, 6-menu native map without iframe, institution auth and approval, citizen reward and growth, persisted sessions, access denial, and layout",
  );
} finally {
  await browser.close();
}
