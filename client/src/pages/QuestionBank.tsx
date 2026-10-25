import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { Question, QuestionType, Difficulty } from '@shared/types';
import { CodeBlock } from '../components/CodeBlock';
import {
  Database,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filters, setFilters] = useState<{ topics: string[]; difficulties: string[]; types: string[] }>({
    topics: [],
    difficulties: [],
    types: []
  });
  const [loading, setLoading] = useState(true);
  const [hasAi, setHasAi] = useState(false);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // AI Generation State
  const [aiTopic, setAiTopic] = useState('Operating Systems');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
  const [aiCount, setAiCount] = useState(3);
  const [aiType, setAiType] = useState<QuestionType>('mcq');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

  // Import State
  const [importJsonText, setImportJsonText] = useState('');
  const [importReport, setImportReport] = useState<{ importedCount?: number; failedCount?: number; errors?: any[] } | null>(null);

  useEffect(() => {
    loadQuestions();
    ApiClient.request('/questions/filters').then(f => setFilters(f)).catch(() => {});
    ApiClient.request('/auth/info').then(info => setHasAi(Boolean(info.hasAiFeatures))).catch(() => {});
  }, [search, selectedTopic, selectedDifficulty, selectedType]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedTopic) params.append('topic', selectedTopic);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedType) params.append('type', selectedType);

      const qs = await ApiClient.request<Question[]>(`/questions?${params.toString()}`);
      setQuestions(qs);
    } catch (err: any) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await ApiClient.request(`/questions/${id}/duplicate`, { method: 'POST' });
      loadQuestions();
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this question from question bank?')) return;
    try {
      await ApiClient.request(`/questions/${id}`, { method: 'DELETE' });
      loadQuestions();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResults([]);
    try {
      const res = await ApiClient.request<{ success: boolean; questions: any[] }>('/questions/generate-ai', {
        method: 'POST',
        body: JSON.stringify({
          topic: aiTopic,
          difficulty: aiDifficulty,
          count: aiCount,
          type: aiType
        })
      });
      setAiResults(res.questions);
    } catch (err: any) {
      alert(`AI generation failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiQuestions = async () => {
    try {
      await ApiClient.request('/questions/import/json', {
        method: 'POST',
        body: JSON.stringify(aiResults)
      });
      setIsAiModalOpen(false);
      setAiResults([]);
      loadQuestions();
      alert('AI Generated questions successfully saved to the bank!');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = await ApiClient.request('/questions/import/json', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      setImportReport(res);
      loadQuestions();
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 text-left">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Database className="w-7 h-7 text-indigo-400" />
            <span>Central Question Bank</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {questions.length} questions available across multiple topics and rounds
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasAi && (
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate with AI</span>
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-mono font-semibold border border-gray-700 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span>Import</span>
          </button>

          <a
            href="/api/questions/export/csv"
            download
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-mono font-semibold border border-gray-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-gray-900 p-3.5 rounded-2xl border border-gray-800 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Topics ({filters.topics.length})</option>
            {filters.topics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 uppercase"
          >
            <option value="">All Types</option>
            {filters.types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question Cards List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-mono text-sm">
          Loading question bank...
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center bg-gray-900/40 rounded-2xl border border-gray-800">
          <p className="text-gray-400 font-mono text-sm">No questions match your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg hover:border-gray-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-gray-500">#{idx + 1}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    {q.topic}
                  </span>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                    {q.difficulty}
                  </span>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-gray-800 text-amber-300 border border-gray-700 font-bold">
                    {q.type}
                  </span>
                </div>

                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="text-emerald-400 font-bold">+{q.points} pts</span>
                  <span className="text-gray-500">• {q.timeLimitSeconds}s</span>
                  <div className="flex items-center space-x-1 ml-3 border-l border-gray-800 pl-3">
                    <button
                      onClick={() => handleDuplicate(q.id)}
                      className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                      title="Duplicate Question"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-800"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-1.5">{q.title}</h3>
              <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed mb-3">
                {q.text}
              </p>

              {q.codeSnippet && (
                <CodeBlock code={q.codeSnippet} language={q.codeLanguage || 'c'} />
              )}

              {/* Options Preview */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 text-xs font-mono">
                  {q.options.map(o => (
                    <div
                      key={o.id}
                      className={`p-2 rounded-lg border ${
                        o.id === q.correctAnswer
                          ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 font-bold'
                          : 'bg-gray-800/60 border-gray-700 text-gray-300'
                      }`}
                    >
                      <span className="font-bold mr-1.5">{o.id}:</span>
                      <span>{o.text}</span>
                      {o.id === q.correctAnswer && <span className="ml-1 text-emerald-400">✓</span>}
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <div className="mt-3 text-xs text-gray-400 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800/60 font-sans">
                  <span className="font-semibold text-gray-300 font-mono">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Generate Questions with AI (Groq)</h3>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Generates rigorous, technically validated questions using LLaMA-3 through Groq API.
            </p>

            <form onSubmit={handleGenerateAi} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Topic</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="e.g. Distributed Consensus (Raft/Paxos)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Question Type</label>
                <select
                  value={aiType}
                  onChange={e => setAiType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs uppercase"
                >
                  <option value="mcq">MCQ (Single Choice)</option>
                  <option value="code">Code Debugging</option>
                  <option value="short_text">Short Typed Answer</option>
                  <option value="buzzer">Buzzer Question</option>
                  <option value="written_rubric">Written Scenario</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Difficulty</label>
                <select
                  value={aiDifficulty}
                  onChange={e => setAiDifficulty(e.target.value as Difficulty)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs capitalize"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Count (1 - 5)</label>
                <input
                  type="number"
                  value={aiCount}
                  onChange={e => setAiCount(parseInt(e.target.value) || 3)}
                  min={1}
                  max={5}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating with Groq LLM...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate {aiCount} Questions</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Generated Results Preview */}
            {aiResults.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Generated {aiResults.length} Questions:
                  </span>
                  <button
                    onClick={handleSaveAiQuestions}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Save All to Bank
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {aiResults.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs">
                      <div className="font-bold text-white mb-1">{r.title}</div>
                      <div className="text-gray-300 mb-2">{r.text}</div>
                      {r.options && (
                        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-gray-400">
                          {r.options.map((o: any) => (
                            <div key={o.id} className={o.id === r.correctAnswer ? 'text-emerald-400 font-bold' : ''}>
                              {o.id}: {o.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportReport(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Bulk Import Questions</h3>
            <p className="text-xs text-gray-400 mb-4">
              Paste JSON array of questions. You can download the template below:
            </p>

            <div className="flex space-x-2 mb-4">
              <a
                href="/api/questions/template/json"
                download
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-indigo-300 text-xs font-mono border border-gray-700 hover:bg-gray-750 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON Template</span>
              </a>
              <a
                href="/api/questions/template/csv"
                download
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-indigo-300 text-xs font-mono border border-gray-700 hover:bg-gray-750 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Template</span>
              </a>
            </div>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder="Paste JSON array here..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500 mb-3"
            />

            <button
              onClick={handleImportJson}
              disabled={!importJsonText.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono transition disabled:opacity-50 cursor-pointer"
            >
              Validate & Import Questions
            </button>

            {importReport && (
              <div className="mt-4 p-3 rounded-xl bg-gray-800 text-xs font-mono">
                <div className="text-emerald-400 font-bold">Imported: {importReport.importedCount} questions</div>
                {importReport.failedCount ? (
                  <div className="text-red-400 font-bold mt-1">Failed rows: {importReport.failedCount}</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
