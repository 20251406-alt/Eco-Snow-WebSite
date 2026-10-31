import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "에코스노우",
  description: "기상·CCTV 노면 정보를 결합한 친환경 제설 의사결정 서비스",
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
