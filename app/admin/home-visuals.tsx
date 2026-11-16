"use client";
import { useState } from "react";
import { homeMetrics } from "./home-metrics";
import { compare, type Store } from "./domain";
import { DEMO_ORG_ID, demoComparisonData } from "./demo";
const fmt = (n: number | null, unit = "") =>
  n === null
    ? "자료 없음"
    : n.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + unit;
const colors = ["#91a5b6", "#4285b5", "#31a89b", "#d9a340", "#087f73"];
export default function HomeVisuals({
  data,
  orgId,
  onNavigate,
}: {
  data: Store;
  orgId: string;
  onNavigate: (v: number) => void;
}) {
  const demo = orgId === DEMO_ORG_ID,
    m = homeMetrics(data, orgId, demo),
    comparison = compare(demo ? demoComparisonData(data) : data, orgId);
  const [month, setMonth] = useState(""),
    [zoneId, setZoneId] = useState("");
  const selected = m.months.find((x) => x.month === month);
  const max = Math.max(
      1,
      ...m.months.flatMap((x) => [x.expected ?? 0, x.actual ?? 0]),
    ),
    chart = { left: 58, top: 24, width: 600, height: 180 };
  const x = (i: number) =>
      chart.left +
      (m.months.length > 1
        ? (i / (m.months.length - 1)) * chart.width
        : chart.width / 2),
    y = (n: number) => chart.top + chart.height - (n / max) * chart.height;
  const segments = (key: "expected" | "actual") => {
    const lines: string[] = [];
    let current: string[] = [];
    m.months.forEach((a, i) => {
      if (a[key] === null) {
        if (current.length) lines.push(current.join(" "));
        current = [];
      } else current.push(`${x(i)},${y(a[key]!)}`);
    });
    if (current.length) lines.push(current.join(" "));
    return lines;
  };
  const total = m.status.reduce((n, s) => n + s.count, 0),
    done = m.status.at(-1)?.count || 0;
  const chosenZone = m.usageByZone.find((z) => z.id === zoneId),
    maxZone = Math.max(1, ...m.usageByZone.map((z) => z.kg ?? 0));
  return (
    <section className="home-visuals" aria-label="한눈에 보는 제설 현황">
      <div className="visual-heading">
        <div>
          <span className="section-kicker">
            {demo
              ? "시연 데이터 · 실제 기관 성과 아님"
              : "현재 기관의 저장된 기록"}
          </span>
          <h2>필요한 살포량부터 작업 현황까지, 한눈에</h2>
          <p>현재 조건의 예상량과 실제 소비 기록을 구분해 확인하세요.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            if (demo)
              document
                .getElementById("demo-dosage")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            else onNavigate(2);
          }}
        >
          {demo ? "조건 바꿔 살포량 예상" : "현장 기록·살포량 확인"}
        </button>
      </div>
      <div className="visual-kpis">
        {[
          {
            label: "현재 구역 안내량",
            value: fmt(m.expected, " kg"),
            note: "구역별 최신 저장 산정값 합계",
          },
          {
            label: "시즌 실제 소비량",
            value: fmt(m.actual, " kg"),
            note: "실제 사용·추가 살포 합계",
          },
          {
            label: "관리 구역",
            value: m.zones ? `${m.zones}곳` : "자료 없음",
            note: "현재 등록된 활성 구역",
          },
          {
            label: "확인이 필요한 작업",
            value: m.works ? `${m.pending}건` : "자료 없음",
            note: "작성·작업·후속 확인 미완료",
          },
        ].map((k) => (
          <article key={k.label}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>
              {k.note}
              {demo ? " · 데모" : ""}
            </small>
          </article>
        ))}
      </div>
      <div className="home-chart-grid">
        <article className="panel trend-panel">
          <div className="section-heading">
            <div>
              <h3>월별 안내량·실제 사용량</h3>
              <p>
                {m.start && m.end
                  ? `${m.start} ~ ${m.end}`
                  : "시즌 기간 설정 필요"}{" "}
                · 단위 kg
              </p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-expected" />
                작업별 안내량
              </span>
              <span>
                <i className="legend-actual" />
                실제 사용량
              </span>
            </div>
          </div>
          {m.months.some((v) => v.expected !== null || v.actual !== null) ? (
            <>
              <svg
                className="usage-chart"
                viewBox="0 0 700 255"
                role="img"
                aria-label="월별 안내량과 실제 사용량 선그래프. 월을 선택하면 상세 값이 표시됩니다."
              >
                {[0, 1, 2, 3, 4].map((t) => {
                  const val = (max * t) / 4,
                    yy = y(val);
                  return (
                    <g key={t}>
                      <line x1="58" x2="658" y1={yy} y2={yy} stroke="#e3ebe9" />
                      <text x="48" y={yy + 4} textAnchor="end">
                        {fmt(Math.round(val))}
                      </text>
                    </g>
                  );
                })}
                {segments("expected").map((points, i) => (
                  <polyline
                    key={"e" + i}
                    points={points}
                    fill="none"
                    stroke="#6790b6"
                    strokeWidth="3"
                    strokeDasharray="6 5"
                  />
                ))}
                {segments("actual").map((points, i) => (
                  <polyline
                    key={"a" + i}
                    points={points}
                    fill="none"
                    stroke="#087f73"
                    strokeWidth="3"
                  />
                ))}
                {m.months.map((v, i) => (
                  <g
                    key={v.month}
                    role="button"
                    tabIndex={0}
                    aria-label={`${v.month} 안내량 ${fmt(v.expected, " kg")}, 실제 ${fmt(v.actual, " kg")}`}
                    onClick={() => setMonth(v.month)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMonth(v.month);
                      }
                    }}
                  >
                    <rect
                      x={x(i) - 22}
                      y="10"
                      width="44"
                      height="210"
                      rx="5"
                      fill={month === v.month ? "#e4f4ed" : "transparent"}
                    />
                    {v.expected !== null && (
                      <circle
                        cx={x(i)}
                        cy={y(v.expected)}
                        r="5"
                        fill="#6790b6"
                        stroke="white"
                        strokeWidth="2"
                      />
                    )}
                    {v.actual !== null && (
                      <circle
                        cx={x(i)}
                        cy={y(v.actual)}
                        r="6"
                        fill="#087f73"
                        stroke="white"
                        strokeWidth="2"
                      />
                    )}
                    <text x={x(i)} y="237" textAnchor="middle">
                      {v.month.slice(5)}월
                    </text>
                    <title>
                      {v.month} · 안내 {fmt(v.expected, " kg")} / 실제{" "}
                      {fmt(v.actual, " kg")}
                    </title>
                  </g>
                ))}
              </svg>
              <p className="chart-selection" role="status">
                {selected
                  ? `${selected.month} · 안내량 ${fmt(selected.expected, " kg")} / 실제 ${fmt(selected.actual, " kg")}`
                  : "그래프의 점을 클릭하거나 키보드로 월을 선택해 상세 값을 확인하세요."}
              </p>
            </>
          ) : (
            <div className="empty-state">
              <h3>시각화할 사용 기록이 없습니다</h3>
              <p>
                시즌 기간과 현장 사용 기록을 등록하면 그래프가 나타납니다.
                누락값을 0으로 그리지 않습니다.
              </p>
              <button onClick={() => onNavigate(7)}>시즌·자료 등록</button>
            </div>
          )}
          <details className="chart-source">
            <summary>그래프 원자료 보기</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>월</th>
                    <th>안내량 (kg)</th>
                    <th>실제 사용량 (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {m.months.map((v) => (
                    <tr key={v.month}>
                      <td>{v.month}</td>
                      <td className="numeric">{fmt(v.expected)}</td>
                      <td className="numeric">{fmt(v.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <small>
            안내량은 해당 월 관찰 작업의 산정값 합계이며 실제 사용량·필요량의
            검증 정답과 다릅니다.
          </small>
        </article>
        <article className="panel completion-panel">
          <h3>작업 진행 현황</h3>
          <p>
            전체 저장 작업 {total ? `${total}건` : "자료 없음"}
            {demo ? " · 더미 기록" : ""}
          </p>
          {total ? (
            <div className="donut-wrap">
              <svg
                viewBox="0 0 180 180"
                role="img"
                aria-label={`완료 ${done}건, 미완료 ${total - done}건`}
              >
                <circle
                  cx="90"
                  cy="90"
                  r="66"
                  fill="none"
                  stroke="#edf2f0"
                  strokeWidth="18"
                />
                {m.status.map((s, i) => {
                  const percent = (s.count / total) * 100,
                    off =
                      (m.status
                        .slice(0, i)
                        .reduce((n, item) => n + item.count, 0) /
                        total) *
                      100;
                  return (
                    <circle
                      key={s.label}
                      cx="90"
                      cy="90"
                      r="66"
                      pathLength="100"
                      fill="none"
                      stroke={colors[i]}
                      strokeWidth="18"
                      strokeDasharray={`${percent} ${100 - percent}`}
                      strokeDashoffset={-off}
                      transform="rotate(-90 90 90)"
                    />
                  );
                })}
                <text x="90" y="85" textAnchor="middle" className="donut-value">
                  {Math.round((done / total) * 100)}%
                </text>
                <text x="90" y="108" textAnchor="middle">
                  기록 완료
                </text>
              </svg>
              <ul>
                {m.status.map((s, i) => (
                  <li key={s.label}>
                    <i style={{ background: colors[i] }} />
                    {s.label}
                    <strong>{s.count}건</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="empty-state">
              작업을 시작하면 상태별 비율을 표시합니다.
            </p>
          )}
          <button onClick={() => onNavigate(3)}>작업 이력 확인</button>
        </article>
      </div>
      <div className="home-bottom-grid">
        <article className="panel zone-chart">
          <div className="section-heading">
            <h3>구역별 실제 사용량</h3>
            <span className="status-badge">시즌 누적 · 상위 5곳</span>
          </div>
          {m.usageByZone.some((z) => z.kg !== null) ? (
            m.usageByZone.slice(0, 5).map((z) => (
              <button
                className="zone-bar"
                key={z.id}
                onClick={() => setZoneId(z.id)}
                aria-pressed={zoneId === z.id}
              >
                <span>{z.name}</span>
                <span className="zone-bar-track">
                  <i
                    style={{
                      width: `${z.kg === null ? 0 : (z.kg / maxZone) * 100}%`,
                    }}
                  />
                </span>
                <strong>{fmt(z.kg, " kg")}</strong>
              </button>
            ))
          ) : (
            <p>구역별 실제 소비 자료 없음</p>
          )}
          <p className="chart-selection">
            {chosenZone
              ? `${chosenZone.name} · 관리 면적 ${fmt(chosenZone.area, " ㎡")} · 사용량 ${fmt(chosenZone.kg, " kg")}`
              : "막대를 선택하면 해당 구역의 면적과 소비량을 확인할 수 있습니다."}
          </p>
        </article>
        <article className="panel yearly-visual">
          <span className="section-kicker">
            전년도 같은 기간 비교{demo ? " · 데모 미리보기" : ""}
          </span>
          <h3>사용량 변화</h3>
          {comparison.previous !== null && comparison.current.kg !== null ? (
            <>
              <div className="yearly-numbers">
                <div>
                  <span>전년도</span>
                  <strong>{fmt(comparison.previous, " kg")}</strong>
                </div>
                <div>
                  <span>올해</span>
                  <strong>{fmt(comparison.current.kg, " kg")}</strong>
                </div>
              </div>
              <p className="yearly-change">
                {fmt(comparison.savings, " %")}{" "}
                <span>절감률 · 사용 증가 시 음수 표시</span>
              </p>
              <p>{comparison.status} · 수치 비교와 보상 확정은 별개입니다.</p>
            </>
          ) : (
            <p className="empty-state">
              전년도·올해 실제 사용 자료가 모두 있어야 비교할 수 있습니다.
            </p>
          )}
          <button onClick={() => onNavigate(4)}>비교 리포트 자세히</button>
        </article>
      </div>
    </section>
  );
}
