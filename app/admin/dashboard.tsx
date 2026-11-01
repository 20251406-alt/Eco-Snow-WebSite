import { actualUsage, compare, type Store, type Work } from "./domain";
import { getPlan } from "./plans";
import Icon from "./ui-icon";
const f = (n: number | null, u = "") =>
  n === null
    ? "자료 없음"
    : n.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + u;
export default function Dashboard({
  data,
  orgId,
  onOpen,
  onNavigate,
}: {
  data: Store;
  orgId: string;
  onOpen: (w: Work) => void;
  onNavigate: (v: number) => void;
}) {
  const zones = data.zones.filter((z) => z.orgId === orgId && !z.archived),
    works = data.works.filter((w) => w.orgId === orgId),
    settings = data.settings[orgId],
    pending = works.filter((w) => w.stage !== "기록 완료"),
    follow = works.filter((w) => w.stage === "후속 확인 대기"),
    recent = [...works]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
    report = compare(data, orgId),
    plan = getPlan(data.subscriptions?.[orgId]?.planId);
  const period =
    settings?.season.start && settings?.season.end
      ? `${settings.season.start} ~ ${settings.season.end}`
      : "집계 기간 미설정";
  const usage = actualUsage(
    data.works,
    orgId,
    settings?.season.start || "",
    settings?.season.end || "",
  );
  return (
    <div className="dashboard-page">
      <div className="dashboard-actions">
        <div>
          <h2>오늘 확인할 현장을 한눈에</h2>
          <p>미완료 기록과 후속 확인부터 이어서 진행하세요.</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => onNavigate(2)}>
            현장 기록 시작
          </button>
          <button onClick={() => onNavigate(1)}>관리 구역 추가</button>
        </div>
      </div>
      <section className="kpi-grid" aria-label="기관 업무 요약">
        {[
          {
            label: "등록 관리 구역",
            value: zones.length ? `${zones.length}곳` : "자료 없음",
            note: "현재 등록 · 보관 구역 제외",
            icon: 1,
          },
          {
            label: "진행 중 작업",
            value: works.length ? `${pending.length}건` : "자료 없음",
            note: "전체 기록 · 완료 전 상태",
            icon: 2,
          },
          {
            label: "후속 확인 대기",
            value: works.length ? `${follow.length}건` : "자료 없음",
            note: "추가 살포 후 재확인 포함",
            icon: 3,
          },
          {
            label: "선택 기간 실제 사용량",
            value: f(usage.kg, " kg"),
            note: period + " · 데모 제외",
            icon: 4,
          },
        ].map((k) => (
          <article className="kpi-card" key={k.label}>
            <span className="kpi-icon">
              <Icon index={k.icon} />
            </span>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.note}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>확인이 필요한 작업</h2>
              <p>실제 저장된 작업 상태를 기준으로 표시합니다.</p>
            </div>
            <span className="status-badge amber">
              {pending.length}건 확인 필요
            </span>
          </div>
          {pending.slice(0, 5).map((w) => (
            <div className="task-row" key={w.id}>
              <div>
                <strong>{w.zone.name}</strong>
                <p>
                  <span className="status-badge">{w.stage}</span>
                  {w.demo && <span className="status-badge">데모</span>}
                </p>
                <small>
                  {w.stage === "후속 확인 대기"
                    ? "후속 사진 또는 수동 관찰을 남겨 주세요."
                    : "누락된 현장 입력과 실제 사용량을 확인해 주세요."}
                </small>
              </div>
              <button onClick={() => onOpen(w)}>이어서 기록</button>
            </div>
          ))}
          {!pending.length && (
            <div className="empty-state">
              <Icon index={2} />
              <h3>
                {works.length
                  ? "확인할 미완료 작업이 없습니다"
                  : "아직 현장 기록이 없습니다"}
              </h3>
              <p>현장 기록을 시작하면 작업 상태가 이곳에 표시됩니다.</p>
            </div>
          )}
          <button className="text-button" onClick={() => onNavigate(3)}>
            전체 작업 이력 보기
          </button>
        </section>
        <div>
          <section className="panel">
            <span className="section-kicker">현재 구독 플랜</span>
            <h2>{plan?.name || "체험 플랜 미선택"}</h2>
            <p>
              {plan
                ? `월 환산 ${f(plan.monthly)}원 · 연간 계약 기준`
                : "플랜 선택 전에도 모든 체험 기능을 사용할 수 있습니다."}
            </p>
            <span className="status-badge">체험 중 · 결제 미연결</span>
            <p>청구 예정 없음</p>
            <button onClick={() => onNavigate(6)}>요금제·구독 보기</button>
          </section>
          <section className="panel">
            <h2>사용량 비교 요약</h2>
            <p>{period}</p>
            <strong className="summary-number">
              {f(report.savings, " %")}
            </strong>
            <p>
              {report.previous === null
                ? "전년도 실제 사용 자료를 등록하면 비교할 수 있습니다."
                : report.status}
            </p>
            <button
              onClick={() => onNavigate(report.previous === null ? 7 : 4)}
            >
              {report.previous === null ? "비교 자료 등록" : "절약 리포트 보기"}
            </button>
          </section>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>최근 작업 이력</h2>
          <button className="text-button" onClick={() => onNavigate(3)}>
            전체 보기
          </button>
        </div>
        {recent.map((w) => (
          <div className="task-row" key={w.id}>
            <div>
              <strong>{w.zone.name}</strong>
              <p>
                {w.product?.name || "제품 미선택"} ·{" "}
                {w.observation.capturedAt || "관찰 시각 미입력"}
              </p>
            </div>
            <span className="status-badge">
              {w.stage}
              {w.demo ? " · 데모" : ""}
            </span>
            <button onClick={() => onOpen(w)}>조회·수정</button>
          </div>
        ))}
        {!recent.length && <p className="empty-state">최근 작업 자료 없음</p>}
      </section>
    </div>
  );
}
