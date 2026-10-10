export default function TrophyIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-[#c69214] drop-shadow-[0_4px_10px_rgba(198,146,20,0.28)] ${className}`}
    >
      <path d="M6.5 3.25h11v2h2.25a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 0 1-4.78 5.23 6.17 6.17 0 0 1-2.97 2.79v2.48h3.5a.75.75 0 0 1 .75.75v2H7v-2a.75.75 0 0 1 .75-.75h3.5v-2.48a6.17 6.17 0 0 1-2.97-2.79A5.25 5.25 0 0 1 3.5 7.5V6a.75.75 0 0 1 .75-.75H6.5v-2Zm0 4H5v.25a3.75 3.75 0 0 0 2.18 3.39A6.13 6.13 0 0 1 6.5 8.1V7.25Zm11 0v.85c0 .98-.24 1.93-.68 2.79A3.75 3.75 0 0 0 19 7.5v-.25h-1.5Z" />
    </svg>
  );
}
