'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/types';

const formatTime = (date: Date): string =>
  new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold',
          isUser
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
        )}
        aria-hidden
      >
        {isUser ? 'U' : 'A'}
      </div>

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <div
          className={cn(
            'px-5 py-3.5 rounded-2xl text-base md:text-lg leading-relaxed transition-all shadow-sm',
            isUser
              ? 'bg-violet-600 dark:bg-violet-600/80 text-white rounded-tr-sm backdrop-blur-sm'
              : 'bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-white/10 backdrop-blur-sm',
            message.isStreaming && 'after:content-["▋"] after:animate-pulse after:ml-0.5',
          )}
        >
          {message.content || (message.isStreaming ? '' : '…')}
        </div>

        {/* Timestamp */}
        <span className="text-sm text-slate-600 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};
