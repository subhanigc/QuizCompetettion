import { Router, Request, Response } from 'express';
import { db, runTransaction } from '../db';
import { requireAdmin } from '../middleware/auth';
import { seedDatabase } from '../db/seed';
import crypto from 'crypto';

const router = Router();

// List all competitions with their rounds
router.get('/', (_req: Request, res: Response) => {
  const comps = db.prepare('SELECT * FROM competitions ORDER BY created_at DESC').all() as any[];
  const rounds = db.prepare('SELECT * FROM rounds ORDER BY round_number ASC').all() as any[];

  const result = comps.map(c => ({
    ...c,
    rounds: rounds
      .filter(r => r.competition_id === c.id)
      .map(r => ({
        ...r,
        allowedQuestionTypes: JSON.parse(r.allowed_question_types || '[]'),
        autoAdvance: Boolean(r.auto_advance),
        showLeaderboardBetweenQuestions: Boolean(r.show_leaderboard_between_questions),
        shuffleQuestions: Boolean(r.shuffle_questions),
        shuffleOptions: Boolean(r.shuffle_options),
        allowPassToNextTeam: Boolean(r.allow_pass_to_next_team),
        questionIds: JSON.parse(r.question_ids || '[]')
      }))
  }));

  res.json(result);
});

// Get single competition by ID
router.get('/:id', (req: Request, res: Response) => {
  const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(req.params.id) as any;
  if (!comp) {
    res.status(404).json({ error: 'Competition not found' });
    return;
  }

  const rounds = db.prepare('SELECT * FROM rounds WHERE competition_id = ? ORDER BY round_number ASC').all(comp.id) as any[];
  res.json({
    ...comp,
    rounds: rounds.map(r => ({
      ...r,
      allowedQuestionTypes: JSON.parse(r.allowed_question_types || '[]'),
      autoAdvance: Boolean(r.auto_advance),
      showLeaderboardBetweenQuestions: Boolean(r.show_leaderboard_between_questions),
      shuffleQuestions: Boolean(r.shuffle_questions),
      shuffleOptions: Boolean(r.shuffle_options),
      allowPassToNextTeam: Boolean(r.allow_pass_to_next_team),
      questionIds: JSON.parse(r.question_ids || '[]')
    }))
  });
});

// Create new competition
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const id = `comp_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO competitions (id, title, description, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, title.trim(), description || '', now);

  res.status(201).json({ id, title, description, createdAt: now, rounds: [] });
});

// Update competition
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const { title, description } = req.body;
  db.prepare(`
    UPDATE competitions SET title = COALESCE(?, title), description = COALESCE(?, description)
    WHERE id = ?
  `).run(title, description, req.params.id);

  res.json({ success: true, message: 'Competition updated' });
});

// Delete competition
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM competitions WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Competition deleted' });
});

// Create round in competition
router.post('/:id/rounds', requireAdmin, (req: Request, res: Response) => {
  const compId = req.params.id;
  const {
    name,
    description,
    type,
    allowedQuestionTypes,
    defaultTimeLimitSeconds,
    pointsPerCorrect,
    negativeMarking,
    bonusPoints,
    teamsAdvancing,
    autoAdvance,
    showLeaderboardBetweenQuestions,
    gradingMode,
    shuffleQuestions,
    shuffleOptions,
    allowPassToNextTeam,
    passPointRatio,
    questionIds
  } = req.body;

  const roundCount = (db.prepare('SELECT count(*) as c FROM rounds WHERE competition_id = ?').get(compId) as any).c;
  const roundId = `round_${crypto.randomBytes(4).toString('hex')}`;

  db.prepare(`
    INSERT INTO rounds (
      id, competition_id, round_number, name, description, type,
      allowed_question_types, default_time_limit_seconds, points_per_correct,
      negative_marking, bonus_points, teams_advancing, auto_advance,
      show_leaderboard_between_questions, grading_mode, shuffle_questions,
      shuffle_options, allow_pass_to_next_team, pass_point_ratio, question_ids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roundId,
    compId,
    roundCount + 1,
    name || `Round ${roundCount + 1}`,
    description || '',
    type || 'screening',
    JSON.stringify(allowedQuestionTypes || ['mcq']),
    defaultTimeLimitSeconds || 30,
    pointsPerCorrect || 1.0,
    negativeMarking || 0.0,
    bonusPoints || 0.0,
    teamsAdvancing || 8,
    autoAdvance ? 1 : 0,
    showLeaderboardBetweenQuestions ? 1 : 0,
    gradingMode || 'auto',
    shuffleQuestions ? 1 : 0,
    shuffleOptions ? 1 : 0,
    allowPassToNextTeam ? 1 : 0,
    passPointRatio || 0.5,
    JSON.stringify(questionIds || [])
  );

  res.status(201).json({ id: roundId, message: 'Round created' });
});

// Update round
router.put('/rounds/:roundId', requireAdmin, (req: Request, res: Response) => {
  const { roundId } = req.params;
  const r = req.body;

  db.prepare(`
    UPDATE rounds SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      type = COALESCE(?, type),
      allowed_question_types = COALESCE(?, allowed_question_types),
      default_time_limit_seconds = COALESCE(?, default_time_limit_seconds),
      points_per_correct = COALESCE(?, points_per_correct),
      negative_marking = COALESCE(?, negative_marking),
      bonus_points = COALESCE(?, bonus_points),
      teams_advancing = COALESCE(?, teams_advancing),
      auto_advance = COALESCE(?, auto_advance),
      show_leaderboard_between_questions = COALESCE(?, show_leaderboard_between_questions),
      grading_mode = COALESCE(?, grading_mode),
      shuffle_questions = COALESCE(?, shuffle_questions),
      shuffle_options = COALESCE(?, shuffle_options),
      allow_pass_to_next_team = COALESCE(?, allow_pass_to_next_team),
      pass_point_ratio = COALESCE(?, pass_point_ratio),
      question_ids = COALESCE(?, question_ids)
    WHERE id = ?
  `).run(
    r.name,
    r.description,
    r.type,
    r.allowedQuestionTypes ? JSON.stringify(r.allowedQuestionTypes) : null,
    r.defaultTimeLimitSeconds,
    r.pointsPerCorrect,
    r.negativeMarking,
    r.bonusPoints,
    r.teamsAdvancing,
    typeof r.autoAdvance === 'boolean' ? (r.autoAdvance ? 1 : 0) : null,
    typeof r.showLeaderboardBetweenQuestions === 'boolean' ? (r.showLeaderboardBetweenQuestions ? 1 : 0) : null,
    r.gradingMode,
    typeof r.shuffleQuestions === 'boolean' ? (r.shuffleQuestions ? 1 : 0) : null,
    typeof r.shuffleOptions === 'boolean' ? (r.shuffleOptions ? 1 : 0) : null,
    typeof r.allowPassToNextTeam === 'boolean' ? (r.allowPassToNextTeam ? 1 : 0) : null,
    r.passPointRatio,
    r.questionIds ? JSON.stringify(r.questionIds) : null,
    roundId
  );

  res.json({ success: true, message: 'Round updated successfully' });
});

// Delete round
router.delete('/rounds/:roundId', requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM rounds WHERE id = ?').run(req.params.roundId);
  res.json({ success: true, message: 'Round deleted' });
});

// Reset to default 5-round template
router.post('/reset-template', requireAdmin, (_req: Request, res: Response) => {
  seedDatabase();
  res.json({ success: true, message: 'Seeded default 5-round competition successfully' });
});

export default router;
