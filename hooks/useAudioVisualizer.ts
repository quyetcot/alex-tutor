'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioVisualizerReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startVisualizer: (stream: MediaStream) => void;
  stopVisualizer: () => void;
  isActive: boolean;
}

/**
 * Hook for real-time audio waveform visualization using Web Audio API.
 * Renders bars proportional to actual microphone volume.
 * SSR-safe and cleans up AudioContext on unmount.
 */
export const useAudioVisualizer = (): UseAudioVisualizerReturn => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isActive, setIsActive] = useState(false);

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 40;
      const barWidth = (width / barCount) * 0.8;
      const gap = (width / barCount) * 0.2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] / 255;
        const barHeight = value * height * 0.9;
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        // Gradient: cyan → purple
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${0.4 + value * 0.6})`);
        gradient.addColorStop(1, `rgba(6, 182, 212, ${0.4 + value * 0.6})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  }, []);

  const startVisualizer = useCallback(
    (stream: MediaStream) => {
      if (typeof window === 'undefined') return;

      // Reuse or create AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }

      const audioCtx = audioContextRef.current;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;

      setIsActive(true);
      drawBars();
    },
    [drawBars],
  );

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    sourceRef.current?.disconnect();
    setIsActive(false);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopVisualizer();
      audioContextRef.current?.close();
    };
  }, [stopVisualizer]);

  return { canvasRef, startVisualizer, stopVisualizer, isActive };
};
