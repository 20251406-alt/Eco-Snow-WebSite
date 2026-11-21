"use client";

import { useCallback, useEffect, useState } from "react";
import ReportMap from "./report-map";
import mapRegions from "./report-regions.json";

const outlineRegions = mapRegions.map((r) => ({
  id: r.id,
  name: r.name,
  polygon: r.poly,
  lat: r.center[0],
  lng: r.center[1],
}));
import {
  kst,
  statuses,
  types,
  type Report,
  type Snapshot,
} from "./report-types";

async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/reports/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response
    .json()
    .catch(() => ({ error: "제보 서버 응답을 읽지 못했습니다." }));
  if (!response.ok) {
    const message =
      response.status === 401
        ? "기관 관리자 로그인이 필요합니다."
        : (data as { error?: string }).error || "제보 요청이 실패했습니다.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data as T;
}

const isPending = (r: Report) =>
  r.status === "pending" || r.status === "needs_review";
const day = (value: string | number) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export default function ReportWorkspace({
  home,
  estimates,
  demoEstimates,
  season,
  savings,
  onMap,
  onWork,
}: {
  home: boolean;
  estimates: {id: string; name: string; kg: number}[];
  demoEstimates: boolean;
  season: string;
  savings: string;
  onMap: () => void;
  onWork: (summary: string) => void;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [region, setRegion] = useState("");
  const [period, setPeriod] = useState("all");
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [weather, setWeather] = useState("");
  const [mode, setMode] = useState("demo");
  const [now, setNow] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await api<Snapshot>("snapshot");
      if (!snapshot.admin)
        throw Object.assign(new Error("기관 관리자 권한이 필요합니다."), {
          status: 403,
        });
      setData(snapshot);
      setNow(Date.now());
      setMessage("");
    } catch (error) {
      if ([401, 403].includes((error as { status?: number }).status ?? 0))
        setData(null);
      setMessage((error as Error).message);
    }
  }, []);
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const first = window.setTimeout(poll, 0);
    const timer = window.setInterval(poll, 3000);
    const renew = window.setInterval(
      () => void api("auth/refresh", {}).catch(() => {}),
      45 * 60000,
    );
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      clearInterval(renew);
    };
  }, [refresh]);

  const all =
    data?.reports.filter((r) => r.simulation === (mode === "demo")) ?? [];
  const reports = all.filter(
    (r) =>
      (!region || r.region_id === region) &&
      (!filter || r.status === filter) &&
      (!kind || r.type === kind) &&
      (!score || (r.assessment?.score ?? -1) >= Number(score)) &&
      (period === "all" ||
        now - new Date(r.created_at).getTime() <= Number(period) * 3600000),
  );
  const current = reports.find((r) => r.id === selected);
  const nameOf = (id: string) =>
    data?.regions.find((r) => r.id === id)?.name ?? "미분류";
  const snowByRegion = new Map<string, number>();
  for (const report of reports) {
    if (report.type === "snow" && report.answer && report.status === "approved")
      snowByRegion.set(
        report.region_id,
        (snowByRegion.get(report.region_id) ?? 0) + 1,
      );
  }
  const hotspot = [...snowByRegion.entries()].sort((a, b) => b[1] - a[1])[0];
  const select = (r: Report) => {
    setSelected(r.id);
    setNote(r.note);
    setWeather("");
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="native-reports"
      aria-label={home ? "기관 제설 현황" : "제보 지도와 검토"}
    >
      {home && (
        <div className="native-kpis">
          {[
            [
              "오늘 시민 제보",
              data
                ? all.filter((r) => day(r.created_at) === day(now)).length +
                  "건"
                : "—",
            ],
            [
              "관리자 확인 필요",
              data ? all.filter(isPending).length + "건" : "—",
            ],
            ["시즌 실제 사용량", season],
            ["전년 대비 절감률", savings],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
      {home && <ol className="poster-flow" aria-label="제설 검토 순서">
        <li><span>01</span> 기상 관측 참고</li>
        <li><span>02</span> 운전자 제보</li>
        <li><span>03</span> 현장 검증</li>
        <li><span>04</span> 살포량 산정</li>
      </ol>}
      <div className="native-report-head">
        <div>
          <span className="section-kicker">공주시 · 도로 제보</span>
          <h2>{home ? "눈길 현황" : "제보 지도"}</h2>
        </div>
        {data && (
          <div className="actions">
            <select
              aria-label="제보 데이터 구분"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="demo">시연용 제보</option>
              <option value="real">실제 제보</option>
            </select>
            <button
              onClick={() =>
                void run(async () => {
                  await api("auth/logout", {});
                  setData(null);
                })
              }
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
      {message && (
        <p className="native-report-status" role="status">
          {message}
        </p>
      )}
      {!data ? (
        <div className="native-map-layout">
          <ReportMap regions={outlineRegions} reports={[]} />
          <form
            className="native-report-card"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run(async () => {
                await api("auth", {
                  mode: "login",
                  email: form.get("email"),
                  password: form.get("password"),
                });
                await refresh();
              });
            }}
          >
            <h3>기관 관리자 로그인</h3>
            <label>
              이메일
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              비밀번호
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              로그인
            </button>
          </form>
        </div>
      ) : (
        <>
          {!home && (
            <div className="native-filters">
              <label>
                지역
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">공주시 전체</option>
                  {data.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                시간
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="all">전체 기간</option>
                  <option value="1">최근 1시간</option>
                  <option value="24">최근 24시간</option>
                  <option value="168">최근 7일</option>
                </select>
              </label>
              <details>
                <summary>상세 필터</summary>
                <label>
                  검토 상태
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">전체</option>
                    {Object.entries(statuses).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  제보 유형
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">전체</option>
                    {Object.entries(types).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  신뢰도
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  >
                    <option value="">전체</option>
                    <option value="50">50점 이상</option>
                    <option value="80">80점 이상</option>
                  </select>
                </label>
              </details>
            </div>
          )}
          <div className="native-map-layout">
            <ReportMap
              regions={data.regions}
              reports={reports}
              selected={selected}
              onSelect={(r) => {
                select(r);
                if (home) onMap();
              }}
              onRegion={home ? undefined : setRegion}
            />
            <aside className="native-report-card">
              {current && !home ? (
                <>
                  <div className="section-heading">
                    <h3>{nameOf(current.region_id)}</h3>
                    <button
                      aria-label="제보 상세 닫기"
                      onClick={() => setSelected("")}
                    >
                      ×
                    </button>
                  </div>
                  <p>
                    {types[current.type]} · {current.answer ? "예" : "아니오"} ·{" "}
                    {kst(current.created_at)}
                  </p>
                  <p>
                    <strong>
                      {current.assessment?.score == null
                        ? "판단 근거 부족"
                        : current.assessment.score + "점"}
                    </strong>{" "}
                    · {statuses[current.status]}
                  </p>
                  <details>
                    <summary>검증 근거와 검토 이력</summary>
                    <p>
                      규칙 기반 신뢰도 · 실제 정확도를 보장하는 확률이 아닙니다.
                    </p>
                    <ul>
                      {current.assessment?.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p>
                      동일 지역 제보{" "}
                      {
                        all.filter(
                          (r) =>
                            r.id !== current.id &&
                            r.region_id === current.region_id,
                        ).length
                      }
                      건 · 제보자 승인 이력{" "}
                      {
                        all.filter(
                          (r) =>
                            r.user_id === current.user_id &&
                            r.id !== current.id &&
                            r.status === "approved",
                        ).length
                      }
                      건
                    </p>
                    <button
                      onClick={() =>
                        void run(async () => {
                          const result = await api<{
                            available: boolean;
                            source?: string;
                            observed_at?: string;
                            values?: Record<string, string>;
                            message: string;
                          }>(
                            "weather?region=" +
                              encodeURIComponent(current.region_id),
                          );
                          setWeather(
                            result.available
                              ? [
                                  result.source,
                                  result.observed_at,
                                  result.values?.T1H != null
                                    ? result.values.T1H + "℃"
                                    : "",
                                  result.values?.PTY != null
                                    ? "강수형태 " + result.values.PTY
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : result.message,
                          );
                        })
                      }
                    >
                      기상청 관측 확인
                    </button>
                    {weather && <p role="status">{weather}</p>}
                    {current.photo_path && (
                      <p>
                        <a
                          href={
                            "/api/reports/photo?id=" +
                            encodeURIComponent(current.id)
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          현장 사진 보기 ↗
                        </a>
                      </p>
                    )}
                    {current.reviews.map((h) => (
                      <p key={h.id}>
                        {kst(h.created_at)} · {statuses[h.to_status]} · {h.note}
                      </p>
                    ))}
                  </details>
                  <label>
                    검토 메모
                    <textarea
                      value={note}
                      maxLength={2000}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    {[
                      ["approved", "승인"],
                      ["needs_review", "추가 확인"],
                      ["false", "반려(허위 판정)"],
                      ["duplicate", "중복"],
                    ].map(([status, label]) => (
                      <button
                        key={status}
                        disabled={busy || !note.trim()}
                        className={
                          status === "approved" ? "primary" : undefined
                        }
                        onClick={() => {
                          if (
                            status === "false" &&
                            !window.confirm(
                              "검토 근거에 따라 이 제보를 허위로 판정할까요?",
                            )
                          )
                            return;
                          void run(async () => {
                            await api("action", {
                              action: "review",
                              id: current.id,
                              status,
                              note,
                            });
                            await refresh();
                          });
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {current.status === "approved" && (
                    <button
                      onClick={() =>
                        onWork(
                          [
                            nameOf(current.region_id),
                            types[current.type],
                            kst(current.created_at),
                            current.simulation ? "시연" : "실제",
                          ].join(" · "),
                        )
                      }
                    >
                      현장 확인에 참고 →
                    </button>
                  )}
                </>
              ) : (
                <>
                  {home && <div className="poster-estimates">
                    <h3>구역별 현장 산정량</h3>
                    <small>{demoEstimates ? "시연 기준 · " : ""}구역별 최신 저장 산정값</small>
                    {estimates.length ? <ul>{estimates.map(item => (
                      <li key={item.id}>
                        <span>{item.name}</span><strong>{item.kg.toLocaleString("ko-KR", {maximumFractionDigits: 2})} kg</strong>
                        <i style={{width: (item.kg / Math.max(1, estimates[0].kg) * 100) + "%"}} />
                      </li>
                    ))}</ul> : <p>저장된 산정값이 없습니다.</p>}
                  </div>}
                  <h3>{home ? "최근 제보" : "제보 목록"}</h3>
                  {home && hotspot && (
                    <p>
                      <strong>승인 강설 제보 최다</strong>
                      <br />
                      {nameOf(hotspot[0])} · {hotspot[1]}건
                    </p>
                  )}
                  {!reports.length && (
                    <p>현재 조건에 해당하는 제보가 없습니다.</p>
                  )}
                  <ul className="native-report-list">
                    {reports.slice(0, home ? 3 : 15).map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => {
                            select(r);
                            if (home) onMap();
                          }}
                        >
                          <strong>
                            {nameOf(r.region_id)} · {types[r.type]}
                          </strong>
                          <small>
                            {kst(r.created_at)} · {statuses[r.status]} ·{" "}
                            {r.assessment?.score ?? "근거 부족"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {home && <button onClick={onMap}>제보 지도 열기 →</button>}
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
