"use client";
import { useState } from "react";
import { predictDemoAmount } from "./demo-prediction";
import { DEMO_ORG_ID } from "./demo";
import type { Store, Zone, Calculation } from "./domain";
const format = (n: number) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
export default function DemoWorkbench({
  data,
  onStart,
  onNavigate,
}: {
  data: Store;
  onStart: (zone: Zone, result: Calculation) => void;
  onNavigate: (view: number) => void;
}) {
  const zones = data.zones.filter(
    (z) => z.orgId === DEMO_ORG_ID && !z.archived,
  );
  const [zoneId, setZoneId] = useState(zones[0]?.id || "");
  const [input, setInput] = useState({
    area: String(zones[0]?.area || 120),
    depth: "2",
    temperature: "-3",
    removal: "일부 제거",
    state: "적설",
  });
  const zone = zones.find((z) => z.id === zoneId),
    result = predictDemoAmount(data, zone, input);
  const set = (key: keyof typeof input, value: string) =>
    setInput({ ...input, [key]: value });
  const scenarios = [
    { name: "얕은 적설", depth: "0.8", temperature: "-3" },
    { name: "보통 적설", depth: "2", temperature: "-3" },
    { name: "많이 쌓인 눈", depth: "4", temperature: "-3" },
    { name: "미측정 확인", depth: "2", temperature: "" },
    { name: "기준 밖 조건", depth: "8", temperature: "-15" },
  ];
  return (
    <section className="panel demo-workbench" id="demo-dosage">
      <div className="section-heading">
        <div>
          <span className="badge-text">핵심 기능 시연 · 모든 값은 더미</span>
          <h2>현재 적설 기반 필요 살포량 예상</h2>
          <p>
            상황을 선택하고 면적·적설을 바꿔 보세요. 등록된 조건별 가상 기준을
            선택해 총량을 예상합니다.
          </p>
        </div>
      </div>
      <div className="demo-scenarios" aria-label="더미 관찰 시나리오">
        {scenarios.map((s) => (
          <button
            key={s.name}
            onClick={() =>
              setInput({
                ...input,
                depth: s.depth,
                temperature: s.temperature,
                state: "적설",
                removal: "일부 제거",
              })
            }
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="demo-prediction-grid">
        <div>
          <label className="admin-field">
            <span>시연 구역</span>
            <select
              value={zoneId}
              onChange={(e) => {
                const z = zones.find((z) => z.id === e.target.value);
                setZoneId(e.target.value);
                setInput({
                  area: String(z?.area || ""),
                  depth: "2",
                  temperature: "-3",
                  removal: "일부 제거",
                  state: "적설",
                });
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-grid">
            {[
              ["area", "실제 처리 면적 (㎡)"],
              ["depth", "현재 적설 깊이 (cm)"],
              ["temperature", "노면 온도 (℃)"],
            ].map(([key, label]) => (
              <label className="admin-field" key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  step="any"
                  aria-label={label}
                  value={input[key as keyof typeof input]}
                  onChange={(e) =>
                    set(key as keyof typeof input, e.target.value)
                  }
                  placeholder="미측정"
                />
              </label>
            ))}
            <label className="admin-field">
              <span>현재 눈·얼음 상태</span>
              <select
                value={input.state}
                onChange={(e) => set("state", e.target.value)}
              >
                {["적설", "잔설", "얼음", "눈·얼음 없음"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>사전 눈 제거</span>
              <select
                value={input.removal}
                onChange={(e) => set("removal", e.target.value)}
              >
                {["미제거", "일부 제거", "대부분 제거"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="demo-prediction-result" aria-live="polite">
          <span>등록 기준에 따른 예상 필요량</span>
          <strong>
            {result?.kg !== null && result?.kg !== undefined
              ? `${format(result.kg)} kg`
              : result?.label || "구역 선택 필요"}
          </strong>
          <p>
            {result?.formula ||
              "정보 또는 적용 기준을 확인하기 전에는 숫자를 만들지 않습니다."}
          </p>
          <p>{result?.status === "calculated" ? "선택 적용 기준" : "검토 기준 후보"}: {result?.criterion?.rate ?? "미등록"} g/㎡</p>
          <p>출처: {result?.criterion?.source || "자료 없음"}</p>
          <ul>
            {result?.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <button
            className="primary"
            disabled={!zone || result?.kg === null || !result}
            onClick={() => {
              if (zone && result && result.kg !== null) onStart(zone, result);
            }}
          >
            이 예상량으로 데모 작업 시작
          </button>
        </div>
      </div>
      <p className="pricing-disclosure">
        시연 전용: AI·미래 날씨 예측이 아닙니다. 15·20·25 g/㎡는 검증되지 않은
        가상 기준입니다. 실제 사용에는 검증된 제품 기준과 담당자 확인이
        필요합니다.
      </p>
      <div className="actions">
        <button onClick={() => onNavigate(3)}>
          실제 사용·추가 살포 이력 보기
        </button>
        <button onClick={() => onNavigate(4)}>전년도 비교 시연</button>
        <button onClick={() => onNavigate(5)}>기관 성장·보상 확인</button>
        <button onClick={() => onNavigate(6)}>구독 체험</button>
      </div>
    </section>
  );
}
