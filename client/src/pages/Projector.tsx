import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { ApiClient } from '../lib/api';
import { SessionState, LeaderboardEntry } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/constants';
import { TimerDisplay } from '../components/TimerDisplay';
import { CodeBlock } from '../components/CodeBlock';
import { Leaderboard } from '../components/Leaderboard';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize,
  Minimize,
  Wifi,
  Users,
  Award,
  Layers,
  CheckCircle2,
  Lock,
  Zap,
  HelpCircle
} from 'lucide-react';

export const Projector: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [sessionCode, setSessionCode] = useState(searchParams.get('code') || '');
  const [session, setSession] = useState<SessionState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lanInfo, setLanInfo] = useState<{ primaryLanUrl?: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    ApiClient.request('/auth/info').then(info => setLanInfo(info)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionCode) return;

    const socket = getSocket();

    socket.emit(SOCKET_EVENTS.JOIN_SESSION, {
      sessionIdOrCode: sessionCode,
      role: 'projector'
    });

    const onSessionUpdated = (state: SessionState) => {
      setSession(state);
    };

    const onLeaderboardUpdated = (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    };

    const onBuzzerStateChanged = (bz: any) => {
      setSession(prev => (prev ? { ...prev, buzzer: bz } : prev));
    };

    const onSubCountUpdated = (data: { submissionsCount: number }) => {
      setSession(prev => (prev ? { ...prev, submissionsCount: data.submissionsCount } : prev));
    };

    socket.on(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
    socket.on(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);
    socket.on('submission_count_updated', onSubCountUpdated);

    ApiClient.request(`/sessions/${sessionCode}`)
      .then(s => setSession(s))
      .catch(() => {});

    ApiClient.request(`/sessions/${sessionCode}/leaderboard`)
      .then(lb => setLeaderboard(lb))
      .catch(() => {});

    return () => {
      socket.off(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
      socket.off(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);
      socket.off('submission_count_updated', onSubCountUpdated);
    };
  }, [sessionCode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const joinUrl = lanInfo?.primaryLanUrl
    ? `${lanInfo.primaryLanUrl}/?code=${session?.joinCode || sessionCode}`
    : `${window.location.origin}/?code=${session?.joinCode || sessionCode}`;

  // If no code is entered, prompt for one
  if (!sessionCode) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-2">Projector View</h2>
          <p className="text-sm text-gray-400 mb-6">Enter the session join code to launch the public projector display:</p>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. TECH26"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl font-mono text-xl text-center text-indigo-400 tracking-widest font-black uppercase"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) setSessionCode(val.toUpperCase());
                }
              }}
            />
            <button
              onClick={e => {
                const input = (e.currentTarget.previousSibling as HTMLInputElement).value.trim();
                if (input) setSessionCode(input.toUpperCase());
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer"
            >
              Launch
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-mono text-gray-400">Loading Projector Display ({sessionCode})...</p>
        </div>
      </div>
    );
  }

  const q = session.currentQuestion;
  const stage = q?.currentStage;

  return (
    <div className="min-h-screen bg-[#070A11] text-gray-100 flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Top Projector Header */}
      <header className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-600/30">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>TechQuiz Arena</span>
              <span className="text-sm font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {session.roundName}
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              Join at <span className="text-indigo-400 font-bold">{joinUrl}</span> with code <span className="text-white font-bold">{session.joinCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>{session.teamsCount} Teams Connected</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-center my-4">
        {/* 1. LOBBY VIEW WITH GIANT QR CODE */}
        {session.status === 'lobby' && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-900/60 border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-md">
            <div className="text-left space-y-4">
              <span className="px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-mono font-bold uppercase tracking-wider">
                Registration Open
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                Scan & Join the Arena
              </h2>
              <p className="text-base text-gray-400">
                Connect your phone to the competition Wi-Fi network and scan the QR code to participate.
              </p>
              <div className="pt-2">
                <div className="text-xs font-mono uppercase text-gray-500 mb-1">Game Join Code</div>
                <div className="text-5xl font-mono font-black text-indigo-400 tracking-widest">
                  {session.joinCode}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-2xl border border-gray-200">
              <QRCodeSVG value={joinUrl} size={260} level="H" />
              <div className="mt-3 text-center text-xs font-mono font-bold text-gray-800 truncate max-w-full">
                {joinUrl}
              </div>
            </div>
          </div>
        )}

        {/* 2. LEADERBOARD VIEW */}
        {session.status === 'leaderboard' && (
          <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white">🏆 Official Leaderboard</h2>
              <p className="text-sm font-mono text-gray-400 mt-1">Live rankings sorted by points and fastest response time</p>
            </div>
            <Leaderboard entries={leaderboard} advancingCutoff={session.roundType === 'screening' ? 8 : 4} />
          </div>
        )}

        {/* 3. ACTIVE QUESTION DISPLAY */}
        {(session.status === 'active_question' || session.status === 'paused' || session.status === 'answer_revealed') && q && (
          <div className="max-w-5xl mx-auto w-full flex flex-col items-center text-center">
            {/* Big Projector Timer */}
            <TimerDisplay
              timerStartedAt={session.timerStartedAt}
              durationSeconds={session.timerDurationSeconds}
              isRunning={session.timerIsRunning}
              size="projector"
            />

            {/* Response Meter */}
            <div className="flex items-center space-x-3 text-xs md:text-sm font-mono text-gray-400 my-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">{session.submissionsCount}</span> of {session.teamsCount} Teams Answered
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
                <Award className="w-4 h-4 text-indigo-400" />
                <span>+{q.points} Points</span>
              </span>
            </div>

            {/* Staged Story Callout */}
            {stage && (
              <div className="w-full max-w-4xl my-3 p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800 text-left">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>{stage.title}</span>
                </div>
                <p className="text-sm md:text-base text-gray-200 whitespace-pre-line leading-relaxed">
                  {stage.storyText}
                </p>
              </div>
            )}

            {/* Question Text */}
            <div className="w-full max-w-4xl bg-gray-900/90 border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl my-3">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
                {stage ? stage.questionText : q.text}
              </h2>

              {/* Code Snippet */}
              {q.codeSnippet && (
                <div className="mt-6 text-left">
                  <CodeBlock code={q.codeSnippet} language={q.codeLanguage || 'c'} />
                </div>
              )}

              {/* Image Question */}
              {q.imageUrl && (
                <div className="mt-6 max-h-80 overflow-hidden rounded-2xl border border-gray-700 flex items-center justify-center bg-black">
                  <img src={q.imageUrl} alt="Asset" className="max-h-80 object-contain" />
                </div>
              )}

              {/* Buzzer Lock Status */}
              {q.type === 'buzzer' && (
                <div className="mt-6">
                  {session.buzzer.winnerTeamName ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600 text-emerald-300 flex items-center justify-center space-x-3 text-xl font-bold animate-bounce">
                      <Zap className="w-7 h-7 text-amber-400" />
                      <span>BUZZER LOCKED BY: "{session.buzzer.winnerTeamName}"</span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gray-800/80 border border-gray-700 text-gray-300 flex items-center justify-center space-x-2 text-lg font-mono">
                      <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
                      <span>Buzzer is OPEN! Press on your device to lock!</span>
                    </div>
                  )}
                </div>
              )}

              {/* Answer Revealed Showcase */}
              {session.status === 'answer_revealed' && session.revealedAnswer && (
                <div className="mt-8 p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500 text-left animate-fade-in shadow-2xl">
                  <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold text-sm uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Official Correct Answer</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white font-mono mb-3">
                    {Array.isArray(session.revealedAnswer.correctAnswer)
                      ? session.revealedAnswer.correctAnswer.join(', ')
                      : String(session.revealedAnswer.correctAnswer)}
                  </div>
                  {session.revealedAnswer.explanation && (
                    <div className="text-sm md:text-base text-gray-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-emerald-900/60">
                      <span className="font-bold text-emerald-300 block mb-1">Explanation:</span>
                      {session.revealedAnswer.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs font-mono text-gray-500">
        <div>TechQuiz Arena • High-Concurrency Self-Hosted LAN Quiz System</div>
        <div>Offline Mode • Monotonic Server Time</div>
      </footer>
    </div>
  );
};
