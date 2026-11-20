"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { transition, type Work } from "./domain";
import rules from "./growth-stages.json";

export function eligibleGrowthWork(work: Work) {
  if (!work.demo || work.stage !== "기록 완료" || !work.applications.length)
    return false;
  try {
    transition({ ...work, stage: "후속 확인 대기" });
    return true;
  } catch {
    return false;
  }
}

export function growthActivity(works: Work[], orgId: string) {
  return [...new Map(works.filter(w => w.orgId === orgId).map(w => [w.id, w])).values()]
    .filter(eligibleGrowthWork);
}

export default function EcoGrowth({ works, orgId, orgName, onOpen }: {
  works: Work[];
  orgId: string;
  orgName: string;
  onOpen?: () => void;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const activities = growthActivity(works, orgId);
  const count = activities.length;
  const shownCount = preview ?? count;
  const level = rules.demoOnlyThresholds.filter(n => n <= shownCount).length;
  const stage = rules.stages[level - 1];
  const next = rules.stages[level];
  const target = rules.demoOnlyThresholds[level];
  const pending = new Set(works.filter(w => w.orgId === orgId && w.demo && w.stage === "후속 확인 대기").map(w => w.id)).size;
  const zones = new Map<string, { name: string; count: number }>();
  for (const work of activities) {
    const entry = zones.get(work.zone.id);
    zones.set(work.zone.id, { name: work.zone.name, count: (entry?.count ?? 0) + 1 });
  }

  return (
    <section className="panel eco-growth" aria-label="시연용 기관 성장">
      <span className="section-kicker">시연용 성장 기준 · 이 브라우저의 기록</span>
      <h2>{onOpen ? "우리 기관의 숲" : "에코스노우와 키우는 기관 공동 숲"}</h2>
      <p>{orgName} · {preview === null ? "유효 작업" : "미리보기 가정"} {shownCount}건 · {stage ? `${level}단계 ${stage.name}` : "첫 활동 준비"}</p>
      {next ? <>
        <progress aria-label={`다음 단계 ${next.name}까지 진행 상황`} max={target} value={shownCount} />
        <p>후속 확인을 마친 작업 {target - shownCount}건을 더 기록하면 {next.name} 단계에 도달합니다.</p>
      </> : <p>시연용 마지막 단계에 도달했습니다.</p>}
      {onOpen && <div className="eco-growth-mascot" aria-hidden="true" />}
      {onOpen ? <button onClick={onOpen}>기관 성장·보상 보기</button> : <>
        <div className="eco-growth-scene">
          <Image src="/eco-growth/forest.webp" alt="노란 안전 조끼를 입은 에코스노우와 도로 옆 나무" width={800} height={450} />
          <div className="eco-forest-stage" data-level={level} aria-hidden="true">
            {Array.from({ length: [0, 1, 1, 1, 3, 5][level] }, (_, i) => <i key={i} />)}
          </div>
          <span>{stage?.visual ?? "후속 확인을 마치면 새싹이 나타납니다"} · 시연 콘셉트</span>
        </div>
        <p>나무는 참여 활동을 보여주는 상징입니다. 실제 식재나 환경 개선 실적은 평가 보류 상태입니다.</p>
        <p>후속 확인 대기 {pending}건 · 미살포 작업도 현장 근거와 후속 확인을 기록하면 참여로 인정됩니다.</p>
        <label>성장 단계 미리보기 <select value={preview ?? ""} onChange={e => setPreview(e.target.value ? Number(e.target.value) : null)}>
          <option value="">현재 시연 기관 기록</option>
          {rules.stages.map((item, i) => <option key={item.level} value={rules.demoOnlyThresholds[i]}>{item.level}단계 · {item.name}</option>)}
        </select></label>
        <details><summary>관리 구역별 완료 활동</summary>
          {zones.size ? <ul>{[...zones.entries()].map(([id, zone]) => <li key={id}>{zone.name} · {zone.count}건</li>)}</ul> : <p>후속 확인을 마친 작업이 여기에 표시됩니다.</p>}
        </details>
      </>}
    </section>
  );
}

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function EcoReward({ onClose }: { onClose: () => void }) {
  const reduce = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const [ended, setFinished] = useState(false);
  const finished = ended || reduce;
  return (
    <aside className="eco-reward" aria-label="시연용 작업 완료 보상">
      <strong role="status">후속 확인 완료 · 시연용 공동 숲에 작업 1건 반영</strong>
      {!finished ? <video aria-hidden="true" autoPlay muted playsInline preload="none" src="/eco-growth/reward.mp4" poster="/eco-growth/forest.webp" onEnded={() => setFinished(true)} onError={() => setFinished(true)} /> :
        <Image src="/eco-growth/forest.webp" alt="공동 숲에 나타난 상징적인 나무 세 그루" width={800} height={450} />}
      <button onClick={onClose}>{finished ? "닫기" : "연출 건너뛰기"}</button>
    </aside>
  );
}
