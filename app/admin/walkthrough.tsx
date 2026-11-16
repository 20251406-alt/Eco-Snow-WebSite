"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { focusControl, placeCoach } from "./walkthrough-layout";
import type { GuideSnapshot, GuideStep } from "./walkthrough-model";
export function WelcomeGuide({
  onStart,
  onLater,
}: {
  onStart: () => void;
  onLater: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return createPortal(
    <div className="guide-modal-shade">
      <div
        className="guide-welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-welcome-title"
        tabIndex={-1}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === "Escape") onLater();
          if (e.key === "Tab") {
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLButtonElement>("button") || [],
            );
            if (!nodes.includes(document.activeElement as HTMLButtonElement)) {
              e.preventDefault();
              (e.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
            } else if (e.shiftKey && document.activeElement === nodes[0]) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <span className="guide-eyebrow">EcoSnow 시작 안내</span>
        <h2 id="guide-welcome-title">
          처음 사용하시나요?
          <br />
          주요 기능을 안내해 드릴까요?
        </h2>
        <p>
          실제 버튼을 누르고 값을 입력하며 구역 등록부터 작업 기록까지 배울 수
          있습니다. 별도의 연습용 자료를 사용해 기존 기관 기록을 보호합니다.
        </p>
        <div className="guide-actions">
          <button className="guide-primary" onClick={onStart}>
            사용법 배우기
          </button>
          <button onClick={onLater}>나중에 하기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Box = { top: number; left: number; width: number; height: number };
export default function Walkthrough({
  steps,
  snapshot,
  onPrepare,
  onExit,
  onFinish,
  onComplete,
}: {
  steps: GuideStep[];
  snapshot: GuideSnapshot;
  onPrepare: (s: GuideStep) => void;
  onExit: () => void;
  onFinish: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0),
    [done, setDone] = useState(false),
    [box, setBox] = useState<Box | null>(null),
    [hint, setHint] = useState("");
  const [viewport, setViewport] = useState({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
    }),
    [cardHeight, setCardHeight] = useState(285),
    [eventTick, setEventTick] = useState(0);
  const card = useRef<HTMLDivElement>(null),
    armed = useRef(false),
    prepareRef = useRef(onPrepare),
    target = useRef<HTMLElement | null>(null);
  useEffect(() => {
    prepareRef.current = onPrepare;
  }, [onPrepare]);
  const notified = useRef(false);
  const step = steps[index];
  function next() {
    armed.current = false;
    setHint("");
    if (index + 1 >= steps.length) setDone(true);
    else setIndex(index + 1);
  }
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    armed.current = false;
    target.current = null;
    const timer = setTimeout(() => {
      setHint("");
      setBox(null);
      if (!done) prepareRef.current(step);
    }, 0);
    return () => clearTimeout(timer);
  }, [index, step, done]);
  useEffect(() => {
    if (done) return;
    let frame = 0,
      scrolled: HTMLElement | null = null;
    let highlighted: HTMLElement | null = null;
    const targetResize = new ResizeObserver(() => schedule());
    const measure = () => {
      const vv = window.visualViewport;
      const v = {
        width: vv?.width || innerWidth,
        height: vv?.height || innerHeight,
        top: vv?.offsetTop || 0,
        left: vv?.offsetLeft || 0,
      };
      setViewport((old) =>
        JSON.stringify(old) === JSON.stringify(v) ? old : v,
      );
      const el =
        Array.from(document.querySelectorAll<HTMLElement>(step.target)).find(
          (el) => el.getClientRects().length > 0,
        ) || null;
      target.current = el;
      if (!el || !el.getClientRects().length) {
        setBox(null);
        return;
      }
      const control = focusControl(el, step.kind);
      if (control !== highlighted) {
        highlighted?.classList.remove("guide-focus-target");
        highlighted = control;
        control.classList.add("guide-focus-target");
        targetResize.disconnect();
        targetResize.observe(control);
      }
      if (el !== scrolled) {
        control.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "instant",
        });
        scrolled = el;
      }
      let r = control.getBoundingClientRect();
      const padding = 18;
      if (r.top < v.top + padding || r.bottom > v.top + v.height - padding) {
        control.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "instant",
        });
        r = control.getBoundingClientRect();
      }
      const layout = placeCoach(r, v, 300);
      if (
        (layout.side === "above" || layout.side === "below") &&
        layout.maxHeight < 220 &&
        v.height > r.height + 170
      ) {
        control.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "instant",
        });
        r = control.getBoundingClientRect();
      }

      if (
        r.width < 1 ||
        r.height < 1 ||
        r.right <= v.left ||
        r.left >= v.left + v.width ||
        r.bottom <= v.top ||
        r.top >= v.top + v.height
      ) {
        setBox(null);
        return;
      }
      const left = Math.max(v.left + 4, r.left - 6),
        top = Math.max(v.top + 4, r.top - 6),
        right = Math.min(v.left + v.width - 4, r.right + 6),
        bottom = Math.min(v.top + v.height - 4, r.bottom + 6);
      const b = {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };
      setBox((old) =>
        old &&
        Object.keys(b).every(
          (k) => Math.abs(old[k as keyof Box] - b[k as keyof Box]) < 0.5,
        )
          ? old
          : b,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    const app = document.querySelector(".admin-console");
    if (app)
      observer.observe(app, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    const timer = setInterval(schedule, 350);
    const resized = () => {
      if (step.navigation) prepareRef.current(step);
      scrolled = null;
      schedule();
    };
    window.addEventListener("resize", resized);
    window.addEventListener("scroll", schedule, true);
    visualViewport?.addEventListener("resize", schedule);
    visualViewport?.addEventListener("scroll", schedule);
    schedule();
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      targetResize.disconnect();
      highlighted?.classList.remove("guide-focus-target");
      window.removeEventListener("resize", resized);
      window.removeEventListener("scroll", schedule, true);
      visualViewport?.removeEventListener("resize", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [step, done]);
  useEffect(() => {
    if (!card.current) return;
    const update = () => {
      const el = card.current;
      if (!el) return;
      const body = el.querySelector<HTMLElement>(".guide-coach-body");
      setCardHeight(
        el.scrollHeight +
          (body ? Math.max(0, body.scrollHeight - body.clientHeight) : 0) +
          2,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(card.current);
    return () => observer.disconnect();
  }, [index, box, done, hint]);
  useEffect(() => {
    if (done) return;
    const action = (e: Event) => {
      const el = target.current;
      if (!el || !(e.target instanceof Node) || !el.contains(e.target)) return;
      if (e.type === "input" && step.kind === "input" && step.validate?.(el))
        setHint("");
      if (step.kind === "click" && (e.type === "click" || e.type === "submit"))
        armed.current = true;
      if (step.kind === "change" && e.type === "change") armed.current = true;
      setEventTick((t) => t + 1);
    };
    document.addEventListener("click", action, true);
    document.addEventListener("submit", action, true);
    document.addEventListener("change", action, true);
    document.addEventListener("input", action, true);
    return () => {
      document.removeEventListener("click", action, true);
      document.removeEventListener("submit", action, true);
      document.removeEventListener("change", action, true);
      document.removeEventListener("input", action, true);
    };
  }, [step, done]);
  useEffect(() => {
    if (!armed.current || done || !target.current) return;
    const ready =
      step.kind === "change"
        ? step.validate?.(target.current)
        : step.complete?.(snapshot);
    if (ready) nextRef.current();
  }, [snapshot, eventTick, step, done]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (done) onFinish();
        else onExit();
        return;
      }
      if (e.key === "Tab") {
        const el = done ? null : target.current;
        const targetNodes = el
          ? [
              el,
              ...el.querySelectorAll<HTMLElement>(
                "button,input,select,textarea,a[href]",
              ),
            ].filter(
              (x) =>
                x.matches("button,input,select,textarea,a[href]") &&
                !x.matches(":disabled") &&
                x.getClientRects().length,
            )
          : [];
        const nodes = [
          ...targetNodes,
          ...Array.from(
            card.current?.querySelectorAll<HTMLElement>("button") || [],
          ),
        ];
        if (!nodes.length) return;
        const current = nodes.indexOf(document.activeElement as HTMLElement);
        if (
          current === -1 ||
          (!e.shiftKey && current === nodes.length - 1) ||
          (e.shiftKey && current === 0)
        ) {
          e.preventDefault();
          (e.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onExit, onFinish, done]);
  useEffect(() => {
    if (done) {
      card.current?.focus();
      if (!notified.current) {
        notified.current = true;
        onComplete();
      }
    }
  }, [done, onComplete]);
  function confirm() {
    if (step.kind === "read") {
      next();
      return;
    }
    if (target.current && step.validate?.(target.current)) {
      (
        target.current.querySelector("input,textarea") as HTMLElement | null
      )?.blur();
      next();
    } else {
      setHint(
        "입력값이 비어 있거나 유효하지 않습니다. 강조된 실제 입력칸을 먼저 채워 주세요.",
      );
      (
        target.current?.querySelector("input,textarea") as HTMLElement | null
      )?.focus();
    }
  }
  if (done)
    return createPortal(
      <div className="guide-modal-shade">
        <div
          className="guide-welcome"
          ref={card}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-complete-title"
          tabIndex={-1}
        >
          <span className="guide-eyebrow">안내 완료</span>
          <h2 id="guide-complete-title">잘하셨습니다!</h2>
          <p>
            안내를 마쳤습니다. 연습 자료는 실제 기관 자료와 분리되어 있습니다.
            ‘시작하기’를 누르면 원래 화면으로 돌아갑니다.
          </p>
          <button className="guide-primary" onClick={onFinish}>
            시작하기
          </button>
          <button onClick={onFinish}>종료</button>
        </div>
      </div>,
      document.body,
    );
  const placement = placeCoach(box, { ...viewport }, cardHeight);
  return createPortal(
    <div className="walkthrough-layer" data-tour-step={step.id}>
      {box ? (
        <>
          <div
            className="guide-shade"
            style={{ left: 0, top: 0, width: "100%", height: box.top }}
          />
          <div
            className="guide-shade"
            style={{
              left: 0,
              top: box.top,
              width: box.left,
              height: box.height,
            }}
          />
          <div
            className="guide-shade"
            style={{
              left: box.left + box.width,
              top: box.top,
              right: 0,
              height: box.height,
            }}
          />
          <div
            className="guide-shade"
            style={{
              left: 0,
              top: box.top + box.height,
              width: "100%",
              bottom: 0,
            }}
          />
          <div className="guide-ring" data-guide-ring style={box} />
        </>
      ) : (
        <div className="guide-shade" style={{ inset: 0 }} />
      )}
      <div
        className="guide-coach"
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="guide-step-title"
        style={{
          position: "fixed",
          top: placement.top,
          left: placement.left,
          width: placement.width,
          maxHeight: placement.maxHeight,
        }}
        tabIndex={-1}
      >
        <div className="guide-coach-header">
          <span>
            연습용 안내 · {index + 1} / {steps.length}
          </span>
          <button aria-label="안내 종료" onClick={onExit}>
            ×
          </button>
        </div>
        <div className="guide-coach-body">
          <progress
            max={steps.length}
            value={index + 1}
            aria-label="사용법 안내 진행률"
          />
          <h2 id="guide-step-title">{step.title}</h2>
          <p>{step.description}</p>
          <p className="guide-action-text">
            {box
              ? step.action
              : "실제 화면 요소를 준비하고 있습니다. 잠시 후에도 나타나지 않으면 이전 단계로 돌아가거나 건너뛸 수 있습니다."}
          </p>
          {hint && (
            <p className="guide-validation" role="alert">
              {hint}
            </p>
          )}
        </div>
        <div className="guide-actions">
          <button
            disabled={!index}
            onClick={() => {
              armed.current = false;
              setIndex((i) => Math.max(0, i - 1));
            }}
          >
            이전 단계
          </button>
          <button onClick={next}>건너뛰기</button>
          <button onClick={onExit}>종료</button>
          {(step.kind === "input" || step.kind === "read") && (
            <button className="guide-primary" disabled={!box} onClick={confirm}>
              {step.kind === "input" ? "입력 확인" : "확인했습니다"}
            </button>
          )}
        </div>
        <span className="guide-sr" aria-live="polite">
          {index + 1}단계 {step.title}. {step.action}
        </span>
      </div>
    </div>,
    document.body,
  );
}
