import { MotifKind } from '../theme/faithTheme';

interface MotifProps {
  kind: MotifKind;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Motif({ kind, size = 24, color = 'currentColor', style = {} }: MotifProps) {
  const s: React.CSSProperties = { width: size, height: size, display: 'block', ...style };
  if (kind === 'cross') {
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none">
        <path d="M10 1.5h4v6h7v3.5h-7v11.5h-4V11H3V7.5h7V1.5z" fill={color} />
      </svg>
    );
  }
  if (kind === 'lotus') {
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none">
        <path d="M12 3c1.6 2.1 2.4 4.3 2.4 6.5 0 1-.2 1.9-.5 2.7-.6-.4-1.2-.6-1.9-.6s-1.3.2-1.9.6c-.3-.8-.5-1.7-.5-2.7C9.6 7.3 10.4 5.1 12 3z" fill={color} />
        <path d="M3.8 8.3c2.5.3 4.5 1.3 6 2.8.7.7 1.2 1.4 1.6 2.2-.7.2-1.3.5-1.8 1-.5.5-.8 1.1-1 1.7-.8-.4-1.5-.9-2.2-1.6-1.5-1.5-2.5-3.5-2.8-6z" fill={color} opacity="0.85" />
        <path d="M20.2 8.3c-.3 2.5-1.3 4.5-2.8 6-.7.7-1.4 1.2-2.2 1.6-.2-.6-.5-1.2-1-1.7-.5-.5-1.1-.8-1.8-1 .4-.8.9-1.5 1.6-2.2 1.5-1.5 3.5-2.5 6.2-2.7z" fill={color} opacity="0.85" />
        <path d="M6 17c1.3-1.7 3-2.7 5-3 .5-.1 1-.1 1.4 0 0 .1 0 .2 0 .3 0 1.2.4 2.3 1.1 3.2-.9.4-1.9.5-3 .5-1.7 0-3.2-.4-4.5-1z" fill={color} opacity="0.7" />
        <path d="M18 17c-1.3.6-2.8 1-4.5 1-.6 0-1.2-.1-1.7-.2.6-.9 1-2 1-3.2 0-.1 0-.2 0-.3.5-.1 1 0 1.5 0 2 .3 3.6 1.3 4.7 2.7z" fill={color} opacity="0.7" />
        <circle cx="12" cy="13.7" r="1.7" fill={color} />
      </svg>
    );
  }
  // rosary
  return (
    <svg viewBox="0 0 24 24" style={s} fill="none">
      <path d="M11.2 1.5h1.6V4h2v1.6h-2v3.5h-1.6V5.6h-2V4h2V1.5z" fill={color} />
      <circle cx="12" cy="11.2" r="1" fill={color} />
      <circle cx="9.2" cy="12.1" r=".9" fill={color} />
      <circle cx="14.8" cy="12.1" r=".9" fill={color} />
      <circle cx="6.8" cy="13.7" r=".85" fill={color} />
      <circle cx="17.2" cy="13.7" r=".85" fill={color} />
      <circle cx="4.8" cy="16" r=".85" fill={color} />
      <circle cx="19.2" cy="16" r=".85" fill={color} />
      <circle cx="4.2" cy="18.7" r=".85" fill={color} />
      <circle cx="19.8" cy="18.7" r=".85" fill={color} />
      <circle cx="6" cy="21" r=".85" fill={color} />
      <circle cx="18" cy="21" r=".85" fill={color} />
      <circle cx="9" cy="22.3" r=".85" fill={color} />
      <circle cx="15" cy="22.3" r=".85" fill={color} />
      <circle cx="12" cy="22.6" r="1" fill={color} />
    </svg>
  );
}

interface MotifLargeProps {
  kind: MotifKind;
  color?: string;
  opacity?: number;
  style?: React.CSSProperties;
}

export function MotifLarge({ kind, color = 'currentColor', opacity = 0.08, style = {} }: MotifLargeProps) {
  const s: React.CSSProperties = { color, opacity, width: '100%', height: '100%', ...style };
  if (kind === 'cross') {
    return (
      <svg viewBox="0 0 200 200" style={s}>
        <path d="M85 12h30v54h62v32h-62v90h-30V98H23V66h62V12z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'lotus') {
    return (
      <svg viewBox="0 0 200 200" style={s}>
        <g fill="currentColor">
          <path d="M100 20c12 18 18 35 18 52 0 8-2 15-5 21-5-3-10-5-13-5s-8 2-13 5c-3-6-5-13-5-21 0-17 6-34 18-52z" />
          <path d="M22 64c20 3 36 11 49 23 5 5 9 11 12 17-5 2-10 4-14 8s-7 9-9 13c-6-3-12-7-17-12-13-13-18-32-21-49z" opacity=".85" />
          <path d="M178 64c-3 17-8 36-21 49-5 5-11 9-17 12-2-4-5-9-9-13s-9-6-14-8c3-6 7-12 12-17 13-12 30-20 49-23z" opacity=".85" />
          <path d="M46 142c10-13 24-21 40-24 4 0 8 0 11 0 0 1 0 2 0 3 0 9 3 18 9 25-7 3-15 4-24 4-13 0-25-3-36-8z" opacity=".7" />
          <path d="M154 142c-11 5-23 8-36 8-4 0-9 0-13-1 4-7 8-16 8-25 0-1 0-2 0-3 4-1 8 0 12 0 16 2 28 11 37 21z" opacity=".7" />
          <circle cx="100" cy="118" r="14" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" style={s}>
      <g fill="currentColor">
        <path d="M92 10h16v22h18v16h-18v32h-16V48H74V32h18V10z" />
        <circle cx="100" cy="98" r="9" />
        <circle cx="78" cy="106" r="8" /><circle cx="122" cy="106" r="8" />
        <circle cx="59" cy="120" r="7.5" /><circle cx="141" cy="120" r="7.5" />
        <circle cx="44" cy="139" r="7.5" /><circle cx="156" cy="139" r="7.5" />
        <circle cx="38" cy="160" r="7.5" /><circle cx="162" cy="160" r="7.5" />
        <circle cx="50" cy="180" r="7.5" /><circle cx="150" cy="180" r="7.5" />
        <circle cx="74" cy="192" r="7.5" /><circle cx="126" cy="192" r="7.5" />
        <circle cx="100" cy="195" r="9" />
      </g>
    </svg>
  );
}
