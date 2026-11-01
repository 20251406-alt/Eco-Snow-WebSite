import { useState } from "react";
import type { Work } from "./domain";
const quantity = (w: Work) =>
  w.applications.length
    ? w.applications
        .reduce((n, a) => n + a.kg, 0)
        .toLocaleString("ko-KR", { maximumFractionDigits: 3 }) + " kg"
    : "자료 없음";
export default function WorkHistory({
  works,
  onOpen,
  onDelete,
}: {
  works: Work[];
  onOpen: (w: Work) => void;
  onDelete: (w: Work) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = works.filter((w) =>
    `${w.zone.name} ${w.stage} ${w.product?.name || ""}`.includes(query),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(currentPage * 20, currentPage * 20 + 20);
  return (
    <section className="panel work-history">
      <div className="section-heading">
        <div>
          <h2>작업 이력</h2>
          <p>구역·제품·면적·적용 기준은 당시 값으로 보관합니다.</p>
        </div>
        <span className="status-badge">{works.length}건</span>
      </div>
      <label className="admin-field history-search">
        <span>구역·상태·제품 검색</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="구역명 또는 작업 상태"
        />
      </label>
      <div className="table-wrap desktop-history">
        <table>
          <thead>
            <tr>
              <th>구역 / 작업</th>
              <th>상태</th>
              <th>관찰 시각</th>
              <th>제품·배치</th>
              <th className="numeric">안내량</th>
              <th className="numeric">실제 사용량</th>
              <th>작업 관리</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.id}>
                <td>
                  <strong>{w.zone.name}</strong>
                  <small className="table-sub">
                    {w.id.slice(0, 8)}
                    {w.demo ? " · 데모" : ""}
                  </small>
                </td>
                <td>
                  <span className="status-badge">{w.stage}</span>
                </td>
                <td>{w.observation.capturedAt || "미입력"}</td>
                <td>
                  {w.product?.name || "미선택"}
                  <small className="table-sub">{w.product?.batch}</small>
                </td>
                <td className="numeric">
                  {w.calculation?.kg == null
                    ? "산정 전·보류"
                    : `${w.calculation.kg.toLocaleString("ko-KR")} kg`}
                </td>
                <td className="numeric">{quantity(w)}</td>
                <td>
                  <button onClick={() => onOpen(w)}>조회·수정</button>
                  <details className="row-menu">
                    <summary>더 보기</summary>
                    <button
                      className="danger-button"
                      onClick={() => onDelete(w)}
                    >
                      삭제
                    </button>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-history">
        {shown.map((w) => (
          <article className="history-card" key={w.id}>
            <div className="section-heading">
              <strong>{w.zone.name}</strong>
              <span className="status-badge">{w.stage}</span>
            </div>
            <p>
              {w.demo ? "데모 · " : ""}
              {w.observation.capturedAt || "관찰 시각 미입력"}
            </p>
            <p>
              {w.product?.name || "제품 미선택"} /{" "}
              {w.product?.batch || "배치 미입력"}
            </p>
            <dl>
              <div>
                <dt>안내량</dt>
                <dd>
                  {w.calculation?.kg == null
                    ? "산정 전·보류"
                    : `${w.calculation.kg} kg`}
                </dd>
              </div>
              <div>
                <dt>실제 사용량</dt>
                <dd>{quantity(w)}</dd>
              </div>
            </dl>
            <div className="actions">
              <button onClick={() => onOpen(w)}>조회·수정</button>
              <details>
                <summary>더 보기</summary>
                <button className="danger-button" onClick={() => onDelete(w)}>
                  삭제
                </button>
              </details>
            </div>
          </article>
        ))}
      </div>
      {filtered.length > 0 && (
        <div className="pagination">
          <span>
            {filtered.length}건 중 {currentPage * 20 + 1}–
            {Math.min((currentPage + 1) * 20, filtered.length)}건
          </span>
          <button
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            이전 기록
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            disabled={currentPage + 1 === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            다음 기록
          </button>
        </div>
      )}
      {!filtered.length && (
        <p className="empty-state">
          아직 작업 자료가 없습니다. 현장 기록에서 첫 작업을 시작하세요.
        </p>
      )}
    </section>
  );
}
