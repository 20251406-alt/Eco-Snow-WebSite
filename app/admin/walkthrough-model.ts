import {
  blankObservation,
  calculate,
  defaultSettings,
  emptyStore,
  now,
  stamp,
  type Store,
  type Work,
  type Zone,
  type Product,
  type Criterion,
} from "./domain";
export const GUIDE_KEY = "ecosnow-onboarding-v1";
export const PRACTICE_KEY = "ecosnow-walkthrough-practice-v1";
export const PRACTICE_ORG = "ecosnow-walkthrough-practice";
export type GuideSnapshot = {
  data: Store;
  view: number;
  work?: Work;
  fieldStep: number;
  settingGroup: number;
};
export type GuideStep = {
  id: string;
  target: string;
  title: string;
  description: string;
  action: string;
  view: number;
  phase?: number;
  setting?: number;
  kind: "click" | "input" | "change" | "read";
  complete?: (s: GuideSnapshot) => boolean;
  validate?: (el: HTMLElement) => boolean;
  navigation?: boolean;
};
const query = (id: string) => `[data-guide="${id}"]`;
const nav = (view: number, title: string, description: string): GuideStep => ({
  id: `nav-${view}`,
  target: query(`nav-${view}`),
  title,
  description,
  action: "강조된 메뉴를 직접 클릭하세요.",
  view,
  navigation: true,
  kind: "click",
  complete: (s) => s.view === view,
});
const input = (
  id: string,
  label: string,
  description: string,
  view: number,
  phase?: number,
): GuideStep => ({
  id,
  target: query(id),
  title: label,
  description,
  action: "실제 입력칸을 채운 뒤 ‘입력 확인’을 누르세요.",
  view,
  phase,
  kind: "input",
  validate: (el) => {
    const field = (
      el.matches("input,textarea") ? el : el.querySelector("input,textarea")
    ) as HTMLInputElement | null;
    if (!field?.value.trim() || !field.checkValidity()) return false;
    if (["zone-area", "observation-area", "application-kg"].includes(id))
      return Number.isFinite(Number(field.value)) && Number(field.value) > 0;
    return true;
  },
});
const change = (
  id: string,
  title: string,
  description: string,
  view: number,
  phase?: number,
): GuideStep => ({
  id,
  target: query(id),
  title,
  description,
  action: "강조된 선택 항목을 직접 바꾸세요.",
  view,
  phase,
  kind: "change",
  validate: (el) => {
    const field = (
      el.matches("input,select") ? el : el.querySelector("input,select")
    ) as HTMLInputElement | HTMLSelectElement | null;
    return field?.type === "checkbox"
      ? (field as HTMLInputElement).checked
      : Boolean(field?.value);
  },
});
const click = (
  id: string,
  title: string,
  description: string,
  view: number,
  complete: GuideStep["complete"],
  phase?: number,
): GuideStep => ({
  id,
  target: query(id),
  title,
  description,
  action: "강조된 버튼을 직접 클릭하세요. 저장이 성공해야 진행됩니다.",
  view,
  phase,
  kind: "click",
  complete,
});
const read = (
  id: string,
  title: string,
  description: string,
  view: number,
): GuideStep => ({
  id,
  target: query(id),
  title,
  description,
  action: "화면의 실제 결과를 확인한 뒤 ‘확인했습니다’를 누르세요.",
  view,
  kind: "read",
});
export function guideSteps(menu = -1): GuideStep[] {
  const zones: GuideStep[] = [
    nav(
      1,
      "관리 구역 열기",
      "카메라 없이 기관의 관리 구역을 등록할 수 있습니다.",
    ),
    input(
      "zone-name",
      "구역명 입력",
      "예: 연습 정문 보행로. 이 입력은 연습 저장소에만 기록됩니다.",
      1,
    ),
    input("zone-location", "위치 입력", "예: 가상 학교 정문에서 본관까지.", 1),
    input(
      "zone-area",
      "관리 면적 입력",
      "단위는 ㎡입니다. 연습값으로 120을 입력해 보세요.",
      1,
    ),
    input(
      "zone-boundary",
      "범위 식별 정보 입력",
      "예: 정문 표지 A부터 본관 표지 B까지. 과거 작업은 당시 범위를 보관합니다.",
      1,
    ),
    input(
      "zone-use",
      "구역 용도 입력",
      "예: 보행로. 작성 내용은 실제 저장 버튼으로 등록합니다.",
      1,
    ),
    click(
      "zone-save",
      "관리 구역 저장",
      "필수 입력을 마친 뒤 저장하세요. 비어 있는 입력이 있으면 안내를 진행하지 않습니다.",
      1,
      (s) =>
        s.data.zones.some(
          (z) => z.orgId === PRACTICE_ORG && z.name !== "[연습] 기존 보행로",
        ),
    ),
  ];
  const field: GuideStep[] = [
    click(
      "zone-start",
      "현장 기록 시작",
      "방금 등록한 구역의 ‘기록 시작’을 클릭합니다. 실제 현장과 분리된 연습 작업을 생성합니다.",
      1,
      (s) => Boolean(s.work),
    ),
    change(
      "observation-state",
      "현재 눈·얼음 상태",
      "예측이 아니라 지금 관찰한 상태를 선택합니다. 연습에서는 ‘적설’을 고르세요.",
      2,
      0,
    ),
    change(
      "observation-removal",
      "사전 눈 제거 상태",
      "기준과 맞는 ‘일부 제거’를 선택해 보세요. 기준 밖의 조건은 산정이 보류됩니다.",
      2,
      0,
    ),
    input(
      "observation-depth",
      "실측 적설 깊이",
      "연습값 2 cm를 입력합니다. 사진만으로 깊이를 확정하지 않습니다.",
      2,
      0,
    ),
    input(
      "observation-area",
      "실제 처리 면적",
      "연습값 120 ㎡를 입력합니다. 등록 면적보다 크면 산정을 보류합니다.",
      2,
      0,
    ),
    input(
      "observation-temperature",
      "현재 노면 온도",
      "연습값 -3 ℃를 입력합니다. 미래 날씨 예측과는 다른 현장 측정값입니다.",
      2,
      0,
    ),
    input(
      "observation-time",
      "관찰 시각",
      "현재 시각을 입력하세요. 실제 사용 기록과 후속 확인은 이 시각 이후여야 합니다.",
      2,
      0,
    ),
    input(
      "observation-manual",
      "사진 없는 수동 기록",
      "예: 연습용 수동 관찰. 사진이 없어도 사유와 측정값으로 기록할 수 있습니다.",
      2,
      0,
    ),
    change(
      "observation-range",
      "구역 범위 확인",
      "측정한 범위와 등록 구역이 같은지 직접 확인합니다.",
      2,
      0,
    ),
    click(
      "observation-next",
      "관찰 확인 후 산정으로",
      "누락 정보가 있으면 관찰 단계에 머뭅니다. 입력이 갖춰졌는지 실제로 검사합니다.",
      2,
      (s) => s.fieldStep === 1,
      0,
    ),
    change(
      "criterion-select",
      "적용 기준 선택",
      "‘연습용 가상 기준’을 선택하세요. 20 g/㎡는 산술 학습용이며 검증된 제품 권장량이 아닙니다.",
      2,
      1,
    ),
    click(
      "calculate",
      "산정 또는 보류 확인",
      "면적 × g/㎡ ÷ 1,000으로 계산합니다. 기준·조건이 맞지 않으면 숫자 대신 확인 필요·보류를 표시합니다.",
      2,
      (s) => Boolean(s.work?.calculation),
      1,
    ),
    click(
      "confirm-field",
      "현장 확인 완료",
      "안내량과 실제 사용량은 다릅니다. 담당자가 현장을 확인한 다음 실제 작업으로 이동합니다.",
      2,
      (s) => s.work?.stage === "현장 확인",
      1,
    ),
    input(
      "application-kg",
      "실제 사용량 입력",
      "예: 2.5 kg. 안내량과 다르더라도 실제 사용량을 그대로 기록합니다.",
      2,
      2,
    ),
    input(
      "application-time",
      "실제 작업 시각 입력",
      "관찰 시각 이후의 실제 작업 시각을 입력하세요. 양식의 초기 시각이 오래됐다면 직접 수정해야 합니다.",
      2,
      2,
    ),
    click(
      "application-save",
      "실제 사용 기록 저장",
      "제품·배치·처리 면적과 시각도 함께 저장됩니다. 이후 추가 살포도 같은 작업에 연결할 수 있습니다.",
      2,
      (s) => (s.work?.applications.length || 0) > 0,
      2,
    ),
    click(
      "application-next",
      "실제 작업 완료",
      "실제 사용 기록이 있어야 작업 완료로 진행합니다. 입력만 하고 저장하지 않았다면 진행할 수 없습니다.",
      2,
      (s) => s.work?.stage === "작업 완료",
      2,
    ),
    input(
      "followup-time",
      "후속 확인 시각 입력",
      "실제 살포 이후에 확인한 시각을 입력하세요. 안내만 따라 눌러 시간 순서를 거꾸로 저장하지 않습니다.",
      2,
      3,
    ),
    input(
      "followup-remaining",
      "사용 후 상태 입력",
      "예: 그늘 구간에 잔설이 남음. 효과 부족도 정상적인 기록입니다.",
      2,
      3,
    ),
    input(
      "followup-removal",
      "추가 눈 제거 여부",
      "예: 삽으로 잔설 제거. 추가 살포와 추가 눈 제거는 구분해 기록합니다.",
      2,
      3,
    ),
    input(
      "followup-manual",
      "후속 사진 없는 사유",
      "예: 연습용 수동 확인. 후속 사진이 없으면 수동 기록 사유가 필요합니다.",
      2,
      3,
    ),
    click(
      "followup-save",
      "후속 관찰 저장",
      "후속 확인 시각은 실제 작업 이후여야 합니다. 관찰 내용을 실제로 저장해 보세요.",
      2,
      (s) => Boolean(s.work?.followup),
      3,
    ),
    click(
      "followup-next",
      "후속 확인 대기로 전환",
      "작업 완료와 후속 확인 대기를 구분하는 기존 상태 전환입니다.",
      2,
      (s) => s.work?.stage === "후속 확인 대기",
      3,
    ),
    {
      ...click(
        "followup-next",
        "기록 완료로 마침",
        "후속 정보가 갖춰진 경우에만 기록 완료가 됩니다. 실제 입력·저장·상태 전환을 모두 경험했습니다.",
        2,
        (s) => s.work?.stage === "기록 완료",
        3,
      ),
      id: "finish-work",
    },
  ];
  const history = [
    nav(
      3,
      "저장한 작업 찾기",
      "작업 이력에서 안내량·실제 사용량·상태를 구분해 확인합니다.",
    ),
    click(
      "history-open",
      "저장 결과 조회",
      "조회·수정으로 같은 작업을 다시 엽니다. 실제 기관 기록에는 영향을 주지 않습니다.",
      3,
      (s) => s.view === 2,
    ),
  ];
  const reporting = [
    nav(
      4,
      "사용량 비교 리포트",
      "구매량이 아니라 실제 소비 기록을 비교합니다.",
    ),
    read(
      "report-title",
      "자료 없음·평가 보류 이해하기",
      "전년도 확인 자료가 없으면 절감률·등급을 임의로 만들지 않습니다. 이 연습에서는 실제 성과를 확정하지 않습니다.",
      4,
    ),
  ];
  const pricing = [
    nav(
      6,
      "체험 요금제 열기",
      "요금안과 현재 가능한 기능·향후 계획을 구분해 볼 수 있습니다.",
    ),
    click(
      "plan-school",
      "체험 플랜 선택",
      "학교 플랜은 연간 계약 시 월 환산 100,000원 가안입니다. 이 클릭은 연습 기관의 체험 선택만 저장하며 실제 결제·계약이 아닙니다.",
      6,
      (s) => s.data.subscriptions?.[PRACTICE_ORG]?.planId === "school",
    ),
  ];
  const settings = [
    nav(7, "기관 설정 열기", "제품·배치와 적용 기준 등을 기관별로 관리합니다."),
    {
      ...click(
        "settings-products",
        "제품·제조 배치 분류",
        "분류를 바꿔도 작성 중인 폼을 유지합니다.",
        7,
        (s) => s.settingGroup === 1,
      ),
      setting: 0,
    },
    {
      ...input(
        "product-name",
        "제품명 입력",
        "예: 연습 제품. 실제 제품이나 인증·성능을 추가하는 것이 아닙니다.",
        7,
      ),
      setting: 1,
    },
    {
      ...input(
        "product-batch",
        "제조 배치 입력",
        "예: PRACTICE-02. 작업은 당시 제품·배치를 보관합니다.",
        7,
      ),
      setting: 1,
    },
    {
      ...click(
        "product-save",
        "제품·배치 저장",
        "입력한 연습 제품이 목록에 추가되는지 확인합니다.",
        7,
        (s) =>
          s.data.products.filter((p) => p.orgId === PRACTICE_ORG).length > 1,
      ),
      setting: 1,
    },
  ];
  if (menu === 1) return zones;
  if (menu === 2) return field;
  if (menu === 3) return history;
  if (menu === 4) return reporting;
  if (menu === 5)
    return [
      nav(
        5,
        "기관 성장·보상 확인",
        "기준과 자료가 확인돼야 단계와 배지가 확정됩니다.",
      ),
      read(
        "growth-title",
        "기관 보상과 운전자 보상 구분",
        "여기는 기관의 4단계 보상입니다. 미확정 정책이나 자료 부족 상태에서는 임의의 혜택을 지급하지 않습니다.",
        5,
      ),
    ];
  if (menu === 6) return pricing;
  if (menu === 7) return settings;
  return [...zones, ...field, ...history, ...reporting, ...pricing];
}
export function createPracticeStore(menu = -1): Store {
  const data = emptyStore(),
    orgId = PRACTICE_ORG;
  data.organizations.push({
    ...stamp(),
    id: orgId,
    name: "[사용법 연습] EcoSnow 기관",
    administrator: "연습 담당자",
  });
  data.settings[orgId] = defaultSettings();
  const p: Product = {
    ...stamp(),
    orgId,
    name: "[연습] 에코스노우",
    batch: "PRACTICE-01",
  };
  data.products.push(p);
  const c: Criterion = {
    ...stamp(),
    orgId,
    productId: p.id,
    rate: 20,
    source: "연습용 가상 기준 · 실제 제품 적용 금지",
    verified: false,
    confirmedBy: "연습 담당자",
    minTemp: -10,
    maxTemp: 2,
    maxDepth: 5,
    conditions: "산술·입력 검증 체험 전용 값",
    removal: "일부 제거",
    surface: "적설",
  };
  data.criteria.push(c);
  if (menu > 1) {
    const zone: Zone = {
      ...stamp(),
      orgId,
      name: "[연습] 기존 보행로",
      location: "가상 학교 정문",
      area: 120,
      boundary: "연습 표지 A~B",
      use: "보행로",
      features: "가상 보도블록",
      important: false,
      productId: p.id,
    };
    data.zones.push(zone);
    if (menu !== 2) {
      const observation = {
        ...blankObservation(),
        state: "적설",
        depth: "2",
        temperature: "-3",
        area: "120",
        removal: "일부 제거",
        source: "데모" as const,
        manualReason: "연습용 수동 관찰",
        capturedAt: "2026-01-15T09:00",
        rangeConfirmed: true,
      };
      data.works.push({
        ...stamp(),
        orgId,
        zone,
        product: p,
        observation,
        calculation: calculate(zone, p, c, observation),
        stage: "기록 완료",
        applications: [
          {
            id: stamp().id,
            product: p,
            area: 120,
            kg: 2.5,
            cost: null,
            at: "2026-01-15T10:00",
            note: "연습 사용",
          },
        ],
        followup: {
          photo: null,
          manualReason: "연습 확인",
          at: "2026-01-15T11:00",
          remaining: "잔설 일부",
          removal: "삽으로 제거",
          note: "연습",
        },
        operator: "연습 담당자",
        note: "실제 실적 제외",
        demo: true,
        reportId: "",
        confirmedAt: now(),
      });
    }
  }
  return data;
}
