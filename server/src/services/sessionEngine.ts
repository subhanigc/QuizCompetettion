import { db, runTransaction } from '../db';
import {
  SessionState,
  ClientQuestionView,
  Question,
  Round,
  Team,
  LeaderboardEntry,
  Submission,
  AuditLog,
  StagedScenarioStage
} from '../../../shared/types';
import { MAX_CLOCK_DRIFT_TOLERANCE_MS } from '../../../shared/constants';
import { ScoringService } from './scoringService';
import { BuzzerService } from './buzzerService';
import crypto from 'crypto';

const statementCache = new Map<string, any>();
function getStatement(sql: string): any {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

export class SessionEngine {
  private static activeEngines = new Map<string, SessionEngine>();

  public sessionId: string;
  public joinCode: string;
  public competitionId: string;
  public roundId: string;
  public round!: Round;
  public questions: Question[] = [];
  public buzzerService: BuzzerService = new BuzzerService();

  private status: SessionState['status'] = 'lobby';
  private currentQuestionIndex: number = 0;
  private currentStageIndex: number = 0;
  private timerStartedAt: number | null = null;
  private timerDurationSeconds: number = 30;
  private timerRemainingMs: number = 30000;
  private timerIsRunning: boolean = false;
  private timerInterval: NodeJS.Timeout | null = null;
  private allowReanswer: boolean = false;
  private revealedAnswer: SessionState['revealedAnswer'] = null;

  private onStateChangeCallbacks: ((state: SessionState) => void)[] = [];
  private onTimerTickCallbacks: ((remainingMs: number) => void)[] = [];

  constructor(sessionId: string, joinCode: string, competitionId: string, roundId: string) {
    this.sessionId = sessionId;
    this.joinCode = joinCode;
    this.competitionId = competitionId;
    this.roundId = roundId;
    this.loadRoundData();
  }

  public static getOrCreateEngine(sessionId: string): SessionEngine {
    let engine = this.activeEngines.get(sessionId);
    if (!engine) {
      const row = getStatement('SELECT * FROM sessions WHERE id = ? OR join_code = ?').get(sessionId, sessionId) as any;
      if (!row) {
        throw new Error(`Session ${sessionId} not found`);
      }
      engine = new SessionEngine(row.id, row.join_code, row.competition_id, row.round_id);
      engine.status = row.status;
      engine.currentQuestionIndex = row.current_question_index;
      engine.currentStageIndex = row.current_stage_index;
      engine.timerDurationSeconds = row.timer_duration_seconds;
      engine.timerRemainingMs = row.timer_remaining_ms;
      engine.timerIsRunning = Boolean(row.timer_is_running);
      engine.allowReanswer = Boolean(row.allow_reanswer);
      this.activeEngines.set(row.id, engine);
      this.activeEngines.set(row.join_code, engine);
    }
    return engine;
  }

  public static createSession(competitionId: string, roundId: string): SessionEngine {
    const sessionId = `sess_${crypto.randomBytes(4).toString('hex')}`;
    const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const roundRow = getStatement('SELECT * FROM rounds WHERE id = ?').get(roundId) as any;
    if (!roundRow) {
      throw new Error(`Round ${roundId} not found`);
    }

    const now = Date.now();
    getStatement(`
      INSERT INTO sessions (
        id, join_code, competition_id, round_id, status,
        current_question_index, current_stage_index,
        timer_duration_seconds, timer_remaining_ms, timer_is_running,
        allow_reanswer, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'lobby', 0, 0, ?, ?, 0, 0, ?, ?)
    `).run(
      sessionId,
      joinCode,
      competitionId,
      roundId,
      roundRow.default_time_limit_seconds,
      roundRow.default_time_limit_seconds * 1000,
      now,
      now
    );

    const engine = new SessionEngine(sessionId, joinCode, competitionId, roundId);
    this.activeEngines.set(sessionId, engine);
    this.activeEngines.set(joinCode, engine);
    return engine;
  }

  private loadRoundData(): void {
    const roundRow = getStatement('SELECT * FROM rounds WHERE id = ?').get(this.roundId) as any;
    if (!roundRow) {
      throw new Error(`Round ${this.roundId} not found`);
    }

    this.round = {
      id: roundRow.id,
      competitionId: roundRow.competition_id,
      roundNumber: roundRow.round_number,
      name: roundRow.name,
      description: roundRow.description,
      type: roundRow.type,
      allowedQuestionTypes: JSON.parse(roundRow.allowed_question_types),
      defaultTimeLimitSeconds: roundRow.default_time_limit_seconds,
      pointsPerCorrect: roundRow.points_per_correct,
      negativeMarking: roundRow.negative_marking,
      bonusPoints: roundRow.bonus_points,
      teamsAdvancing: roundRow.teams_advancing,
      autoAdvance: Boolean(roundRow.auto_advance),
      showLeaderboardBetweenQuestions: Boolean(roundRow.show_leaderboard_between_questions),
      gradingMode: roundRow.grading_mode,
      shuffleQuestions: Boolean(roundRow.shuffle_questions),
      shuffleOptions: Boolean(roundRow.shuffle_options),
      allowPassToNextTeam: Boolean(roundRow.allow_pass_to_next_team),
      passPointRatio: roundRow.pass_point_ratio,
      rapidFireDurationSeconds: roundRow.rapid_fire_duration_seconds,
      questionIds: JSON.parse(roundRow.question_ids)
    };

    // Load questions
    this.questions = [];
    for (const qid of this.round.questionIds) {
      const qRow = getStatement('SELECT * FROM questions WHERE id = ?').get(qid) as any;
      if (qRow) {
        this.questions.push({
          id: qRow.id,
          type: qRow.type,
          title: qRow.title,
          text: qRow.text,
          topic: qRow.topic,
          difficulty: qRow.difficulty,
          timeLimitSeconds: qRow.time_limit_seconds,
          points: qRow.points,
          negativePoints: qRow.negative_points,
          bonusPoints: qRow.bonus_points,
          explanation: qRow.explanation,
          codeSnippet: qRow.code_snippet,
          codeLanguage: qRow.code_language,
          imageUrl: qRow.image_url,
          options: qRow.options_json ? JSON.parse(qRow.options_json) : undefined,
          correctAnswer: qRow.correct_answer_json ? JSON.parse(qRow.correct_answer_json) : undefined,
          shortAnswerAccepted: qRow.short_answer_accepted_json ? JSON.parse(qRow.short_answer_accepted_json) : undefined,
          shortAnswerRegex: qRow.short_answer_regex,
          shortAnswerCaseSensitive: Boolean(qRow.short_answer_case_sensitive),
          rubricCriteria: qRow.rubric_criteria_json ? JSON.parse(qRow.rubric_criteria_json) : undefined,
          stagedStages: qRow.staged_stages_json ? JSON.parse(qRow.staged_stages_json) : undefined,
          createdAt: qRow.created_at
        });
      }
    }

    if (this.round.shuffleQuestions) {
      this.questions.sort(() => Math.random() - 0.5);
    }
  }

  // ================= State Management =================

  public subscribeState(cb: (state: SessionState) => void): () => void {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(c => c !== cb);
    };
  }

  public subscribeTimer(cb: (remainingMs: number) => void): () => void {
    this.onTimerTickCallbacks.push(cb);
    return () => {
      this.onTimerTickCallbacks = this.onTimerTickCallbacks.filter(c => c !== cb);
    };
  }

  private notifyDebounceTimer: NodeJS.Timeout | null = null;
  public notifyStateChange(immediate: boolean = false): void {
    if (immediate) {
      if (this.notifyDebounceTimer) {
        clearTimeout(this.notifyDebounceTimer);
        this.notifyDebounceTimer = null;
      }
      this.doNotifyStateChange();
      return;
    }

    if (!this.notifyDebounceTimer) {
      this.notifyDebounceTimer = setTimeout(() => {
        this.notifyDebounceTimer = null;
        this.doNotifyStateChange();
      }, 40);
    }
  }

  private doNotifyStateChange(): void {
    const state = this.getState();
    this.persistSessionState();
    for (const cb of this.onStateChangeCallbacks) {
      cb(state);
    }
  }

  public getState(): SessionState {
    const currentQ = this.getCurrentClientQuestionView();
    const teamCount = (getStatement('SELECT count(*) as c FROM teams WHERE session_id = ?').get(this.sessionId) as any).c;
    const subCount = currentQ
      ? (getStatement('SELECT count(*) as c FROM submissions WHERE session_id = ? AND question_id = ?').get(this.sessionId, currentQ.id) as any).c
      : 0;

    return {
      id: this.sessionId,
      joinCode: this.joinCode,
      competitionId: this.competitionId,
      roundId: this.roundId,
      roundName: this.round.name,
      roundType: this.round.type,
      status: this.status,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      currentQuestion: currentQ,
      revealedAnswer: this.revealedAnswer,
      currentStageIndex: this.currentStageIndex,
      timerStartedAt: this.timerStartedAt,
      timerDurationSeconds: this.timerDurationSeconds,
      timerRemainingMs: Math.max(0, this.timerRemainingMs),
      timerIsRunning: this.timerIsRunning,
      buzzer: this.buzzerService.getState(),
      allowReanswer: this.allowReanswer,
      teamsCount: teamCount,
      submissionsCount: subCount
    };
  }

  private persistSessionState(): void {
    getStatement(`
      UPDATE sessions SET
        status = ?,
        current_question_index = ?,
        current_question_id = ?,
        current_stage_index = ?,
        timer_started_at = ?,
        timer_duration_seconds = ?,
        timer_remaining_ms = ?,
        timer_is_running = ?,
        allow_reanswer = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      this.status,
      this.currentQuestionIndex,
      this.questions[this.currentQuestionIndex]?.id || null,
      this.currentStageIndex,
      this.timerStartedAt,
      this.timerDurationSeconds,
      this.timerRemainingMs,
      this.timerIsRunning ? 1 : 0,
      this.allowReanswer ? 1 : 0,
      Date.now(),
      this.sessionId
    );
  }

  public getCurrentClientQuestionView(): ClientQuestionView | null {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) return null;

    let options = q.options;
    if (this.round.shuffleOptions && options) {
      options = [...options].sort(() => Math.random() - 0.5);
    }

    let currentStage: StagedScenarioStage | undefined;
    if (q.type === 'staged_scenario' && q.stagedStages && q.stagedStages.length > 0) {
      currentStage = q.stagedStages[this.currentStageIndex];
    }

    return {
      id: q.id,
      type: q.type,
      title: q.title,
      text: q.text,
      topic: q.topic,
      difficulty: q.difficulty,
      timeLimitSeconds: currentStage ? currentStage.timeLimitSeconds : (q.timeLimitSeconds || this.round.defaultTimeLimitSeconds),
      points: currentStage ? currentStage.points : (q.points || this.round.pointsPerCorrect),
      negativePoints: q.negativePoints || this.round.negativeMarking,
      bonusPoints: q.bonusPoints || this.round.bonusPoints,
      codeSnippet: q.codeSnippet,
      codeLanguage: q.codeLanguage,
      imageUrl: q.imageUrl,
      options,
      rubricCriteria: currentStage?.rubricCriteria || q.rubricCriteria,
      currentStage
    };
  }

  // ================= Team Management =================

  public registerOrReconnectTeam(teamName: string): { team: Team; token: string; isNew: boolean } {
    const cleanName = teamName.trim();
    if (!cleanName) {
      throw new Error('Team name cannot be empty');
    }

    return runTransaction(() => {
      const existing = getStatement('SELECT * FROM teams WHERE session_id = ? AND name = ? COLLATE NOCASE').get(
        this.sessionId,
        cleanName
      ) as any;

      if (existing) {
        getStatement('UPDATE teams SET is_connected = 1 WHERE id = ?').run(existing.id);
        const team: Team = {
          id: existing.id,
          sessionId: existing.session_id,
          name: existing.name,
          score: existing.score,
          bonusScore: existing.bonus_score,
          penaltyScore: existing.penalty_score,
          totalTimeMs: existing.total_time_ms,
          isEliminated: Boolean(existing.is_eliminated),
          isConnected: true,
          joinedAt: existing.joined_at
        };
        this.notifyStateChange();
        return { team, token: existing.token, isNew: false };
      }

      const teamId = `team_${crypto.randomBytes(4).toString('hex')}`;
      const token = `tok_${crypto.randomBytes(16).toString('hex')}`;
      const now = Date.now();

      getStatement(`
        INSERT INTO teams (
          id, session_id, name, score, bonus_score, penalty_score,
          total_time_ms, is_eliminated, is_connected, joined_at, token
        ) VALUES (?, ?, ?, 0.0, 0.0, 0.0, 0.0, 0, 1, ?, ?)
      `).run(teamId, this.sessionId, cleanName, now, token);

      const team: Team = {
        id: teamId,
        sessionId: this.sessionId,
        name: cleanName,
        score: 0,
        bonusScore: 0,
        penaltyScore: 0,
        totalTimeMs: 0,
        isEliminated: false,
        isConnected: true,
        joinedAt: now
      };

      this.notifyStateChange();
      return { team, token, isNew: true };
    });
  }

  public getTeamByToken(token: string): Team | null {
    const row = getStatement('SELECT * FROM teams WHERE session_id = ? AND token = ?').get(this.sessionId, token) as any;
    if (!row) return null;
    return {
      id: row.id,
      sessionId: row.session_id,
      name: row.name,
      score: row.score,
      bonusScore: row.bonus_score,
      penaltyScore: row.penalty_score,
      totalTimeMs: row.total_time_ms,
      isEliminated: Boolean(row.is_eliminated),
      isConnected: Boolean(row.is_connected),
      joinedAt: row.joined_at
    };
  }

  public getTeams(): Team[] {
    const rows = getStatement('SELECT * FROM teams WHERE session_id = ? ORDER BY score DESC, total_time_ms ASC').all(this.sessionId) as any[];
    return rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      name: r.name,
      score: r.score,
      bonusScore: r.bonus_score,
      penaltyScore: r.penalty_score,
      totalTimeMs: r.total_time_ms,
      isEliminated: Boolean(r.is_eliminated),
      isConnected: Boolean(r.is_connected),
      joinedAt: r.joined_at
    }));
  }

  public kickTeam(teamId: string): void {
    getStatement('DELETE FROM teams WHERE id = ? AND session_id = ?').run(teamId, this.sessionId);
    this.notifyStateChange();
  }

  public renameTeam(teamId: string, newName: string): void {
    getStatement('UPDATE teams SET name = ? WHERE id = ? AND session_id = ?').run(newName.trim(), teamId, this.sessionId);
    this.notifyStateChange();
  }

  // ================= Round & Question Flow Controls =================

  public startQuestion(questionIndex: number = 0): void {
    if (questionIndex < 0 || questionIndex >= this.questions.length) {
      throw new Error(`Question index ${questionIndex} out of bounds`);
    }

    this.stopTimer();
    this.currentQuestionIndex = questionIndex;
    this.currentStageIndex = 0;
    this.revealedAnswer = null;
    this.status = 'active_question';

    const q = this.questions[this.currentQuestionIndex];
    let duration = q.timeLimitSeconds || this.round.defaultTimeLimitSeconds;
    if (q.type === 'staged_scenario' && q.stagedStages && q.stagedStages.length > 0) {
      duration = q.stagedStages[0].timeLimitSeconds;
    }

    this.timerDurationSeconds = duration;
    this.timerRemainingMs = duration * 1000;
    this.timerStartedAt = Date.now();
    this.timerIsRunning = true;

    if (q.type === 'buzzer') {
      this.buzzerService.open();
    } else {
      this.buzzerService.reset();
    }

    this.startTimerTicker();
    this.notifyStateChange();
  }

  public nextQuestion(): void {
    const nextIdx = this.currentQuestionIndex + 1;
    if (nextIdx < this.questions.length) {
      this.startQuestion(nextIdx);
    } else {
      this.endRound();
    }
  }

  public nextStage(): void {
    const q = this.questions[this.currentQuestionIndex];
    if (q && q.type === 'staged_scenario' && q.stagedStages) {
      const nextStageIdx = this.currentStageIndex + 1;
      if (nextStageIdx < q.stagedStages.length) {
        this.currentStageIndex = nextStageIdx;
        const stage = q.stagedStages[this.currentStageIndex];
        this.timerDurationSeconds = stage.timeLimitSeconds;
        this.timerRemainingMs = stage.timeLimitSeconds * 1000;
        this.timerStartedAt = Date.now();
        this.timerIsRunning = true;
        this.revealedAnswer = null;
        this.status = 'active_question';
        this.startTimerTicker();
        this.notifyStateChange();
        return;
      }
    }
    this.nextQuestion();
  }

  public pauseTimer(): void {
    if (!this.timerIsRunning) return;
    this.timerIsRunning = false;
    this.status = 'paused';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.notifyStateChange();
  }

  public resumeTimer(): void {
    if (this.timerIsRunning || this.timerRemainingMs <= 0) return;
    this.timerIsRunning = true;
    this.status = 'active_question';
    this.timerStartedAt = Date.now() - (this.timerDurationSeconds * 1000 - this.timerRemainingMs);
    this.startTimerTicker();
    this.notifyStateChange();
  }

  public revealAnswer(): void {
    this.stopTimer();
    this.status = 'answer_revealed';

    const q = this.questions[this.currentQuestionIndex];
    if (q) {
      if (q.type === 'staged_scenario' && q.stagedStages && q.stagedStages[this.currentStageIndex]) {
        const stage = q.stagedStages[this.currentStageIndex];
        this.revealedAnswer = {
          correctAnswer: stage.correctAnswer || 'Evaluated by rubric',
          explanation: stage.explanation
        };
      } else {
        this.revealedAnswer = {
          correctAnswer: q.correctAnswer || 'Evaluated by rubric',
          explanation: q.explanation
        };
      }
    }

    this.notifyStateChange();
  }

  public showLeaderboard(): void {
    this.stopTimer();
    this.status = 'leaderboard';
    this.notifyStateChange();
  }

  public endRound(): void {
    this.stopTimer();
    this.status = 'completed';
    this.notifyStateChange();
  }

  public setAllowReanswer(allow: boolean): void {
    this.allowReanswer = allow;
    this.notifyStateChange();
  }

  // ================= Timer Mechanics =================

  private startTimerTicker(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.timerIsRunning || !this.timerStartedAt) return;

      const elapsed = Date.now() - this.timerStartedAt;
      const remaining = Math.max(0, this.timerDurationSeconds * 1000 - elapsed);
      this.timerRemainingMs = remaining;

      for (const cb of this.onTimerTickCallbacks) {
        cb(remaining);
      }

      if (remaining <= 0) {
        this.stopTimer();
        this.status = 'paused';
        this.buzzerService.lock();
        this.notifyStateChange();
      }
    }, 250);
  }

  public stopTimer(): void {
    this.timerIsRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ================= Answer Submission & Scoring =================

  public submitAnswer(
    teamId: string,
    rawAnswer: any,
    clientTime: number = Date.now()
  ): { success: boolean; submission?: Submission; message?: string } {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) {
      return { success: false, message: 'No question currently active' };
    }

    const team = getStatement('SELECT * FROM teams WHERE id = ? AND session_id = ?').get(teamId, this.sessionId) as any;
    if (!team) {
      return { success: false, message: 'Team not found' };
    }

    if (team.is_eliminated) {
      return { success: false, message: 'Team has been eliminated' };
    }

    // Check timer validity with tolerance
    const now = Date.now();
    const isLate = this.timerRemainingMs <= 0 && (!this.timerStartedAt || (now - (this.timerStartedAt + this.timerDurationSeconds * 1000) > MAX_CLOCK_DRIFT_TOLERANCE_MS));

    if (isLate) {
      return { success: false, message: 'Time expired. Answer rejected.' };
    }

    let stageId: string | undefined;
    let targetQuestionOrStage: Question | StagedScenarioStage = q;

    if (q.type === 'staged_scenario' && q.stagedStages && q.stagedStages.length > 0) {
      targetQuestionOrStage = q.stagedStages[this.currentStageIndex];
      stageId = targetQuestionOrStage.id;
    }

    // Buzzer validation: only buzzer winner can submit answer
    if (q.type === 'buzzer') {
      const buzzerState = this.buzzerService.getState();
      if (buzzerState.winnerTeamId !== teamId) {
        return { success: false, message: 'Only the team that successfully locked the buzzer can submit' };
      }
    }

    return runTransaction(() => {
      // Check existing submission
      const existing = getStatement(`
        SELECT * FROM submissions 
        WHERE session_id = ? AND question_id = ? AND team_id = ?
        ${stageId ? 'AND stage_id = ?' : ''}
      `).get(...(stageId ? [this.sessionId, q.id, teamId, stageId] : [this.sessionId, q.id, teamId])) as any;

      if (existing && !this.allowReanswer) {
        return { success: false, message: 'Team already submitted an answer for this question' };
      }

      const responseTimeMs = this.timerStartedAt ? Math.max(0, now - this.timerStartedAt) : 0;
      const basePoints = targetQuestionOrStage.points || this.round.pointsPerCorrect;
      const negPoints = q.negativePoints || this.round.negativeMarking;
      const bonusPoints = q.bonusPoints || this.round.bonusPoints;

      // Grade automatically if not written rubric
      const gradeResult = ScoringService.gradeSubmission(
        targetQuestionOrStage,
        rawAnswer,
        basePoints,
        negPoints,
        bonusPoints,
        false
      );

      const submissionId = existing ? existing.id : `sub_${crypto.randomBytes(4).toString('hex')}`;
      const answerJson = JSON.stringify(rawAnswer);

      if (existing) {
        // Re-answer update: subtract previous points first
        getStatement('UPDATE teams SET score = score - ? WHERE id = ?').run(existing.points_awarded, teamId);
        getStatement(`
          UPDATE submissions SET
            answer_json = ?,
            submitted_at = ?,
            response_time_ms = ?,
            is_correct = ?,
            points_awarded = ?
          WHERE id = ?
        `).run(
          answerJson,
          now,
          responseTimeMs,
          gradeResult.isCorrect ? 1 : 0,
          gradeResult.pointsAwarded,
          submissionId
        );
      } else {
        getStatement(`
          INSERT INTO submissions (
            id, session_id, question_id, stage_id, team_id, team_name,
            answer_json, submitted_at, response_time_ms, is_correct,
            points_awarded, is_late
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          submissionId,
          this.sessionId,
          q.id,
          stageId || null,
          teamId,
          team.name,
          answerJson,
          now,
          responseTimeMs,
          gradeResult.isCorrect ? 1 : 0,
          gradeResult.pointsAwarded,
          0
        );
      }

      // Update team score & accumulated response time
      getStatement(`
        UPDATE teams SET
          score = score + ?,
          total_time_ms = total_time_ms + ?
        WHERE id = ?
      `).run(gradeResult.pointsAwarded, responseTimeMs, teamId);

      const sub: Submission = {
        id: submissionId,
        sessionId: this.sessionId,
        questionId: q.id,
        stageId,
        teamId,
        teamName: team.name,
        answer: rawAnswer,
        submittedAt: now,
        responseTimeMs,
        isCorrect: gradeResult.isCorrect,
        pointsAwarded: gradeResult.pointsAwarded,
        isLate: false
      };

      return { success: true, submission: sub };
    });
  }

  // ================= Judging Queue & Manual Scoring =================

  public submitJudgeScore(
    submissionId: string,
    judgeIdentifier: string,
    rubricScores: Record<string, number>,
    comments: string = ''
  ): void {
    runTransaction(() => {
      const sub = getStatement('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
      if (!sub) throw new Error('Submission not found');

      const q = this.questions.find(x => x.id === sub.question_id);
      let criteria = q?.rubricCriteria || [];
      if (q?.type === 'staged_scenario' && q.stagedStages) {
        const stage = q.stagedStages.find(s => s.id === sub.stage_id);
        if (stage?.rubricCriteria) criteria = stage.rubricCriteria;
      }

      const totalScore = ScoringService.calculateRubricScore(criteria, rubricScores);
      const scoreId = `jscore_${crypto.randomBytes(4).toString('hex')}`;

      getStatement(`
        INSERT INTO judge_scores (
          id, submission_id, judge_identifier, score, criteria_scores_json, comments, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(scoreId, submissionId, judgeIdentifier, totalScore, JSON.stringify(rubricScores), comments, Date.now());

      // Average judge scores for this submission
      const avgRow = getStatement('SELECT AVG(score) as avgScore FROM judge_scores WHERE submission_id = ?').get(submissionId) as any;
      const finalJudgeScore = Math.round((avgRow.avgScore || 0) * 10) / 10;

      // Adjust team points: delta from previous points_awarded
      const pointDelta = finalJudgeScore - sub.points_awarded;

      getStatement(`
        UPDATE submissions SET
          points_awarded = ?,
          judge_score = ?,
          judge_comments = ?,
          is_correct = ?
        WHERE id = ?
      `).run(finalJudgeScore, finalJudgeScore, comments, finalJudgeScore > 0 ? 1 : 0, submissionId);

      getStatement(`
        UPDATE teams SET
          score = score + ?
        WHERE id = ?
      `).run(pointDelta, sub.team_id);

      this.notifyStateChange();
    });
  }

  // ================= Leaderboard & Advancement =================

  public getLeaderboard(): LeaderboardEntry[] {
    const teams = this.getTeams();
    let currentRank = 1;

    return teams.map((t, idx) => {
      // Calculate questions answered and correct count
      const subStats = getStatement(`
        SELECT count(*) as total, sum(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
        FROM submissions
        WHERE session_id = ? AND team_id = ?
      `).get(this.sessionId, t.id) as any;

      const entry: LeaderboardEntry = {
        rank: idx + 1,
        teamId: t.id,
        teamName: t.name,
        totalScore: Math.round(t.score * 10) / 10,
        totalTimeMs: Math.round(t.totalTimeMs),
        questionsAnswered: subStats.total || 0,
        correctAnswers: subStats.correct || 0,
        isEliminated: t.isEliminated
      };
      return entry;
    });
  }

  public advanceTeams(topN: number, manualAdvancingTeamIds?: string[]): { advancing: Team[]; eliminated: Team[] } {
    return runTransaction(() => {
      const teams = this.getTeams();
      const advancing: Team[] = [];
      const eliminated: Team[] = [];

      let advancingIds = new Set<string>();
      if (manualAdvancingTeamIds && manualAdvancingTeamIds.length > 0) {
        advancingIds = new Set(manualAdvancingTeamIds);
      } else {
        const topTeams = teams.slice(0, topN);
        topTeams.forEach(t => advancingIds.add(t.id));
      }

      for (const t of teams) {
        if (advancingIds.has(t.id)) {
          advancing.push(t);
        } else {
          getStatement('UPDATE teams SET is_eliminated = 1 WHERE id = ?').run(t.id);
          eliminated.push({ ...t, isEliminated: true });
        }
      }

      this.notifyStateChange();
      return { advancing, eliminated };
    });
  }

  // ================= Manual Score Override & Audit =================

  public adjustTeamScore(teamId: string, delta: number, reason: string, changedBy: string = 'Admin'): void {
    runTransaction(() => {
      const team = getStatement('SELECT * FROM teams WHERE id = ? AND session_id = ?').get(teamId, this.sessionId) as any;
      if (!team) throw new Error('Team not found');

      const prevScore = team.score;
      const newScore = Math.max(0, prevScore + delta);
      const actualDelta = newScore - prevScore;

      getStatement('UPDATE teams SET score = ? WHERE id = ?').run(newScore, teamId);

      const auditId = `audit_${crypto.randomBytes(4).toString('hex')}`;
      getStatement(`
        INSERT INTO audit_logs (
          id, session_id, team_id, team_name, changed_by,
          previous_score, new_score, delta, reason, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(auditId, this.sessionId, teamId, team.name, changedBy, prevScore, newScore, actualDelta, reason, Date.now());

      this.notifyStateChange();
    });
  }

  public getAuditLogs(): AuditLog[] {
    const rows = getStatement('SELECT * FROM audit_logs WHERE session_id = ? ORDER BY timestamp DESC').all(this.sessionId) as any[];
    return rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      teamId: r.team_id,
      teamName: r.team_name,
      changedBy: r.changed_by,
      previousScore: r.previous_score,
      newScore: r.new_score,
      delta: r.delta,
      reason: r.reason,
      timestamp: r.timestamp
    }));
  }
}
