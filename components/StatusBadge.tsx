'use client';

import { cn } from '@/lib/utils';
import type { SystemStatus } from '@/types';

const STATUS_CONFIG: Record<
  SystemStatus,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: 'Ready', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', pulse: false },
  listening: { label: 'Listening...', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', pulse: true },
  processing: { label: 'Processing...', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', pulse: true },
  speaking: { label: 'Speaking...', color: 'bg-violet-500/20 text-violet-400 border-violet-500/40', pulse: true },
  error: { label: 'Error', color: 'bg-red-500/20 text-red-400 border-red-500/40', pulse: false },
};

interface StatusBadgeProps {
  status: SystemStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-medium transition-all duration-300 shadow-sm',
        config.color,
        className,
      )}
      aria-live="polite"
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={cn(
          'w-2.5 h-2.5 rounded-full',
          status === 'listening' && 'bg-emerald-400',
          status === 'processing' && 'bg-amber-400',
          status === 'speaking' && 'bg-violet-400',
          status === 'idle' && 'bg-slate-500',
          status === 'error' && 'bg-red-400',
          config.pulse && 'animate-pulse',
        )}
      />
      {config.label}
    </div>
  );
};
