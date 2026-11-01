"use client";
import { useState } from "react";
import {
  getPlan,
  plans,
  selectTrial,
  type TrialSubscription,
  type PlanId,
} from "./plans";
const money = (n: number) => n.toLocaleString("ko-KR");
const available = [
  "관리 구역 등록",
  "제품·배치·적용 기준 관리",
  "현장 수동 기록",
  "등록 기준에 따른 산정·보류",
  "실제 사용·추가 살포 기록",
  "후속 확인",
  "전년도 사용량·비용 비교",
  "설정형 기관 성장·보상 현황",
];
const planned = [
  "AI 사진 분석",
  "계정·기관별 접근 제어",
  "서버 저장과 기기 간 동기화",
  "외부 내비게이션 제보 연동",
  "실제 결제",
];
export default function Pricing({
  orgName,
  orgId,
  subscription,
  onSave,
  notify,
  discount,
  inquiryDraft,
  onSaveInquiry,
}: {
  orgName: string;
  orgId: string;
  subscription?: TrialSubscription;
  onSave: (s: TrialSubscription) => boolean;
  notify: (s: string) => void;
  discount: string;
  inquiryDraft?: string;
  onSaveInquiry: (draft: string) => boolean;
}) {
  const [inquiry, setInquiry] = useState(
    inquiryDraft || subscription?.inquiry || "",
  );
  const [inquiryKind, setInquiryKind] = useState<
    "municipal" | "product" | null
  >(null);
  const [dirty, setDirty] = useState(false);
  const plan = getPlan(subscription?.planId);
  const template = (kind: "municipal" | "product") =>
    `${kind === "municipal" ? "EcoSnow 지자체 소프트웨어 도입 상담" : "EcoSnow 친환경 제설제 도입 문의"}\n기관: ${orgName}\n기관 ID: ${orgId}\n관리 구역·면적: \n희망 도입 범위·시기: \n담당자·회신 연락처: \n추가 문의: \n※ 작성용 초안이며 자동 전송되지 않습니다.`;
  function choose(id: PlanId) {
    if (onSave(selectTrial(id, new Date().toISOString(), inquiry)))
      notify(
        "체험 플랜이 변경되었습니다. 실제 결제나 계약은 발생하지 않습니다.",
      );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(inquiry);
      notify("문의 내용을 복사했습니다. 접수·전송되지 않았습니다.");
    } catch {
      notify(
        "복사하지 못했습니다. 아래 문의 내용을 직접 선택해 복사하세요. 전송되지 않았습니다.",
      );
    }
  }
  return (
    <div className="pricing-page">
      <section className="pricing-intro">
        <span className="badge-text">요금안 · 결제 미연결</span>
        <h2>기관 규모에 맞는 EcoSnow 관리 플랜</h2>
        <p>
          현장 기록부터 적정 살포 지원, 사용량 비교까지 한곳에서 관리하세요.
        </p>
        <div className="pricing-disclosure">
          사업모델 검토용 요금안입니다. 현재 체험판에는 실제 결제·청구가
          연결되어 있지 않습니다.
        </div>
      </section>
      <section className="panel plan-current">
        <div>
          <span className="section-kicker">현재 기관 · {orgName}</span>
          <h2>{plan ? `${plan.name} 체험` : "체험 플랜을 선택해 주세요"}</h2>
          <p>
            {plan
              ? `월 환산 ${money(plan.monthly)}원 · 연간 ${money(plan.annual)}원 (부가세 별도 가안)`
              : "선택 전에도 기존 모든 기능을 사용할 수 있습니다."}
          </p>
        </div>
        <div>
          <span className="badge-text">체험 중 · 결제 미연결</span>
          <p>청구 예정: 없음</p>
          <small>{discount}</small>
        </div>
      </section>
      <div className="pricing-cards">
        {plans.map((p) => (
          <article
            className={`price-card ${p.id === plan?.id ? "selected" : ""}`}
            key={p.id}
          >
            <div className="price-card-heading">
              <h3>{p.name}</h3>
              {p.id === plan?.id && (
                <span className="badge-text">선택한 체험 플랜</span>
              )}
            </div>
            <p>{p.description}</p>
            <div className="price-value">
              {money(p.monthly)}
              <span>원 / 월 환산</span>
            </div>
            <p>연간 계약 시 월 환산액 · 부가세 별도 가안</p>
            <div className="annual-price">
              연간 계약 금액 <strong>{money(p.annual)}원</strong>
            </div>
            <ul>
              <li>제품 구매 비용 별도</li>
              <li>상세 제공 범위는 협의 예정</li>
              <li>체험판의 모든 기존 기능 이용 가능</li>
            </ul>
            <button
              className="primary"
              onClick={() => {
                if (p.id === "municipal") {
                  setInquiryKind("municipal");
                  if (!dirty) setInquiry(inquiry || template("municipal"));
                } else choose(p.id);
              }}
            >
              {p.id === "municipal"
                ? "도입 상담 내용 작성"
                : "이 플랜으로 체험"}
            </button>
          </article>
        ))}
      </div>
      <p className="pricing-footnote">
        관리 구역·계정 수, 저장 한도, 지원 수준은 협의 예정입니다. 결제
        주기·자동갱신·환불 조건은 아직 정해지지 않았습니다.
      </p>
      <section className="panel">
        <h2>지금 체험할 수 있는 기능과 향후 계획</h2>
        <p>
          플랜 선택으로 기존 기능을 제한하지 않습니다. 아래 구분은 모든 플랜에
          동일하게 적용됩니다.
        </p>
        <div className="feature-columns">
          <div>
            <h3>현재 체험 가능</h3>
            {available.map((f) => (
              <p className="feature-row" key={f}>
                <span className="feature-status">체험 가능</span>
                {f}
              </p>
            ))}
          </div>
          <div>
            <h3>향후 고도화 · 미연결</h3>
            {planned.map((f) => (
              <p className="feature-row" key={f}>
                <span className="feature-status planned">계획</span>
                {f}
              </p>
            ))}
            <p>기록·사진은 현재 이 브라우저에만 저장됩니다.</p>
          </div>
        </div>
      </section>
      <section className="panel product-intro">
        <div>
          <span className="section-kicker">소프트웨어 구독과 별도</span>
          <h2>EcoSnow 친환경 제설제</h2>
          <p className="product-price">
            목표 판매가 <strong>15,000원 / 20kg</strong>
          </p>
          <p>사업계획상 목표 가격이며 실제 견적·공급 조건은 별도 협의합니다.</p>
        </div>
        <button
          onClick={() => {
            setInquiryKind("product");
            if (!dirty) setInquiry(template("product"));
          }}
        >
          제품 도입 문의
        </button>
      </section>
      {(inquiryKind || inquiryDraft || subscription?.inquiry) && (
        <section className="panel inquiry" id="inquiry">
          <h2>
            {inquiryKind === "product" ? "제품 문의 초안" : "도입 상담 초안"}
          </h2>
          <p>
            내용 작성·저장·복사만 가능합니다. 담당자에게 전송되거나 접수되지
            않습니다.
          </p>
          <label className="admin-field">
            <span>문의 내용</span>
            <textarea
              aria-label="문의 내용"
              rows={9}
              value={inquiry}
              onChange={(e) => {
                setInquiry(e.target.value);
                setDirty(!onSaveInquiry(e.target.value));
              }}
            />
          </label>
          <div className="actions">
            <button
              className="primary"
              onClick={() => {
                const saved =
                  inquiryKind === "municipal"
                    ? onSave(
                        selectTrial(
                          "municipal",
                          new Date().toISOString(),
                          inquiry,
                        ),
                      )
                    : onSaveInquiry(inquiry);
                if (saved) {
                  setDirty(false);
                  notify(
                    "문의 초안을 이 기관의 브라우저 저장소에 보관했습니다. 실제 계약·청구·전송은 발생하지 않습니다.",
                  );
                }
              }}
            >
              문의 초안 저장
            </button>
            <button onClick={() => void copy()}>문의 내용 복사</button>
          </div>
          {dirty && (
            <p>
              저장하지 않은 문의 초안이 있습니다. 입력 내용은 로컬 자동 저장을
              시도하며, 실패 메시지가 있으면 직접 복사해 보관하세요.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
