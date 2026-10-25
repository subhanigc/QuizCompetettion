export type QuestionType =
  | 'mcq'
  | 'multiple_select'
  | 'true_false'
  | 'short_text'
  | 'written_rubric'
  | 'code'
  | 'image'
  | 'buzzer'
  | 'staged_scenario';

export type CodeLanguage = 'c' | 'cpp' | 'java' | 'python' | 'sql' | 'javascript' | 'other';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type RoundType =
  | 'screening'
  | 'code_debugging'
  | 'scenario'
  | 'rapid_fire_buzzer'
  | 'staged_crisis'
  | 'custom';

export type SessionStatus =
  | 'lobby'
  | 'active_question'
  | 'paused'
  | 'answer_revealed'
  | 'leaderboard'
  | 'completed';

export interface RubricCriterion {
  id: string;
  title: string;
  maxScore: number;
  description?: string;
}

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface StagedScenarioStage {
  id: string;
  stageNumber: number;
  title: string;
  storyText: string;
  questionText: string;
  questionType: 'mcq' | 'short_text' | 'written_rubric';
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  rubricCriteria?: RubricCriterion[];
  points: number;
  timeLimitSeconds: number;
  explanation?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  text: string;
  topic: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  points: number;
  negativePoints: number;
  bonusPoints: number;
  explanation?: string;
  codeSnippet?: string;
  codeLanguage?: CodeLanguage;
  imageUrl?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[]; // hidden from team view before reveal
  shortAnswerAccepted?: string[]; // array of acceptable variations
  shortAnswerRegex?: string;
  shortAnswerCaseSensitive?: boolean;
  rubricCriteria?: RubricCriterion[];
  stagedStages?: StagedScenarioStage[];
  createdAt: string;
}

export interface ClientQuestionView {
  id: string;
  type: QuestionType;
  title: string;
  text: string;
  topic: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  points: number;
  negativePoints: number;
  bonusPoints: number;
  codeSnippet?: string;
  codeLanguage?: CodeLanguage;
  imageUrl?: string;
  options?: QuestionOption[];
  rubricCriteria?: RubricCriterion[];
  currentStage?: StagedScenarioStage;
  // Note: correctAnswer, explanation, and shortAnswer variations are excluded until answer_revealed!
}

export interface Round {
  id: string;
  competitionId: string;
  roundNumber: number;
  name: string;
  description: string;
  type: RoundType;
  allowedQuestionTypes: QuestionType[];
  defaultTimeLimitSeconds: number;
  pointsPerCorrect: number;
  negativeMarking: number;
  bonusPoints: number;
  teamsAdvancing: number;
  autoAdvance: boolean;
  showLeaderboardBetweenQuestions: boolean;
  gradingMode: 'auto' | 'judge' | 'both';
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowPassToNextTeam: boolean;
  passPointRatio: number; // e.g. 0.5
  rapidFireDurationSeconds?: number;
  questionIds: string[];
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  rounds: Round[];
}

export interface Team {
  id: string;
  sessionId: string;
  name: string;
  score: number;
  bonusScore: number;
  penaltyScore: number;
  totalTimeMs: number;
  isEliminated: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface Submission {
  id: string;
  sessionId: string;
  questionId: string;
  stageId?: string;
  teamId: string;
  teamName: string;
  answer: string | string[] | Record<string, any>;
  submittedAt: number;
  responseTimeMs: number;
  isCorrect?: boolean | null;
  pointsAwarded: number;
  judgeScore?: number | null;
  judgeComments?: string | null;
  isLate: boolean;
}

export interface BuzzerState {
  isOpen: boolean;
  winnerTeamId: string | null;
  winnerTeamName: string | null;
  lockedAt: number | null;
  buzzQueue: { teamId: string; teamName: string; buzzTime: number }[];
}

export interface SessionState {
  id: string;
  joinCode: string;
  competitionId: string;
  roundId: string;
  roundName: string;
  roundType: RoundType;
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: ClientQuestionView | null;
  revealedAnswer?: {
    correctAnswer: string | string[];
    explanation?: string;
  } | null;
  currentStageIndex: number;
  timerStartedAt: number | null;
  timerDurationSeconds: number;
  timerRemainingMs: number;
  timerIsRunning: boolean;
  buzzer: BuzzerState;
  allowReanswer: boolean;
  teamsCount: number;
  submissionsCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  teamId: string;
  teamName: string;
  totalScore: number;
  totalTimeMs: number;
  questionsAnswered: number;
  correctAnswers: number;
  isEliminated: boolean;
}

export interface AuditLog {
  id: string;
  sessionId: string;
  teamId: string;
  teamName: string;
  changedBy: string;
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
  timestamp: number;
}

export interface JudgeQueueItem {
  submissionId: string;
  sessionId: string;
  questionId: string;
  stageId?: string;
  teamAlias: string; // Anonymized, e.g. "Team #3"
  questionTitle: string;
  questionText: string;
  writtenAnswer: string;
  rubricCriteria: RubricCriterion[];
  currentScore?: number | null;
  judgeComments?: string | null;
  aiSuggestedScore?: number | null;
  aiSuggestedReasoning?: string | null;
  scoresCount: number;
}

export interface AnalyticsData {
  sessionId: string;
  roundName: string;
  totalTeams: number;
  averageScore: number;
  highestScore: number;
  questionStats: {
    questionId: string;
    title: string;
    topic: string;
    difficulty: Difficulty;
    totalSubmissions: number;
    correctCount: number;
    accuracyPercent: number;
    averageResponseTimeMs: number;
  }[];
  hardestQuestion?: { title: string; accuracyPercent: number };
  easiestQuestion?: { title: string; accuracyPercent: number };
  leaderboard: LeaderboardEntry[];
}
