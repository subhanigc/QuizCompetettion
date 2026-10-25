import React from 'react';
import { LeaderboardEntry } from '@shared/types';
import { Trophy, Medal, Clock, CheckCircle2, UserX } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightTeamId?: string;
  advancingCutoff?: number;
  compact?: boolean;
  isFinal?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  highlightTeamId,
  advancingCutoff,
  compact = false
}) => {
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 font-mono text-sm bg-gray-900/40 rounded-xl border border-gray-800">
        No teams on the leaderboard yet.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900/90 shadow-2xl backdrop-blur-md">
      <div className="px-5 py-3.5 bg-gray-800/80 border-b border-gray-700/80 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Live Rankings</span>
        </div>
        {advancingCutoff && (
          <span className="text-emerald-400 text-[11px] font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
            Top {advancingCutoff} Advance
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-800/80 overflow-x-auto">
        {entries.map((entry, index) => {
          const isHighlighted = entry.teamId === highlightTeamId;
          const isAdvancing = advancingCutoff ? entry.rank <= advancingCutoff && !entry.isEliminated : !entry.isEliminated;

          let rankBadge = (
            <span className="font-mono text-xs font-bold text-gray-400 w-6 text-center">
              #{entry.rank}
            </span>
          );

          if (entry.rank === 1) {
            rankBadge = (
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                🥇
              </span>
            );
          } else if (entry.rank === 2) {
            rankBadge = (
              <span className="w-6 h-6 rounded-full bg-gray-400/20 text-gray-300 border border-gray-400/40 flex items-center justify-center font-bold text-xs">
                🥈
              </span>
            );
          } else if (entry.rank === 3) {
            rankBadge = (
              <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center font-bold text-xs">
                🥉
              </span>
            );
          }

          return (
            <div
              key={entry.teamId}
              className={`flex items-center justify-between px-4 py-3 transition-colors ${
                isHighlighted
                  ? 'bg-indigo-950/50 border-l-4 border-indigo-500'
                  : index % 2 === 0
                  ? 'bg-gray-900/40'
                  : 'bg-gray-900/80'
              } hover:bg-gray-800/40`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                {rankBadge}
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-semibold text-sm md:text-base truncate ${
                        isHighlighted ? 'text-indigo-300 font-bold' : 'text-gray-100'
                      }`}
                    >
                      {entry.teamName}
                    </span>
                    {isHighlighted && (
                      <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/40 uppercase">
                        You
                      </span>
                    )}
                    {entry.isEliminated && (
                      <span className="text-[10px] font-semibold bg-red-950 text-red-400 px-1.5 py-0.2 rounded border border-red-800 flex items-center gap-0.5">
                        <UserX className="w-2.5 h-2.5" /> Eliminated
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <div className="flex items-center space-x-3 text-xs text-gray-400 font-mono mt-0.5">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {entry.correctAnswers}/{entry.questionsAnswered} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {(entry.totalTimeMs / 1000).toFixed(1)}s total
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex items-center space-x-3 ml-4">
                <div>
                  <div className="text-base md:text-lg font-mono font-extrabold text-white">
                    {entry.totalScore}
                    <span className="text-xs text-gray-400 ml-1 font-normal">pts</span>
                  </div>
                  {compact && (
                    <div className="text-[11px] text-gray-500 font-mono">
                      {(entry.totalTimeMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
