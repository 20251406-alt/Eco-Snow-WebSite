import {
  calculate,
  numeric,
  type Store,
  type Zone,
  type Observation,
  type Calculation,
} from "./domain";
import { DEMO_ORG_ID } from "./demo";
export const PREDICTION_RULE_PREFIX = "demo-prediction-rate-";
export function predictDemoAmount(
  store: Store,
  zone: Zone | undefined,
  input: {
    area: string;
    depth: string;
    temperature: string;
    removal: string;
    state: string;
  },
): Calculation | null {
  if (!zone || zone.orgId !== DEMO_ORG_ID) return null;
  const product =
    store.products.find(
      (p) => p.id === zone.productId && p.orgId === DEMO_ORG_ID,
    ) || null;
  const rules = store.criteria
    .filter(
      (c) =>
        c.orgId === DEMO_ORG_ID &&
        c.productId === product?.id &&
        c.id.startsWith(PREDICTION_RULE_PREFIX),
    )
    .sort((a, b) => a.maxDepth - b.maxDepth);
  const depth = numeric(input.depth),
    temp = numeric(input.temperature, -100);
  const selected =
    rules.find(
      (c) =>
        depth !== null &&
        depth <= c.maxDepth &&
        temp !== null &&
        temp >= c.minTemp &&
        temp <= c.maxTemp &&
        input.removal === c.removal &&
        input.state === c.surface,
    ) ||
    rules.at(-1) ||
    null;
  const observation: Observation = {
    ...input,
    source: "데모",
    capturedAt: "2026-01-15T09:00",
    manualReason: "필요 살포량 예측을 위한 더미 관찰값 · 실제 측정 아님",
    rangeConfirmed: true,
    before: {
      id: "ecosnow-demo-before",
      name: "데모 사용 전 도식.svg",
      capturedAt: "2026-01-15T09:00",
    },
  };
  const result = calculate(zone, product, selected, observation);
  if (depth === 0 && input.state === "적설")
    return {
      ...result,
      status: "information_required",
      label: "눈·얼음 상태 확인 필요",
      kg: null,
      formula: "",
      reasons: [
        "적설 0 cm와 적설 상태가 함께 입력됐습니다. 잔설·얼음 여부를 확인하고 맞는 기준을 등록하세요.",
      ],
    };
  return result;
}
export function demoTimeAfter(value: string, minutes = 30) {
  const time = Date.parse(value + "Z");
  return Number.isFinite(time)
    ? new Date(time + minutes * 60000).toISOString().slice(0, 16)
    : "2026-01-15T09:30";
}
