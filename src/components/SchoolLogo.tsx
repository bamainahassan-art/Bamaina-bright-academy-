interface SchoolLogoProps {
  logoDataUrl?: string | null;
  className?: string;
}

export function SchoolLogo({ logoDataUrl, className = 'h-10 w-10' }: SchoolLogoProps) {
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt="Bamaina Bright Academy Crest"
        referrerPolicy="no-referrer"
        className={`${className} rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Royal Blue Academic Shield */}
      <path
        d="M32 4L56 12V31C56 45.2 45.8 55.6 32 60C18.2 55.6 8 45.2 8 31V12L32 4Z"
        fill="#1E3A8A"
        stroke="#F59E0B"
        strokeWidth="2.5"
      />
      {/* Bright Rising Sun Rays (Knowledge & Bright Future) */}
      <circle cx="32" cy="24" r="6.5" fill="#F59E0B" />
      <path
        d="M32 12V15M22 16L24.2 18.2M42 16L39.8 18.2M18 24H21M43 24H46"
        stroke="#FCD34D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Open Book of Education */}
      <path
        d="M17 31C21.5 29.2 27.5 30 32 33C36.5 30 42.5 29.2 47 31V44.5C42.5 42.8 36.5 43.4 32 46.2C27.5 43.4 21.5 42.8 17 44.5V31Z"
        fill="#FFFFFF"
        stroke="#93C5FD"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M32 33V46" stroke="#1E3A8A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 35.5H28M21 39H27M36 35.5H43M37 39H43" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Golden Honour Ribbon */}
      <path
        d="M20 50.5C24 52.5 40 52.5 44 50.5"
        stroke="#F59E0B"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
