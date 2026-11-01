const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const panel = (title) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
async function nav(name) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
await page.goto(process.env.ADMIN_TEST_URL || "http://127.0.0.1:5173/");
await page.getByText("저장 준비 완료", { exact: false }).waitFor();
await page.getByLabel("기관명", { exact: true }).fill("테스트 학교");
await page.getByLabel("관리자", { exact: true }).fill("담당자");
await page.getByRole("button", { name: "기관 등록", exact: true }).click();
await nav("기관 설정");
let p = panel("제품·제조 배치 관리");
await p.getByLabel("제품명").fill("에코스노우");
await p.getByLabel("제조 배치").fill("B1");
await p.getByRole("button", { name: "제품 등록" }).click();
await nav("관리 구역");
p = panel("관리 구역 등록");
await p.getByLabel("구역명", { exact: true }).fill("정문");
await p.getByLabel("위치", { exact: true }).fill("학교 정문");
await p.getByLabel("관리 면적").fill("120");
await p.getByLabel("경계·촬영 범위").fill("문 앞 12×10m");
await p.getByLabel("용도").fill("보행로");
await p.getByLabel("기본 제품").selectOption({ label: "에코스노우 · B1" });
await p.getByRole("button", { name: "구역 저장" }).click();
await panel("등록 구역").getByRole("button", { name: "기록 시작" }).click();
await page.getByLabel("눈·얼음 상태", { exact: true }).selectOption("적설");
await page
  .getByLabel("사전 눈 제거", { exact: true })
  .selectOption("일부 제거");
await page.getByLabel("실측 적설 깊이").fill("2");
await page
  .getByLabel("실제 처리 면적 (㎡)", { exact: true })
  .first()
  .fill("120");
await page.getByLabel("노면 온도").fill("-3");
await page.getByLabel("관찰·촬영 시각").fill("2025-12-10T09:00");
await page.getByLabel("사진 없이 수동 기록하는 사유").fill("직접 측정");
await page.getByLabel("사진·수동 관찰 범위").check();
await page.getByRole("button", { name: "입력 확인·산정" }).click();
await page
  .getByRole("heading", { name: "적용 기준 확인 필요", exact: true })
  .waitFor();
await nav("기관 설정");
p = panel("제품 적용 기준 관리");
await p.getByLabel("적용 제품·배치").selectOption({ label: "에코스노우 · B1" });
for (const [label, value] of [
  ["적용 기준 (g/㎡)", "20"],
  ["출처 문서·버전·페이지 또는 URL", "담당자 확인 문서"],
  ["자료 확인 담당자", "담당자"],
  ["노면 온도 최저 (℃)", "-10"],
  ["노면 온도 최고 (℃)", "2"],
  ["허용 최대 적설 깊이 (cm)", "5"],
  ["기타 적용 조건·불확실성 (작업 시 확인)", "현장 담당자 최종 확인"],
])
  await p.getByLabel(label, { exact: true }).fill(value);
await p.getByLabel("사전 제설 조건").selectOption("일부 제거");
await p.getByLabel("눈·얼음 상태 조건").selectOption("적설");
await p.getByRole("button", { name: "기준 저장", exact: true }).click();
await nav("현장 확인·정량 살포");
await page.getByLabel("제품별 적용 기준").selectOption({ index: 1 });
await page.getByRole("button", { name: "입력 확인·산정" }).click();
await page
  .getByRole("heading", { name: "관리자 입력 기준 계산", exact: true })
  .waitFor();
assert.match(await page.locator(".calculation").innerText(), /2.4 kg/);
await page
  .getByLabel("사진 등록 (선택, 이미지 8MB 이하)", { exact: true })
  .setInputFiles({
    name: "현장.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
await page
  .getByRole("button", { name: "사진 보기: 현장.png", exact: true })
  .waitFor();
await page
  .getByRole("button", { name: "사진 분석 가능 여부 확인", exact: true })
  .click();
await page.getByText("사진 분석 모델 미연결.", { exact: false }).waitFor();
await page.getByRole("button", { name: "입력 확인·산정" }).click();
await page.getByRole("button", { name: "다음 상태로 진행" }).click();
p = panel("3. 실제 작업·추가 살포");
await p.getByLabel("실제 사용량").fill("2.5");
await p.getByLabel("작업 시각", { exact: true }).fill("2025-12-10T10:00");
await p.getByRole("button", { name: "실제 사용 기록 추가" }).click();
await page.getByRole("button", { name: "다음 상태로 진행" }).click();
await page.getByRole("button", { name: "다음 상태로 진행" }).click();
p = panel("4. 후속 확인");
await p.getByLabel("확인·촬영 시각").fill("2025-12-10T11:00");
await p.getByLabel("남은 눈").fill("그늘 잔설, 효과 부족");
await p.getByLabel("추가 눈 제거 여부").fill("삽으로 추가 제거");
await p.getByLabel("후속 사진이 없는").fill("육안 확인");
await p.getByRole("button", { name: "후속 관찰 저장" }).click();
await page.getByRole("button", { name: "다음 상태로 진행" }).click();
await nav("작업 이력");
assert.match(await panel("작업 이력").innerText(), /기록 완료/);
assert.match(await panel("작업 이력").innerText(), /2.5 kg/);
await page.reload();
await page.getByRole("heading", { name: "홈 대시보드", exact: true }).waitFor();
await nav("작업 이력");
assert.match(await panel("작업 이력").innerText(), /2.5 kg/);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "/tmp/ecosnow-admin-work-mobile.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1280, height: 900 });
await page.screenshot({
  path: "/tmp/ecosnow-admin-desktop.png",
  fullPage: true,
});
await nav("기관 설정");
p = panel("기관·관리자 등록");
await p.getByLabel("기관명", { exact: true }).fill("다른 기관");
await p.getByLabel("관리자", { exact: true }).fill("다른 담당자");
await p.getByRole("button", { name: "기관 등록", exact: true }).click();
await nav("작업 이력");
assert.match(await panel("작업 이력").innerText(), /자료 없음/);
assert.doesNotMatch(await panel("작업 이력").innerText(), /2.5 kg/);
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
await page.screenshot({
  path: "/tmp/ecosnow-admin-mobile.png",
  fullPage: true,
});
assert.deepEqual(errors, []);
console.log(
  "PASS: criterion calculation, IndexedDB photo, unavailable AI fallback, zone without CCTV, manual fallback, held calculation, actual application, all five states, reload persistence, organization isolation, mobile width, no JS errors",
);
const broken = await browser.newContext();
const bp = await broken.newPage();
await bp.goto(process.env.ADMIN_TEST_URL || "http://127.0.0.1:5173/");
await bp.evaluate(() => localStorage.setItem("ecosnow-admin-v1", "{broken"));
await bp.reload();
await bp.getByRole("status").filter({ hasText: "SyntaxError" }).waitFor();
assert.equal(
  await bp.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
  "{broken",
);
const quota = await browser.newContext();
await quota.addInitScript(() => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === "ecosnow-admin-v1")
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    return original.call(this, key, value);
  };
});
const qp = await quota.newPage();
await qp.goto(process.env.ADMIN_TEST_URL || "http://127.0.0.1:5173/");
await qp.getByText("저장 준비 완료", { exact: false }).waitFor();
await qp.getByLabel("기관명", { exact: true }).fill("저장 실패 검사");
await qp.getByLabel("관리자", { exact: true }).fill("담당");
await qp.getByRole("button", { name: "기관 등록", exact: true }).click();
await qp.getByRole("status").filter({ hasText: "저장 실패" }).waitFor();
assert.equal(
  await qp.evaluate(() => localStorage.getItem("ecosnow-admin-v1")),
  null,
);
console.log(
  "PASS: corrupt data preserved; storage quota failure does not falsely report success",
);
await browser.close();
