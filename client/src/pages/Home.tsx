import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import { getSocket } from '../lib/socket';
import { SOCKET_EVENTS } from '@shared/constants';
import { Terminal, Tv, Shield, Scale, Wifi, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '');
  const [teamName, setTeamName] = useState(localStorage.getItem('techquiz_team_name') || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lanInfo, setLanInfo] = useState<{ primaryLanUrl?: string; lanIps?: string[] } | null>(null);

  useEffect(() => {
    // Fetch LAN info for display
    ApiClient.request('/auth/info')
      .then(info => setLanInfo(info))
      .catch(() => {});
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    const cleanName = teamName.trim();

    if (!cleanCode) {
      setError('Please enter the 6-character game code');
      return;
    }
    if (!cleanName) {
      setError('Please enter your team or player name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const socket = getSocket();

    // Listen for team registration acknowledgement
    const onRegistered = (data: { team: any; token: string }) => {
      ApiClient.setTeamToken(data.token);
      localStorage.setItem('techquiz_team_name', cleanName);
      localStorage.setItem('techquiz_session_id', cleanCode);
      socket.off('team_registered', onRegistered);
      socket.off(SOCKET_EVENTS.ERROR, onError);
      navigate(`/play?code=${cleanCode}`);
    };

    const onError = (data: { message: string }) => {
      setError(data.message || 'Failed to join session');
      setIsSubmitting(false);
      socket.off('team_registered', onRegistered);
      socket.off(SOCKET_EVENTS.ERROR, onError);
    };

    socket.once('team_registered', onRegistered);
    socket.once(SOCKET_EVENTS.ERROR, onError);

    // Emit join session
    socket.emit(SOCKET_EVENTS.JOIN_SESSION, {
      sessionIdOrCode: cleanCode,
      role: 'team',
      teamName: cleanName
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center items-center px-4 py-8">
      {/* LAN Network Banner */}
      {lanInfo?.primaryLanUrl && (
        <div className="mb-6 flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-mono text-indigo-300">
          <Wifi className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>LAN Host URL:</span>
          <span className="font-bold text-white selection:bg-indigo-600">{lanInfo.primaryLanUrl}</span>
        </div>
      )}

      {/* Main Join Card */}
      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl font-black mb-3 shadow-lg shadow-indigo-600/30">
            ⚡
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            TechQuiz Arena
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Enter your team name and session code to enter the arena.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-300 mb-1.5 font-semibold">
              Game Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3F8E1"
              maxLength={10}
              className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 rounded-xl text-center font-mono text-xl sm:text-2xl font-black text-indigo-400 tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-300 mb-1.5 font-semibold">
              Team / Player Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Byte Busters"
              maxLength={30}
              className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 rounded-xl text-white font-medium text-base placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{isSubmitting ? 'Entering Arena...' : 'Join Competition'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Role Switcher Grid */}
      <div className="w-full max-w-md mt-8 grid grid-cols-3 gap-3 text-center">
        <button
          onClick={() => navigate('/projector')}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition flex flex-col items-center group cursor-pointer"
        >
          <Tv className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 mb-1 transition-colors" />
          <span className="text-xs font-semibold text-gray-300">Projector</span>
        </button>

        <button
          onClick={() => navigate('/judge')}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition flex flex-col items-center group cursor-pointer"
        >
          <Scale className="w-5 h-5 text-gray-400 group-hover:text-amber-400 mb-1 transition-colors" />
          <span className="text-xs font-semibold text-gray-300">Judge</span>
        </button>

        <button
          onClick={() => navigate('/admin')}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition flex flex-col items-center group cursor-pointer"
        >
          <Shield className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 mb-1 transition-colors" />
          <span className="text-xs font-semibold text-gray-300">Host Login</span>
        </button>
      </div>
    </div>
  );
};
