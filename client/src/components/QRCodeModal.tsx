import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  joinCode: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, joinCode, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mx-auto mb-3">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">Scan to Join Quiz</h3>
        <p className="text-xs text-gray-400 mb-5">Connect phones to the same Wi-Fi network and scan the code below:</p>

        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
          <QRCodeSVG value={url} size={200} level="M" />
        </div>

        <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700/80 mb-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-mono mb-0.5">
            Join Code
          </div>
          <div className="text-2xl font-mono font-black text-indigo-400 tracking-widest">
            {joinCode}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-mono font-semibold transition border border-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">LAN URL Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="truncate">{url}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
