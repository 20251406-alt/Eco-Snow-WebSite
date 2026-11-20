export default function SeasonComparison({
  previous,
  current,
  saving,
  cost,
}: {
  previous: number | null;
  current: number | null;
  saving: number | null;
  cost: number | null;
}) {
  const max = Math.max(1, previous ?? 0, current ?? 0);
  const format = (n: number | null, unit: string) =>
    n === null
      ? "자료 없음"
      : n.toLocaleString("ko-KR", { maximumFractionDigits: 1 }) + unit;
  return (
    <div className="portal-season">
      <div className="portal-season-result">
        <span>전년 대비 절감률</span>
        <strong>{format(saving, "%")}</strong>
        <small>비용 절약액 {format(cost, "원")}</small>
      </div>
      <div className="portal-usage" aria-label="전년도와 이번 시즌 사용량 비교">
        {(
          [
            ["전년도", previous],
            ["이번 시즌", current],
          ] as const
        ).map(([label, amount]) => (
          <div key={label}>
            <span>{label}</span>
            <i style={{ width: ((amount ?? 0) / max) * 100 + "%" }} />
            <strong>{format(amount, "kg")}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
