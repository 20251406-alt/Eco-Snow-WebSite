"use client";
import { useRef, useState } from "react";
import type { Region, Report } from "./report-types";
const point = (lat: number, lng: number) => [
  ((lng - 126.88) / 0.54) * 900,
  650 - ((lat - 36.25) / 0.48) * 650,
];
export default function ReportMap({
  regions,
  reports,
  onSelect,
  selected,
  labels = true,
  density = true,
  onRegion,
}: {
  regions: Region[];
  reports: Report[];
  onSelect?: (r: Report) => void;
  selected?: string;
  labels?: boolean;
  density?: boolean;
  onRegion?: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState([0, 0]);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const groups = new Map<string, Report[]>();
  for (const r of reports) {
    const [x, y] = point(Number(r.lat), Number(r.lng)),
      key = Math.round((x * zoom) / 32) + "," + Math.round((y * zoom) / 32);
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  return (
    <div className="report-map">
      <div className="map-caption">
        <span className="live-dot" />
        공주시 행정구역 · 제보 기반 지도
      </div>
      <div className="map-tools">
        <button
          aria-label="지도 확대"
          onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
        >
          +
        </button>
        <button
          aria-label="지도 축소"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          −
        </button>
        <button
          aria-label="지도 위치 초기화"
          onClick={() => {
            setZoom(1);
            setPan([0, 0]);
          }}
        >
          ⌖
        </button>
      </div>
      <svg
        viewBox="0 0 900 650"
        role="group"
        aria-label="공주시 16개 읍면동 제보 지도. 지도를 드래그하거나 확대 버튼을 이용하세요."
        onPointerDown={(e) => {
          if ((e.target as Element).closest("[role=button]")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan[0], py: pan[1] };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const ratio = 900 / e.currentTarget.getBoundingClientRect().width;
          setPan([
            drag.current.px + (e.clientX - drag.current.x) * ratio,
            drag.current.py + (e.clientY - drag.current.y) * ratio,
          ]);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="map-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="#ddded1"
              strokeWidth=".5"
            />
          </pattern>
        </defs>
        <rect width="900" height="650" fill="#f1f0e5" />
        <rect width="900" height="650" fill="url(#map-grid)" />
        <g
          transform={`translate(${450 + pan[0]} ${325 + pan[1]}) scale(${zoom}) translate(-450 -325)`}
        >
          {regions.map((region) => {
            const n = reports.filter((r) => r.region_id === region.id).length,
              [x, y] = point(Number(region.lat), Number(region.lng));
            return (
              <g key={region.id}>
                <polygon
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.name} 제보 ${n}건`}
                  points={region.polygon
                    .map(([lat, lng]) => point(lat, lng).join(","))
                    .join(" ")}
                  fill={
                    density && n
                      ? `rgba(94,158,121,${Math.min(0.7, 0.12 + n * 0.05)})`
                      : "#e5eddd"
                  }
                  stroke="#fffdfb"
                  strokeWidth="2"
                  onClick={() => onRegion?.(region.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRegion?.(region.id);
                  }}
                />
                {labels && (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="region-label"
                    pointerEvents="none"
                  >
                    {region.name}
                  </text>
                )}
              </g>
            );
          })}
          {[...groups.values()].map((items) => {
            const r = items[0],
              [x, y] = point(Number(r.lat), Number(r.lng)),
              size = items.length > 1 ? 16 : 10;
            return (
              <g
                key={r.id}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${r.nickname} · ${items.length > 1 ? items.length + "건 클러스터" : r.type + " 제보"}`}
                onClick={() => {
                  onSelect?.(r);
                  if (items.length > 1 && zoom < 3)
                    setZoom((z) => Math.min(5, z + 0.5));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect?.(r);
                }}
              >
                <circle
                  r={size + 6}
                  fill={selected === r.id ? "#4a363130" : "#fffdfb90"}
                />
                <circle
                  r={size}
                  fill={
                    r.status === "approved"
                      ? "#457d5d"
                      : r.type === "ice"
                        ? "#7faedb"
                        : "#dd6b5b"
                  }
                  stroke="#fffdfb"
                  strokeWidth="2"
                />
                {items.length > 1 && (
                  <text
                    textAnchor="middle"
                    dy="5"
                    fill="white"
                    fontWeight="700"
                    fontSize="12"
                  >
                    {items.length}
                  </text>
                )}
                <title>
                  {r.nickname} · {items.length}건 ·{" "}
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-key">
        <span>
          <i style={{ background: "#457d5d" }} />
          검증 완료
        </span>
        <span>
          <i style={{ background: "#dd6b5b" }} />
          검토 대기
        </span>
        <span>
          <i style={{ background: "#7faedb" }} />
          결빙 제보
        </span>
        <small>첨부 샘플의 경계 데이터 · 도로 안내용 아님</small>
      </div>
    </div>
  );
}
