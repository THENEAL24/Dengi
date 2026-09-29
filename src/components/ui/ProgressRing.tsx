import type { ReactNode } from 'react';

type Props = {
  /** Доля от «нормы»: 0…1 — основной слой, >1 — перерасход вторым цветом */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  /** Второй слой, когда progress > 1 */
  overflowColor?: string;
  /** Сколько «лишних» полных кругов показывать перерасходом (по умолчанию 1) */
  overflowCap?: number;
  trackColor?: string;
  children?: ReactNode;
};

export function ProgressRing({
  progress,
  size = 208,
  thickness = 12,
  color = 'var(--accent)',
  overflowColor = 'var(--ios-orange)',
  overflowCap = 1,
  trackColor = 'var(--fill-tertiary)',
  children,
}: Props) {
  const primary = Math.min(1, Math.max(0, progress));
  const overflow =
    progress > 1 ? Math.min(Math.max(0, progress - 1), Math.max(0, overflowCap)) : 0;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const primaryLen = primary * circumference;
  const overflowLen = overflow * circumference;
  const transition = 'stroke-dashoffset 520ms cubic-bezier(0.32, 0.72, 0, 1), stroke-dasharray 520ms cubic-bezier(0.32, 0.72, 0, 1)';

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
        {primaryLen > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${primaryLen} ${circumference - primaryLen}`}
            strokeDashoffset={0}
            style={{ transition }}
          />
        )}
        {overflowLen > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={overflowColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${overflowLen} ${circumference - overflowLen}`}
            strokeDashoffset={-primaryLen}
            style={{ transition }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center px-4 text-center">{children}</div>
    </div>
  );
}
