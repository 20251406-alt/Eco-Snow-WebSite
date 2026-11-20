"use client";

import { useEffect, useRef, useState } from "react";

const reportOrigin = "https://eco-snow-report-platform.vercel.app";
const adminUrl = reportOrigin + "/admin";

export default function ReportWorkspace() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin === reportOrigin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "ecosnow:report-admin-ready"
      ) {
        clearTimeout(timeout);
        setState("ready");
      }
    }
    const timeout = window.setTimeout(() => setState("unavailable"), 6500);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, [attempt]);

  return (
    <section className="panel report-workspace" aria-label="제보 관리 대시보드">
      <div className="section-heading">
        <h2>공주시 제보 지도 및 검증</h2>
        <a href={adminUrl} target="_blank" rel="noopener noreferrer">
          제보 관리 새 창에서 열기 ↗
        </a>
      </div>
      {state !== "ready" && (
        <div className="report-workspace-status" role="status">
          {state === "loading" ? (
            <p>제보 대시보드를 불러오는 중입니다.</p>
          ) : (
            <>
              <p>탭 안에서 제보 대시보드를 열지 못했습니다.</p>
              <p>위의 새 창 링크에서 지도와 승인 기능을 사용할 수 있습니다.</p>
              <button onClick={() => {
                setState("loading");
                setAttempt(n => n + 1);
              }}>다시 불러오기</button>
            </>
          )}
        </div>
      )}
      <iframe
        key={attempt}
        ref={frame}
        src={adminUrl}
        title="제보 지도·분석·검증 대시보드"
        className={state === "ready" ? undefined : "report-workspace-pending"}
        aria-hidden={state !== "ready"}
        tabIndex={state === "ready" ? undefined : -1}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}
