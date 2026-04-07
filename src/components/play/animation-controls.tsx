"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AnimationData, CanvasData } from "@/engine/types";
import type { AnimationState } from "@/engine/animation-engine";
import { getAnimationFrame } from "@/engine/animation-engine";

interface AnimationControlsProps {
  animationData: AnimationData;
  canvasData: CanvasData;
  onFrameUpdate: (state: AnimationState) => void;
  isVisible: boolean;
}

const STEP_SIZE = 0.1; // seconds

export function AnimationControls({
  animationData,
  canvasData,
  onFrameUpdate,
  isVisible,
}: AnimationControlsProps) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const speedRef = useRef(1);

  // Keep refs in sync
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const emitFrame = useCallback(
    (t: number) => {
      const frame = getAnimationFrame(animationData, canvasData, t);
      frame.isPlaying = isPlaying;
      frame.speed = speedRef.current;
      onFrameUpdate(frame);
    },
    [animationData, canvasData, isPlaying, onFrameUpdate],
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }

      const dt = ((now - lastFrameTimeRef.current) / 1000) * speedRef.current;
      lastFrameTimeRef.current = now;

      let newTime = timeRef.current + dt;
      if (newTime >= animationData.duration) {
        newTime = 0; // loop
      }

      timeRef.current = newTime;
      setTime(newTime);

      const frame = getAnimationFrame(animationData, canvasData, newTime);
      frame.isPlaying = true;
      frame.speed = speedRef.current;
      onFrameUpdate(frame);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, animationData, canvasData, onFrameUpdate]);

  // Emit frame on mount and when time changes via seeking
  useEffect(() => {
    if (!isPlaying) {
      emitFrame(time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleJumpToStart = useCallback(() => {
    setTime(0);
    timeRef.current = 0;
    setIsPlaying(false);
    const frame = getAnimationFrame(animationData, canvasData, 0);
    frame.isPlaying = false;
    frame.speed = speedRef.current;
    onFrameUpdate(frame);
  }, [animationData, canvasData, onFrameUpdate]);

  const handleJumpToEnd = useCallback(() => {
    const t = animationData.duration;
    setTime(t);
    timeRef.current = t;
    setIsPlaying(false);
    const frame = getAnimationFrame(animationData, canvasData, t);
    frame.isPlaying = false;
    frame.speed = speedRef.current;
    onFrameUpdate(frame);
  }, [animationData, canvasData, onFrameUpdate]);

  const handleStepBack = useCallback(() => {
    const t = Math.max(0, timeRef.current - STEP_SIZE);
    setTime(t);
    timeRef.current = t;
    setIsPlaying(false);
    const frame = getAnimationFrame(animationData, canvasData, t);
    frame.isPlaying = false;
    frame.speed = speedRef.current;
    onFrameUpdate(frame);
  }, [animationData, canvasData, onFrameUpdate]);

  const handleStepForward = useCallback(() => {
    const t = Math.min(animationData.duration, timeRef.current + STEP_SIZE);
    setTime(t);
    timeRef.current = t;
    setIsPlaying(false);
    const frame = getAnimationFrame(animationData, canvasData, t);
    frame.isPlaying = false;
    frame.speed = speedRef.current;
    onFrameUpdate(frame);
  }, [animationData, canvasData, onFrameUpdate]);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseFloat(e.target.value);
      setTime(t);
      timeRef.current = t;
      const frame = getAnimationFrame(animationData, canvasData, t);
      frame.isPlaying = isPlaying;
      frame.speed = speedRef.current;
      onFrameUpdate(frame);
    },
    [animationData, canvasData, isPlaying, onFrameUpdate],
  );

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    speedRef.current = s;
  }, []);

  // Keyboard handler for space = play/pause
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, handlePlayPause]);

  if (!isVisible) return null;

  const progress = animationData.duration > 0 ? (time / animationData.duration) * 100 : 0;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/80 px-5 py-3 shadow-2xl backdrop-blur-xl">
      {/* Transport controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleJumpToStart}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Jump to start"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={handleStepBack}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Step back 0.1s"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={handlePlayPause}
          className="mx-1 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/50"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <button
          onClick={handleStepForward}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Step forward 0.1s"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleJumpToEnd}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Jump to end"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Scrubber */}
      <div className="relative flex flex-1 items-center gap-3">
        <div className="relative flex-1">
          {/* Track background */}
          <div className="h-1.5 w-full rounded-full bg-zinc-700/60">
            {/* Filled portion */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Native range input (invisible, captures interaction) */}
          <input
            type="range"
            min={0}
            max={animationData.duration}
            step={0.01}
            value={time}
            onChange={handleScrub}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {/* Thumb indicator */}
          <div
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 shadow-md"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <span className="min-w-[80px] text-right font-mono text-xs text-zinc-400">
          {time.toFixed(1)}s / {animationData.duration.toFixed(1)}s
        </span>
      </div>

      {/* Speed controls */}
      <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/60 p-0.5">
        {[0.5, 1, 2].map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              speed === s
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
