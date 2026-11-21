import { growthActivity } from "./eco-growth";
import rules from "./growth-stages.json";
import type { Work } from "./domain";

export default function PosterCertification({ works, orgId, demo, costDifference, onOpen }: {
  works: Work[];
  orgId: string;
  demo: boolean;
  costDifference: number | null;
  onOpen: () => void;
}) {
  const count = demo ? growthActivity(works, orgId).length : 0;
  const level = rules.demoOnlyThresholds.filter(n => n <= count).length;
  const stage = rules.stages[level - 1];
  const cost = costDifference === null ? "자료 없음" :
    Math.abs(Math.round(costDifference)).toLocaleString("ko-KR") + "원";
  return (
    <button type="button" className="poster-certification" onClick={onOpen}>
      <span className="poster-mascot" aria-hidden="true" />
      <span className="poster-certification-content">
        <small>에콩이 · 자체 인증 {demo ? "시연" : "기준 준비 중"}</small>
        <strong>{demo && stage ? `${level}/5단계 · ${stage.name}` : demo ? "0/5단계 · 첫 활동 준비" : "단계 미산정"}</strong>
        <span className="poster-levels" aria-hidden="true">
          {rules.stages.map(s => <i key={s.level} data-complete={s.level <= level} />)}
        </span>
        <span className="poster-cost">
          전년 대비 제설제 비용 {costDifference !== null && costDifference < 0 ? "증가액" : "절감액"} <b>{cost}</b>
        </span>
      </span>
    </button>
  );
}
