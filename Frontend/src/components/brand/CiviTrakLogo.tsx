import React from 'react';

interface CiviTrakLogoProps {
  variant?: 'full' | 'wordmark' | 'emblem' | 'lockup';
  className?: string;
  alt?: string;
}

const sources = {
  full: '/civitrak-logo-full.png',
  wordmark: '/civitrak-wordmark.png',
  emblem: '/civitrak-emblem.png',
} as const;

export const CiviTrakLogo: React.FC<CiviTrakLogoProps> = ({
  variant = 'wordmark',
  className = '',
  alt = 'CiviTrak — Civic Solutions & Progress Tracker',
}) => {
  if (variant === 'lockup') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} aria-label={alt}>
        <img src={sources.emblem} alt="" className="h-full w-auto min-w-0 object-contain" draggable={false} />
        <span className="h-[70%] w-px bg-[#0D2B3A]/12" />
        <img src={sources.wordmark} alt="" className="h-[74%] w-auto min-w-0 object-contain" draggable={false} />
      </span>
    );
  }

  return (
    <img
      src={sources[variant]}
      alt={alt}
      className={`block object-contain ${className}`}
      draggable={false}
    />
  );
};
