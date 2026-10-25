import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'c', title }) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  const cleanLang = language.toLowerCase();
  const prismLang = cleanLang === 'cpp' || cleanLang === 'c++' ? 'cpp' : cleanLang;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 bg-[#161B22] shadow-xl my-4 text-left">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/80 text-xs font-mono text-gray-400">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
          <span className="font-semibold text-gray-300 ml-2">{title || `${language.toUpperCase()} Snippet`}</span>
        </div>
        <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-gray-700 text-indigo-300">
          {language}
        </span>
      </div>
      <div className="p-4 overflow-x-auto text-sm md:text-base font-mono leading-relaxed selection:bg-indigo-600 selection:text-white">
        <pre className={`language-${prismLang} !bg-transparent !p-0 !m-0`}>
          <code className={`language-${prismLang}`}>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
};
