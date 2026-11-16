"use client";
import { useState } from "react";
import { compare, type Store } from "./domain";
import { demoComparisonData, DEMO_ORG_ID } from "./demo";
export default function DemoSeason({
  data,
  onReport,
}: {
  data: Store;
  onReport: () => void;
}) {
  const [finished, setFinished] = useState(false),
    [saving, setSaving] = useState<number | null>(null);
  const source = demoComparisonData(data),
    settings = source.settings[DEMO_ORG_ID],
    original = compare(source, DEMO_ORG_ID);
  const factor =
    saving !== null &&
    original.previous !== null &&
    original.current.kg !== null &&
    original.current.kg > 0
      ? (original.previous * (1 - saving / 100)) / original.current.kg
      : 1;
  const simulated: Store = {
    ...source,
    works: source.works.map((w) =>
      w.orgId === DEMO_ORG_ID
        ? {
            ...w,
            stage: finished ? "기록 완료" : w.stage,
            applications: w.applications.map((a) => ({
              ...a,
              kg: a.kg * factor,
              cost: a.cost === null ? null : Math.round(a.cost * factor),
            })),
          }
        : w,
    ),
  };
  const result = compare(simulated, DEMO_ORG_ID),
    stage = result.stage;
  const number = (v: number | null, unit: string) =>
    v === null
      ? "자료 없음"
      : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${unit}`;
  return (
    <section className="panel">
      <span className="badge-text">기관 보상 전체 기능 시연 · 가상 결과</span>
      <h2 data-guide="growth-title">기록 완료부터 단계·혜택까지 체험</h2>
      <p>
        더미 기록의 후속 확인 완료 여부와 가상 절감 시나리오를 바꿔 보세요. 원본
        작업을 수정하거나 실제 기관의 등급·배지를 발급하지 않습니다.
      </p>
      <div className="actions">
        <button
          onClick={() => {
            setFinished(false);
            setSaving(null);
          }}
        >
          미완료 기록이 있는 시즌
        </button>
        <button
          onClick={() => {
            setFinished(true);
            setSaving(null);
          }}
        >
          모든 후속 확인이 끝난 시즌 가정
        </button>
      </div>
      <div className="growth">
        {[1, 2, 3, 4].map((n, i) => (
          <article key={n}>
            <h3>{n}단계 시연</h3>
            <p>
              설정 기준 {settings?.policy.thresholds[i]}% 이상 · 할인{" "}
              {settings?.policy.discounts[i]}%
            </p>
            <button
              onClick={() => {
                setFinished(true);
                setSaving(
                  Math.min(99, (settings?.policy.thresholds[i] || 0) + 0.5),
                );
              }}
            >
              {n}단계 결과 보기
            </button>
          </article>
        ))}
      </div>
      <div className="calculation">
        <h3>
          {result.status} {stage !== null ? `· ${stage}단계 (데모)` : ""}
        </h3>
        <p>
          전년도 {number(result.previous, " kg")} / 올해{" "}
          {number(result.current.kg, " kg")} / 절감률{" "}
          {number(result.savings, " %")}
        </p>
        {saving !== null && (
          <p>
            선택한 단계 UI를 확인하기 위해 올해 소비량을 {saving}% 절감으로
            가정한 더미 시나리오입니다. 실제 현장 효과·실제 절감 성과가
            아닙니다.
          </p>
        )}
        <ul>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {stage !== null && stage > 0 && (
          <p>
            <strong>
              제품·구독 할인 {settings?.policy.discounts[stage - 1]}% (시연
              표시, 청구·계약 적용 없음)
            </strong>
          </p>
        )}
        {stage === 4 && (
          <div className="badge">
            <strong>에코스노우 스마트 제설 실천 배지 · 데모 미리보기</strong>
            <p>
              기관: [데모] 에코스노우 체험 학교 / 시즌: {settings?.season.name}{" "}
              / 4단계 / 검증 상태: 시연 가정
            </p>
            <p>
              에코스노우 자체 기준에 따른 실천 배지이며, 공인 환경인증이
              아닙니다.
            </p>
          </div>
        )}
      </div>
      <button onClick={onReport}>원래 더미 사용량 비교 리포트</button>
    </section>
  );
}
