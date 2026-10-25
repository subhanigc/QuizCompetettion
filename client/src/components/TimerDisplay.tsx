import React, { useState, useEffect } from 'react';
import { getRemainingTimerMs } from '../lib/socket';
import { sound } from '../lib/sound';

interface TimerDisplayProps {
  timerStartedAt: number | null;
  durationSeconds: number;
  isRunning: boolean;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'projector';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timerStartedAt,
  durationSeconds,
  isRunning,
  onExpire,
  size = 'md'
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    getRemainingTimerMs(timerStartedAt, durationSeconds)
  );

  useEffect(() => {
    let animId: number;
    let lastTickedSecond = -1;

    const updateTimer = () => {
      const ms = getRemainingTimerMs(timerStartedAt, durationSeconds);
      setRemainingMs(ms);

      const sec = Math.ceil(ms / 1000);
      if (isRunning && sec <= 5 && sec > 0 && sec !== lastTickedSecond) {
        lastTickedSecond = sec;
        sound.playTick();
      }

      if (ms <= 0 && isRunning) {
        onExpire?.();
      } else if (isRunning) {
        animId = requestAnimationFrame(updateTimer);
      }
    };

    if (isRunning) {
      animId = requestAnimationFrame(updateTimer);
    } else {
      setRemainingMs(getRemainingTimerMs(timerStartedAt, durationSeconds));
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [timerStartedAt, durationSeconds, isRunning, onExpire]);

  const totalMs = Math.max(1, durationSeconds * 1000);
  const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const seconds = Math.ceil(remainingMs / 1000);

  const isUrgent = seconds <= 5 && seconds > 0;
  const isWarning = seconds <= 10 && seconds > 5;

  let colorClass = 'bg-indigo-500';
  let textColorClass = 'text-indigo-400';
  if (isUrgent) {
    colorClass = 'bg-red-500 animate-pulse';
    textColorClass = 'text-red-400 animate-pulse';
  } else if (isWarning) {
    colorClass = 'bg-amber-500';
    textColorClass = 'text-amber-400';
  }

  if (size === 'projector') {
    return (
      <div className="flex flex-col items-center justify-center my-4 w-full">
        <div className={`font-mono font-black text-8xl md:text-9xl tracking-tight ${textColorClass}`}>
          {seconds}
          <span className="text-3xl text-gray-500 ml-1">s</span>
        </div>
        <div className="w-full max-w-4xl h-5 bg-gray-800 rounded-full overflow-hidden mt-4 border border-gray-700/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-150 ease-linear ${colorClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-1.5 my-2">
      <div className="flex items-center justify-between text-xs font-mono font-semibold">
        <span className="text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-ping' : 'bg-gray-500'}`} />
          {isRunning ? 'Time Remaining' : 'Timer Paused'}
        </span>
        <span className={`font-mono text-base font-bold ${textColorClass}`}>
          {seconds}s
        </span>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/60 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-150 ease-linear ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
