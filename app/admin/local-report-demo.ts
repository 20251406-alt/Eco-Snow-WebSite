import type { Region, Report, Snapshot } from "./report-types";

export const LOCAL_REPORT_DEMO_KEY = "ecosnow-report-review-demo-v1";
export const SHARED_REPORT_MODE_KEY = "ecosnow-report-shared-mode-v1";

export function sampleReports(regions: Region[], now: number): Pick<Snapshot, "regions" | "reports"> {
  const reports = regions.slice(0, 8).flatMap((region, index) =>
    Array.from({ length: [3, 9, 2, 6, 1, 4, 2, 1][index] }, (_, i): Report => ({
      id: `sample-${region.id}-${i}`,
      user_id: `sample-citizen-${index}-${i}`,
      nickname: "가상 제보자",
      region_id: region.id,
      lat: region.lat + (i % 3) * 0.001,
      lng: region.lng + (i % 4) * 0.001,
      type: i % 4 === 0 ? "accumulation" : "snow",
      answer: true,
      method: "voice",
      simulation: true,
      created_at: new Date(now - (index * 5 + i + 1) * 60000).toISOString(),
      status: i % 3 === 0 ? "approved" : "pending",
      note: "",
      assessment: { score: 55 + (index * 4 + i) % 41, evidence: ["가상 제보와 관측을 사용한 검토 연습 자료입니다."], kind: "시연용 가상 점수" },
      reward: null,
      reviews: [],
    })),
  );
  return { regions, reports: reports.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
}
