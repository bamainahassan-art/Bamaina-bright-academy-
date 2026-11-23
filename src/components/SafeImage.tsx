import { useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-blue-100 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <GraduationCap className="w-8 h-8 text-amber-400 mb-2" />
        <span className="text-xs font-medium text-blue-100/90 max-w-xs">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
