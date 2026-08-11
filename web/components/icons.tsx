type IconProps = {
  className?: string;
};

/** Mini newspaper front-page glyph used for the brand mark. */
export function NewspaperMark({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="currentColor" />
      <rect
        x="9"
        y="7.5"
        width="14"
        height="2.6"
        rx="1.3"
        fill="#0b1626"
        opacity="0.9"
      />
      <rect x="9" y="12.5" width="14" height="1.4" rx="0.7" fill="#0b1626" opacity="0.75" />
      <rect x="9" y="15.9" width="9" height="1.4" rx="0.7" fill="#0b1626" opacity="0.55" />
      <rect x="9" y="19.3" width="6.5" height="1.4" rx="0.7" fill="#0b1626" opacity="0.4" />
      <rect x="9" y="22.7" width="14" height="2.6" rx="1.3" fill="#0b1626" opacity="0.85" />
    </svg>
  );
}

export function ChromeLogo({ className = "h-9 w-9" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#ffffff" />
      <path d="M12 12L12 1.5A10.5 10.5 0 0 1 21.09 7.5L12 12Z" fill="#ea4335" />
      <path
        d="M12 12L21.09 7.5A10.5 10.5 0 0 1 12 22.5L12 12Z"
        fill="#34a853"
      />
      <circle cx="12" cy="12" r="3.4" fill="#4285f4" />
    </svg>
  );
}

export function FirefoxLogo({ className = "h-9 w-9" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="firefox-flame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9500" />
          <stop offset="1" stopColor="#e2500f" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#firefox-flame)" />
      <path
        d="M12 5.2c2.6 2.3 4 4.5 4 6.8a4 4 0 0 1-8 0c0-1.2.4-2.5 1.1-3.7.7 1.3 1.6 2.1 2.6 2.7-.3-1.7-.1-3.4 1.1-5.2-.4.3-.6.5-.8.8Z"
        fill="#fde7d0"
        opacity="0.95"
      />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function FolderIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function FileIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
