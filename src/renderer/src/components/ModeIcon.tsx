type Mode = 'chat' | 'work' | 'bots'

export default function ModeIcon({ mode, size = 14 }: { mode: Mode; size?: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mode === 'chat' ? (
        <path d="M4 4h16v12H9l-5 4V4Z" />
      ) : mode === 'work' ? (
        <>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
        </>
      ) : (
        <>
          <rect x="4" y="7" width="16" height="13" rx="3" />
          <path d="M12 7V3M9 3h6M2 12v4M22 12v4M8 16h8" />
          <circle cx="9" cy="12" r=".8" />
          <circle cx="15" cy="12" r=".8" />
        </>
      )}
    </svg>
  )
}
