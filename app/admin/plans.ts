export const plans = [
  {
    id: "school",
    name: "학교·소규모 기관",
    monthly: 100000,
    annual: 1200000,
    description: "소규모 시설의 기록·관리 시작",
  },
  {
    id: "private",
    name: "아파트·민간기관",
    monthly: 200000,
    annual: 2400000,
    description: "여러 관리 구역의 반복 작업 관리",
  },
  {
    id: "municipal",
    name: "지자체",
    monthly: 800000,
    annual: 9600000,
    description: "공공시설·다수 현장의 도입 범위 협의",
  },
] as const;
export type PlanId = (typeof plans)[number]["id"];
export type TrialSubscription = {
  planId: PlanId;
  updatedAt: string;
  inquiry?: string;
};
export function getPlan(id?: string) {
  return plans.find((p) => p.id === id);
}
export function selectTrial(
  planId: string,
  at: string,
  inquiry = "",
): TrialSubscription {
  const plan = getPlan(planId);
  if (!plan) throw new Error("지원하지 않는 플랜입니다.");
  return { planId: plan.id, updatedAt: at, inquiry };
}
