import type { Metadata } from "next";
import "./globals.css";
import "./admin/saas.css";

export const metadata: Metadata = {
  title: "에코스노우",
  description: "기관별 현장 기록·기준 기반 정량 살포·실제 사용량 비교를 지원하는 EcoSnow 관리자 서비스",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
