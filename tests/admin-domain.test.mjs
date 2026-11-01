import assert from "node:assert/strict";
import test from "node:test";
import {
  stamp,
  blankObservation,
  calculate,
  transition,
  addApplication,
  emptyStore,
  defaultSettings,
  compare,
  actualUsage,
  validPolicy,
  unavailableAnalyzer,
  plannedReportAdapter,
} from "../app/admin/domain.ts";
const zone = () => ({
  ...stamp(),
  orgId: "a",
  name: "보행로",
  location: "학교",
  area: 120,
  boundary: "정문~본관",
  use: "보행로",
  features: "그늘",
  important: true,
  productId: "p",
});
const product = {
  ...stamp(),
  id: "p",
  orgId: "a",
  name: "EcoSnow",
  batch: "B1",
};
const criterion = () => ({
  ...stamp(),
  orgId: "a",
  productId: "p",
  rate: 20,
  source: "제품 기준 문서",
  verified: false,
  confirmedBy: "관리자",
  minTemp: -10,
  maxTemp: 2,
  maxDepth: 5,
  conditions: "현장 확인",
  removal: "일부 제거",
  surface: "적설",
});
const observation = () => ({
  ...blankObservation(),
  state: "적설",
  depth: "2",
  temperature: "-3",
  area: "120",
  removal: "일부 제거",
  capturedAt: "2025-12-10T09:00",
  manualReason: "사진 촬영 불가, 현장 측정",
  rangeConfirmed: true,
});
const work = () => ({
  ...stamp(),
  orgId: "a",
  zone: zone(),
  product,
  observation: observation(),
  calculation: null,
  stage: "작성 중",
  applications: [],
  followup: null,
  operator: "김 담당",
  note: "",
  demo: false,
  reportId: "",
  confirmedAt: null,
});
const app = (kg = 2) => ({
  id: crypto.randomUUID(),
  kg,
  area: 120,
  product,
  at: "2025-12-10T10:00",
  cost: null,
  note: "",
});

test("카메라·예측·AI 없이 P1 기록에서 작업 및 후속 완료까지", () => {
  let w = work();
  w = transition(w);
  assert.equal(w.stage, "현장 확인");
  w = addApplication(w, app());
  w = transition(w);
  assert.equal(w.stage, "작업 완료");
  w = transition(w);
  assert.equal(w.stage, "후속 확인 대기");
  assert.throws(() => transition(w), /후속/);
  w.followup = {
    photo: null,
    manualReason: "수동 확인",
    at: "2025-12-10T11:00",
    remaining: "잔설 있음, 효과 부족",
    removal: "추가 눈 제거",
    note: "후속 작업 예정",
  };
  w = transition(w);
  assert.equal(w.stage, "기록 완료");
  w = addApplication(w, { ...app(1), at: "2025-12-10T12:00" });
  assert.equal(w.stage, "후속 확인 대기");
  assert.equal(w.followup, null);
  assert.equal(actualUsage([w, w], "a", "2025-12-01", "2025-12-31").kg, 3);
});
test("g/kg 산술, 기준·입력 누락, 적용 범위와 다른 기관 기준", () => {
  const z = zone(),
    c = criterion(),
    o = observation();
  assert.equal(calculate(z, product, c, o).kg, 2.4);
  assert.equal(calculate(z, product, c, o).label, "관리자 입력 기준 계산");
  assert.equal(calculate(z, product, null, o).status, "criterion_required");
  for (const field of [
    "depth",
    "temperature",
    "area",
    "capturedAt",
    "removal",
    "state",
  ])
    assert.equal(calculate(z, product, c, { ...o, [field]: "" }).kg, null);
  assert.equal(calculate(z, product, c, { ...o, area: "121" }).status, "held");
  assert.equal(
    calculate(z, product, c, { ...o, temperature: "-11" }).status,
    "held",
  );
  assert.equal(calculate(z, product, { ...c, orgId: "b" }, o).kg, null);
  assert.equal(
    calculate(z, product, c, { ...o, source: "데모" }).label,
    "데모 계산",
  );
  for (const area of ["-1", "0", "Infinity", "NaN", "1e309"])
    assert.equal(calculate(z, product, c, { ...o, area }).kg, null);
  assert.equal(calculate(z, product, c, { ...o, depth: "0" }).kg, 2.4); // actual criterion controls application, no invented depth coefficient
});
test("기록 스냅샷과 구역 전환의 새 관찰값, 안내와 실제 분리", () => {
  const w = work(),
    z = zone();
  w.zone = structuredClone(z);
  w.calculation = calculate(z, product, criterion(), w.observation);
  z.area = 500;
  assert.equal(w.zone.area, 120);
  assert.equal(blankObservation().area, "");
  const applied = addApplication(transition(w), app(3));
  assert.equal(applied.calculation.kg, 2.4);
  assert.equal(actualUsage([applied], "a", "2025-12-01", "2025-12-31").kg, 3);
  assert.throws(() => addApplication(applied, applied.applications[0]), /중복/);
  assert.throws(() => addApplication(applied, app(-1)), /사용량/);
  assert.throws(
    () =>
      addApplication(applied, {
        ...app(),
        product: { ...product, orgId: "b" },
      }),
    /다른 기관/,
  );
});
test("삭제·정정·기관·데모 분리와 비용 누락", () => {
  const w = addApplication(transition(work()), app(2));
  assert.equal(actualUsage([w], "a", "2025-12-01", "2025-12-31").cost, null);
  assert.equal(
    actualUsage([{ ...w, demo: true }], "a", "2025-12-01", "2025-12-31").kg,
    null,
  );
  assert.equal(actualUsage([w], "b", "2025-12-01", "2025-12-31").kg, null);
  assert.equal(actualUsage([], "a", "2025-12-01", "2025-12-31").kg, null);
  const edited = {
    ...w,
    applications: [{ ...w.applications[0], kg: 4, cost: 100 }],
  };
  assert.equal(actualUsage([edited], "a", "2025-12-01", "2025-12-31").kg, 4);
  assert.equal(
    actualUsage([edited], "a", "2025-12-01", "2025-12-31").cost,
    100,
  );
});
function reportStore() {
  const d = emptyStore();
  const w = addApplication(transition(work()), app(12));
  w.stage = "기록 완료";
  d.works = [w];
  d.zones = [w.zone];
  d.settings.a = defaultSettings();
  d.settings.a.season = {
    name: "2025",
    start: "2025-12-01",
    end: "2025-12-31",
    priorStart: "2024-12-01",
    priorEnd: "2024-12-31",
    ended: true,
    comparable: true,
    complete: true,
    necessaryWorkConfirmed: true,
  };
  d.prior = [
    {
      ...stamp(),
      orgId: "a",
      zoneId: w.zone.id,
      season: "2024",
      area: 120,
      start: "2024-12-01",
      end: "2024-12-31",
      kg: 10,
      cost: null,
      source: "사용 원장",
      verified: true,
    },
  ];
  return d;
}
test("전년 없거나 0이면 비율 없음, 증가량과 음수 절감률 표시", () => {
  const d = reportStore();
  let r = compare(d, "a", "2026-01-02");
  assert.equal(r.delta, 2);
  assert.equal(r.savings, -20);
  assert.equal(r.stage, null);
  assert.ok(r.reasons.includes("보상 정책 기준 확정 예정"));
  d.prior[0].kg = 0;
  assert.equal(compare(d, "a").savings, null);
  d.prior = [];
  assert.equal(compare(d, "a").savings, null);
});
test("시즌·면적·정책 미확정 평가 보류, 합당할 때만 4단계 가능", () => {
  const d = reportStore();
  d.settings.a.policy = {
    finalized: true,
    thresholds: [1, 2, 3, 4],
    discounts: [0, 0, 0, 0],
  }; // test fixtures, not default policy
  assert.equal(validPolicy(d.settings.a.policy), true);
  d.works[0].applications[0].kg = 9;
  assert.equal(compare(d, "a", "2026-01-02").stage, 4);
  assert.equal(compare(d, "a", "2025-12-20").stage, null);
  d.zones[0] = { ...d.zones[0], area: 200 };
  assert.ok(
    compare(d, "a", "2026-01-02").reasons.includes("비교 구역·면적 불일치"),
  );
  d.settings.a.policy.thresholds = [null, null, null, null];
  assert.equal(compare(d, "a", "2026-01-02").stage, null);
});
test("AI와 제보는 미연결이며 수동 입력으로 계속 가능", async () => {
  const r = await unavailableAnalyzer.analyze(
    { id: "p", name: "눈", capturedAt: "" },
    zone(),
  );
  assert.equal(r.status, "unavailable");
  assert.equal(r.humanConfirmed, false);
  assert.deepEqual(r.observations, []);
  assert.equal(plannedReportAdapter.connected, false);
});

test("계산 범위 초과와 시간 역전은 보류·차단", () => {
  assert.equal(
    calculate(zone(), product, { ...criterion(), rate: 1e308 }, observation())
      .kg,
    null,
  );
  assert.throws(
    () =>
      addApplication(transition(work()), { ...app(), at: "2025-12-10T08:00" }),
    /시각/,
  );
  assert.throws(
    () => addApplication(transition(work()), { ...app(), kg: 1e308 }),
    /범위/,
  );
});
