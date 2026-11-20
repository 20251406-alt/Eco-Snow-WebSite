export type Region = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  polygon: number[][];
};
export type Report = {
  id: string;
  user_id: string;
  nickname: string;
  region_id: string;
  lat: number;
  lng: number;
  type: string;
  answer: boolean;
  method: string;
  simulation: boolean;
  created_at: string;
  status: string;
  note: string;
  photo_path?: string;
  assessment: { score: number | null; evidence: string[]; kind: string } | null;
  reward: {
    opened_at: string | null;
    amount: number | null;
    revoked: boolean;
  } | null;
  reviews: {
    id: string;
    from_status: string;
    to_status: string;
    note: string;
    created_at: string;
  }[];
};
export type Snapshot = {
  profile: {
    id: string;
    nickname: string;
    cash: number;
    lifetime: number;
    boost: number;
    skin: string;
  };
  admin: boolean;
  reports: Report[];
  boxes: {
    id: string;
    opened_at: string | null;
    amount: number | null;
    revoked: boolean;
  }[];
  inventory: { id: string; item_id: string; code: string | null }[];
  transactions: {
    id: string;
    amount: number;
    kind: string;
    created_at: string;
  }[];
  destinations: { id: string; name: string; favorite: boolean }[];
  policy: { daily_limit: number; high: number; medium: number };
  regions: Region[];
  weather: {
    id: string;
    region_id: string;
    observed_at: string;
    pty: number;
    temperature: number;
    source: string;
  }[];
  leaders: {
    id: string;
    nickname: string;
    verified: number;
    contribution: number;
    weekly: number;
  }[];
};
export const types: Record<string, string> = {
  snow: "눈 내림",
  accumulation: "노면 적설",
  ice: "노면 결빙",
  cleared: "제설 완료",
};
export const statuses: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인 완료",
  needs_review: "추가 확인",
  duplicate: "중복 제보",
  false: "허위 최종 판정",
};
export const kst = (s: string) =>
  new Date(s).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
