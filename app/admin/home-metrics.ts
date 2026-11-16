import type { Store, Work } from "./domain";
export type MonthMetric = {
  month: string;
  expected: number | null;
  actual: number | null;
};
const sum = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) : null;
export function homeMetrics(data: Store, orgId: string, includeDemo = false) {
  const works = [
    ...new Map(
      data.works
        .filter((w) => w.orgId === orgId && (includeDemo || !w.demo))
        .map((w) => [w.id, w]),
    ).values(),
  ];
  const zones = data.zones.filter((z) => z.orgId === orgId && !z.archived);
  const season = data.settings[orgId]?.season;
  const start = season?.start || "",
    end = season?.end || "";
  const inPeriod = (at: string) =>
    Boolean(start && end && at.slice(0, 10) >= start && at.slice(0, 10) <= end);
  const applications = works.flatMap((w) =>
    [...new Map(w.applications.map((a) => [a.id, a])).values()]
      .filter((a) => inPeriod(a.at))
      .map((a) => ({ ...a, zoneId: w.zone.id })),
  );
  const monthly = new Map<string, MonthMetric>();
  const bucket = (at: string) => {
    const month = at.slice(0, 7);
    if (!monthly.has(month))
      monthly.set(month, { month, expected: null, actual: null });
    return monthly.get(month)!;
  };
  for (const w of works)
    if (
      w.calculation?.kg !== null &&
      w.calculation?.kg !== undefined &&
      inPeriod(w.calculation.inputs.capturedAt)
    ) {
      const m = bucket(w.calculation.inputs.capturedAt);
      m.expected = (m.expected ?? 0) + w.calculation.kg;
    }
  for (const a of applications) {
    const m = bucket(a.at);
    m.actual = (m.actual ?? 0) + a.kg;
  }
  // Do not fabricate a zero value for months without records.
  if (start && end && start <= end) {
    const d = new Date(start.slice(0, 7) + "-01T00:00:00Z");
    for (
      let n = 0;
      n < 24 && d.toISOString().slice(0, 7) <= end.slice(0, 7);
      n++, d.setUTCMonth(d.getUTCMonth() + 1)
    )
      bucket(d.toISOString());
  }
  const latest = new Map<string, Work>();
  for (const w of works) {
    const old = latest.get(w.zone.id);
    if (
      !old ||
      (w.observation.capturedAt || w.createdAt) >
        (old.observation.capturedAt || old.createdAt)
    )
      latest.set(w.zone.id, w);
  }
  const expected = sum(
    zones.flatMap((z) => {
      const kg = latest.get(z.id)?.calculation?.kg;
      return kg === null || kg === undefined ? [] : [kg];
    }),
  );
  const status = [
    "작성 중",
    "현장 확인",
    "작업 완료",
    "후속 확인 대기",
    "기록 완료",
  ].map((label) => ({
    label,
    count: works.filter((w) => w.stage === label).length,
  }));
  const usageByZone = zones
    .map((z) => ({
      id: z.id,
      name: z.name,
      area: z.area,
      kg: sum(applications.filter((a) => a.zoneId === z.id).map((a) => a.kg)),
    }))
    .sort((a, b) => (b.kg ?? -1) - (a.kg ?? -1));
  return {
    zones: zones.length,
    works: works.length,
    expected,
    actual: sum(applications.map((a) => a.kg)),
    pending: works.filter((w) => w.stage !== "기록 완료").length,
    status,
    months: [...monthly.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    usageByZone,
    start,
    end,
  };
}
