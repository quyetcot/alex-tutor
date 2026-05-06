'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookMarked, Check, ArrowRight, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LanguageAnalysis, VocabularyUpgrade } from '@/types';
import { useConversationStore } from '@/store/conversationStore';

interface AnalysisPanelProps {
  analysis: LanguageAnalysis;
  className?: string;
}

export const AnalysisPanel = ({ analysis, className }: AnalysisPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { savedVocabulary, saveVocabularyItem } = useConversationStore();

  const hasCorrections = analysis.corrections && analysis.corrections.length > 0;
  const hasUpgrades = analysis.vocabulary_upgrades && analysis.vocabulary_upgrades.length > 0;
  const hasSuggestions = analysis.suggested_replies && analysis.suggested_replies.length > 0;

  if (!hasCorrections && !hasUpgrades && !hasSuggestions) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/3 backdrop-blur-sm overflow-hidden transition-all duration-300',
        className,
      )}
    >
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-base md:text-lg font-medium text-slate-300 hover:text-white transition-colors"
        aria-expanded={isOpen}
        aria-controls="analysis-content"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Language Analysis
          {hasCorrections && (
            <span className="text-sm bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              {analysis.corrections.length} correction{analysis.corrections.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Content */}
      {isOpen && (
        <div id="analysis-content" className="px-4 pb-4 space-y-4">
          {/* Grammar Corrections */}
          {hasCorrections && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Grammar Corrections
              </h3>
              {analysis.corrections.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/15 p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-base">
                      <span className="text-red-600 dark:text-red-400 line-through decoration-red-600/50 dark:decoration-red-400/50">
                        {c.original}
                      </span>
                      <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{c.corrected}</span>
                    </div>
                    <Badge variant="outline" className="text-xs uppercase border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                      {c.explanation}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vocabulary Upgrades */}
          {hasUpgrades && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Vocabulary Upgrades
              </h3>
              {analysis.vocabulary_upgrades.map((v, i) => (
                <VocabCard key={i} item={v} isSaved={savedVocabulary.some((s) => s.used === v.used)} onSave={saveVocabularyItem} />
              ))}
            </div>
          )}

          {/* Suggested Replies */}
          {hasSuggestions && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageCircle size={14} className="text-blue-500" />
                How to reply
              </h3>
              <div className="flex flex-col gap-2">
                {analysis.suggested_replies.map((reply, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3 text-sm md:text-base text-blue-900 dark:text-blue-200"
                  >
                    &ldquo;{reply}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── VocabCard sub-component ──────────────────────────────────────────────────

interface VocabCardProps {
  item: VocabularyUpgrade;
  isSaved: boolean;
  onSave: (item: VocabularyUpgrade) => void;
}

const VocabCard = ({ item, isSaved, onSave }: VocabCardProps) => (
  <div className="rounded-lg bg-slate-100 dark:bg-[#12121a] border border-slate-200 dark:border-white/5 p-3 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm text-slate-600 dark:text-slate-400">{item.used}</span>
        <span className="text-slate-400 text-sm">→</span>
        <span className="text-base text-violet-600 dark:text-violet-300 font-medium">{item.upgrade}</span>
      </div>
      <button
        onClick={() => onSave(item)}
        disabled={isSaved}
        title={isSaved ? 'Saved' : 'Save to vocabulary'}
        className={cn(
          'flex-shrink-0 p-1.5 rounded-md transition-all',
          isSaved
            ? 'text-emerald-400 bg-emerald-500/10'
            : 'text-slate-500 hover:text-violet-400 hover:bg-violet-500/10',
        )}
        aria-label={isSaved ? 'Vocabulary saved' : 'Save vocabulary'}
      >
        {isSaved ? <Check size={12} /> : <BookMarked size={12} />}
      </button>
    </div>
    <p className="text-sm text-slate-500 italic">&ldquo;{item.example}&rdquo;</p>
  </div>
);
