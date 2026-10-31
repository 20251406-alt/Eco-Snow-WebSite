"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RoadState = "dry" | "wet" | "snow" | "ice";
type Camera = {
  id: number;
  name: string;
  location: string;
  url: string;
  roadState: RoadState;
  connected: boolean;
  updatedAt: string;
};

const roadLabels: Record<RoadState, string> = {
  dry: "건조",
  wet: "젖음",
  snow: "적설",
  ice: "결빙 의심",
};

const initialCameras: Camera[] = [
  {
    id: 1,
    name: "정문 보행로",
    location: "한일고등학교 정문",
    url: "https://cctv.example/school-gate",
    roadState: "wet",
    connected: true,
    updatedAt: "방금 전",
  },
  {
    id: 2,
    name: "급경사 진입로",
    location: "학교 후문 오르막",
    url: "https://cctv.example/back-hill",
    roadState: "ice",
    connected: true,
    updatedAt: "2분 전",
  },
];

export default function Home() {
  const [temperature, setTemperature] = useState(-3);
  const [humidity, setHumidity] = useState(82);
  const [precipitation, setPrecipitation] = useState("snow");
  const [roadType, setRoadType] = useState("school");
  const [cameras, setCameras] = useState<Camera[]>(initialCameras);
  const [selectedId, setSelectedId] = useState(2);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    location: "",
    url: "",
    roadState: "wet" as RoadState,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("ecosnow-cameras");
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Camera[];
        if (Array.isArray(parsed) && parsed.length) {
          timer = setTimeout(() => setCameras(parsed), 0);
        }
      } catch {
        // Keep the built-in demonstration cameras when stored data is invalid.
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ecosnow-cameras", JSON.stringify(cameras));
  }, [cameras]);

  const selectedCamera = cameras.find((camera) => camera.id === selectedId) ?? cameras[0];

  const analysis = useMemo(() => {
    let score = 0;
    if (temperature <= -5) score += 35;
    else if (temperature <= 0) score += 27;
    else if (temperature <= 2) score += 13;

    if (humidity >= 80) score += 10;
    else if (humidity >= 65) score += 5;

    if (precipitation === "snow") score += 27;
    if (precipitation === "rain") score += 17;

    if (selectedCamera?.roadState === "ice") score += 28;
    if (selectedCamera?.roadState === "snow") score += 22;
    if (selectedCamera?.roadState === "wet") score += 10;

    if (roadType === "slope") score += 12;
    if (roadType === "school" || roadType === "sensitive") score += 8;

    score = Math.min(100, score);

    if (score >= 75) {
      return {
        score,
        level: "위험",
        action: "즉시 살포 권장",
        material: roadType === "slope" ? "혼합 제설제" : "아세트산칼슘",
        dose: roadType === "slope" ? "25 g/㎡" : "20 g/㎡",
        tone: "danger",
      };
    }
    if (score >= 50) {
      return {
        score,
        level: "주의",
        action: "예방 살포 권장",
        material: "아세트산칼슘",
        dose: "15 g/㎡",
        tone: "warning",
      };
    }
    if (score >= 30) {
      return {
        score,
        level: "관찰",
        action: "30분 후 재확인",
        material: "대기",
        dose: "0 g/㎡",
        tone: "watch",
      };
    }
    return {
      score,
      level: "안전",
      action: "살포 불필요",
      material: "사용 안 함",
      dose: "0 g/㎡",
      tone: "safe",
    };
  }, [temperature, humidity, precipitation, roadType, selectedCamera]);

  function addCamera(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.location.trim() || !form.url.trim()) {
      setNotice("CCTV 이름, 위치, 영상 주소를 모두 입력해 주세요.");
      return;
    }
    const next: Camera = {
      id: Date.now(),
      name: form.name.trim(),
      location: form.location.trim(),
      url: form.url.trim(),
      roadState: form.roadState,
      connected: /^https?:\/\//i.test(form.url) || /^rtsp:\/\//i.test(form.url),
      updatedAt: "방금 전",
    };
    setCameras((current) => [...current, next]);
    setSelectedId(next.id);
    setForm({ name: "", location: "", url: "", roadState: "wet" });
    setNotice("CCTV가 등록되어 현재 위험도 분석에 반영되었습니다.");
  }

  function removeCamera(id: number) {
    setCameras((current) => current.filter((camera) => camera.id !== id));
    if (selectedId === id) setSelectedId(cameras.find((camera) => camera.id !== id)?.id ?? 0);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="에코스노우 홈">
          <span className="brand-mark">❄</span>
          <span><strong>ECOSNOW</strong><small>Snow Signal</small></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a className="active" href="#dashboard"><span>⌂</span>대시보드</a>
          <a href="#cctv"><span>◉</span>CCTV 관리</a>
          <a href="#decision"><span>▥</span>살포 분석</a>
          <a href="#material"><span>♻</span>친환경 제설제</a>
        </nav>
        <div className="side-note">
          <span>PROJECT 2026</span>
          <strong>눈은 녹이고<br />환경은 살리다</strong>
          <p>폐분필 자원순환과 데이터 기반 겨울 안전관리</p>
        </div>
      </aside>

      <main id="dashboard" className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">WINTER ENVIRONMENT CONTROL</p>
            <h1>오늘의 제설 판단</h1>
          </div>
          <div className="live"><i /> 실시간 분석 <span>2026. 08. 19.</span></div>
        </header>

        <section className="hero-grid" id="decision">
          <article className={`risk-card ${analysis.tone}`}>
            <div className="risk-head">
              <div>
                <p>종합 결빙 위험도</p>
                <h2>{analysis.action}</h2>
              </div>
              <span className="status-pill">{analysis.level}</span>
            </div>
            <div className="risk-body">
              <div className="gauge" style={{ "--score": `${analysis.score * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{analysis.score}</strong><span>/100</span></div>
              </div>
              <div className="recommendation">
                <span>권장 제설제</span>
                <strong>{analysis.material}</strong>
                <p>권장 살포량 <b>{analysis.dose}</b></p>
                <small>선택 CCTV의 노면 상태와 기상 조건을 함께 반영한 결과입니다.</small>
              </div>
            </div>
          </article>

          <article className="weather-card">
            <div className="section-title">
              <div><span className="icon-box">☁</span><div><h2>기상 조건 입력</h2><p>현장 관측값을 조정해 보세요</p></div></div>
              <span className="source">수동 입력</span>
            </div>
            <div className="weather-inputs">
              <label><span>기온 <b>{temperature}℃</b></span><input type="range" min="-15" max="10" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label>
              <label><span>습도 <b>{humidity}%</b></span><input type="range" min="20" max="100" value={humidity} onChange={(e) => setHumidity(Number(e.target.value))} /></label>
              <label><span>강수 상태</span><select value={precipitation} onChange={(e) => setPrecipitation(e.target.value)}><option value="none">없음</option><option value="rain">비</option><option value="snow">눈</option></select></label>
              <label><span>장소 유형</span><select value={roadType} onChange={(e) => setRoadType(e.target.value)}><option value="school">학교 보행로</option><option value="sensitive">하천·가로수 주변</option><option value="normal">일반 도로</option><option value="slope">급경사 도로</option></select></label>
            </div>
          </article>
        </section>

        <section className="metrics" aria-label="현재 분석 지표">
          <article><span className="metric-icon blue">❄</span><div><small>기온</small><strong>{temperature}℃</strong><p>{temperature <= 0 ? "결빙 가능 구간" : "영상 유지"}</p></div></article>
          <article><span className="metric-icon cyan">◒</span><div><small>습도</small><strong>{humidity}%</strong><p>{humidity >= 80 ? "수분 응결 주의" : "보통 수준"}</p></div></article>
          <article><span className="metric-icon purple">◉</span><div><small>선택 노면</small><strong>{roadLabels[selectedCamera?.roadState ?? "dry"]}</strong><p>{selectedCamera?.name ?? "CCTV 미선택"}</p></div></article>
          <article><span className="metric-icon lime">♻</span><div><small>염화물 절감</small><strong>{analysis.material === "아세트산칼슘" ? "100%" : "최소화"}</strong><p>권고 제설제 기준</p></div></article>
        </section>

        <section className="panel" id="cctv">
          <div className="section-title panel-heading">
            <div><span className="icon-box dark">◉</span><div><h2>CCTV 정보 입력</h2><p>현장 카메라를 등록하고 관찰된 노면 상태를 분석에 연결합니다.</p></div></div>
            <span className="count">등록 {cameras.length}대</span>
          </div>
          <div className="cctv-layout">
            <form className="camera-form" onSubmit={addCamera}>
              <div className="form-grid">
                <label><span>CCTV 이름</span><input placeholder="예: 본관 앞 보행로" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label><span>설치 위치</span><input placeholder="예: 충남 공주시 정안면" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
                <label className="wide"><span>영상 주소 또는 스트림 URL</span><input placeholder="https://… 또는 rtsp://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
                <label><span>현재 관찰 노면</span><select value={form.roadState} onChange={(e) => setForm({ ...form, roadState: e.target.value as RoadState })}><option value="dry">건조</option><option value="wet">젖음</option><option value="snow">적설</option><option value="ice">결빙 의심</option></select></label>
                <button type="submit">＋ CCTV 등록</button>
              </div>
              {notice && <p className="notice" role="status">{notice}</p>}
              <p className="privacy">입력 정보는 이 MVP에서 현재 기기의 브라우저에만 저장됩니다. 실제 영상 인식 연동 전에는 관찰한 노면 상태를 직접 선택합니다.</p>
            </form>

            <div className="camera-list" aria-label="등록된 CCTV 목록">
              {cameras.length === 0 ? <div className="empty">등록된 CCTV가 없습니다.</div> : cameras.map((camera) => (
                <article key={camera.id} className={selectedId === camera.id ? "camera active-camera" : "camera"}>
                  <button className="camera-select" type="button" onClick={() => setSelectedId(camera.id)} aria-label={`${camera.name} 분석 선택`}>
                    <span className="camera-preview"><b>CAM</b><small>{camera.connected ? "연결 정보 확인" : "주소 확인 필요"}</small></span>
                    <span className="camera-copy"><span className="camera-top"><strong>{camera.name}</strong><em className={camera.roadState}>{roadLabels[camera.roadState]}</em></span><small>{camera.location}</small><code>{camera.url}</code><span className="updated"><i /> {camera.updatedAt} · 분석에 사용</span></span>
                  </button>
                  <button className="delete" type="button" onClick={() => removeCamera(camera.id)} aria-label={`${camera.name} 삭제`}>×</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="material-panel" id="material">
          <div>
            <p className="eyebrow">CIRCULAR DEICER</p>
            <h2>폐분필에서 다시 태어난<br />아세트산칼슘 제설제</h2>
            <p>학교에서 버려지는 폐분필의 탄산칼슘을 식초의 아세트산과 반응시켜, 염화이온을 포함하지 않는 대체 제설제의 가능성을 확인했습니다.</p>
          </div>
          <div className="process">
            <span><b>01</b>폐분필 수거</span><i>→</i><span><b>02</b>분쇄·반응</span><i>→</i><span><b>03</b>여과·결정화</span><i>→</i><span><b>04</b>선택적 살포</span>
          </div>
          <div className="evidence"><span>✓ 질산은 반응</span><strong>염화이온 침전이 관찰되지 않음</strong><small>정성 실험 결과이며, 종합 환경성 검증은 후속 연구가 필요합니다.</small></div>
        </section>

        <footer><strong>ECOSNOW</strong><span>한일고등학교 환경탐구 프로젝트 · MVP</span><span>데이터로 필요한 곳에, 필요한 만큼</span></footer>
      </main>
    </div>
  );
}
