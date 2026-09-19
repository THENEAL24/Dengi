import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'strong' | 'flat';
  padded?: boolean;
};

export function GlassCard({ children, className, variant = 'glass', padded = true }: Props) {
  const base = variant === 'strong' ? 'glass-strong' : variant === 'flat' ? 'glass-flat' : 'glass';
  return (
    <div
      className={cn(base, 'rounded-[var(--radius-card)]', padded && 'p-4', className)}
    >
      {children}
    </div>
  );
}
