import type { SVGProps, JSX } from 'react';

type SvgProps = SVGProps<SVGSVGElement>;

function Star(props: SvgProps) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * 22.5 - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? 26 : 11;
    pts.push(`${(32 + r * Math.cos(a)).toFixed(1)},${(32 + r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <polygon points={pts.join(' ')} />
    </svg>
  );
}

function Moon(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M34 6 C16 6 4 18 4 32 C4 46 16 58 34 58 C24 50 18 42 18 32 C18 22 24 14 34 6Z" />
    </svg>
  );
}

function Cat(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M16 28 L12 8 L28 22 L32 20 L36 22 L52 8 L48 28 C48 46 41 56 32 56 C23 56 16 46 16 28Z" />
      <circle cx="25" cy="35" r="2.5" className="symbol-detail" />
      <circle cx="39" cy="35" r="2.5" className="symbol-detail" />
      <path d="M30 40 L32 42 L34 40" fill="none" stroke="var(--bg-card-front, #111119)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Flower(props: SvgProps) {
  const petals = [];
  for (let i = 0; i < 6; i++) {
    petals.push(
      <ellipse key={i} cx="32" cy="18" rx="7" ry="14" transform={`rotate(${i * 60} 32 32)`} />
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      {petals}
      <circle cx="32" cy="32" r="6" className="symbol-detail" />
    </svg>
  );
}

function Leaf(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M32 6 C50 14 56 32 48 48 C42 58 32 60 32 60 C32 60 22 58 16 48 C8 32 14 14 32 6Z" />
      <line x1="32" y1="16" x2="32" y2="54" stroke="var(--bg-card-front, #111119)" strokeWidth="1.5" />
    </svg>
  );
}

function Diamond(props: SvgProps) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    const r = i % 2 === 0 ? 28 : 10;
    pts.push(`${(32 + r * Math.cos(a)).toFixed(1)},${(32 + r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <polygon points={pts.join(' ')} />
    </svg>
  );
}

function Butterfly(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M32 16 C18 8 4 16 8 32 C12 46 28 44 32 34 C36 44 52 46 56 32 C60 16 46 8 32 16Z" />
      <rect x="30.5" y="14" width="3" height="40" rx="1.5" />
    </svg>
  );
}

function Heart(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M32 56 C18 44 4 34 4 20 C4 10 12 4 20 4 C26 4 30 8 32 12 C34 8 38 4 44 4 C52 4 60 10 60 20 C60 34 46 44 32 56Z" />
    </svg>
  );
}

function Sun(props: SvgProps) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * Math.PI / 180;
    rays.push(
      <line
        key={i}
        x1={32 + 16 * Math.cos(a)}
        y1={32 + 16 * Math.sin(a)}
        x2={32 + 26 * Math.cos(a)}
        y2={32 + 26 * Math.sin(a)}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <circle cx="32" cy="32" r="10" />
      {rays}
    </svg>
  );
}

function Cloud(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <circle cx="20" cy="36" r="12" />
      <circle cx="36" cy="30" r="14" />
      <circle cx="50" cy="36" r="10" />
      <rect x="10" y="36" width="50" height="14" />
    </svg>
  );
}

function Mushroom(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M6 36 Q6 10 32 10 Q58 10 58 36 Z" />
      <rect x="24" y="36" width="16" height="20" rx="4" />
    </svg>
  );
}

function Eye(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M4 32 Q16 12 32 12 Q48 12 60 32 Q48 52 32 52 Q16 52 4 32Z" />
      <circle cx="32" cy="32" r="9" className="symbol-detail" />
      <circle cx="32" cy="32" r="4.5" fill="currentColor" />
    </svg>
  );
}

function Crystal(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <polygon points="32,4 50,18 50,46 32,60 14,46 14,18" />
    </svg>
  );
}

function Feather(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M42 4 C56 12 60 28 52 44 C44 58 30 62 22 56 C14 50 12 38 18 26 C24 14 36 6 42 4Z" />
      <line x1="42" y1="6" x2="22" y2="56" stroke="var(--bg-card-front, #111119)" strokeWidth="1.5" />
    </svg>
  );
}

function Drop(props: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" {...props}>
      <path d="M32 6 C32 6 52 28 52 40 C52 50 43 58 32 58 C21 58 12 50 12 40 C12 28 32 6 32 6Z" />
    </svg>
  );
}

const SYMBOL_MAP: Record<string, (props: SvgProps) => JSX.Element> = {
  star: Star,
  moon: Moon,
  cat: Cat,
  flower: Flower,
  leaf: Leaf,
  diamond: Diamond,
  butterfly: Butterfly,
  heart: Heart,
  sun: Sun,
  cloud: Cloud,
  mushroom: Mushroom,
  eye: Eye,
  crystal: Crystal,
  feather: Feather,
  drop: Drop,
};

export function CardSymbol({ symbol, className }: { symbol: string; className?: string }) {
  const Component = SYMBOL_MAP[symbol];
  if (!Component) return null;
  return <Component className={className} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="10" cy="14" r="6" />
      <circle cx="18" cy="14" r="6" />
    </svg>
  );
}
