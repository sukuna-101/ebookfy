import React from 'react';
import {THEME_ASSETS} from '../assets/themeAssets';

/**
 * Ornate Gothic corner flourish SVG used subtly in sidebar and right-hand frames.
 */
export const GothicCorner: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
  className?: string;
}> = ({position, className = ''}) => {
  const transforms: Record<typeof position, string> = {
    tl: '',
    tr: 'scale-x-[-1]',
    bl: 'scale-y-[-1]',
    br: 'scale-[-1]',
  };
  const posClasses: Record<typeof position, string> = {
    tl: 'top-1.5 left-1.5',
    tr: 'top-1.5 right-1.5',
    bl: 'bottom-1.5 left-1.5',
    br: 'bottom-1.5 right-1.5',
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={`pointer-events-none absolute w-7 h-7 text-[#8C7B81]/55 ${posClasses[position]} ${transforms[position]} ${className}`}
      fill="none"
    >
      <path
        d="M2 30V8C2 4.686 4.686 2 8 2H30"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M6 22V10C6 7.79 7.79 6 10 6H22"
        stroke="#650D20"
        strokeWidth="1.1"
      />
      <path
        d="M2 14C6 14 9 11 9 7C9 10 11 12 14 12"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="6.5" r="1.5" fill="#E5092D" fillOpacity="0.7" />
    </svg>
  );
};

export const EbookfyBookLogo: React.FC<{className?: string}> = ({
  className = 'w-12 h-11',
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 64 52"
    className={className}
    fill="none"
  >
    <path
      d="M32 11C23 6 12 6 5 11V42C12 37 23 37 32 43C41 37 52 37 59 42V11C52 6 41 6 32 11Z"
      fill="#0D080A"
      stroke="#F5EFF1"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <path
      d="M32 11V43"
      stroke="#E5092D"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path d="M11 18C17 15.5 23 15.5 27 18" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11 25C17 22.5 23 22.5 27 25" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11 32C17 29.5 23 29.5 27 32" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M53 18C47 15.5 41 15.5 37 18" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M53 25C47 22.5 41 22.5 37 25" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M53 32C47 29.5 41 29.5 37 32" stroke="#F5EFF1" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M2 15V45C11 40 22 40 32 46C42 40 53 40 62 45V15"
      stroke="#650D20"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Ambient bottom-right Gothic rose cluster layered subtly behind right-column cards.
 */
export const GothicBackgroundRoses: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
  >
    {/* Subtle crimson atmosphere top-right */}
    <div
      className="absolute -top-24 right-0 w-[480px] h-[360px] opacity-25"
      style={{
        background:
          'radial-gradient(circle at 75% 20%, rgba(165, 14, 42, 0.32) 0%, rgba(8, 6, 7, 0) 70%)',
      }}
    />
    {/* Bottom-right gothic roses cluster matching reference */}
    <img
      src={THEME_ASSETS.gothicRosesCorner}
      alt=""
      referrerPolicy="no-referrer"
      className="absolute bottom-0 right-0 w-[260px] sm:w-[340px] lg:w-[400px] h-auto object-contain opacity-65 mix-blend-lighten pointer-events-none"
      style={{
        maskImage:
          'radial-gradient(ellipse at bottom right, black 48%, transparent 86%)',
        WebkitMaskImage:
          'radial-gradient(ellipse at bottom right, black 48%, transparent 86%)',
      }}
    />
  </div>
);
