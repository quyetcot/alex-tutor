'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  className?: string;
}

export const AudioVisualizer = ({ canvasRef, isActive, className }: AudioVisualizerProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep canvas dimensions in sync with container size
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const observer = new ResizeObserver(() => {
      canvas.width = wrapper.clientWidth * window.devicePixelRatio;
      canvas.height = wrapper.clientHeight * window.devicePixelRatio;
      canvas.style.width = `${wrapper.clientWidth}px`;
      canvas.style.height = `${wrapper.clientHeight}px`;
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative w-full h-16 rounded-xl overflow-hidden transition-all duration-500',
        isActive
          ? 'opacity-100 border border-violet-500/30 bg-black/20'
          : 'opacity-30',
        className,
      )}
      aria-label={isActive ? 'Audio visualizer active' : 'Audio visualizer inactive'}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Idle state: static bars */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-700 rounded-full"
              style={{ height: `${4 + Math.sin(i * 0.4) * 3}px` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
