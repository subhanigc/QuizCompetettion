import React from 'react';
import { BuzzerState } from '@shared/types';
import { Zap, Lock, CheckCircle2 } from 'lucide-react';
import { sound } from '../lib/sound';

interface BuzzerButtonProps {
  buzzerState: BuzzerState;
  onPress: () => void;
  myTeamId?: string;
  disabled?: boolean;
}

export const BuzzerButton: React.FC<BuzzerButtonProps> = ({
  buzzerState,
  onPress,
  myTeamId,
  disabled = false
}) => {
  const isWinner = buzzerState.winnerTeamId === myTeamId;
  const isLockedOut = !buzzerState.isOpen && buzzerState.winnerTeamId !== null && !isWinner;
  const isOpen = buzzerState.isOpen;

  const handleClick = () => {
    if (isOpen && !disabled) {
      sound.playBuzzer();
      onPress();
    }
  };

  if (isWinner) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl shadow-2xl animate-bounce-short text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-black text-emerald-300">YOU BUZZED IN FIRST!</h3>
        <p className="text-sm text-emerald-400/80 mt-1">Submit your answer now!</p>
      </div>
    );
  }

  if (isLockedOut) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-950/30 border border-red-800/60 rounded-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/60 flex items-center justify-center mb-2">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h4 className="text-lg font-bold text-red-300">BUZZER LOCKED</h4>
        <p className="text-sm text-gray-400 mt-1">
          <span className="font-semibold text-white">"{buzzerState.winnerTeamName}"</span> buzzed in first!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full">
      <button
        onClick={handleClick}
        disabled={!isOpen || disabled}
        className={`relative group w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center font-black text-white shadow-2xl transition-all duration-100 transform active:scale-95 select-none ${
          isOpen && !disabled
            ? 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 border-8 border-red-900/80 cursor-pointer shadow-red-900/50 hover:shadow-red-600/40 hover:scale-105 animate-pulse'
            : 'bg-gray-800 border-8 border-gray-900 text-gray-500 cursor-not-allowed opacity-60'
        }`}
        aria-label="Press Buzzer"
      >
        <Zap className={`w-14 h-14 md:w-16 md:h-16 mb-2 ${isOpen ? 'text-amber-300 animate-bounce' : 'text-gray-600'}`} />
        <span className="text-2xl md:text-3xl tracking-wider uppercase font-mono">
          {isOpen ? 'BUZZ IN!' : 'WAITING'}
        </span>
      </button>
      <p className="text-xs text-gray-400 font-mono mt-4">
        {isOpen ? '⚡ Press as fast as possible to lock the buzzer!' : 'Buzzer is currently locked by the host.'}
      </p>
    </div>
  );
};
