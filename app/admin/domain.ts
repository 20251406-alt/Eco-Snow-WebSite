export type Source = "현장 측정" | "관리자 입력" | "데모";
export type Stamp = { id: string; createdAt: string; updatedAt: string };
export type Organization = Stamp & { name: string; administrator: string };
export type Zone = Stamp & {
  orgId: string;
  name: string;
  location: string;
  area: number;
  boundary: string;
  use: string;
  features: string;
  important: boolean;
  productId: string;
  archived?: boolean;
};
export type Product = Stamp & { orgId: string; name: string; batch: string };
export type Criterion = Stamp & {
  orgId: string;
  productId: string;
  rate: number;
  source: string;
  verified: boolean;
  confirmedBy: string;
  minTemp: number;
  maxTemp: number;
  maxDepth: number;
  conditions: string;
  removal: string;
  surface: string;
};
export type Photo = { id: string; name: string; capturedAt: string };
export type Observation = {
  state: string;
  depth: string;
  temperature: string;
  area: string;
  removal: string;
  source: Source;
  before: Photo | null;
  manualReason: string;
  capturedAt: string;
  rangeConfirmed: boolean;
};
export type Calculation = {
  status: "calculated" | "criterion_required" | "information_required" | "held";
  label: string;
  kg: number | null;
  reasons: string[];
  formula: string;
  criterion: Criterion | null;
  inputs: Observation;
  calculatedAt: string;
};
export const stages = [
  "작성 중",
  "현장 확인",
  "작업 완료",
  "후속 확인 대기",
  "기록 완료",
] as const;
export type Stage = (typeof stages)[number];
export type Application = {
  id: string;
  kg: number;
  area: number;
  product: Product;
  at: string;
  cost: number | null;
  note: string;
};
export type Followup = {
  photo: Photo | null;
  manualReason: string;
  at: string;
  remaining: string;
  removal: string;
  note: string;
};
export type Work = Stamp & {
  orgId: string;
  zone: Zone;
  product: Product | null;
  observation: Observation;
  calculation: Calculation | null;
  stage: Stage;
  applications: Application[];
  followup: Followup | null;
  operator: string;
  note: string;
  demo: boolean;
  reportId: string;
  confirmedAt: string | null;
};
export type Prior = Stamp & {
  orgId: string;
  season: string;
  zoneId: string;
  area: number;
  start: string;
  end: string;
  kg: number;
  cost: number | null;
  source: string;
  verified: boolean;
};
export type Policy = {
  thresholds: (number | null)[];
  discounts: (number | null)[];
  finalized: boolean;
};
export type Season = {
  name: string;
  start: string;
  end: string;
  priorStart: string;
  priorEnd: string;
  ended: boolean;
  comparable: boolean;
  complete: boolean;
  necessaryWorkConfirmed: boolean;
};
export type Report = Stamp & {
  orgId: string;
  zoneId: string;
  occurredAt: string;
  receivedAt: string;
  location: string;
  content: string;
  source: string;
  status: "확인 요청" | "현장 확인";
  demo: boolean;
};
export type Evaluation = Stamp & {
  orgId: string;
  season: string;
  status: string;
  stage: number | null;
  reasons: string[];
  verifiedBy: string;
  savings: number | null;
  basis: string;
};
export type Audit = { at: string; orgId: string; action: string };
export type Store = {
  version: 1;
  organizations: Organization[];
  zones: Zone[];
  products: Product[];
  criteria: Criterion[];
  works: Work[];
  prior: Prior[];
  reports: Report[];
  settings: Record<string, { season: Season; policy: Policy }>;
  evaluations: Evaluation[];
  audit: Audit[];
};
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const stamp = (): Stamp => {
  const at = now();
  return { id: id(), createdAt: at, updatedAt: at };
};
export const emptyStore = (): Store => ({
  version: 1,
  organizations: [],
  zones: [],
  products: [],
  criteria: [],
  works: [],
  prior: [],
  reports: [],
  settings: {},
  evaluations: [],
  audit: [],
});
export const defaultSettings = () =>
  ({
    season: {
      name: "",
      start: "",
      end: "",
      priorStart: "",
      priorEnd: "",
      ended: false,
      comparable: false,
      complete: false,
      necessaryWorkConfirmed: false,
    },
    policy: {
      thresholds: [null, null, null, null],
      discounts: [null, null, null, null],
      finalized: false,
    },
  }) satisfies Store["settings"][string];
export const blankObservation = (): Observation => ({
  state: "",
  depth: "",
  temperature: "",
  area: "",
  removal: "",
  source: "현장 측정",
  before: null,
  manualReason: "",
  capturedAt: "",
  rangeConfirmed: false,
});
export function numeric(
  value: unknown,
  min = 0,
  positive = false,
): number | null {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === ""
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) && n <= 1e12 && (positive ? n > min : n >= min)
    ? n
    : null;
}
export function observationIssues(o: Observation): string[] {
  const missing: string[] = [];
  if (!o.state) missing.push("현재 눈·얼음 상태");
  if (numeric(o.depth) === null) missing.push("실측 적설 깊이(cm)");
  if (numeric(o.area, 0, true) === null) missing.push("실제 처리 면적(㎡)");
  if (numeric(o.temperature, -100) === null || Number(o.temperature) > 100)
    missing.push("노면 온도(℃, 미측정)");
  if (!o.removal) missing.push("사전 제설 여부");
  if (!o.capturedAt) missing.push("현장 관찰 시각");
  if (o.capturedAt && !Number.isFinite(Date.parse(o.capturedAt)))
    missing.push("유효한 관찰 시각");
  if (!o.before && !o.manualReason.trim())
    missing.push("사용 전 사진 또는 수동 기록 사유");
  if (!o.rangeConfirmed) missing.push("촬영·관찰 범위와 구역 일치 확인");
  return missing;
}
export function calculate(
  zone: Zone,
  product: Product | null,
  criterion: Criterion | null,
  o: Observation,
): Calculation {
  const result: Calculation = {
    status: "information_required",
    label: "추가 정보 필요",
    kg: null,
    reasons: observationIssues(o),
    formula: "",
    criterion: criterion ? structuredClone(criterion) : null,
    inputs: structuredClone(o),
    calculatedAt: now(),
  };
  if (!product || product.orgId !== zone.orgId)
    result.reasons.push("사용 제품·제조 배치");
  if (result.reasons.length) return result;
  if (
    !criterion ||
    criterion.orgId !== zone.orgId ||
    criterion.productId !== product?.id ||
    !criterion.source.trim() ||
    !criterion.confirmedBy.trim()
  ) {
    return {
      ...result,
      status: "criterion_required",
      label: "적용 기준 확인 필요",
      reasons: ["제품에 맞는 출처·확인자가 있는 기준을 선택하세요."],
    };
  }
  const area = Number(o.area),
    depth = Number(o.depth),
    temp = Number(o.temperature);
  if (
    area > zone.area ||
    temp < criterion.minTemp ||
    temp > criterion.maxTemp ||
    depth > criterion.maxDepth ||
    criterion.removal !== o.removal ||
    criterion.surface !== o.state
  ) {
    return {
      ...result,
      status: "held",
      label: "산정 보류",
      reasons: [
        "면적·노면 온도·적설 깊이·사전 제설·눈 상태가 등록된 기준의 적용 범위 밖입니다.",
      ],
    };
  }
  const kg = (area * criterion.rate) / 1000;
  if (
    !Number.isFinite(kg) ||
    numeric(criterion.rate, 0, true) === null ||
    kg > 1e12
  )
    return {
      ...result,
      status: "held",
      label: "산정 보류",
      reasons: [
        "유효한 양수 기준 또는 계산 범위를 확인하세요. 입력·결과 상한은 1조 단위입니다.",
      ],
    };
  return {
    ...result,
    status: "calculated",
    label:
      o.source === "데모"
        ? "데모 계산"
        : criterion.verified
          ? "확인된 적용 기준 계산"
          : "관리자 입력 기준 계산",
    kg,
    reasons: [
      "사진 AI 분석은 연결되지 않았습니다. 담당자가 적용 조건과 최종 작업량을 확인해야 합니다.",
      criterion.conditions,
    ],
    formula: `${area} ㎡ × ${criterion.rate} g/㎡ ÷ 1,000 = ${kg} kg`,
  };
}
export function transition(work: Work): Work {
  const index = stages.indexOf(work.stage);
  if (index < 0 || index === stages.length - 1)
    throw new Error("더 진행할 상태가 없습니다.");
  if (index === 0) {
    const issues = observationIssues(work.observation);
    if (!work.operator.trim()) issues.push("담당자");
    if (issues.length) throw new Error(`추가 정보 필요: ${issues.join(", ")}`);
  }
  if (
    index === 1 &&
    (!work.applications.length ||
      work.applications.some(
        (a) => !a.at || a.kg < 0 || !Number.isFinite(a.kg),
      ))
  )
    throw new Error(
      "실제 사용량·처리 면적·작업 시각을 기록하세요. 미살포는 0 kg과 사유를 기록하세요.",
    );
  if (index === 3) {
    const f = work.followup;
    if (
      !f ||
      !f.at ||
      !f.remaining.trim() ||
      (!f.photo && !f.manualReason.trim()) ||
      !f.removal
    )
      throw new Error(
        "후속 관찰·확인 시각·사진 또는 수동 사유·추가 눈 제거 여부가 필요합니다.",
      );
    if (work.applications.some((a) => a.at > f.at))
      throw new Error("추가 살포 이후 후속 확인을 다시 기록하세요.");
    if (f.at < work.observation.capturedAt)
      throw new Error("후속 확인 시각은 현장 관찰 이후여야 합니다.");
  }
  return {
    ...work,
    stage: stages[index + 1],
    updatedAt: now(),
    confirmedAt: now(),
  };
}
export function addApplication(work: Work, application: Application): Work {
  if (work.stage === "작성 중")
    throw new Error("현장 확인 후 실제 사용을 기록하세요.");
  if (
    !Number.isFinite(application.kg) ||
    application.kg < 0 ||
    !Number.isFinite(application.area) ||
    application.area <= 0 ||
    application.area > work.zone.area ||
    !application.at ||
    (application.kg === 0 && !application.note.trim()) ||
    (application.cost !== null &&
      (!Number.isFinite(application.cost) || application.cost < 0))
  )
    throw new Error(
      "사용량·면적·시각을 확인하세요. 미살포는 사유가 필요합니다.",
    );
  if (application.product.orgId !== work.orgId)
    throw new Error("다른 기관의 제품은 사용할 수 없습니다.");
  if (
    numeric(application.kg) === null ||
    numeric(application.area, 0, true) === null ||
    (application.cost !== null && numeric(application.cost) === null)
  )
    throw new Error("입력 범위를 초과했습니다 (각 항목 최대 1조 단위).");
  if (
    !Number.isFinite(Date.parse(application.at)) ||
    application.at < work.observation.capturedAt
  )
    throw new Error("작업 시각은 현장 관찰 이후여야 합니다.");
  if (work.applications.some((a) => a.id === application.id))
    throw new Error("중복 작업 기록입니다.");
  return {
    ...work,
    applications: [...work.applications, application],
    stage: work.stage === "기록 완료" ? "후속 확인 대기" : work.stage,
    followup: null,
    updatedAt: now(),
  };
}
export function actualUsage(
  works: Work[],
  orgId: string,
  start: string,
  end: string,
  zoneId?: string,
) {
  const applications = [
    ...new Map(
      works
        .filter(
          (w) =>
            w.orgId === orgId && !w.demo && (!zoneId || w.zone.id === zoneId),
        )
        .map((w) => [w.id, w]),
    ).values(),
  ].flatMap((w) =>
    w.applications.map((a) => ({
      ...a,
      workId: w.id,
      zoneId: w.zone.id,
      zoneName: w.zone.name,
    })),
  );
  const inPeriod = applications.filter(
    (a) => a.at.slice(0, 10) >= start && a.at.slice(0, 10) <= end,
  );
  return {
    kg: inPeriod.length ? inPeriod.reduce((sum, a) => sum + a.kg, 0) : null,
    cost:
      inPeriod.length && inPeriod.every((a) => a.cost !== null)
        ? inPeriod.reduce((sum, a) => sum + a.cost!, 0)
        : null,
    applications: inPeriod,
  };
}
export function compare(
  store: Store,
  orgId: string,
  today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  ),
) {
  const settings = store.settings[orgId] || defaultSettings(),
    s = settings.season;
  const current = actualUsage(store.works, orgId, s.start, s.end);
  const priors = store.prior.filter(
    (p) =>
      p.orgId === orgId && p.start === s.priorStart && p.end === s.priorEnd,
  );
  const previous = priors.length
    ? priors.reduce((sum, p) => sum + p.kg, 0)
    : null;
  const delta =
    current.kg !== null && previous !== null ? current.kg - previous : null;
  const savings =
    delta !== null && previous !== null && previous > 0
      ? (-delta / previous) * 100
      : null;
  const reasons: string[] = [];
  if (
    !s.start ||
    !s.end ||
    !s.priorStart ||
    !s.priorEnd ||
    s.start > s.end ||
    s.priorStart > s.priorEnd
  )
    reasons.push("비교 기간 설정 필요");
  const days = (a: string, b: string) =>
    (Date.parse(b) - Date.parse(a)) / 86400000;
  if (days(s.start, s.end) !== days(s.priorStart, s.priorEnd))
    reasons.push("비교 기간 길이 불일치");
  if (!s.ended || !s.end || today <= s.end)
    reasons.push("시즌 진행 중: 최종 평가 전");
  if (previous === null || previous <= 0 || priors.some((p) => !p.verified))
    reasons.push("전년도 실제 사용 기록 부족·미확인 또는 0 kg");
  if (current.kg === null) reasons.push("올해 실제 사용 자료 없음");
  const active = store.zones.filter((z) => z.orgId === orgId && !z.archived);
  if (
    !active.length ||
    active.some(
      (z) => !priors.some((p) => p.zoneId === z.id && p.area === z.area),
    ) ||
    priors.some(
      (p) => !active.some((z) => z.id === p.zoneId && z.area === p.area),
    )
  )
    reasons.push("비교 구역·면적 불일치");
  if (
    store.works.some(
      (w) =>
        w.orgId === orgId &&
        !w.demo &&
        w.applications.some(
          (a) => a.at.slice(0, 10) >= s.start && a.at.slice(0, 10) <= s.end,
        ) &&
        !priors.some((p) => p.zoneId === w.zone.id && p.area === w.zone.area),
    )
  )
    reasons.push("작업 당시 구역 면적과 비교 자료 불일치");
  if (
    store.works.some(
      (w) =>
        w.orgId === orgId &&
        !w.demo &&
        ((w.observation.capturedAt.slice(0, 10) >= s.start &&
          w.observation.capturedAt.slice(0, 10) <= s.end) ||
          w.applications.some(
            (a) => a.at.slice(0, 10) >= s.start && a.at.slice(0, 10) <= s.end,
          )) &&
        w.stage !== "기록 완료",
    )
  )
    reasons.push("필수 작업·후속 확인 기록 부족");
  if (!s.comparable) reasons.push("강설·운영 조건 비교 확인 필요");
  if (!s.complete) reasons.push("자료 완성도 확인 필요");
  if (!s.necessaryWorkConfirmed) reasons.push("필요한 제설 수행 확인 필요");
  const policy = settings.policy;
  if (!validPolicy(policy)) reasons.push("보상 정책 기준 확정 예정");
  const stage =
    reasons.length || savings === null
      ? null
      : policy.thresholds.reduce(
          (level, n, i) => (savings >= n! ? i + 1 : level),
          0,
        );
  const priorCost =
    priors.length && priors.every((p) => p.cost !== null)
      ? priors.reduce((n, p) => n + p.cost!, 0)
      : null;
  return {
    current,
    previous,
    priorCost,
    delta,
    savings,
    reasons,
    stage,
    status: reasons.length ? "평가 보류" : "평가 가능",
    priors,
  };
}
export function validPolicy(p: Policy) {
  return (
    p.finalized &&
    p.thresholds.length === 4 &&
    p.discounts.length === 4 &&
    p.thresholds.every(
      (n, i) =>
        n !== null &&
        Number.isFinite(n) &&
        n >= 0 &&
        n <= 100 &&
        (!i || n > p.thresholds[i - 1]!),
    ) &&
    p.discounts.every(
      (n) => n !== null && Number.isFinite(n) && n >= 0 && n <= 100,
    )
  );
}
/** Invalidates a badge whenever its evidence changes, even if the percentage stays equal. */
export function evaluationBasis(store: Store, orgId: string): string {
  return JSON.stringify({
    settings: store.settings[orgId],
    zones: store.zones.filter((z) => z.orgId === orgId),
    prior: store.prior.filter((p) => p.orgId === orgId),
    works: store.works.filter((w) => w.orgId === orgId && !w.demo),
  });
}
export interface PhotoAnalyzer {
  analyze(
    photo: Photo,
    zone: Zone,
  ): Promise<{
    status: "unavailable" | "needs_confirmation";
    observations: string[];
    uncertainty: string;
    humanConfirmed: boolean;
  }>;
}
export const unavailableAnalyzer: PhotoAnalyzer = {
  async analyze() {
    return {
      status: "unavailable",
      observations: [],
      uncertainty:
        "사진 분석 모델 미연결. 사진을 확인하고 현장 측정값을 수동 입력하세요.",
      humanConfirmed: false,
    };
  },
};
export interface ReportAdapter {
  connected: boolean;
  read(): Promise<Report[]>;
}
export const plannedReportAdapter: ReportAdapter = {
  connected: false,
  async read() {
    return [];
  },
};
