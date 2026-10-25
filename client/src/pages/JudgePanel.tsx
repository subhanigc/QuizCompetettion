import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { getGameSocket } from '../lib/socket';
import { soundEffects } from '../lib/sound';
import { CodeBlock } from '../components/CodeBlock';
import {
  Gavel,
  Sparkles,
  CheckCircle,
  Clock,
  RefreshCw,
  LogOut,
  AlertCircle,
  HelpCircle,
  Send,
  EyeOff
} from 'lucide-react';
import { JudgeQueueItem, RubricCriterion } from '../../../shared/types';

export default function JudgePanel() {
  const [judgeCode, setJudgeCode] = useState<string>(ApiClient.getJudgeCode() || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!ApiClient.getJudgeCode());
  const [loginError, setLoginError] = useState<string>('');

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [queue, setQueue] = useState<JudgeQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<JudgeQueueItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Rubric scoring form state
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<string>('');
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');

  // Fetch active sessions
  const loadSessions = async () => {
    try {
      const list = await ApiClient.request<any[]>('/sessions/active/list');
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  // Load judge queue whenever session changes
  const loadQueue = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError('');
      const data = await ApiClient.request<JudgeQueueItem[]>(`/sessions/${sessionId}/judge-queue`);
      setQueue(data);
      if (data.length > 0) {
        // Select first pending or selected
        if (!selectedItem || !data.some(d => d.submissionId === selectedItem.submissionId)) {
          selectItem(data[0]);
        }
      } else {
        setSelectedItem(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && selectedSessionId) {
      loadQueue(selectedSessionId);

      // Listen on socket for real-time submission alerts
      const socket = getGameSocket();
      socket.connect();
      socket.emit('join_room', { sessionId: selectedSessionId, room: 'judges' });

      socket.on('SUBMISSION_ACK', () => {
        soundEffects.playBuzzer();
        loadQueue(selectedSessionId);
      });

      const interval = setInterval(() => {
        loadQueue(selectedSessionId);
      }, 5000);

      return () => {
        clearInterval(interval);
        socket.off('SUBMISSION_ACK');
      };
    }
  }, [isAuthenticated, selectedSessionId]);

  const selectItem = (item: JudgeQueueItem) => {
    setSelectedItem(item);
    setAiFeedback('');
    // Initialize rubric scores from item or defaults
    const initialScores: Record<string, number> = {};
    item.rubricCriteria.forEach((crit: RubricCriterion) => {
      initialScores[crit.id] = Math.round(crit.maxScore * 0.7); // default 70%
    });
    setRubricScores(initialScores);
    setComments(item.judgeComments || '');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await ApiClient.request<{ token: string }>('/auth/judge/login', {
        method: 'POST',
        body: JSON.stringify({ code: judgeCode })
      });
      if (res.token) {
        ApiClient.setJudgeCode(judgeCode);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid judge access code');
    }
  };

  const handleLogout = () => {
    ApiClient.clearJudgeCode();
    setJudgeCode('');
    setIsAuthenticated(false);
  };

  const handleScoreChange = (critId: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    setRubricScores(prev => ({ ...prev, [critId]: clamped }));
  };

  const handleAiSuggest = async () => {
    if (!selectedItem || !selectedSessionId) return;
    setAiLoading(true);
    setAiFeedback('');
    try {
      const result = await ApiClient.request<any>(`/sessions/${selectedSessionId}/ai-score-suggest`, {
        method: 'POST',
        body: JSON.stringify({
          questionTitle: selectedItem.questionTitle,
          questionText: selectedItem.questionText,
          writtenAnswer: selectedItem.writtenAnswer,
          rubricCriteria: selectedItem.rubricCriteria
        })
      });

      if (result.scores) {
        setRubricScores(result.scores);
      }
      if (result.rationale || result.feedback) {
        setAiFeedback(result.rationale || result.feedback);
        if (!comments) {
          setComments(result.rationale || result.feedback);
        }
      }
      soundEffects.playFanfare();
    } catch (err: any) {
      setAiFeedback(`AI suggestion error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedItem || !selectedSessionId) return;
    setSubmittingScore(true);
    try {
      await ApiClient.request(`/sessions/${selectedSessionId}/judge-score`, {
        method: 'POST',
        body: JSON.stringify({
          submissionId: selectedItem.submissionId,
          rubricScores,
          comments,
          judgeIdentifier: 'Judge Portal'
        })
      });

      soundEffects.playCorrect();
      await loadQueue(selectedSessionId);
    } catch (err: any) {
      alert(`Failed to save grade: ${err.message}`);
    } finally {
      setSubmittingScore(false);
    }
  };

  // If not authenticated, render login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-950/40">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4">
              <Gavel className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Judge Portal</h1>
            <p className="text-sm text-slate-400 mt-1">
              Blind rubric evaluation for written and scenario questions
            </p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Judge Access Code
              </label>
              <input
                type="password"
                value={judgeCode}
                onChange={e => setJudgeCode(e.target.value)}
                placeholder="Enter JUDGE_CODE"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <Gavel className="w-4 h-4" />
              <span>Authorize Judge Panel</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalPossible = selectedItem
    ? selectedItem.rubricCriteria.reduce((sum, c) => sum + c.maxScore, 0)
    : 0;
  const currentAwarded = Object.values(rubricScores).reduce((sum, v) => sum + (Number(v) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Judge Evaluation Desk</h1>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> Blind Review
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Double-blind rubric scoring for descriptive & scenario answers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Session Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase text-slate-400">Round:</label>
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.round_name} ({s.join_code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadQueue(selectedSessionId)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg transition-colors border border-slate-700"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Queue Sidebar */}
        <aside className="w-full lg:w-80 bg-slate-900/60 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Submissions
            </h2>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
              {queue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                No pending written submissions waiting for evaluation.
              </div>
            ) : (
              queue.map(item => {
                const isSelected = selectedItem?.submissionId === item.submissionId;
                const isGraded = item.scoresCount > 0;
                return (
                  <button
                    key={item.submissionId}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/40 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-indigo-400">
                        {item.teamAlias}
                      </span>
                      {isGraded ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium">
                          Graded ({item.currentScore} pts)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-medium">
                          Needs Review
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-slate-200 line-clamp-1">
                      {item.questionTitle}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Active Item Evaluation Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
              <HelpCircle className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-base font-medium">Select a submission from the queue to start grading</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Question Context Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                      Question Context
                    </span>
                    <h2 className="text-xl font-bold text-slate-100">{selectedItem.questionTitle}</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Candidate Identity</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {selectedItem.teamAlias}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {selectedItem.questionText}
                </div>
              </div>

              {/* Submitted Answer Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <span>Team Submitted Response</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {selectedItem.submissionId.slice(0, 8)}...
                  </span>
                </div>

                {typeof selectedItem.writtenAnswer === 'string' &&
                (selectedItem.writtenAnswer.includes('\n') || selectedItem.writtenAnswer.length > 80) ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedItem.writtenAnswer}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-base font-semibold text-slate-100">
                    {String(selectedItem.writtenAnswer)}
                  </div>
                )}
              </div>

              {/* Rubric Evaluation Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-indigo-400" />
                      Rubric Scoring
                    </h3>
                    <p className="text-xs text-slate-400">
                      Adjust scores per criterion. Max total: {totalPossible} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-950/60 border border-indigo-500/30 px-4 py-2 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">
                        Total Awarded
                      </span>
                      <span className="text-xl font-bold font-mono text-indigo-400">
                        {currentAwarded} / {totalPossible}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={aiLoading}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                      title="Request AI rubric evaluation suggestion via Groq"
                    >
                      <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                      <span>{aiLoading ? 'Evaluating via AI...' : 'AI Score Suggest'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Rationale banner if provided */}
                {aiFeedback && (
                  <div className="p-4 bg-violet-950/40 border border-violet-500/30 rounded-xl text-violet-200 text-sm space-y-1">
                    <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" /> Groq AI Suggested Breakdown:
                    </div>
                    <div className="text-xs whitespace-pre-line leading-relaxed">{aiFeedback}</div>
                  </div>
                )}

                {/* Rubric Criteria Items */}
                <div className="space-y-4">
                  {selectedItem.rubricCriteria.map(crit => {
                    const currentVal = rubricScores[crit.id] ?? 0;
                    return (
                      <div
                        key={crit.id}
                        className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200">{crit.title}</h4>
                            {crit.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{crit.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={crit.maxScore}
                              value={currentVal}
                              onChange={e =>
                                handleScoreChange(crit.id, Number(e.target.value), crit.maxScore)
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-slate-100 text-sm focus:border-indigo-500"
                            />
                            <span className="text-xs text-slate-400 font-mono">/ {crit.maxScore} pts</span>
                          </div>
                        </div>

                        {/* Slider */}
                        <input
                          type="range"
                          min={0}
                          max={crit.maxScore}
                          step={1}
                          value={currentVal}
                          onChange={e =>
                            handleScoreChange(crit.id, Number(e.target.value), crit.maxScore)
                          }
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Comments / Feedback */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Judge Rationale & Feedback (Visible to Host & Audit Log)
                  </label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Provide brief justification or comments on technical merit..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Submit Evaluation */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitEvaluation}
                    disabled={submittingScore}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submittingScore ? 'Saving Evaluation...' : 'Confirm & Save Score'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
