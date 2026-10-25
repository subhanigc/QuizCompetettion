import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ApiClient } from '../lib/api';
import { soundEffects } from '../lib/sound';
import { Leaderboard } from '../components/Leaderboard';
import {
  Trophy,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Clock,
  Award,
  Sparkles,
  ArrowLeft,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { AnalyticsData } from '../../../shared/types';

export default function Analytics() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>(paramSessionId || '');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load session list if no param
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const list = await ApiClient.request<any[]>('/sessions/active/list');
        setSessions(list);
        if (!sessionId && list.length > 0) {
          setSessionId(list[0].id);
        }
      } catch {
        // ignore
      }
    };
    fetchSessions();
  }, [sessionId]);

  // Load analytics data
  useEffect(() => {
    if (!sessionId) return;
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await ApiClient.request<AnalyticsData>(`/sessions/${sessionId}/analytics`);
        setData(res);

        // Fire celebratory confetti if there are teams on the podium
        if (res.leaderboard && res.leaderboard.length > 0) {
          triggerConfetti();
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [sessionId]);

  const triggerConfetti = () => {
    soundEffects.playFanfare();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  };

  const handleExportCsv = () => {
    window.open(`/api/sessions/${sessionId}/export/csv`, '_blank');
  };

  const handleExportPdf = () => {
    window.open(`/api/sessions/${sessionId}/export/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-mono text-sm">Aggregating competition analytics...</p>
        </div>
      </div>
    );
  }

  const top3 = data?.leaderboard.slice(0, 3) || [];
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Portal
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-indigo-300 to-indigo-100">
                Competition Analytics & Results
              </h1>
              {data && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono px-2 py-0.5 rounded-full font-semibold">
                  {data.roundName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Complete performance audit, question breakdown, and downloadable scorecards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessions.length > 0 && (
            <select
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.round_name} ({s.join_code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={triggerConfetti}
            className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Celebrate Winners"
          >
            <Sparkles className="w-4 h-4" /> Celebrate
          </button>

          <button
            onClick={handleExportCsv}
            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>

          <button
            onClick={handleExportPdf}
            className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <FileText className="w-4 h-4" /> PDF Report
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-8">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Podium Area */}
        {top3.length > 0 && (
          <section className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center mb-10">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                Official Hall of Fame
              </span>
              <h2 className="text-3xl font-black text-slate-100 mt-1">Podium Finishers</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-6">
              {/* 2nd Place (Silver) */}
              {second && (
                <div className="order-2 md:order-1 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-400/60 flex items-center justify-center shadow-lg mb-3">
                    <Award className="w-10 h-10 text-slate-300" />
                  </div>
                  <span className="text-lg font-bold text-slate-100 text-center">{second.teamName}</span>
                  <span className="text-2xl font-black font-mono text-slate-300 mt-1">
                    {second.totalScore} <span className="text-xs font-normal text-slate-400">pts</span>
                  </span>
                  <div className="w-full mt-4 bg-slate-800/80 border-t-4 border-slate-400 rounded-t-2xl py-6 text-center">
                    <span className="text-xl font-black text-slate-400 font-mono">2nd Place</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold) */}
              {first && (
                <div className="order-1 md:order-2 flex flex-col items-center -mt-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-3 animate-bounce">
                      <Trophy className="w-12 h-12 text-amber-400" />
                    </div>
                  </div>
                  <span className="text-xl font-extrabold text-amber-300 text-center">{first.teamName}</span>
                  <span className="text-3xl font-black font-mono text-amber-400 mt-1">
                    {first.totalScore} <span className="text-sm font-normal text-amber-300">pts</span>
                  </span>
                  <div className="w-full mt-4 bg-gradient-to-t from-amber-950/40 to-slate-800 border-t-4 border-amber-400 rounded-t-2xl py-10 text-center shadow-xl">
                    <span className="text-2xl font-black text-amber-400 font-mono">🏆 Champion</span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {third && (
                <div className="order-3 md:order-3 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-amber-900/30 border-2 border-amber-700/60 flex items-center justify-center shadow-lg mb-3">
                    <Award className="w-10 h-10 text-amber-600" />
                  </div>
                  <span className="text-lg font-bold text-slate-100 text-center">{third.teamName}</span>
                  <span className="text-2xl font-black font-mono text-amber-600 mt-1">
                    {third.totalScore} <span className="text-xs font-normal text-slate-400">pts</span>
                  </span>
                  <div className="w-full mt-4 bg-slate-800/80 border-t-4 border-amber-700 rounded-t-2xl py-4 text-center">
                    <span className="text-xl font-black text-amber-600 font-mono">3rd Place</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick KPI Stat Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">
                Participating Teams
              </span>
              <span className="text-3xl font-black font-mono text-slate-100">{data.totalTeams}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">
                Average Team Score
              </span>
              <span className="text-3xl font-black font-mono text-indigo-400">{data.averageScore}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">
                Highest Score
              </span>
              <span className="text-3xl font-black font-mono text-amber-400">{data.highestScore}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">
                Questions Tested
              </span>
              <span className="text-3xl font-black font-mono text-emerald-400">
                {data.questionStats.length}
              </span>
            </div>
          </div>
        )}

        {/* Hardest & Easiest Insights */}
        {data && (data.hardestQuestion || data.easiestQuestion) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.hardestQuestion && (
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 shadow-xl flex items-start gap-4">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl flex-shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                    Toughest Challenge ({data.hardestQuestion.accuracyPercent}% Accuracy)
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-1">
                    {data.hardestQuestion.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Stumped the most teams across this round. Great candidate for post-quiz review.
                  </p>
                </div>
              </div>
            )}

            {data.easiestQuestion && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Highest Solved ({data.easiestQuestion.accuracyPercent}% Accuracy)
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-1">
                    {data.easiestQuestion.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mastered by the highest percentage of contestants.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Question-by-Question Deep Dive */}
        {data && data.questionStats.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Item Difficulty & Accuracy Breakdown
                </h3>
                <p className="text-xs text-slate-400">
                  Statistical accuracy and average response times across all submitted answers
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-mono uppercase text-slate-400">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Question</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4 text-center">Submissions</th>
                    <th className="py-3 px-4">Accuracy</th>
                    <th className="py-3 px-4 text-right">Avg Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {data.questionStats.map((q, idx) => (
                    <tr key={q.questionId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                        {q.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {q.topic}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                            q.difficulty === 'hard'
                              ? 'bg-rose-500/20 text-rose-300'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {q.correctCount} / {q.totalSubmissions}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                q.accuracyPercent > 60
                                  ? 'bg-emerald-500'
                                  : q.accuracyPercent > 30
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${q.accuracyPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-200">{q.accuracyPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        {(q.averageResponseTimeMs / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Full Official Final Leaderboard */}
        {data && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Full Final Leaderboard Standings
                </h3>
                <p className="text-xs text-slate-400">
                  Ranked by score with automated sub-millisecond response time tie-breaking
                </p>
              </div>
            </div>

            <Leaderboard entries={data.leaderboard} isFinal={true} />
          </section>
        )}
      </main>
    </div>
  );
}
