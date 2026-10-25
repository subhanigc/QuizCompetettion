import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Terminal, Tv, Shield, Scale, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/sound';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
  };

  const navLinks = [
    { name: 'Play', path: '/', icon: Terminal },
    { name: 'Projector', path: '/projector', icon: Tv },
    { name: 'Judge', path: '/judge', icon: Scale },
    { name: 'Host / Admin', path: '/admin', icon: Shield },
  ];

  return (
    <nav className="w-full bg-[#0E1322] border-b border-gray-800/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <span className="font-extrabold text-base md:text-lg tracking-tight text-white group-hover:text-indigo-400 transition-colors">
            TechQuiz <span className="text-indigo-400">Arena</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 hidden sm:inline-block">
            LAN Offline
          </span>
        </Link>

        <div className="flex items-center space-x-1 sm:space-x-3">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{link.name}</span>
              </Link>
            );
          })}

          <button
            onClick={toggleMute}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition ml-1"
            title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-gray-300" />}
          </button>
        </div>
      </div>
    </nav>
  );
};
