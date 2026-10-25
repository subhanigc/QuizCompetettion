import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { ApiClient } from '../lib/api';
import { SessionState, LeaderboardEntry, Team, AuditLog } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/constants';
import { TimerDisplay } from '../components/TimerDisplay';
import { QRCodeModal } from '../components/QRCodeModal';
import { Leaderboard } from '../components/Leaderboard';
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  Trophy,
  Zap,
  Users,
  Settings,
  Shield,
  QrCode,
  Edit,
  Trash2,
  AlertCircle,
  BarChart2,
  RefreshCw,
  PlusCircle,
  Layers
} from 'lucide-react';

export const LiveControlRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lanInfo, setLanInfo] = useState<{ primaryLanUrl?: string } | null>(null);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number>(1);
  const [scoreReason, setScoreReason] = useState<string>('');

  useEffect(() => {
    if (!sessionId) return;

    ApiClient.request('/auth/info').then(info => setLanInfo(info)).catch(() => {});

    const socket = getSocket();
    const token = ApiClient.getAdminToken();

    socket.emit(SOCKET_EVENTS.JOIN_SESSION, {
      sessionIdOrCode: sessionId,
      role: 'admin',
      token
    });

    const onSessionUpdated = (state: SessionState) => {
      setSession(state);
    };

    const onLeaderboardUpdated = (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    };

    const onTeamListChanged = (data: Team[]) => {
      setTeams(data);
    };

    const onBuzzerStateChanged = (bz: any) => {
      setSession(prev => (prev ? { ...prev, buzzer: bz } : prev));
    };

    socket.on(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
    socket.on(SOCKET_EVENTS.TEAM_LIST_CHANGED, onTeamListChanged);
    socket.on(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);

    loadInitialData();

    return () => {
      socket.off(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
      socket.off(SOCKET_EVENTS.TEAM_LIST_CHANGED, onTeamListChanged);
      socket.off(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);
    };
  }, [sessionId]);

  const loadInitialData = async () => {
    if (!sessionId) return;
    try {
      const s = await ApiClient.request(`/sessions/${sessionId}`);
      setSession(s);
      const t = await ApiClient.request(`/sessions/${sessionId}/teams`);
      setTeams(t);
      const lb = await ApiClient.request(`/sessions/${sessionId}/leaderboard`);
      setLeaderboard(lb);
      const logs = await ApiClient.request(`/sessions/${sessionId}/audit-logs`);
      setAuditLogs(logs);
    } catch {}
  };

  const emitAdminAction = (action: string, payload?: any) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.ADMIN_ACTION, {
      action,
      payload,
      token: ApiClient.getAdminToken()
    });
  };

  const handleStartQuestion = (idx: number) => {
    emitAdminAction('start_question', { questionIndex: idx });
  };

  const handleNextQuestion = () => {
    emitAdminAction('next_question');
  };

  const handleNextStage = () => {
    emitAdminAction('next_stage');
  };

  const handlePauseTimer = () => {
    emitAdminAction('pause_timer');
  };

  const handleResumeTimer = () => {
    emitAdminAction('resume_timer');
  };

  const handleRevealAnswer = () => {
    emitAdminAction('reveal_answer');
  };

  const handleShowLeaderboard = () => {
    emitAdminAction('show_leaderboard');
  };

  const handleReopenBuzzer = () => {
    emitAdminAction('reopen_buzzer');
  };

  const handleLockBuzzer = () => {
    emitAdminAction('lock_buzzer');
  };

  const handleKickTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to kick this team?')) return;
    await ApiClient.request(`/sessions/${sessionId}/teams/${teamId}`, { method: 'DELETE' });
    loadInitialData();
  };

  const handleRenameTeam = async (teamId: string) => {
    const newName = window.prompt('Enter new team name:');
    if (!newName) return;
    await ApiClient.request(`/sessions/${sessionId}/teams/${teamId}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ newName })
    });
    loadInitialData();
  };

  const handleScoreAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !scoreReason.trim()) return;

    try {
      await ApiClient.request(`/sessions/${sessionId}/adjust-score`, {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeam.id,
          delta: scoreDelta,
          reason: scoreReason
        })
      });
      setIsScoreModalOpen(false);
      setScoreReason('');
      loadInitialData();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message}`);
    }
  };

  const handleAdvanceTeams = async () => {
    if (!session) return;
    const topN = window.prompt(`How many top teams should advance to next round?`, '4');
    if (!topN) return;

    const count = parseInt(topN, 10);
    if (isNaN(count) || count <= 0) return;

    try {
      const res = await ApiClient.request(`/sessions/${sessionId}/advance`, {
        method: 'POST',
        body: JSON.stringify({ topN: count })
      });
      alert(`Advanced ${res.advancing.length} teams. ${res.eliminated.length} teams marked eliminated.`);
      loadInitialData();
    } catch (err: any) {
      alert(`Advancement failed: ${err.message}`);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono text-gray-400">Loading Control Room ({sessionId})...</p>
        </div>
      </div>
    );
  }

  const q = session.currentQuestion;
  const isStaged = q?.type === 'staged_scenario';

  const joinUrl = lanInfo?.primaryLanUrl
    ? `${lanInfo.primaryLanUrl}/?code=${session.joinCode}`
    : `${window.location.origin}/?code=${session.joinCode}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Session Command Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl md:text-2xl font-black text-white">
                Live Stage: {session.roundName}
              </h1>
            </div>
            <p className="text-xs font-mono text-gray-400">
              Session Code: <span className="font-bold text-indigo-400 text-sm">{session.joinCode}</span> • Status: <span className="uppercase text-white font-bold">{session.status}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsQrOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-indigo-300 text-xs font-mono font-semibold border border-gray-700 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Show QR</span>
            </button>

            <Link
              to={`/projector?code=${session.joinCode}`}
              target="_blank"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-mono font-semibold border border-gray-700 transition"
            >
              <span>Projector</span>
            </Link>

            <Link
              to={`/analytics/${session.id}`}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-mono font-semibold border border-indigo-500/40 transition"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics & Podium</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Control Stage (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Question & Action Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl text-left">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Question {session.currentQuestionIndex + 1} of {session.totalQuestions}
                {isStaged && ` (Stage ${session.currentStageIndex + 1})`}
              </span>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-gray-400">
                  {session.submissionsCount} / {session.teamsCount} Submissions
                </span>
              </div>
            </div>

            {/* Active Question Preview */}
            {q ? (
              <div className="mb-6">
                <div className="flex items-center space-x-2 text-xs font-mono text-gray-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 border border-gray-700">
                    {q.topic}
                  </span>
                  <span className="text-emerald-400 font-bold">+{q.points} pts</span>
                  <span className="uppercase text-gray-500">{q.type}</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                  {q.title}
                </h3>
                <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {q.currentStage ? `${q.currentStage.storyText}\n\n${q.currentStage.questionText}` : q.text}
                </p>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 font-mono text-sm">
                No question active. Click "Start Round" below to begin.
              </div>
            )}

            {/* Timer Bar */}
            <div className="my-4">
              <TimerDisplay
                timerStartedAt={session.timerStartedAt}
                durationSeconds={session.timerDurationSeconds}
                isRunning={session.timerIsRunning}
              />
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {session.timerIsRunning ? (
                <button
                  onClick={handlePauseTimer}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Timer</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeTimer}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Timer</span>
                </button>
              )}

              <button
                onClick={handleRevealAnswer}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal Answer</span>
              </button>

              <button
                onClick={handleShowLeaderboard}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Show Standings</span>
              </button>

              {isStaged ? (
                <button
                  onClick={handleNextStage}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Next Stage</span>
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="py-2.5 px-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Next Question</span>
                </button>
              )}
            </div>

            {/* Buzzer Host Controls */}
            {q?.type === 'buzzer' && (
              <div className="mt-5 p-4 rounded-xl bg-gray-800/80 border border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 block font-semibold">
                    Buzzer Control
                  </span>
                  <span className="text-sm font-bold text-white">
                    Winner: <span className="text-amber-400">{session.buzzer.winnerTeamName || 'None'}</span>
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleReopenBuzzer}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition cursor-pointer"
                  >
                    Reopen Buzzer
                  </button>
                  <button
                    onClick={handleLockBuzzer}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono transition cursor-pointer"
                  >
                    Lock Buzzer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table in Live Stage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Live Leaderboard Standings</span>
              </h3>
              <button
                onClick={handleAdvanceTeams}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono transition cursor-pointer"
              >
                Advance Top Teams
              </button>
            </div>
            <Leaderboard entries={leaderboard} />
          </div>

          {/* Audit Logs Section */}
          {auditLogs.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl text-left">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 mb-3">
                Score Adjustment Audit Log
              </h4>
              <div className="divide-y divide-gray-800 text-xs font-mono">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{log.teamName}: </span>
                      <span className={log.delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {log.delta >= 0 ? `+${log.delta}` : log.delta} pts
                      </span>
                      <span className="text-gray-400 ml-2">({log.reason})</span>
                    </div>
                    <span className="text-gray-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Connected Teams Management (1 Col) */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Roster ({teams.length})</span>
              </h3>
              <span className="text-xs font-mono text-gray-400">Click to adjust</span>
            </div>

            <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
              {teams.map(t => (
                <div key={t.id} className="py-2.5 flex items-center justify-between group">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${t.isConnected ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                      <span className={t.isEliminated ? 'line-through text-gray-500' : ''}>{t.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400">
                      {Math.round(t.score * 10) / 10} pts • {(t.totalTimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => {
                        setSelectedTeam(t);
                        setIsScoreModalOpen(true);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-gray-800"
                      title="Adjust Score"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRenameTeam(t.id)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                      title="Rename Team"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleKickTeam(t.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800"
                      title="Kick Team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Score Adjustment Modal */}
      {isScoreModalOpen && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-left">
            <h3 className="text-base font-bold text-white mb-1">
              Adjust Score: {selectedTeam.name}
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Current Score: {selectedTeam.score} pts
            </p>

            <form onSubmit={handleScoreAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Points Delta (+ or -)</label>
                <input
                  type="number"
                  value={scoreDelta}
                  onChange={e => setScoreDelta(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono"
                  step="0.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  value={scoreReason}
                  onChange={e => setScoreReason(e.target.value)}
                  placeholder="e.g. Bonus for explanation / Host correction"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScoreModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save & Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrOpen && (
        <QRCodeModal
          url={joinUrl}
          joinCode={session.joinCode}
          onClose={() => setIsQrOpen(false)}
        />
      )}
    </div>
  );
};
