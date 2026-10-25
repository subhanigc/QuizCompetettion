import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import { Competition, Round } from '@shared/types';
import {
  Shield,
  Play,
  RotateCcw,
  Database,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  Clock,
  Award,
  Users,
  Settings,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(ApiClient.getAdminToken()));
  const [loginError, setLoginError] = useState<string | null>(null);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  // Round Edit Modal State
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadCompetitions();
    }
  }, [isAuthenticated]);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.request<Competition[]>('/competitions');
      setCompetitions(data);
      if (data.length > 0) {
        setSelectedComp(data[0]);
      }
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('token')) {
        setIsAuthenticated(false);
        ApiClient.clearAdminToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await ApiClient.request<{ token: string }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      ApiClient.setAdminToken(res.token);
      setIsAuthenticated(true);
      loadCompetitions();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin password');
    }
  };

  const handleStartSession = async (roundId: string) => {
    if (!selectedComp) return;
    try {
      const res = await ApiClient.request<{ sessionId: string; joinCode: string }>('/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ competitionId: selectedComp.id, roundId })
      });
      navigate(`/admin/live/${res.sessionId}`);
    } catch (err: any) {
      alert(`Failed to start live session: ${err.message}`);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Reset database to the default 5-round template? Existing live sessions will be reset.')) return;
    try {
      await ApiClient.request('/competitions/reset-template', { method: 'POST' });
      await loadCompetitions();
      alert('Successfully re-seeded 5-round template with 30 technical questions!');
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const handleSaveRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;

    try {
      await ApiClient.request(`/competitions/rounds/${editingRound.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingRound)
      });
      setIsRoundModalOpen(false);
      loadCompetitions();
    } catch (err: any) {
      alert(`Failed to update round: ${err.message}`);
    }
  };

  // If not authenticated, render login dialog
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-white">Host & Admin Login</h2>
            <p className="text-xs text-gray-400 mt-1">
              Enter the admin password configured in your .env file
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition cursor-pointer"
            >
              Sign In to Control Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-indigo-400" />
            <span>Host Command Center</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Manage competitions, rounds, launch live sessions, and configure question banks
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/admin/questions"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-mono font-semibold border border-gray-700 transition"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Question Bank</span>
          </Link>

          <button
            onClick={handleResetTemplate}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-amber-300 text-xs font-mono font-semibold border border-amber-900/60 transition cursor-pointer"
            title="Reset to 5 pre-made rounds with 30 sample technical questions"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset 5 Rounds</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 font-mono text-sm">
          Loading competitions...
        </div>
      ) : competitions.length === 0 ? (
        <div className="p-12 text-center bg-gray-900/40 rounded-2xl border border-gray-800">
          <p className="text-gray-400 font-mono mb-4">No competitions found.</p>
          <button
            onClick={handleResetTemplate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer"
          >
            Seed 5-Round Template
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Competition Card */}
          {selectedComp && (
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {selectedComp.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                    {selectedComp.description}
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 self-start">
                  {selectedComp.rounds.length} Specialized Rounds
                </span>
              </div>

              {/* Rounds List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {selectedComp.rounds.map(round => (
                  <div
                    key={round.id}
                    className="bg-gray-800/80 border border-gray-700/80 rounded-xl p-5 flex flex-col justify-between hover:border-gray-600 transition shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-700 text-indigo-300">
                          Round {round.roundNumber} • {round.type}
                        </span>
                        <button
                          onClick={() => {
                            setEditingRound(round);
                            setIsRoundModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition"
                          title="Edit Round Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-indigo-300 transition-colors">
                        {round.name}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                        {round.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400 mb-4 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{round.defaultTimeLimitSeconds}s / Q</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+{round.pointsPerCorrect} pts</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Top {round.teamsAdvancing} Advance</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Q's:</span>
                          <span className="font-bold text-gray-300">{round.questionIds.length} in bank</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartSession(round.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono flex items-center justify-center space-x-1.5 shadow transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Launch Live Session</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Round Settings Modal */}
      {isRoundModalOpen && editingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Edit Round Settings</h3>

            <form onSubmit={handleSaveRound} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Round Name</label>
                <input
                  type="text"
                  value={editingRound.name}
                  onChange={e => setEditingRound({ ...editingRound, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingRound.description}
                  onChange={e => setEditingRound({ ...editingRound, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={editingRound.defaultTimeLimitSeconds}
                    onChange={e => setEditingRound({ ...editingRound, defaultTimeLimitSeconds: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    min={5}
                    max={600}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Points per Correct</label>
                  <input
                    type="number"
                    value={editingRound.pointsPerCorrect}
                    onChange={e => setEditingRound({ ...editingRound, pointsPerCorrect: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Negative Marking</label>
                  <input
                    type="number"
                    value={editingRound.negativeMarking}
                    onChange={e => setEditingRound({ ...editingRound, negativeMarking: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    min={0}
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Teams Advancing</label>
                  <input
                    type="number"
                    value={editingRound.teamsAdvancing}
                    onChange={e => setEditingRound({ ...editingRound, teamsAdvancing: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    min={1}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRound.shuffleQuestions}
                    onChange={e => setEditingRound({ ...editingRound, shuffleQuestions: e.target.checked })}
                    className="rounded border-gray-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Shuffle Questions</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRound.shuffleOptions}
                    onChange={e => setEditingRound({ ...editingRound, shuffleOptions: e.target.checked })}
                    className="rounded border-gray-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Shuffle Options</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsRoundModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
