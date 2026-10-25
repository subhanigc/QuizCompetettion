import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAdmin, requireJudge } from '../middleware/auth';
import { SessionEngine } from '../services/sessionEngine';
import { GroqService } from '../services/groqService';
import { ExportService } from '../services/exportService';
import { JudgeQueueItem, AnalyticsData } from '../../../shared/types';

const router = Router();

// Start a new live session for a competition round
router.post('/start', requireAdmin, (req: Request, res: Response) => {
  const { competitionId, roundId } = req.body;
  if (!competitionId || !roundId) {
    res.status(400).json({ error: 'competitionId and roundId are required' });
    return;
  }

  try {
    const engine = SessionEngine.createSession(competitionId, roundId);
    res.status(201).json({
      sessionId: engine.sessionId,
      joinCode: engine.joinCode,
      state: engine.getState()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List recent and active sessions
router.get('/active/list', (_req: Request, res: Response) => {
  try {
    const sessions = db.prepare(`
      SELECT s.*, c.title as competition_title, r.name as round_name, r.round_number
      FROM sessions s
      JOIN competitions c ON s.competition_id = c.id
      JOIN rounds r ON s.round_id = r.id
      ORDER BY s.created_at DESC
      LIMIT 15
    `).all();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get session state by ID or Join Code
router.get('/:id', (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    res.json(engine.getState());
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Get session teams
router.get('/:id/teams', (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    res.json(engine.getTeams());
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Kick a team
router.delete('/:id/teams/:teamId', requireAdmin, (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    engine.kickTeam(req.params.teamId);
    res.json({ success: true, message: 'Team kicked successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rename a team
router.put('/:id/teams/:teamId/rename', requireAdmin, (req: Request, res: Response) => {
  const { newName } = req.body;
  if (!newName) {
    res.status(400).json({ error: 'New name is required' });
    return;
  }

  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    engine.renameTeam(req.params.teamId, newName);
    res.json({ success: true, message: 'Team renamed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get session leaderboard
router.get('/:id/leaderboard', (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    res.json(engine.getLeaderboard());
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Advance teams (Top N or manual list)
router.post('/:id/advance', requireAdmin, (req: Request, res: Response) => {
  const { topN, teamIds } = req.body;
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    const result = engine.advanceTeams(topN || engine.round.teamsAdvancing, teamIds);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual score adjustment by admin with audit logging
router.post('/:id/adjust-score', requireAdmin, (req: Request, res: Response) => {
  const { teamId, delta, reason } = req.body;
  if (!teamId || delta === undefined || !reason) {
    res.status(400).json({ error: 'teamId, delta, and reason are required' });
    return;
  }

  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    engine.adjustTeamScore(teamId, Number(delta), String(reason), 'Admin');
    res.json({ success: true, message: 'Score adjusted and logged in audit log' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit logs
router.get('/:id/audit-logs', requireAdmin, (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    res.json(engine.getAuditLogs());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Judging Queue =================

// Anonymized judging queue of written submissions
router.get('/:id/judge-queue', requireJudge, (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);

    // Fetch all submissions for written_rubric questions in this session
    const rows = db.prepare(`
      SELECT s.*, q.title as question_title, q.text as question_text,
             q.rubric_criteria_json, q.staged_stages_json
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      WHERE s.session_id = ?
      ORDER BY s.submitted_at ASC
    `).all(engine.sessionId) as any[];

    // Map each team to a consistent anonymous alias in this queue (e.g. "Team #1", "Team #2")
    const teamAliasMap = new Map<string, string>();
    let aliasCounter = 1;

    const queue: JudgeQueueItem[] = [];

    for (const r of rows) {
      if (!teamAliasMap.has(r.team_id)) {
        teamAliasMap.set(r.team_id, `Team #${aliasCounter++}`);
      }

      let criteria = r.rubric_criteria_json ? JSON.parse(r.rubric_criteria_json) : [];
      let questionTitle = r.question_title;
      let questionText = r.question_text;

      if (r.stage_id && r.staged_stages_json) {
        try {
          const stages = JSON.parse(r.staged_stages_json);
          const stage = stages.find((s: any) => s.id === r.stage_id);
          if (stage) {
            questionTitle = `${r.question_title} (${stage.title})`;
            questionText = `${stage.storyText}\n\n${stage.questionText}`;
            if (stage.rubricCriteria) criteria = stage.rubricCriteria;
          }
        } catch {}
      }

      // Only show if question has rubric criteria
      if (criteria && criteria.length > 0) {
        const scoreCount = (db.prepare('SELECT count(*) as c FROM judge_scores WHERE submission_id = ?').get(r.id) as any).c;

        queue.push({
          submissionId: r.id,
          sessionId: r.session_id,
          questionId: r.question_id,
          stageId: r.stage_id || undefined,
          teamAlias: teamAliasMap.get(r.team_id)!,
          questionTitle,
          questionText,
          writtenAnswer: typeof r.answer_json === 'string' ? JSON.parse(r.answer_json) : r.answer_json,
          rubricCriteria: criteria,
          currentScore: r.judge_score,
          judgeComments: r.judge_comments,
          scoresCount: scoreCount
        });
      }
    }

    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a judge rubric evaluation
router.post('/:id/judge-score', requireJudge, (req: Request, res: Response) => {
  const { submissionId, rubricScores, comments, judgeIdentifier } = req.body;
  if (!submissionId || !rubricScores) {
    res.status(400).json({ error: 'submissionId and rubricScores are required' });
    return;
  }

  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    engine.submitJudgeScore(submissionId, judgeIdentifier || 'Judge-1', rubricScores, comments || '');
    res.json({ success: true, message: 'Judge score registered and leaderboard updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Suggest score for judge
router.post('/:id/ai-score-suggest', requireJudge, async (req: Request, res: Response) => {
  if (!GroqService.isConfigured()) {
    res.status(400).json({ error: 'AI features are not enabled. Set GROQ_API_KEY in .env.' });
    return;
  }

  const { questionTitle, questionText, writtenAnswer, rubricCriteria } = req.body;
  if (!writtenAnswer || !rubricCriteria) {
    res.status(400).json({ error: 'writtenAnswer and rubricCriteria are required' });
    return;
  }

  try {
    const suggestion = await GroqService.suggestScore({
      questionTitle: questionTitle || 'Written Response',
      questionText: questionText || '',
      writtenAnswer: String(writtenAnswer),
      rubricCriteria
    });
    res.json(suggestion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Analytics & Exports =================

// Post-event analytics
router.get('/:id/analytics', (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    const leaderboard = engine.getLeaderboard();

    const qStats = engine.questions.map(q => {
      const stats = db.prepare(`
        SELECT count(*) as total,
               sum(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
               avg(response_time_ms) as avg_time
        FROM submissions
        WHERE session_id = ? AND question_id = ?
      `).get(engine.sessionId, q.id) as any;

      const total = stats.total || 0;
      const correct = stats.correct || 0;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      return {
        questionId: q.id,
        title: q.title,
        topic: q.topic,
        difficulty: q.difficulty,
        totalSubmissions: total,
        correctCount: correct,
        accuracyPercent: accuracy,
        averageResponseTimeMs: Math.round(stats.avg_time || 0)
      };
    });

    const activeQStats = qStats.filter(q => q.totalSubmissions > 0);
    const sortedByAcc = [...activeQStats].sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    const hardest = sortedByAcc[0];
    const easiest = sortedByAcc[sortedByAcc.length - 1];

    const totalScores = leaderboard.map(l => l.totalScore);
    const avgScore = totalScores.length > 0 ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 10) / 10 : 0;
    const highestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;

    const analytics: AnalyticsData = {
      sessionId: engine.sessionId,
      roundName: engine.round.name,
      totalTeams: leaderboard.length,
      averageScore: avgScore,
      highestScore,
      questionStats: qStats,
      hardestQuestion: hardest ? { title: hardest.title, accuracyPercent: hardest.accuracyPercent } : undefined,
      easiestQuestion: easiest ? { title: easiest.title, accuracyPercent: easiest.accuracyPercent } : undefined,
      leaderboard
    };

    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Results CSV
router.get('/:id/export/csv', (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    const leaderboard = engine.getLeaderboard();
    const csv = ExportService.exportLeaderboardCsv(leaderboard, `${engine.round.name} (Code: ${engine.joinCode})`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="techquiz-${engine.joinCode}-results.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Results PDF
router.get('/:id/export/pdf', async (req: Request, res: Response) => {
  try {
    const engine = SessionEngine.getOrCreateEngine(req.params.id);
    const leaderboard = engine.getLeaderboard();
    const pdfBuffer = await ExportService.generateLeaderboardPdf(leaderboard, `${engine.round.name} (Code: ${engine.joinCode})`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="techquiz-${engine.joinCode}-results.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
