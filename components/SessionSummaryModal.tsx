'use client';

import { Star, TrendingUp, BookOpen, AlertCircle, X } from 'lucide-react';
import type { SessionSummary } from '@/types';
import { cn } from '@/lib/utils';

interface SessionSummaryModalProps {
  summary: SessionSummary;
  onClose: () => void;
}

export const SessionSummaryModal = ({ summary, onClose }: SessionSummaryModalProps) => {
  const fluencyColor =
    summary.fluencyScore >= 8
      ? 'text-emerald-400'
      : summary.fluencyScore >= 5
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#13131a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-violet-600 dark:text-violet-400" />
              Session Summary
            </h2>
            <p className="text-sm text-slate-500 mt-1">After {summary.totalTurns} turns</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close summary"
            id="btn-close-summary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Fluency Score */}
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 text-center">
          <div className={cn('text-5xl font-black', fluencyColor)}>
            {summary.fluencyScore}
            <span className="text-2xl text-slate-500">/10</span>
          </div>
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-center gap-1">
            <Star size={16} className="text-amber-500 dark:text-amber-400" />
            Fluency Score
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Corrections"
            value={summary.totalCorrections}
            icon={<AlertCircle size={14} />}
            color="text-amber-400"
          />
          <StatCard
            label="New Vocabulary"
            value={summary.newVocabulary.length}
            icon={<BookOpen size={14} />}
            color="text-cyan-400"
          />
        </div>

        {/* Frequent errors */}
        {summary.frequentErrors.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Common Mistakes
            </h3>
            {summary.frequentErrors.slice(0, 3).map((e, i) => (
              <div
                key={i}
                className="text-sm px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 text-slate-600 dark:text-slate-400"
              >
                <span className="line-through text-red-600 dark:text-red-400 mr-2">{e.original}</span>→
                <span className="text-emerald-600 dark:text-emerald-400 ml-2 font-medium">{e.corrected}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-base font-semibold transition-all"
          id="btn-continue-session"
        >
          Continue Practicing
        </button>
      </div>
    </div>
  );
};

const StatCard = ({
  label, value, icon, color,
}: { label: string; value: number; icon: React.ReactNode; color: string }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 text-center">
    <div className={cn('text-3xl font-bold', color)}>{value}</div>
    <div className="text-sm font-medium text-slate-600 dark:text-slate-500 flex items-center justify-center gap-1 mt-1">
      <span className={color}>{icon}</span>
      {label}
    </div>
  </div>
);
