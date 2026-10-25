import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../lib/socket';
import { ApiClient } from '../lib/api';
import { sound } from '../lib/sound';
import { SessionState, Submission, Team } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/constants';
import { TimerDisplay } from '../components/TimerDisplay';
import { CodeBlock } from '../components/CodeBlock';
import { BuzzerButton } from '../components/BuzzerButton';
import { Leaderboard } from '../components/Leaderboard';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  Award,
  Layers,
  HelpCircle,
  Check
} from 'lucide-react';

export const TeamPlay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const codeParam = searchParams.get('code') || localStorage.getItem('techquiz_session_id') || '';
  const [session, setSession] = useState<SessionState | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Answer states
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [writtenAnswer, setWrittenAnswer] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!codeParam) {
      navigate('/');
      return;
    }

    const socket = getSocket();
    const token = ApiClient.getTeamToken();

    // Reconnect or register
    if (token) {
      socket.emit(SOCKET_EVENTS.RECONNECT_TEAM, {
        sessionIdOrCode: codeParam,
        token
      });
    } else {
      const storedName = localStorage.getItem('techquiz_team_name');
      if (storedName) {
        socket.emit(SOCKET_EVENTS.JOIN_SESSION, {
          sessionIdOrCode: codeParam,
          role: 'team',
          teamName: storedName
        });
      } else {
        navigate(`/?code=${codeParam}`);
        return;
      }
    }

    // Socket Event Handlers
    const onTeamRegistered = (data: { team: Team; token: string }) => {
      setTeam(data.team);
      ApiClient.setTeamToken(data.token);
    };

    const onSessionUpdated = (state: SessionState) => {
      setSession(state);
    };

    const onSubmissionAck = (data: { success: boolean; submission?: Submission; message?: string }) => {
      if (data.success && data.submission) {
        setHasSubmitted(true);
        setMySubmission(data.submission);
        setSubmitError(null);
      } else {
        setSubmitError(data.message || 'Answer rejected');
      }
    };

    const onLeaderboardUpdated = (data: any[]) => {
      setLeaderboard(data);
    };

    const onBuzzerStateChanged = (bz: any) => {
      setSession(prev => (prev ? { ...prev, buzzer: bz } : prev));
    };

    socket.on('team_registered', onTeamRegistered);
    socket.on(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
    socket.on(SOCKET_EVENTS.SUBMISSION_ACK, onSubmissionAck);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
    socket.on(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);

    // Initial fetch of session state if available
    ApiClient.request(`/sessions/${codeParam}`)
      .then(s => setSession(s))
      .catch(() => {});

    return () => {
      socket.off('team_registered', onTeamRegistered);
      socket.off(SOCKET_EVENTS.SESSION_UPDATED, onSessionUpdated);
      socket.off(SOCKET_EVENTS.SUBMISSION_ACK, onSubmissionAck);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
      socket.off(SOCKET_EVENTS.BUZZER_STATE_CHANGED, onBuzzerStateChanged);
    };
  }, [codeParam, navigate]);

  // Reset answer states when active question or stage changes
  const qId = session?.currentQuestion?.id;
  const stageIdx = session?.currentStageIndex;

  useEffect(() => {
    setSelectedOption('');
    setMultiSelect([]);
    setTypedAnswer('');
    setWrittenAnswer('');
    setHasSubmitted(false);
    setMySubmission(null);
    setSubmitError(null);
  }, [qId, stageIdx]);

  // Play audio on reveal
  useEffect(() => {
    if (session?.status === 'answer_revealed' && mySubmission) {
      if (mySubmission.isCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }
    }
  }, [session?.status, mySubmission]);

  // Answer Submit Action
  const submitAnswer = (ans: any) => {
    if (hasSubmitted && !session?.allowReanswer) return;
    setSubmitError(null);
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.SUBMIT_ANSWER, {
      answer: ans,
      clientTimestamp: Date.now()
    });
  };

  const handlePressBuzzer = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.PRESS_BUZZER);
  };

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono text-gray-400">Connecting to session {codeParam}...</p>
        </div>
      </div>
    );
  }

  const q = session.currentQuestion;
  const stage = q?.currentStage;
  const isBuzzer = q?.type === 'buzzer';
  const isBuzzerWinner = session.buzzer.winnerTeamId === team?.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Team & Session Header Bar */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 shadow-md mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">
            Team
          </span>
          <span className="font-extrabold text-sm md:text-base text-white truncate max-w-[150px] inline-block">
            {team?.name || 'Joining...'}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">
            Round
          </span>
          <span className="text-xs font-semibold text-indigo-400">
            {session.roundName}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">
            Score
          </span>
          <span className="font-mono font-black text-sm md:text-base text-emerald-400">
            {team ? Math.round(team.score * 10) / 10 : 0} pts
          </span>
        </div>
      </div>

      {team?.isEliminated && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>Your team has been eliminated. You are currently in Spectator Mode.</span>
        </div>
      )}

      {/* 1. LOBBY STATE */}
      {session.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-900/60 border border-gray-800 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-3xl font-black mb-4 animate-bounce">
            ⏳
          </div>
          <h2 className="text-2xl font-black text-white">In the Lobby</h2>
          <p className="text-sm text-gray-400 max-w-sm mt-2">
            You're connected as <span className="font-bold text-white">"{team?.name}"</span>. The host will launch the round shortly.
          </p>
          <div className="mt-6 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs font-mono text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready for action • {session.teamsCount} teams waiting</span>
          </div>
        </div>
      )}

      {/* 2. LEADERBOARD STATE */}
      {session.status === 'leaderboard' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-black text-white">Leaderboard Standings</h2>
            <p className="text-xs text-gray-400 font-mono">Scores updated live</p>
          </div>
          <Leaderboard entries={leaderboard} highlightTeamId={team?.id} />
        </div>
      )}

      {/* 3. ACTIVE QUESTION OR REVEALED ANSWER */}
      {(session.status === 'active_question' || session.status === 'paused' || session.status === 'answer_revealed') && q && (
        <div className="flex-1 flex flex-col">
          {/* Timer Display */}
          <TimerDisplay
            timerStartedAt={session.timerStartedAt}
            durationSeconds={session.timerDurationSeconds}
            isRunning={session.timerIsRunning}
          />

          {/* Question Card */}
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl my-2 flex-1 flex flex-col">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-3">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  {q.topic}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 uppercase text-[11px]">
                  {q.difficulty}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                <Award className="w-3.5 h-3.5" />
                <span>+{q.points} pts</span>
                {q.negativePoints > 0 && <span className="text-red-400">(-{q.negativePoints})</span>}
              </div>
            </div>

            {/* Staged Story Context */}
            {stage && (
              <div className="mb-4 p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-left">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{stage.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {stage.storyText}
                </p>
              </div>
            )}

            {/* Question Text */}
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white text-left leading-snug">
              {stage ? stage.questionText : q.text}
            </h3>

            {/* Code Snippet */}
            {q.codeSnippet && (
              <CodeBlock code={q.codeSnippet} language={q.codeLanguage || 'c'} />
            )}

            {/* Image Question */}
            {q.imageUrl && (
              <div className="my-3 rounded-xl overflow-hidden border border-gray-700 max-h-64 flex items-center justify-center bg-black">
                <img src={q.imageUrl} alt="Question Asset" className="max-h-64 object-contain" />
              </div>
            )}

            {/* Submit Error */}
            {submitError && (
              <div className="my-2 p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs">
                {submitError}
              </div>
            )}

            {/* ================= ANSWER INTERFACES ================= */}

            {/* Buzzer Question Interface */}
            {isBuzzer && (
              <div className="my-auto">
                <BuzzerButton
                  buzzerState={session.buzzer}
                  onPress={handlePressBuzzer}
                  myTeamId={team?.id}
                  disabled={team?.isEliminated || hasSubmitted}
                />
              </div>
            )}

            {/* Option Interface for MCQ / True-False (or when buzzer is won) */}
            {(!isBuzzer || isBuzzerWinner) && q.type === 'mcq' || q.type === 'true_false' || (q.type === 'code' && q.options && q.options.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
                {q.options?.map(opt => {
                  const isSelected = selectedOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedOption(opt.id);
                        submitAnswer(opt.id);
                      }}
                      disabled={hasSubmitted && !session.allowReanswer}
                      className={`p-3.5 sm:p-4 rounded-xl text-left border font-semibold text-sm sm:text-base flex items-start space-x-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-gray-800/90 border-gray-700/80 text-gray-200 hover:bg-gray-750 hover:border-gray-600 active:scale-[0.98]'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        isSelected ? 'bg-white text-indigo-700' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {opt.id}
                      </span>
                      <span className="flex-1 mt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Multiple-Select Interface */}
            {q.type === 'multiple_select' && (
              <div className="space-y-2.5 my-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options?.map(opt => {
                    const isChecked = multiSelect.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? multiSelect.filter(x => x !== opt.id)
                            : [...multiSelect, opt.id];
                          setMultiSelect(updated);
                        }}
                        disabled={hasSubmitted && !session.allowReanswer}
                        className={`p-3 rounded-xl text-left border text-sm flex items-center space-x-3 transition ${
                          isChecked
                            ? 'bg-indigo-950/70 border-indigo-500 text-white font-bold'
                            : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-indigo-600 border-indigo-500' : 'border-gray-600'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="flex-1">{opt.id}: {opt.text}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => submitAnswer(multiSelect)}
                  disabled={multiSelect.length === 0 || (hasSubmitted && !session.allowReanswer)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow transition disabled:opacity-50 cursor-pointer"
                >
                  Submit Selections ({multiSelect.length} selected)
                </button>
              </div>
            )}

            {/* Short Typed Answer Interface */}
            {(!isBuzzer || isBuzzerWinner) && (q.type === 'short_text' || (q.type === 'code' && (!q.options || q.options.length === 0))) && (
              <div className="my-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    placeholder="Type your exact answer here..."
                    disabled={hasSubmitted && !session.allowReanswer}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => submitAnswer(typedAnswer)}
                    disabled={!typedAnswer.trim() || (hasSubmitted && !session.allowReanswer)}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>
            )}

            {/* Written Rubric Long Text Interface */}
            {(q.type === 'written_rubric' || stage?.questionType === 'written_rubric') && (
              <div className="my-4 text-left">
                {/* Rubric Criteria Preview */}
                {(stage?.rubricCriteria || q.rubricCriteria) && (
                  <div className="mb-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/60 text-xs">
                    <span className="font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                      Judging Rubric Breakdown
                    </span>
                    <ul className="space-y-1">
                      {(stage?.rubricCriteria || q.rubricCriteria)?.map(c => (
                        <li key={c.id} className="text-gray-400 flex justify-between">
                          <span>• {c.title}</span>
                          <span className="font-mono font-bold text-emerald-400">Max {c.maxScore} pts</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <textarea
                  rows={5}
                  value={writtenAnswer}
                  onChange={e => setWrittenAnswer(e.target.value)}
                  placeholder="Detail your engineering response addressing root cause, technical fix, and prevention..."
                  disabled={hasSubmitted && !session.allowReanswer}
                  className="w-full p-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />

                <button
                  onClick={() => submitAnswer(writtenAnswer)}
                  disabled={!writtenAnswer.trim() || (hasSubmitted && !session.allowReanswer)}
                  className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow transition disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Written Response for Judging</span>
                </button>
              </div>
            )}

            {/* Submitted Waiting Status */}
            {hasSubmitted && session.status !== 'answer_revealed' && (
              <div className="mt-4 p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Answer submitted! Waiting for host to reveal...</span>
                </div>
                {session.allowReanswer && (
                  <span className="text-[11px] text-gray-400">Re-answers allowed</span>
                )}
              </div>
            )}

            {/* Answer Revealed Explanation Card */}
            {session.status === 'answer_revealed' && session.revealedAnswer && (
              <div className="mt-5 p-4 rounded-xl bg-gray-800/90 border border-gray-700 text-left animate-fade-in">
                <div className="flex items-center space-x-2 mb-2 font-bold text-sm">
                  {mySubmission ? (
                    mySubmission.isCorrect ? (
                      <span className="flex items-center space-x-1.5 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>CORRECT! (+{mySubmission.pointsAwarded} pts)</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1.5 text-red-400">
                        <XCircle className="w-5 h-5" />
                        <span>INCORRECT ({mySubmission.pointsAwarded} pts)</span>
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400">No answer submitted</span>
                  )}
                </div>

                <div className="text-xs font-mono text-gray-300 mb-2">
                  <span className="text-gray-500">Correct Answer: </span>
                  <span className="font-bold text-emerald-400">
                    {Array.isArray(session.revealedAnswer.correctAnswer)
                      ? session.revealedAnswer.correctAnswer.join(', ')
                      : String(session.revealedAnswer.correctAnswer)}
                  </span>
                </div>

                {session.revealedAnswer.explanation && (
                  <div className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                    <span className="font-semibold text-indigo-300 block mb-1">Explanation:</span>
                    {session.revealedAnswer.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
