'use client';
import {useId} from 'react';

// The house paw motif. `eyes` adds two knocked-out eyes inside the main pad —
// the "character mark". Single visible fill via currentColor; the eyes are true
// knockouts (a mask), so they read on any background and inherit no second
// colour. Drop the `eyes` prop anywhere it reads too cutesy to fall back to the
// plain paw glyph already used across the app.
export function PawMark({className = '', style, eyes = false}: {className?: string; style?: React.CSSProperties; eyes?: boolean}) {
  const id = `paw${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pads = (
    <>
      <ellipse cx="32" cy="43" rx="15" ry="12" />
      <ellipse cx="13" cy="29" rx="6" ry="8" />
      <ellipse cx="25" cy="18" rx="6" ry="8.5" />
      <ellipse cx="39" cy="18" rx="6" ry="8.5" />
      <ellipse cx="51" cy="29" rx="6" ry="8" />
    </>
  );
  if (!eyes) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden className={className} style={style} fill="currentColor">{pads}</svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} style={style} fill="currentColor">
      <mask id={id}>
        <rect width="64" height="64" fill="#fff" />
        <circle cx="27" cy="41" r="2.2" fill="#000" />
        <circle cx="37" cy="41" r="2.2" fill="#000" />
      </mask>
      <g mask={`url(#${id})`}>{pads}</g>
    </svg>
  );
}
