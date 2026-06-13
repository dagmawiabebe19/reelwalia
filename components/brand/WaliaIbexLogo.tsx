export function WaliaIbexLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M8 26L10 18L6 14L8 10L12 12L16 6L20 12L24 10L26 14L22 18L24 26H20L18 20L16 24L14 20L12 26H8Z"
        fill="#E03C2F"
      />
      <path
        d="M11 8C11 8 12 5 16 4C20 5 21 8 21 8"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="11" r="1" fill="#FFFFFF" />
      <circle cx="18" cy="11" r="1" fill="#FFFFFF" />
    </svg>
  );
}
