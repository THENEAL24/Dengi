import type { ReactNode } from 'react';

type Props = {
  /** 0..1, значения больше 1 обрезаются */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
};

export function ProgressRing({
  progress,
  size = 208,
  thickness = 12,
  color = 'var(--accent)',
  trackColor = 'var(--fill-tertiary)',
  children,
}: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 520ms cubic-bezier(0.32, 0.72, 0, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center px-4 text-center">{children}</div>
    </div>
  );
}
