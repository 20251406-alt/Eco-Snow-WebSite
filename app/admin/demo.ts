import { blankObservation, calculate, defaultSettings, now, stamp, type Store, type Work, type Zone, type Product, type Criterion } from "./domain";

export const DEMO_ORG_ID = "ecosnow-demo-organization-v1";
/** Add once; never overwrite user edits or existing organizations. */
export function withDemo(store: Store): Store {
  if (store.organizations.some((o) => o.id === DEMO_ORG_ID)) return completeDemo(store);
  const orgId = DEMO_ORG_ID;
  const product: Product = { ...stamp(), orgId, name: "[데모] 에코스노우", batch: "DEMO-BATCH-01" };
  const zone: Zone = { ...stamp(), orgId, name: "[데모] 학교 정문 보행로", location: "가상 학교 정문~본관", area: 120, boundary: "가상의 12m × 10m 구간", use: "보행로", features: "일부 그늘 · 보도블록", important: true, productId: product.id };
  const second: Zone = { ...zone, ...stamp(), name: "[데모] 주차장 진입로", area: 200, boundary: "가상의 20m × 10m 구간", use: "진입로", features: "완만한 경사 · 아스팔트", important: false };
  const criterion: Criterion = { ...stamp(), orgId, productId: product.id, rate: 20, source: "데모 산술 확인용 가상 기준 (실제 제품 적용 금지)", verified: false, confirmedBy: "데모 담당자", minTemp: -10, maxTemp: 2, maxDepth: 5, conditions: "20 g/㎡는 기능 시험용 임의 값이며, 검증된 권장량이 아닙니다.", removal: "일부 제거", surface: "적설" };
  const observation = { ...blankObservation(), state: "적설", depth: "2", temperature: "-3", area: "120", removal: "일부 제거", source: "데모" as const, manualReason: "가상 현장 시나리오. 실제 사진·실측 자료 없음", capturedAt: "2026-01-15T09:00", rangeConfirmed: true };
  const completed: Work = { ...stamp(), orgId, zone: structuredClone(zone), product: structuredClone(product), observation, calculation: calculate(zone,product,criterion,observation), stage: "기록 완료", applications: [{ id: stamp().id, product: structuredClone(product), kg: 2.5, area: 120, at: "2026-01-15T09:30", cost: 7500, note: "데모 최초 살포" }, { id: stamp().id, product: structuredClone(product), kg: 0.5, area: 30, at: "2026-01-15T10:00", cost: 1500, note: "데모 그늘 구간 추가 살포" }], followup: { photo: null, manualReason: "데모 수동 확인", at: "2026-01-15T10:30", remaining: "그늘 구간에 잔설 일부 남음", removal: "삽으로 추가 제거", note: "효과 부족도 기록하는 예시" }, operator: "데모 담당자", note: "산정 2.4 kg / 실제 총 3 kg을 비교해 보세요. 실제 실적에서 제외됩니다.", demo: true, reportId: "", confirmedAt: now() };
  const draft: Work = { ...completed, ...stamp(), zone: structuredClone(second), observation: { ...blankObservation(), area: "200", source: "데모", manualReason: "나머지 관찰값을 입력해 보세요." }, calculation: null, stage: "작성 중", applications: [], followup: null, note: "작성 중 예시입니다. 빈 정보를 채우고 산정·상태 전환을 시험하세요.", confirmedAt: null };
  const settings = defaultSettings();
  settings.season = { ...settings.season, name: "[데모] 2025–2026 겨울", start: "2025-12-01", end: "2026-03-31", priorStart: "2024-12-01", priorEnd: "2025-03-31" };
  return completeDemo({ ...store, organizations: [...store.organizations, { ...stamp(), id: orgId, name: "[데모] 에코스노우 체험 학교", administrator: "데모 담당자" }], zones: [...store.zones, zone, second], products: [...store.products, product], criteria: [...store.criteria, criterion], works: [...store.works,completed,draft], settings: { ...store.settings,[orgId]:settings }, reports: [...store.reports, { ...stamp(), orgId, zoneId: second.id, occurredAt: "2026-01-15T08:30", receivedAt: "2026-01-15T08:35", location: "가상 주차장 입구", content: "주차장 진입로에 눈이 남아 있습니다 (데모)", source: "가상 제보 · 티맵 연동 아님", status: "확인 요청", demo: true }], audit: [...store.audit,{ at: now(), orgId, action: "별도 기관에 데모 데이터 추가 (실적 제외)" }] });
}


function completeDemo(store: Store): Store {
  const marker = "데모 예시 전체 채움 v2";
  if (store.audit.some((a) => a.orgId === DEMO_ORG_ID && a.action === marker)) return store;
  const orgId = DEMO_ORG_ID;
  const criteria = store.criteria.find((c) => c.orgId === orgId);
  const works = store.works.map((w) => {
    if(w.orgId !== orgId || !w.demo) return w;
    const observation = { ...w.observation, state:w.observation.state || "적설", depth:w.observation.depth || "2", temperature:w.observation.temperature || "-3", removal:w.observation.removal || "일부 제거", capturedAt:w.observation.capturedAt || "2026-01-15T09:00", rangeConfirmed:true, before:w.observation.before || {id:"ecosnow-demo-before",name:"데모 사용 전 도식.svg",capturedAt:"2026-01-15T09:00"} };
    const followup = w.followup || {photo:null,manualReason:"데모 수동 관찰",at:"2026-01-15T10:30",remaining:"일부 잔설, 추가 눈 제거 필요",removal:"삽으로 잔설 제거",note:"실제 관찰이 아닌 시험용 예시"};
    return {...w,observation,calculation:w.calculation || calculate(w.zone,w.product,criteria || null,observation),applications:w.applications.length?w.applications:[{id:stamp().id,product:w.product!,kg:4,area:200,at:"2026-01-15T09:30",cost:12000,note:"데모 진입로 살포"}],followup:{...followup,photo:followup.photo || {id:"ecosnow-demo-after",name:"데모 사용 후 도식.svg",capturedAt:followup.at}},stage:w.stage === "작성 중" ? "후속 확인 대기" as const : w.stage,reportId:w.reportId || store.reports.find((r)=>r.orgId===orgId&&r.zoneId===w.zone.id)?.id || "",note:w.note + " · 전체 예시 입력 완료"};
  });
  const setting = store.settings[orgId] || defaultSettings();
  return {...store,works,settings:{...store.settings,[orgId]:{...setting,policy:{...setting.policy,thresholds:setting.policy.thresholds.map((v,i)=>v ?? [5,10,20,30][i]),discounts:setting.policy.discounts.map((v,i)=>v ?? [1,2,3,5][i]),finalized:false}}},prior:[...store.prior,...store.zones.filter((z)=>z.orgId===orgId&&!store.prior.some((p)=>p.orgId===orgId&&p.zoneId===z.id)).map((z,i)=>({...stamp(),orgId,zoneId:z.id,area:z.area,season:"[데모] 2024–2025 겨울",start:"2024-12-01",end:"2025-03-31",kg:i===0?4:6,cost:i===0?12000:18000,source:"가상 사용 원장 · 실제 자료 아님",verified:false,demo:true}))],audit:[...store.audit,{at:now(),orgId,action:marker}]};
}
