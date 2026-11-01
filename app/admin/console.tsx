"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  addApplication,
  evaluationBasis,
  blankObservation,
  calculate,
  compare,
  defaultSettings,
  emptyStore,
  id,
  now,
  numeric,
  stages,
  stamp,
  transition,
  unavailableAnalyzer,
  actualUsage,
  type Store,
  type Work,
  type Zone,
  type Photo,
  type Criterion,
  type Policy,
  type Season,
} from "./domain";
import {
  decodeStore,
  getPhoto,
  putPhoto,
  saveStore,
  STORAGE_KEY,
} from "./storage";

const menus = [
  "홈 대시보드",
  "관리 구역",
  "현장 확인·정량 살포",
  "작업 이력",
  "절약 리포트",
  "기관 성장·보상",
  "기관 설정",
];
const fmt = (n: number | null, unit = "") =>
  n === null
    ? "자료 없음"
    : `${n.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}${unit}`;
const localTime = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-label"?: string }>, {
            "aria-label": label,
          })
        : children}
    </label>
  );
}
function Text({
  name,
  label,
  required = false,
  value = "",
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  value?: string | number;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={type === "number" ? "any" : undefined}
      />
    </Field>
  );
}
function NumberInput({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  min?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="any"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="미측정·미입력"
      />
    </Field>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">선택 필요</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
}
function Checked({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (s: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel admin-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function fields(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  return {
    get: (key: string) => String(data.get(key) ?? "").trim(),
    has: (key: string) => data.has(key),
  };
}
function must(value: string, label: string) {
  if (!value) throw new Error(`${label}을(를) 입력하세요.`);
  return value;
}
function num(value: string, label: string, positive = false) {
  const n = numeric(value, 0, positive);
  if (n === null)
    throw new Error(
      `${label}: 유효한 ${positive ? "양수" : "0 이상 수"}를 입력하세요.`,
    );
  return n;
}

function PhotoField({
  orgId,
  photo,
  onChange,
  capturedAt,
  notify,
}: {
  orgId: string;
  photo: Photo | null;
  onChange: (p: Photo) => boolean | void;
  capturedAt: string;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const p: Photo = { id: id(), name: file.name, capturedAt };
      await putPhoto(orgId, p, file);
      if (onChange(p) === false) {
        throw new Error(
          "사진 원본은 로컬에 저장됐지만 작업 연결에 실패했습니다. 저장 권한이나 다른 탭의 변경을 확인해 주세요.",
        );
      }
      notify(
        "사진을 이 기기의 IndexedDB에 저장했습니다. 촬영 시각은 직접 확인해 주세요.",
      );
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function view() {
    try {
      const blob = photo && (await getPhoto(orgId, photo.id));
      if (!blob)
        throw new Error(
          "이 기기에서 사진을 찾을 수 없습니다. 다시 등록하거나 수동 기록 사유를 남기세요.",
        );
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      notify(String(e));
    }
  }
  return (
    <div className="photo-field">
      <Field label="사진 등록 (선택, 이미지 8MB 이하)">
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Field>
      {busy && <p role="status">사진 저장 중…</p>}
      {photo && (
        <button type="button" onClick={() => void view()}>
          사진 보기: {photo.name}
        </button>
      )}
      <small>
        사진 분석 AI 미연결 · 사진만으로 면적과 깊이를 산정하지 않습니다.
      </small>
    </div>
  );
}

export default function AdminConsole() {
  const [data, setData] = useState<Store>(emptyStore);
  const [loaded, setLoaded] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [view, setView] = useState(0);
  const [message, setMessage] = useState("");
  const [workId, setWorkId] = useState("");
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [criterionId, setCriterionId] = useState("");
  const persisted = useRef<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = decodeStore(raw);
        persisted.current = raw;
        setData(state);
        setOrgId(state.organizations[0]?.id ?? "");
        setLoaded(true);
      } catch (e) {
        setMessage(String(e));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function change(next: Store, action: string, selectedOrg = orgId) {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== persisted.current)
        throw new Error(
          "다른 탭에서 데이터가 변경됐습니다. 새로고침 후 다시 작업하세요. 현재 탭은 덮어쓰지 않습니다.",
        );
      const saved = {
        ...next,
        audit: [...next.audit, { at: now(), orgId: selectedOrg, action }],
      };
      saveStore(localStorage, saved);
      persisted.current = JSON.stringify(saved);
      setData(saved);
      setMessage(`${action} · 이 브라우저에 저장됨`);
      return true;
    } catch (e) {
      setMessage(`저장 실패: ${String(e)}. 기존 저장 데이터는 유지됩니다.`);
      return false;
    }
  }
  const org = data.organizations.find((o) => o.id === orgId);
  const zones = data.zones.filter((z) => z.orgId === orgId && !z.archived);
  const products = data.products.filter((p) => p.orgId === orgId);
  const criteria = data.criteria.filter((c) => c.orgId === orgId);
  const works = data.works.filter((w) => w.orgId === orgId);
  const reports = data.reports.filter((r) => r.orgId === orgId);
  const work = works.find((w) => w.id === workId);
  const settings = data.settings[orgId] || defaultSettings();
  const report = compare(data, orgId);
  function setting(next: typeof settings) {
    change(
      { ...data, settings: { ...data.settings, [orgId]: next } },
      "기관 설정 수정",
    );
  }
  function updateWork(next: Work, action = "작업 기록 수정") {
    return change(
      {
        ...data,
        works: data.works.map((w) =>
          w.id === next.id && w.orgId === orgId
            ? { ...next, updatedAt: now() }
            : w,
        ),
      },
      action,
    );
  }
  function startWork(zoneId: string, reportId = "") {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return setMessage("관리 구역을 먼저 등록하세요.");
    const p = products.find((p) => p.id === zone.productId) || null;
    const w: Work = {
      ...stamp(),
      orgId,
      zone: structuredClone(zone),
      product: p ? structuredClone(p) : null,
      observation: blankObservation(),
      calculation: null,
      stage: "작성 중",
      applications: [],
      followup: null,
      operator: org?.administrator || "",
      note: "",
      demo: reports.find((r) => r.id === reportId)?.demo ?? false,
      reportId,
      confirmedAt: null,
    };
    if (change({ ...data, works: [...data.works, w] }, "현장 기록 시작")) {
      setWorkId(w.id);
      setCriterionId("");
      setView(2);
    }
  }
  function observation(
    key: keyof Work["observation"],
    value: string | boolean | Photo,
  ) {
    if (!work) return;
    return updateWork({
      ...work,
      observation: { ...work.observation, [key]: value },
      calculation: null,
    });
  }
  function attempt(fn: () => void) {
    try {
      fn();
    } catch (e) {
      setMessage(String(e));
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ecosnow-local-records.json";
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      "기록 JSON을 내보냈습니다. 사진 원본은 포함되지 않습니다. 모든 로컬 기관의 기록이 포함됩니다.",
    );
  }
  return (
    <div className="app-shell admin-console">
      <aside className="sidebar">
        <a className="brand" href="#content">
          <span className="brand-mark">❄</span>
          <span>
            <strong>ECOSNOW</strong>
            <small>Snow Signal</small>
          </span>
        </a>
        <nav aria-label="관리자 메뉴">
          {menus.map((m, i) => (
            <button
              key={m}
              className={view === i ? "active" : ""}
              onClick={() => setView(i)}
            >
              {m}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <span>PHASE 1 → PHASE 2</span>
          <strong>
            기록에서 시작하는
            <br />
            적정 살포
          </strong>
          <p>필요한 제설을 유지하고 과다 사용을 줄입니다.</p>
        </div>
      </aside>
      <main className="main" id="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FIELD OPERATIONS · ADMIN</p>
            <h1>{menus[view]}</h1>
          </div>
          <Field label="현재 기관 (로컬 구분)">
            <select
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setWorkId("");
                setEditingZone(null);
                setCriterionId("");
              }}
            >
              {!data.organizations.length && (
                <option value="">기관 등록 필요</option>
              )}
              {data.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
        </header>
        <p className="scope-banner">
          로컬 기록 모드 · 인증·서버 동기화 없음 · 같은 브라우저 사용자에게 모든
          로컬 기관이 보입니다. 기관 선택은 보안 권한이 아닙니다. 사진은 이
          기기의 IndexedDB에 저장됩니다.
        </p>
        <div className="admin-notice" role="status" aria-live="polite">
          {message ||
            (loaded
              ? "저장 준비 완료 · 실제 AI·티맵 연동 없음"
              : "기존 저장 자료를 확인하는 중입니다.")}
        </div>
        {!loaded ? (
          <p>
            저장소를 읽을 수 없으면 브라우저 저장 권한을 확인하세요. 손상된 기존
            자료를 자동으로 초기화하지 않습니다.
          </p>
        ) : (
          <>
            {(!org || view === 6) && (
              <Panel title="기관·관리자 등록">
                <form
                  onSubmit={(e) =>
                    attempt(() => {
                      const f = fields(e);
                      const o = {
                        ...stamp(),
                        name: must(f.get("name"), "기관명"),
                        administrator: must(f.get("administrator"), "관리자"),
                      };
                      if (
                        change(
                          {
                            ...data,
                            organizations: [...data.organizations, o],
                            settings: {
                              ...data.settings,
                              [o.id]: defaultSettings(),
                            },
                          },
                          "기관 등록",
                          o.id,
                        )
                      ) {
                        setOrgId(o.id);
                        e.currentTarget.reset();
                      }
                    })
                  }
                >
                  <div className="admin-grid">
                    <Text name="name" label="기관명" required />
                    <Text name="administrator" label="관리자" required />
                  </div>
                  <button>기관 등록</button>
                </form>
              </Panel>
            )}
            {org && (
              <>
                {view === 0 && (
                  <>
                    <section className="metrics">
                      <article>
                        <div>
                          <small>등록 관리 구역</small>
                          <strong>
                            {zones.length ? `${zones.length}곳` : "자료 없음"}
                          </strong>
                        </div>
                      </article>
                      <article>
                        <div>
                          <small>확인 요청 제보</small>
                          <strong>
                            {reports.length
                              ? reports.filter((r) => r.status === "확인 요청")
                                  .length
                              : "자료 없음"}
                          </strong>
                        </div>
                      </article>
                      <article>
                        <div>
                          <small>진행 중 작업</small>
                          <strong>
                            {works.length
                              ? works.filter((w) => w.stage !== "기록 완료")
                                  .length
                              : "자료 없음"}
                          </strong>
                        </div>
                      </article>
                      <article>
                        <div>
                          <small>시즌 실제 사용량</small>
                          <strong>{fmt(report.current.kg, " kg")}</strong>
                          <p>구매량·재고량 제외 / 데모 제외</p>
                        </div>
                      </article>
                    </section>
                    <Panel title="현장 업무 시작">
                      <p>
                        P1은 제품 사용 기록과 결과 축적, P2는 확인된 적용 기준에
                        따른 산정을 지원합니다. 학습 모델의 최적화 기능은
                        구현되지 않았습니다.
                      </p>
                      <div className="actions">
                        <button onClick={() => setView(2)}>
                          현장 기록 시작
                        </button>
                        <button onClick={() => setView(2)}>살포량 안내</button>
                      </div>
                      <p>
                        입력 누락·후속 확인 미완료:{" "}
                        {works.filter((w) => w.stage !== "기록 완료").length}건
                        · 절약 평가: {report.status} · 단계:{" "}
                        {report.stage === null
                          ? "확정 보류"
                          : `${report.stage}단계 평가 가능`}
                      </p>
                    </Panel>
                    <Panel title="구역별 확인 우선순위">
                      <p>
                        담당자가 지정한 중요 구역과 미확인 제보를 먼저
                        표시합니다. 위험도 점수는 사용하지 않습니다.
                      </p>
                      {[...zones]
                        .sort(
                          (a, b) => Number(b.important) - Number(a.important),
                        )
                        .map((z) => (
                          <div className="list-row" key={z.id}>
                            <strong>{z.name}</strong>
                            <span>
                              {z.important
                                ? "담당자 지정 중요 구역"
                                : "일반 구역"}{" "}
                              · 미확인 제보{" "}
                              {
                                reports.filter(
                                  (r) =>
                                    r.zoneId === z.id &&
                                    r.status === "확인 요청",
                                ).length
                              }
                              건
                            </span>
                            <button onClick={() => startWork(z.id)}>
                              현장 확인
                            </button>
                          </div>
                        ))}
                      {!zones.length && <p>관리 구역 자료 없음</p>}
                    </Panel>
                  </>
                )}
                {view === 1 && (
                  <>
                    <Panel
                      title={editingZone ? "관리 구역 수정" : "관리 구역 등록"}
                    >
                      <p>
                        카메라 없이 등록할 수 있습니다. 면적 단위는 ㎡로
                        통일합니다. 수정은 새 작업에만 반영되며 과거 기록의 구역
                        사본은 유지됩니다.
                      </p>
                      <form
                        key={editingZone?.id || "new"}
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const z: Zone = {
                              ...(editingZone || stamp()),
                              orgId,
                              name: must(f.get("name"), "구역명"),
                              location: must(f.get("location"), "위치"),
                              area: num(f.get("area"), "면적", true),
                              boundary: must(
                                f.get("boundary"),
                                "경계·촬영 범위",
                              ),
                              use: must(f.get("use"), "용도"),
                              features: f.get("features"),
                              important: f.has("important"),
                              productId: f.get("product"),
                              updatedAt: now(),
                            };
                            if (
                              change(
                                {
                                  ...data,
                                  zones: editingZone
                                    ? data.zones.map((v) =>
                                        v.id === z.id ? z : v,
                                      )
                                    : [...data.zones, z],
                                },
                                "관리 구역 저장",
                              )
                            ) {
                              setEditingZone(null);
                              e.currentTarget.reset();
                            }
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Text
                            name="name"
                            label="구역명"
                            required
                            value={editingZone?.name}
                          />
                          <Text
                            name="location"
                            label="위치"
                            required
                            value={editingZone?.location}
                          />
                          <Text
                            name="area"
                            label="관리 면적 (㎡)"
                            type="number"
                            required
                            value={editingZone?.area}
                          />
                          <Text
                            name="boundary"
                            label="경계·촬영 범위 식별 정보"
                            required
                            value={editingZone?.boundary}
                          />
                          <Text
                            name="use"
                            label="용도 (보행로·진입로 등)"
                            required
                            value={editingZone?.use}
                          />
                          <Text
                            name="features"
                            label="경사·그늘·바닥 재질"
                            value={editingZone?.features}
                          />
                          <Field label="기본 제품">
                            <select
                              name="product"
                              defaultValue={editingZone?.productId || ""}
                            >
                              <option value="">미설정</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} · {p.batch}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <label className="check">
                            <input
                              name="important"
                              type="checkbox"
                              defaultChecked={editingZone?.important}
                            />
                            담당자 지정 중요 구역
                          </label>
                        </div>
                        <button>구역 저장</button>
                        {editingZone && (
                          <button
                            type="button"
                            onClick={() => setEditingZone(null)}
                          >
                            수정 취소
                          </button>
                        )}
                      </form>
                    </Panel>
                    <Panel title="등록 구역">
                      {zones.map((z) => (
                        <div key={z.id} className="list-row">
                          <div>
                            <strong>{z.name}</strong>
                            <p>
                              {org.name} · {z.location} · {fmt(z.area, " ㎡")} ·{" "}
                              {z.boundary}
                            </p>
                            <small>
                              {z.use} / {z.features || "특성 미입력"}
                            </small>
                          </div>
                          <div className="actions">
                            <button onClick={() => setEditingZone(z)}>
                              수정
                            </button>
                            <button onClick={() => startWork(z.id)}>
                              기록 시작
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "구역을 보관 처리할까요? 과거 작업은 유지됩니다.",
                                  )
                                )
                                  change(
                                    {
                                      ...data,
                                      zones: data.zones.map((v) =>
                                        v.id === z.id
                                          ? {
                                              ...v,
                                              archived: true,
                                              updatedAt: now(),
                                            }
                                          : v,
                                      ),
                                    },
                                    "구역 보관",
                                  );
                              }}
                            >
                              보관
                            </button>
                          </div>
                        </div>
                      ))}
                      {!zones.length && <p>자료 없음</p>}
                    </Panel>
                  </>
                )}
                {view === 2 && (
                  <>
                    <Panel title="현장 기록 선택">
                      <Field label="관리 구역">
                        <select
                          value=""
                          onChange={(e) => startWork(e.target.value)}
                        >
                          <option value="">구역 선택 → 새 기록 작성</option>
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="작성 중·기존 작업 열기">
                        <select
                          value={workId}
                          onChange={(e) => {
                            setWorkId(e.target.value);
                            setCriterionId("");
                          }}
                        >
                          <option value="">작업 선택</option>
                          {works.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.zone.name} · {w.stage} · {w.id.slice(0, 8)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </Panel>
                    {work && (
                      <>
                        <Panel title={`${work.zone.name} · ${work.stage}`}>
                          <p>
                            작업 {work.id} · 기관 {org.name} · 당시 면적{" "}
                            {work.zone.area} ㎡ ·{" "}
                            {work.demo ? "데모 (실적 제외)" : "실제 기록"}
                          </p>
                          <p>
                            당시 구역 범위: {work.zone.boundary} ·{" "}
                            {work.zone.features}
                          </p>
                          <ol className="steps">
                            {stages.map((s) => (
                              <li
                                key={s}
                                aria-current={
                                  s === work.stage ? "step" : undefined
                                }
                              >
                                {s}
                              </li>
                            ))}
                          </ol>
                          {work.stage !== "작성 중" && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "현장 입력을 다시 수정할까요? 이전 산정은 초기화되고 실제 사용 이력은 보존됩니다.",
                                  )
                                )
                                  updateWork(
                                    {
                                      ...work,
                                      stage: "작성 중",
                                      calculation: null,
                                    },
                                    "현장 입력 재확인",
                                  );
                              }}
                            >
                              현장 입력 수정으로 돌아가기
                            </button>
                          )}
                          <fieldset disabled={work.stage !== "작성 중"}>
                            <legend>1. 현재 관찰 (입력할 때 자동 저장)</legend>
                            <div className="admin-grid">
                              <Select
                                label="눈·얼음 상태"
                                value={work.observation.state}
                                onChange={(v) => observation("state", v)}
                                options={[
                                  "적설",
                                  "잔설",
                                  "얼음",
                                  "눈·얼음 없음",
                                ]}
                              />
                              <Select
                                label="사전 눈 제거"
                                value={work.observation.removal}
                                onChange={(v) => observation("removal", v)}
                                options={["미제거", "일부 제거", "대부분 제거"]}
                              />
                              <NumberInput
                                label="실측 적설 깊이 (cm)"
                                value={work.observation.depth}
                                onChange={(v) => observation("depth", v)}
                              />
                              <NumberInput
                                label="실제 처리 면적 (㎡)"
                                value={work.observation.area}
                                onChange={(v) => observation("area", v)}
                              />
                              <NumberInput
                                label="노면 온도 (℃)"
                                min={-100}
                                value={work.observation.temperature}
                                onChange={(v) => observation("temperature", v)}
                              />
                              <Select
                                label="관찰값 출처"
                                value={work.observation.source}
                                onChange={(v) => {
                                  updateWork({
                                    ...work,
                                    demo: v === "데모" || work.demo,
                                    observation: {
                                      ...work.observation,
                                      source:
                                        v as Work["observation"]["source"],
                                    },
                                    calculation: null,
                                  });
                                }}
                                options={["현장 측정", "관리자 입력", "데모"]}
                              />
                              <Field label="관찰·촬영 시각">
                                <input
                                  type="datetime-local"
                                  value={work.observation.capturedAt}
                                  onChange={(e) =>
                                    observation("capturedAt", e.target.value)
                                  }
                                />
                              </Field>
                              <Field label="담당자">
                                <input
                                  value={work.operator}
                                  onChange={(e) =>
                                    updateWork({
                                      ...work,
                                      operator: e.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="사용 제품·배치">
                                <select
                                  value={work.product?.id || ""}
                                  onChange={(e) => {
                                    const p = products.find(
                                      (p) => p.id === e.target.value,
                                    );
                                    updateWork({
                                      ...work,
                                      product: p ? structuredClone(p) : null,
                                      calculation: null,
                                    });
                                    setCriterionId("");
                                  }}
                                >
                                  <option value="">제품 선택</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} · {p.batch}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="사진 없이 수동 기록하는 사유">
                                <textarea
                                  value={work.observation.manualReason}
                                  onChange={(e) =>
                                    observation("manualReason", e.target.value)
                                  }
                                />
                              </Field>
                            </div>
                            <PhotoField
                              orgId={orgId}
                              photo={work.observation.before}
                              capturedAt={work.observation.capturedAt}
                              onChange={(p) => observation("before", p)}
                              notify={setMessage}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (work.observation.before)
                                  void unavailableAnalyzer
                                    .analyze(work.observation.before, work.zone)
                                    .then((r) => setMessage(r.uncertainty));
                                else
                                  setMessage(
                                    "사진 미등록. 수동 관찰값과 사유를 입력할 수 있습니다.",
                                  );
                              }}
                            >
                              사진 분석 가능 여부 확인
                            </button>
                            <Checked
                              label="사진·수동 관찰 범위와 구역 경계를 직접 확인했습니다"
                              checked={work.observation.rangeConfirmed}
                              onChange={(v) => observation("rangeConfirmed", v)}
                            />
                            <Checked
                              label="데모 기록 (시즌 실적에서 제외)"
                              checked={work.demo}
                              onChange={(v) => {
                                if (
                                  !v &&
                                  (work.observation.source === "데모" ||
                                    reports.find((r) => r.id === work.reportId)
                                      ?.demo)
                                )
                                  return setMessage(
                                    "데모 관찰값·제보에 연결된 기록은 실제 실적으로 변경할 수 없습니다.",
                                  );
                                updateWork({
                                  ...work,
                                  demo: v,
                                  calculation: null,
                                });
                              }}
                            />
                          </fieldset>
                          {work.reportId && (
                            <p>
                              연결 제보:{" "}
                              {
                                reports.find((r) => r.id === work.reportId)
                                  ?.content
                              }{" "}
                              · 제보는 측정값을 대신하지 않습니다.
                            </p>
                          )}
                          <Field label="담당자 메모">
                            <textarea
                              value={work.note}
                              onChange={(e) =>
                                updateWork({ ...work, note: e.target.value })
                              }
                            />
                          </Field>
                        </Panel>
                        <Panel title="2. 정량 살포 산정 또는 보류">
                          <Field label="제품별 적용 기준">
                            <select
                              value={criterionId}
                              onChange={(e) => setCriterionId(e.target.value)}
                            >
                              <option value="">기준 미등록·선택 필요</option>
                              {criteria
                                .filter((c) => c.productId === work.product?.id)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.source} · {c.rate} g/㎡ ·{" "}
                                    {c.verified
                                      ? "담당자 검증 확인"
                                      : "관리자 입력"}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          <button
                            onClick={() => {
                              const c =
                                criteria.find((c) => c.id === criterionId) ||
                                null;
                              updateWork(
                                {
                                  ...work,
                                  calculation: calculate(
                                    work.zone,
                                    work.product,
                                    c,
                                    work.observation,
                                  ),
                                },
                                "산정 근거 저장",
                              );
                            }}
                          >
                            입력 확인·산정
                          </button>
                          {work.calculation ? (
                            <div className="calculation">
                              <h3>{work.calculation.label}</h3>
                              <strong>{fmt(work.calculation.kg, " kg")}</strong>
                              <p>{work.calculation.formula}</p>
                              <p>
                                입력: {work.calculation.inputs.area || "미측정"}{" "}
                                ㎡ · {work.calculation.inputs.depth || "미측정"}{" "}
                                cm ·{" "}
                                {work.calculation.inputs.temperature ||
                                  "미측정"}{" "}
                                ℃ · {work.calculation.inputs.source}
                              </p>
                              <p>
                                출처:{" "}
                                {work.calculation.criterion?.source ||
                                  "기준 미등록"}{" "}
                                / 확인자:{" "}
                                {work.calculation.criterion?.confirmedBy ||
                                  "미확인"}
                              </p>
                              <ul>
                                {work.calculation.reasons.map((r) => (
                                  <li key={r}>{r}</li>
                                ))}
                              </ul>
                              <small>
                                담당자 최종 확인이 필요합니다. 산정 보류
                                상태여도 P1 실제 사용 기록은 남길 수 있습니다.
                              </small>
                            </div>
                          ) : (
                            <p>
                              아직 산정하지 않았습니다. 기준·측정값이 없으면
                              숫자를 만들지 않습니다.
                            </p>
                          )}
                          <button
                            onClick={() =>
                              attempt(() => {
                                const next = transition(work);
                                const r = data.reports.map((r) =>
                                  r.id === work.reportId
                                    ? {
                                        ...r,
                                        status: "현장 확인" as const,
                                        updatedAt: now(),
                                      }
                                    : r,
                                );
                                change(
                                  {
                                    ...data,
                                    reports: r,
                                    works: data.works.map((w) =>
                                      w.id === work.id ? next : w,
                                    ),
                                  },
                                  `상태 전환: ${next.stage}`,
                                );
                              })
                            }
                            disabled={work.stage === "기록 완료"}
                          >
                            다음 상태로 진행
                          </button>
                        </Panel>
                        <Panel title="3. 실제 작업·추가 살포">
                          <p>
                            안내량과 실제 사용량은 별도입니다. 사용량은 이 아래
                            실제 기록만 집계합니다. 미살포는 0 kg과 사유를
                            기록하세요.
                          </p>
                          <form
                            key={`${work.id}-${work.applications.length}`}
                            onSubmit={(e) =>
                              attempt(() => {
                                const f = fields(e);
                                const p = products.find(
                                  (p) => p.id === f.get("product"),
                                );
                                if (!p) throw new Error("제품을 선택하세요.");
                                const a = {
                                  id: id(),
                                  product: structuredClone(p),
                                  kg: num(f.get("kg"), "실제 사용량"),
                                  area: num(
                                    f.get("area"),
                                    "실제 처리 면적",
                                    true,
                                  ),
                                  at: must(f.get("at"), "작업 시각"),
                                  cost:
                                    f.get("cost") === ""
                                      ? null
                                      : num(f.get("cost"), "실제 비용"),
                                  note: f.get("note"),
                                };
                                updateWork(
                                  addApplication(work, a),
                                  "실제 사용·추가 살포 등록",
                                );
                              })
                            }
                          >
                            <div className="admin-grid">
                              <Field label="실제 제품·배치">
                                <select
                                  name="product"
                                  required
                                  defaultValue={work.product?.id || ""}
                                >
                                  <option value="">선택</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} · {p.batch}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Text
                                name="kg"
                                label="실제 사용량 (kg)"
                                type="number"
                                required
                              />
                              <Text
                                name="area"
                                label="실제 처리 면적 (㎡)"
                                type="number"
                                required
                                value={work.observation.area}
                              />
                              <Text
                                name="at"
                                label="작업 시각"
                                type="datetime-local"
                                value={localTime()}
                                required
                              />
                              <Text
                                name="cost"
                                label="실제 사용 비용 (원, 없으면 미입력)"
                                type="number"
                              />
                              <Text
                                name="note"
                                label="작업·미살포·추가 처리 사유"
                              />
                            </div>
                            <button disabled={work.stage === "작성 중"}>
                              실제 사용 기록 추가
                            </button>
                          </form>
                          {work.applications.map((a) => (
                            <div className="list-row" key={a.id}>
                              <span>
                                {a.at} · {a.product.name}/{a.product.batch} ·{" "}
                                {a.area} ㎡ · {fmt(a.kg, " kg")} · 비용{" "}
                                {fmt(a.cost, " 원")} · {a.note}
                              </span>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "이 실제 사용 기록을 삭제할까요? 집계도 변경되고 후속 확인이 다시 필요합니다.",
                                    )
                                  )
                                    updateWork(
                                      {
                                        ...work,
                                        applications: work.applications.filter(
                                          (v) => v.id !== a.id,
                                        ),
                                        stage: "현장 확인",
                                        followup: null,
                                      },
                                      "실제 사용 기록 삭제",
                                    );
                                }}
                              >
                                삭제·정정
                              </button>
                            </div>
                          ))}
                          <p>
                            이 작업의 누적 실제 사용량:{" "}
                            {work.applications.length
                              ? fmt(
                                  work.applications.reduce(
                                    (n, a) => n + a.kg,
                                    0,
                                  ),
                                  " kg",
                                )
                              : "자료 없음"}
                          </p>
                        </Panel>
                        <Panel title="4. 후속 확인">
                          <p>
                            효과 부족과 추가 처리가 필요한 결과도 그대로
                            기록하세요.
                          </p>
                          <form
                            key={`${work.id}-${work.followup?.at || "new"}`}
                            onSubmit={(e) =>
                              attempt(() => {
                                const f = fields(e);
                                const followup = {
                                  photo: work.followup?.photo || null,
                                  manualReason: f.get("manualReason"),
                                  at: must(f.get("at"), "후속 확인 시각"),
                                  remaining: must(
                                    f.get("remaining"),
                                    "잔여 눈·얼음 관찰",
                                  ),
                                  removal: must(
                                    f.get("removal"),
                                    "추가 눈 제거 여부",
                                  ),
                                  note: f.get("note"),
                                };
                                updateWork(
                                  {
                                    ...work,
                                    followup,
                                    stage:
                                      work.stage === "기록 완료"
                                        ? "후속 확인 대기"
                                        : work.stage,
                                  },
                                  "후속 확인 저장",
                                );
                              })
                            }
                          >
                            <div className="admin-grid">
                              <Text
                                name="at"
                                label="확인·촬영 시각"
                                type="datetime-local"
                                value={work.followup?.at || localTime()}
                                required
                              />
                              <Text
                                name="remaining"
                                label="남은 눈·얼음·효과 부족 관찰"
                                value={work.followup?.remaining}
                                required
                              />
                              <Text
                                name="removal"
                                label="추가 눈 제거 여부·방법"
                                value={work.followup?.removal}
                                required
                              />
                              <Text
                                name="manualReason"
                                label="후속 사진이 없는 경우 수동 기록 사유"
                                value={work.followup?.manualReason}
                              />
                              <Text
                                name="note"
                                label="후속 메모"
                                value={work.followup?.note}
                              />
                            </div>
                            <button>후속 관찰 저장</button>
                          </form>
                          {work.followup && (
                            <PhotoField
                              orgId={orgId}
                              capturedAt={work.followup.at}
                              photo={work.followup.photo}
                              notify={setMessage}
                              onChange={(p) =>
                                updateWork(
                                  {
                                    ...work,
                                    followup: { ...work.followup!, photo: p },
                                  },
                                  "후속 사진 연결",
                                )
                              }
                            />
                          )}
                        </Panel>
                      </>
                    )}
                    <Panel title="선택 기관의 안내량 합계">
                      <p>
                        작업 ID별 최신 산정만 합산합니다. 동일 구역의 재작업은
                        별도 작업이므로 아래 건수를 확인하세요.
                      </p>
                      <p>
                        {
                          works.filter(
                            (w) =>
                              !w.demo &&
                              w.calculation?.kg !== null &&
                              w.calculation?.status === "calculated",
                          ).length
                        }
                        건 ·{" "}
                        {works.some(
                          (w) =>
                            !w.demo && w.calculation?.status === "calculated",
                        )
                          ? fmt(
                              works
                                .filter(
                                  (w) =>
                                    !w.demo &&
                                    w.calculation?.status === "calculated",
                                )
                                .reduce((n, w) => n + w.calculation!.kg!, 0),
                              " kg",
                            )
                          : "자료 없음"}
                      </p>
                    </Panel>
                  </>
                )}
                {view === 3 && (
                  <Panel title="작업 이력">
                    <p>구역·제품·면적·적용 기준은 당시 값으로 보관합니다.</p>
                    {works.map((w) => (
                      <div className="list-row" key={w.id}>
                        <div>
                          <strong>
                            {w.zone.name} · {w.stage} {w.demo && "· 데모"}
                          </strong>
                          <p>
                            {w.id} · 담당 {w.operator || "미입력"} · 안내{" "}
                            {fmt(w.calculation?.kg ?? null, " kg")} · 실제{" "}
                            {w.applications.length
                              ? fmt(
                                  w.applications.reduce((n, a) => n + a.kg, 0),
                                  " kg",
                                )
                              : "자료 없음"}
                          </p>
                          <small>
                            생성 {w.createdAt} / 수정 {w.updatedAt} / 확인{" "}
                            {w.confirmedAt || "미확인"}
                          </small>
                        </div>
                        <div className="actions">
                          <button
                            onClick={() => {
                              setWorkId(w.id);
                              setCriterionId("");
                              setView(2);
                            }}
                          >
                            조회·수정
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "작업을 삭제하면 실제 사용 집계에서도 제외됩니다. 계속할까요?",
                                )
                              )
                                change(
                                  {
                                    ...data,
                                    works: data.works.filter(
                                      (v) => v.id !== w.id,
                                    ),
                                  },
                                  `작업 삭제 ${w.id}`,
                                );
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                    {!works.length && <p>자료 없음</p>}
                  </Panel>
                )}
                {view === 4 && (
                  <>
                    <Panel
                      title={
                        settings.season.ended
                          ? "시즌 사용량 비교"
                          : "시즌 누적 현황"
                      }
                    >
                      <p>
                        {settings.season.name || "시즌 미설정"} · 올해{" "}
                        {settings.season.start || "미설정"} ~{" "}
                        {settings.season.end || "미설정"} / 전년도{" "}
                        {settings.season.priorStart || "미설정"} ~{" "}
                        {settings.season.priorEnd || "미설정"}
                      </p>
                      <div className="metrics">
                        <article>
                          <div>
                            <small>전년도 실제 사용량</small>
                            <strong>{fmt(report.previous, " kg")}</strong>
                          </div>
                        </article>
                        <article>
                          <div>
                            <small>올해 실제 사용량</small>
                            <strong>{fmt(report.current.kg, " kg")}</strong>
                          </div>
                        </article>
                        <article>
                          <div>
                            <small>사용량 증감 (올해−전년)</small>
                            <strong>{fmt(report.delta, " kg")}</strong>
                          </div>
                        </article>
                        <article>
                          <div>
                            <small>절감률 (증가 시 음수)</small>
                            <strong>{fmt(report.savings, " %")}</strong>
                          </div>
                        </article>
                      </div>
                      <p>
                        전년도 비용 {fmt(report.priorCost, " 원")} · 올해 실제
                        사용 비용 {fmt(report.current.cost, " 원")} · 비용
                        절약액{" "}
                        {fmt(
                          report.priorCost !== null &&
                            report.current.cost !== null
                            ? report.priorCost - report.current.cost
                            : null,
                          " 원",
                        )}
                      </p>
                      <p>
                        사용량 절감률 = (전년도−올해) ÷ 전년도 × 100. 전년도
                        0·자료 없음은 산정하지 않습니다.
                      </p>
                      <p>
                        수치상 증감은 성과 확정과 다릅니다.
                        강설량·구역·면적·운영기간 차이를 검토해야 하며 환경
                        개선량으로 환산하지 않습니다.
                      </p>
                      <h3>{report.status}</h3>
                      <ul>
                        {report.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </Panel>
                    <Panel title="월별·구역별 실제 소비 추이">
                      <p>
                        전년도는 등록된 기간별 총량으로 비교합니다. 월별
                        원자료가 없으면 전년도 월별 추이를 생성하지 않습니다.
                      </p>
                      {[
                        ...new Set(
                          report.current.applications.map((a) =>
                            a.at.slice(0, 7),
                          ),
                        ),
                      ]
                        .sort()
                        .map((month) => {
                          const rows = report.current.applications.filter((a) =>
                            a.at.startsWith(month),
                          );
                          return (
                            <p key={month}>
                              <strong>{month}</strong> ·{" "}
                              {fmt(
                                rows.reduce((n, a) => n + a.kg, 0),
                                " kg",
                              )}{" "}
                              · 비용{" "}
                              {rows.every((a) => a.cost !== null)
                                ? fmt(
                                    rows.reduce((n, a) => n + a.cost!, 0),
                                    " 원",
                                  )
                                : "자료 없음"}
                            </p>
                          );
                        })}
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>작업 시각</th>
                              <th>구역</th>
                              <th>실제 사용량</th>
                              <th>실제 비용</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.current.applications.map((a) => (
                              <tr key={`${a.workId}-${a.id}`}>
                                <td>{a.at}</td>
                                <td>{a.zoneName}</td>
                                <td>{fmt(a.kg, " kg")}</td>
                                <td>{fmt(a.cost, " 원")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!report.current.applications.length && <p>자료 없음</p>}
                      {zones.map((z) => {
                        const v = actualUsage(
                          works,
                          orgId,
                          settings.season.start,
                          settings.season.end,
                          z.id,
                        );
                        return (
                          <p key={z.id}>
                            {z.name} ({z.area} ㎡): {fmt(v.kg, " kg")}
                          </p>
                        );
                      })}
                    </Panel>
                  </>
                )}
                {view === 5 && (
                  <>
                    <Panel title="기관 4단계 성장·보상">
                      <p>
                        1·2·3단계: 제품·구독 할인 / 4단계: 할인 + 자체 실천 배지
                      </p>
                      <p>
                        운전자 마일리지·상위 3명 메달과는 별개입니다. 필요한
                        제설을 생략해서는 안 됩니다.
                      </p>
                      <div className="growth">
                        {[1, 2, 3, 4].map((n) => (
                          <article key={n}>
                            <h3>{n}단계</h3>
                            <p>
                              {settings.policy.finalized
                                ? `절감률 ${settings.policy.thresholds[n - 1] ?? "미설정"}% 이상`
                                : "기준 확정 예정"}
                            </p>
                            <p>
                              할인{" "}
                              {settings.policy.finalized &&
                              settings.policy.discounts[n - 1] !== null
                                ? `${settings.policy.discounts[n - 1]}%`
                                : "미설정"}
                            </p>
                          </article>
                        ))}
                      </div>
                      <h3>
                        {report.status} ·{" "}
                        {report.stage === null
                          ? "단계 확정 보류"
                          : `${report.stage}단계 평가 가능`}
                      </h3>
                      <ul>
                        {report.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <button
                        disabled={report.reasons.length > 0}
                        onClick={() => {
                          const ev = {
                            ...stamp(),
                            orgId,
                            season: settings.season.name,
                            status: "담당자 최종 확인",
                            stage: report.stage,
                            reasons: report.reasons,
                            verifiedBy: org.administrator,
                            savings: report.savings,
                            basis: evaluationBasis(data, orgId),
                          };
                          change(
                            { ...data, evaluations: [...data.evaluations, ev] },
                            "시즌 평가 확인 저장",
                          );
                        }}
                      >
                        담당자 최종 평가 확인
                      </button>
                    </Panel>
                    <Panel title="에코스노우 스마트 제설 실천 배지">
                      <p>
                        기관: {org.name} · 시즌:{" "}
                        {settings.season.name || "미설정"} · 단계:{" "}
                        {report.stage ?? "보류"}
                      </p>
                      <p>
                        검증 상태:{" "}
                        {report.reasons.length
                          ? "발급 보류"
                          : "담당자 평가 확인 필요"}
                      </p>
                      {!report.reasons.length &&
                        report.stage === 4 &&
                        data.evaluations.some(
                          (e) =>
                            e.orgId === orgId &&
                            e.season === settings.season.name &&
                            e.stage === 4 &&
                            e.savings === report.savings &&
                            e.basis === evaluationBasis(data, orgId),
                        ) && (
                          <strong className="badge">
                            4단계 자체 실천 배지 · 담당자 확인
                          </strong>
                        )}
                      <p>
                        에코스노우 자체 기준에 따른 실천 배지이며, 공인
                        환경인증이 아닙니다.
                      </p>
                      <button onClick={() => setView(4)}>
                        상세 절약 리포트
                      </button>
                    </Panel>
                  </>
                )}
                {view === 6 && (
                  <>
                    <Panel title="현재 기관 정보">
                      <form
                        key={org.id}
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            change(
                              {
                                ...data,
                                organizations: data.organizations.map((o) =>
                                  o.id === orgId
                                    ? {
                                        ...o,
                                        name: must(f.get("name"), "기관명"),
                                        administrator: must(
                                          f.get("administrator"),
                                          "관리자",
                                        ),
                                        updatedAt: now(),
                                      }
                                    : o,
                                ),
                              },
                              "기관 정보 수정",
                            );
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Text
                            name="name"
                            label="기관명"
                            value={org.name}
                            required
                          />
                          <Text
                            name="administrator"
                            label="관리자"
                            value={org.administrator}
                            required
                          />
                        </div>
                        <button>기관 정보 저장</button>
                      </form>
                    </Panel>
                    <Panel title="제품·제조 배치 관리">
                      <form
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const p = {
                              ...stamp(),
                              orgId,
                              name: must(f.get("name"), "제품명"),
                              batch: must(f.get("batch"), "제조 배치"),
                            };
                            if (
                              change(
                                { ...data, products: [...data.products, p] },
                                "제품·배치 등록",
                              )
                            )
                              e.currentTarget.reset();
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Text name="name" label="제품명" required />
                          <Text name="batch" label="제조 배치" required />
                        </div>
                        <button>제품 등록</button>
                      </form>
                      {products.map((p) => (
                        <p key={p.id}>
                          {p.name} · 배치 {p.batch}
                        </p>
                      ))}
                      <p>
                        배치 변경은 새 제품·배치로 등록합니다. 과거 작업의 제품
                        정보는 바뀌지 않습니다.
                      </p>
                    </Panel>
                    <Panel title="제품 적용 기준 관리">
                      <p>
                        조건별 출처와 확인자를 남깁니다. 검증 체크는 관리자의
                        자료 확인 표시이며 서비스가 자체 검증한 인증이 아닙니다.
                      </p>
                      <form
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const p = products.find(
                              (p) => p.id === f.get("product"),
                            );
                            if (!p) throw new Error("제품 선택 필요");
                            const minTemp = Number(
                                must(f.get("minTemp"), "최저 온도"),
                              ),
                              maxTemp = Number(
                                must(f.get("maxTemp"), "최고 온도"),
                              );
                            if (
                              !Number.isFinite(minTemp) ||
                              !Number.isFinite(maxTemp) ||
                              minTemp > maxTemp ||
                              minTemp < -100 ||
                              maxTemp > 100
                            )
                              throw new Error("노면 온도 범위를 확인하세요.");
                            const c: Criterion = {
                              ...stamp(),
                              orgId,
                              productId: p.id,
                              rate: num(f.get("rate"), "적용 기준", true),
                              source: must(f.get("source"), "출처"),
                              confirmedBy: must(f.get("confirmedBy"), "확인자"),
                              verified: f.has("verified"),
                              minTemp,
                              maxTemp,
                              maxDepth: num(
                                f.get("maxDepth"),
                                "최대 적설 깊이",
                              ),
                              conditions: must(
                                f.get("conditions"),
                                "적용 조건",
                              ),
                              removal: must(f.get("removal"), "사전 제거 조건"),
                              surface: must(f.get("surface"), "눈 상태 조건"),
                            };
                            if (
                              change(
                                { ...data, criteria: [...data.criteria, c] },
                                "적용 기준 등록",
                              )
                            )
                              e.currentTarget.reset();
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Field label="적용 제품·배치">
                            <select name="product" required>
                              <option value="">제품 선택</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} · {p.batch}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Text
                            name="rate"
                            label="적용 기준 (g/㎡)"
                            type="number"
                            required
                          />
                          <Text
                            name="source"
                            label="출처 문서·버전·페이지 또는 URL"
                            required
                          />
                          <Text
                            name="confirmedBy"
                            label="자료 확인 담당자"
                            required
                          />
                          <Text
                            name="minTemp"
                            label="노면 온도 최저 (℃)"
                            type="number"
                            required
                          />
                          <Text
                            name="maxTemp"
                            label="노면 온도 최고 (℃)"
                            type="number"
                            required
                          />
                          <Text
                            name="maxDepth"
                            label="허용 최대 적설 깊이 (cm)"
                            type="number"
                            required
                          />
                          <Text
                            name="conditions"
                            label="기타 적용 조건·불확실성 (작업 시 확인)"
                            required
                          />
                          <Field label="사전 제설 조건">
                            <select name="removal" required>
                              <option value="">선택</option>
                              {["미제거", "일부 제거", "대부분 제거"].map(
                                (v) => (
                                  <option key={v}>{v}</option>
                                ),
                              )}
                            </select>
                          </Field>
                          <Field label="눈·얼음 상태 조건">
                            <select name="surface" required>
                              <option value="">선택</option>
                              {["적설", "잔설", "얼음", "눈·얼음 없음"].map(
                                (v) => (
                                  <option key={v}>{v}</option>
                                ),
                              )}
                            </select>
                          </Field>
                          <label className="check">
                            <input type="checkbox" name="verified" />
                            출처의 검증된 제품 기준을 확인했습니다
                          </label>
                        </div>
                        <button>기준 저장</button>
                      </form>
                      {criteria.map((c) => (
                        <div className="list-row" key={c.id}>
                          <p>
                            {products.find((p) => p.id === c.productId)?.name} ·{" "}
                            {c.rate} g/㎡ · {c.source} · {c.minTemp}~{c.maxTemp}
                            ℃ / 최대 {c.maxDepth}cm / {c.removal} / {c.surface}{" "}
                            ·{" "}
                            {c.verified
                              ? "담당자 검증 확인"
                              : "관리자 입력 기준"}{" "}
                            · {c.confirmedBy}
                          </p>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "이 기준을 목록에서 제거할까요? 과거 산정 사본은 보존됩니다.",
                                )
                              )
                                change(
                                  {
                                    ...data,
                                    criteria: data.criteria.filter(
                                      (v) => v.id !== c.id,
                                    ),
                                  },
                                  "적용 기준 제거",
                                );
                            }}
                          >
                            제거·새 기준으로 정정
                          </button>
                        </div>
                      ))}
                    </Panel>
                    <Panel title="시즌·비교 기간·평가 확인">
                      <form
                        key={`season-${orgId}`}
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const season: Season = {
                              name: must(f.get("name"), "시즌명"),
                              start: must(f.get("start"), "시작일"),
                              end: must(f.get("end"), "종료일"),
                              priorStart: must(
                                f.get("priorStart"),
                                "전년도 시작일",
                              ),
                              priorEnd: must(
                                f.get("priorEnd"),
                                "전년도 종료일",
                              ),
                              ended: f.has("ended"),
                              comparable: f.has("comparable"),
                              complete: f.has("complete"),
                              necessaryWorkConfirmed: f.has("necessary"),
                            };
                            if (
                              season.start > season.end ||
                              season.priorStart > season.priorEnd
                            )
                              throw new Error("기간 순서를 확인하세요.");
                            setting({ ...settings, season });
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Text
                            name="name"
                            label="시즌명"
                            value={settings.season.name}
                            required
                          />
                          <Text
                            name="start"
                            label="올해 비교 시작"
                            type="date"
                            value={settings.season.start}
                            required
                          />
                          <Text
                            name="end"
                            label="올해 비교 종료"
                            type="date"
                            value={settings.season.end}
                            required
                          />
                          <Text
                            name="priorStart"
                            label="전년도 비교 시작"
                            type="date"
                            value={settings.season.priorStart}
                            required
                          />
                          <Text
                            name="priorEnd"
                            label="전년도 비교 종료"
                            type="date"
                            value={settings.season.priorEnd}
                            required
                          />
                        </div>
                        {[
                          ["ended", "시즌 종료 확인", settings.season.ended],
                          [
                            "comparable",
                            "강설·구역·운영 조건 차이를 검토하여 비교 가능함을 확인",
                            settings.season.comparable,
                          ],
                          [
                            "complete",
                            "실제 소비 자료 완성도 확인",
                            settings.season.complete,
                          ],
                          [
                            "necessary",
                            "필요한 제설을 생략하지 않았음을 확인",
                            settings.season.necessaryWorkConfirmed,
                          ],
                        ].map(([key, label, value]) => (
                          <label className="check" key={String(key)}>
                            <input
                              type="checkbox"
                              name={String(key)}
                              defaultChecked={Boolean(value)}
                            />
                            {label}
                          </label>
                        ))}
                        <button>시즌 설정 저장</button>
                      </form>
                    </Panel>
                    <Panel title="전년도 실제 사용 기록 (수동 등록)">
                      <p>
                        구매량·재고량 대신 실제 소비 자료만 입력하세요.
                        구역별·동일 비교 기간은 한 건으로 관리합니다.
                      </p>
                      <form
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const z = zones.find((z) => z.id === f.get("zone"));
                            if (!z) throw new Error("구역 선택 필요");
                            const start = must(f.get("start"), "시작일"),
                              end = must(f.get("end"), "종료일");
                            if (start > end)
                              throw new Error("기간 순서 확인 필요");
                            if (
                              data.prior.some(
                                (p) =>
                                  p.orgId === orgId &&
                                  p.zoneId === z.id &&
                                  p.start <= end &&
                                  p.end >= start,
                              )
                            )
                              throw new Error(
                                "동일 구역의 기간이 겹칩니다. 기존 기록을 삭제·정정하세요.",
                              );
                            const p = {
                              ...stamp(),
                              orgId,
                              season: must(f.get("season"), "시즌명"),
                              zoneId: z.id,
                              area: num(f.get("area"), "당시 관리 면적", true),
                              start,
                              end,
                              kg: num(f.get("kg"), "전년도 실제 사용량"),
                              cost:
                                f.get("cost") === ""
                                  ? null
                                  : num(f.get("cost"), "실제 비용"),
                              source: must(f.get("source"), "자료 출처"),
                              verified: f.has("verified"),
                            };
                            change(
                              { ...data, prior: [...data.prior, p] },
                              "전년도 실제 사용 기록 저장",
                            );
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Field label="비교 구역">
                            <select name="zone" required>
                              <option value="">선택</option>
                              {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Text name="season" label="전년도 시즌명" required />
                          <Text
                            name="start"
                            label="자료 시작일"
                            type="date"
                            required
                            value={settings.season.priorStart}
                          />
                          <Text
                            name="end"
                            label="자료 종료일"
                            type="date"
                            required
                            value={settings.season.priorEnd}
                          />
                          <Text
                            name="area"
                            label="당시 관리 면적 (㎡)"
                            type="number"
                            required
                          />
                          <Text
                            name="kg"
                            label="실제 사용량 (kg)"
                            type="number"
                            required
                          />
                          <Text
                            name="cost"
                            label="실제 사용 비용 (원, 선택)"
                            type="number"
                          />
                          <Text
                            name="source"
                            label="출처·원장·확인 근거"
                            required
                          />
                        </div>
                        <label className="check">
                          <input type="checkbox" name="verified" />
                          담당자가 원자료를 확인했습니다
                        </label>
                        <button>전년도 자료 등록</button>
                      </form>
                      {data.prior
                        .filter((p) => p.orgId === orgId)
                        .map((p) => (
                          <div className="list-row" key={p.id}>
                            <p>
                              {p.season} · {p.start}~{p.end} · {p.area} ㎡ ·{" "}
                              {p.kg} kg · {p.source} ·{" "}
                              {p.verified ? "확인됨" : "미확인"}
                            </p>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "전년도 자료를 삭제·정정할까요?",
                                  )
                                )
                                  change(
                                    {
                                      ...data,
                                      prior: data.prior.filter(
                                        (v) => v.id !== p.id,
                                      ),
                                    },
                                    "전년도 자료 삭제",
                                  );
                              }}
                            >
                              삭제·정정
                            </button>
                          </div>
                        ))}
                    </Panel>
                    <Panel title="4단계 보상 정책">
                      <p>
                        정책 수치는 기본 미설정입니다. 실제 운영자가 확정한
                        절감률·할인율만 입력하세요.
                      </p>
                      <form
                        key={`policy-${orgId}`}
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const thresholds = [0, 1, 2, 3].map((i) =>
                              f.get(`t${i}`) === ""
                                ? null
                                : num(f.get(`t${i}`), "절감률 경계"),
                            );
                            const discounts = [0, 1, 2, 3].map((i) =>
                              f.get(`d${i}`) === ""
                                ? null
                                : num(f.get(`d${i}`), "할인율"),
                            );
                            const policy: Policy = {
                              thresholds,
                              discounts,
                              finalized: f.has("finalized"),
                            };
                            if (
                              thresholds.some(
                                (n, i) =>
                                  n !== null &&
                                  (n > 100 ||
                                    (i > 0 &&
                                      thresholds[i - 1] !== null &&
                                      n <= thresholds[i - 1]!)),
                              ) ||
                              discounts.some((n) => n !== null && n > 100)
                            )
                              throw new Error(
                                "경계는 0~100% 오름차순, 할인율은 0~100%여야 합니다.",
                              );
                            if (
                              policy.finalized &&
                              [...thresholds, ...discounts].some(
                                (v) => v === null,
                              )
                            )
                              throw new Error(
                                "미설정 수치가 있으면 정책 확정을 할 수 없습니다.",
                              );
                            setting({ ...settings, policy });
                          })
                        }
                      >
                        <div className="growth">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i}>
                              <Text
                                name={`t${i}`}
                                label={`${i + 1}단계 절감률 경계 (%)`}
                                type="number"
                                value={settings.policy.thresholds[i] ?? ""}
                              />
                              <Text
                                name={`d${i}`}
                                label={`${i + 1}단계 할인율 (%)`}
                                type="number"
                                value={settings.policy.discounts[i] ?? ""}
                              />
                            </div>
                          ))}
                        </div>
                        <label className="check">
                          <input
                            type="checkbox"
                            name="finalized"
                            defaultChecked={settings.policy.finalized}
                          />
                          운영자가 정책을 확정했습니다
                        </label>
                        <button>보상 정책 저장</button>
                      </form>
                    </Panel>
                    <Panel title="외부 제보 연결 준비 · 티맵 미연결">
                      <p>
                        실제 API·제휴는 없습니다. 아래 입력은 명시적인 데모이며
                        실제 기관 실적에 포함되지 않습니다.
                      </p>
                      <form
                        onSubmit={(e) =>
                          attempt(() => {
                            const f = fields(e);
                            const z = zones.find((z) => z.id === f.get("zone"));
                            if (!z) throw new Error("구역을 선택하세요.");
                            const r = {
                              ...stamp(),
                              orgId,
                              zoneId: z.id,
                              location: must(f.get("location"), "위치"),
                              occurredAt: must(f.get("at"), "발생 시각"),
                              receivedAt: now(),
                              content: must(f.get("content"), "제보 내용"),
                              source: "명시적 데모 입력",
                              status: "확인 요청" as const,
                              demo: true,
                            };
                            change(
                              { ...data, reports: [...data.reports, r] },
                              "데모 제보 등록",
                            );
                          })
                        }
                      >
                        <div className="admin-grid">
                          <Field label="연결 구역">
                            <select name="zone">
                              <option value="">선택</option>
                              {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Text name="location" label="발생 위치" required />
                          <Text
                            name="at"
                            label="발생 시각"
                            type="datetime-local"
                            required
                          />
                          <Text
                            name="content"
                            label="강설·적설·제설 상태 제보"
                            required
                          />
                        </div>
                        <button>데모 제보 입력</button>
                      </form>
                      {reports.map((r) => (
                        <div className="list-row" key={r.id}>
                          <p>
                            데모 · {r.id} · {r.status} · {r.occurredAt} ·{" "}
                            {r.location} · {r.content} · 출처 {r.source}
                          </p>
                          <button onClick={() => startWork(r.zoneId, r.id)}>
                            담당자 현장 확인 요청
                          </button>
                        </div>
                      ))}
                    </Panel>
                    <Panel title="로컬 자료 보관·수정 이력">
                      <button onClick={exportData}>
                        모든 로컬 기록 JSON 내보내기 (사진 제외)
                      </button>
                      <p>
                        기존 ecosnow-cameras 저장값은 삭제하지 않았습니다. 새
                        관리 구역으로 자동 변환하지 않으며 기존 원본을
                        보존합니다.
                      </p>
                      <p>
                        브라우저 데이터 삭제·기기 변경 시 자료가 사라질 수
                        있습니다. 공용 운영 전 서버 인증·기관별 접근 제어·사진
                        저장소와 백업 구현이 필요합니다.
                      </p>
                      <details>
                        <summary>기관 수정·확인 이력</summary>
                        {data.audit
                          .filter((a) => a.orgId === orgId)
                          .slice()
                          .reverse()
                          .map((a, i) => (
                            <p key={`${a.at}-${i}`}>
                              {a.at} · {a.action}
                            </p>
                          ))}
                      </details>
                      <details>
                        <summary>시즌 평가 확인 이력</summary>
                        {data.evaluations
                          .filter((e) => e.orgId === orgId)
                          .map((e) => (
                            <p key={e.id}>
                              {e.createdAt} · {e.season} · {e.stage}단계 ·{" "}
                              {e.verifiedBy} · 현재 자료 변경 시 재평가 필요
                            </p>
                          ))}
                      </details>
                    </Panel>
                  </>
                )}
              </>
            )}
          </>
        )}
        <footer>
          <strong>ECOSNOW</strong>
          <span>친환경 제설제 사용 기록 · 적정 살포 지원</span>
          <span>P1 기록 / P2 기준 기반 산정</span>
        </footer>
      </main>
    </div>
  );
}
