import type { CSSProperties } from "react";
// No icon package is installed; small stroke SVGs keep the bundle dependency-free.
const paths = [
  "M3 10 12 3l9 7v11h-6v-7H9v7H3z",
  "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  "M9 3H5v18h14V3h-4M9 2h6v4H9zm-1 9h8m-8 5h5",
  "M4 5h16M4 12h16M4 19h16",
  "M4 20V4m0 16h17M8 16l4-5 4 2 5-8",
  "M12 3 5 6v6c0 4 7 9 7 9s7-5 7-9V6z",
  "M3 5h18v14H3zm0 5h18m-13 5h4",
  "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
];
export default function Icon({
  index = 0,
  style,
}: {
  index?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      style={style}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[index % paths.length]} />
    </svg>
  );
}
