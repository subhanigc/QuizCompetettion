import { Router, Request, Response } from 'express';
import { db, runTransaction } from '../db';
import { requireAdmin } from '../middleware/auth';
import { ExportService } from '../services/exportService';
import { GroqService } from '../services/groqService';
import { Question } from '../../../shared/types';
import crypto from 'crypto';

const router = Router();

// List questions with search & filter
router.get('/', (req: Request, res: Response) => {
  const { search, topic, difficulty, type } = req.query;

  let query = 'SELECT * FROM questions WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (title LIKE ? OR text LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (topic) {
    query += ' AND topic = ?';
    params.push(topic);
  }
  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  const questions: Question[] = rows.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    text: r.text,
    topic: r.topic,
    difficulty: r.difficulty,
    timeLimitSeconds: r.time_limit_seconds,
    points: r.points,
    negativePoints: r.negative_points,
    bonusPoints: r.bonus_points,
    explanation: r.explanation,
    codeSnippet: r.code_snippet,
    codeLanguage: r.code_language,
    imageUrl: r.image_url,
    options: r.options_json ? JSON.parse(r.options_json) : undefined,
    correctAnswer: r.correct_answer_json ? JSON.parse(r.correct_answer_json) : undefined,
    shortAnswerAccepted: r.short_answer_accepted_json ? JSON.parse(r.short_answer_accepted_json) : undefined,
    shortAnswerRegex: r.short_answer_regex,
    shortAnswerCaseSensitive: Boolean(r.short_answer_case_sensitive),
    rubricCriteria: r.rubric_criteria_json ? JSON.parse(r.rubric_criteria_json) : undefined,
    stagedStages: r.staged_stages_json ? JSON.parse(r.staged_stages_json) : undefined,
    createdAt: r.created_at
  }));

  res.json(questions);
});

// Distinct topics and difficulties for filter dropdowns
router.get('/filters', (_req: Request, res: Response) => {
  const topics = (db.prepare('SELECT DISTINCT topic FROM questions ORDER BY topic ASC').all() as any[]).map(t => t.topic);
  res.json({
    topics,
    difficulties: ['easy', 'medium', 'hard'],
    types: ['mcq', 'multiple_select', 'true_false', 'short_text', 'written_rubric', 'code', 'image', 'buzzer', 'staged_scenario']
  });
});

// Get single question by ID
router.get('/:id', (req: Request, res: Response) => {
  const r = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!r) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }

  const q: Question = {
    id: r.id,
    type: r.type,
    title: r.title,
    text: r.text,
    topic: r.topic,
    difficulty: r.difficulty,
    timeLimitSeconds: r.time_limit_seconds,
    points: r.points,
    negativePoints: r.negative_points,
    bonusPoints: r.bonus_points,
    explanation: r.explanation,
    codeSnippet: r.code_snippet,
    codeLanguage: r.code_language,
    imageUrl: r.image_url,
    options: r.options_json ? JSON.parse(r.options_json) : undefined,
    correctAnswer: r.correct_answer_json ? JSON.parse(r.correct_answer_json) : undefined,
    shortAnswerAccepted: r.short_answer_accepted_json ? JSON.parse(r.short_answer_accepted_json) : undefined,
    shortAnswerRegex: r.short_answer_regex,
    shortAnswerCaseSensitive: Boolean(r.short_answer_case_sensitive),
    rubricCriteria: r.rubric_criteria_json ? JSON.parse(r.rubric_criteria_json) : undefined,
    stagedStages: r.staged_stages_json ? JSON.parse(r.staged_stages_json) : undefined,
    createdAt: r.created_at
  };

  res.json(q);
});

// Create question
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const q = req.body;
  if (!q.title || !q.text || !q.type) {
    res.status(400).json({ error: 'Title, text, and type are required' });
    return;
  }

  const id = q.id || `q_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO questions (
      id, type, title, text, topic, difficulty, time_limit_seconds, points,
      negative_points, bonus_points, explanation, code_snippet, code_language,
      image_url, options_json, correct_answer_json, short_answer_accepted_json,
      short_answer_regex, short_answer_case_sensitive, rubric_criteria_json,
      staged_stages_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    q.type,
    q.title.trim(),
    q.text.trim(),
    q.topic || 'General Computer Science',
    q.difficulty || 'medium',
    q.timeLimitSeconds || 30,
    q.points || 1.0,
    q.negativePoints || 0.0,
    q.bonusPoints || 0.0,
    q.explanation || null,
    q.codeSnippet || null,
    q.codeLanguage || null,
    q.imageUrl || null,
    q.options ? JSON.stringify(q.options) : null,
    q.correctAnswer ? JSON.stringify(q.correctAnswer) : null,
    q.shortAnswerAccepted ? JSON.stringify(q.shortAnswerAccepted) : null,
    q.shortAnswerRegex || null,
    q.shortAnswerCaseSensitive ? 1 : 0,
    q.rubricCriteria ? JSON.stringify(q.rubricCriteria) : null,
    q.stagedStages ? JSON.stringify(q.stagedStages) : null,
    now
  );

  res.status(201).json({ id, message: 'Question created successfully' });
});

// Update question
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const q = req.body;

  db.prepare(`
    UPDATE questions SET
      type = COALESCE(?, type),
      title = COALESCE(?, title),
      text = COALESCE(?, text),
      topic = COALESCE(?, topic),
      difficulty = COALESCE(?, difficulty),
      time_limit_seconds = COALESCE(?, time_limit_seconds),
      points = COALESCE(?, points),
      negative_points = COALESCE(?, negative_points),
      bonus_points = COALESCE(?, bonus_points),
      explanation = COALESCE(?, explanation),
      code_snippet = COALESCE(?, code_snippet),
      code_language = COALESCE(?, code_language),
      image_url = COALESCE(?, image_url),
      options_json = COALESCE(?, options_json),
      correct_answer_json = COALESCE(?, correct_answer_json),
      short_answer_accepted_json = COALESCE(?, short_answer_accepted_json),
      short_answer_regex = COALESCE(?, short_answer_regex),
      short_answer_case_sensitive = COALESCE(?, short_answer_case_sensitive),
      rubric_criteria_json = COALESCE(?, rubric_criteria_json),
      staged_stages_json = COALESCE(?, staged_stages_json)
    WHERE id = ?
  `).run(
    q.type,
    q.title,
    q.text,
    q.topic,
    q.difficulty,
    q.timeLimitSeconds,
    q.points,
    q.negativePoints,
    q.bonusPoints,
    q.explanation,
    q.codeSnippet,
    q.codeLanguage,
    q.imageUrl,
    q.options ? JSON.stringify(q.options) : null,
    q.correctAnswer ? JSON.stringify(q.correctAnswer) : null,
    q.shortAnswerAccepted ? JSON.stringify(q.shortAnswerAccepted) : null,
    q.shortAnswerRegex,
    typeof q.shortAnswerCaseSensitive === 'boolean' ? (q.shortAnswerCaseSensitive ? 1 : 0) : null,
    q.rubricCriteria ? JSON.stringify(q.rubricCriteria) : null,
    q.stagedStages ? JSON.stringify(q.stagedStages) : null,
    id
  );

  res.json({ success: true, message: 'Question updated successfully' });
});

// Duplicate question
router.post('/:id/duplicate', requireAdmin, (req: Request, res: Response) => {
  const original = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!original) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }

  const newId = `q_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO questions (
      id, type, title, text, topic, difficulty, time_limit_seconds, points,
      negative_points, bonus_points, explanation, code_snippet, code_language,
      image_url, options_json, correct_answer_json, short_answer_accepted_json,
      short_answer_regex, short_answer_case_sensitive, rubric_criteria_json,
      staged_stages_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    original.type,
    `${original.title} (Copy)`,
    original.text,
    original.topic,
    original.difficulty,
    original.time_limit_seconds,
    original.points,
    original.negative_points,
    original.bonus_points,
    original.explanation,
    original.code_snippet,
    original.code_language,
    original.image_url,
    original.options_json,
    original.correct_answer_json,
    original.short_answer_accepted_json,
    original.short_answer_regex,
    original.short_answer_case_sensitive,
    original.rubric_criteria_json,
    original.staged_stages_json,
    now
  );

  res.status(201).json({ id: newId, message: 'Question duplicated successfully' });
});

// Delete question
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Question deleted' });
});

// Export questions CSV
router.get('/export/csv', requireAdmin, (_req: Request, res: Response) => {
  const csv = ExportService.exportQuestionsToCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="techquiz-questions-bank.csv"');
  res.send(csv);
});

// Download CSV template
router.get('/template/csv', (_req: Request, res: Response) => {
  const template = ExportService.getCsvTemplate();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="techquiz-import-template.csv"');
  res.send(template);
});

// Download JSON template
router.get('/template/json', (_req: Request, res: Response) => {
  const template = ExportService.getJsonTemplate();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="techquiz-import-template.json"');
  res.json(template);
});

// Import questions from JSON with row validation
router.post('/import/json', requireAdmin, (req: Request, res: Response) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Import payload must be a JSON array of questions' });
    return;
  }

  const errors: { row: number; error: string }[] = [];
  let importedCount = 0;

  runTransaction(() => {
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO questions (
        id, type, title, text, topic, difficulty, time_limit_seconds, points,
        negative_points, bonus_points, explanation, code_snippet, code_language,
        image_url, options_json, correct_answer_json, short_answer_accepted_json,
        short_answer_regex, short_answer_case_sensitive, rubric_criteria_json,
        staged_stages_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach((item, idx) => {
      const rowNum = idx + 1;
      if (!item.title || typeof item.title !== 'string') {
        errors.push({ row: rowNum, error: 'Missing or invalid "title"' });
        return;
      }
      if (!item.text || typeof item.text !== 'string') {
        errors.push({ row: rowNum, error: 'Missing or invalid "text"' });
        return;
      }
      if (!item.type) {
        errors.push({ row: rowNum, error: 'Missing "type"' });
        return;
      }

      const id = item.id || `q_${crypto.randomBytes(4).toString('hex')}`;
      insertStmt.run(
        id,
        item.type,
        item.title.trim(),
        item.text.trim(),
        item.topic || 'General IT',
        item.difficulty || 'medium',
        item.timeLimitSeconds || 30,
        item.points || 1.0,
        item.negativePoints || 0.0,
        item.bonusPoints || 0.0,
        item.explanation || null,
        item.codeSnippet || null,
        item.codeLanguage || null,
        item.imageUrl || null,
        item.options ? JSON.stringify(item.options) : null,
        item.correctAnswer ? JSON.stringify(item.correctAnswer) : null,
        item.shortAnswerAccepted ? JSON.stringify(item.shortAnswerAccepted) : null,
        item.shortAnswerRegex || null,
        item.shortAnswerCaseSensitive ? 1 : 0,
        item.rubricCriteria ? JSON.stringify(item.rubricCriteria) : null,
        item.stagedStages ? JSON.stringify(item.stagedStages) : null,
        new Date().toISOString()
      );
      importedCount++;
    });
  });

  res.json({
    success: true,
    importedCount,
    failedCount: errors.length,
    errors
  });
});

// AI Generate Questions using Groq
router.post('/generate-ai', requireAdmin, async (req: Request, res: Response) => {
  if (!GroqService.isConfigured()) {
    res.status(400).json({ error: 'Groq AI is not configured. Set GROQ_API_KEY in .env to enable.' });
    return;
  }

  const { topic, difficulty, count, type } = req.body;
  if (!topic) {
    res.status(400).json({ error: 'Topic is required for AI generation' });
    return;
  }

  try {
    const generated = await GroqService.generateQuestions({
      topic: String(topic),
      difficulty: difficulty || 'medium',
      count: Math.min(10, Math.max(1, parseInt(count || '3', 10))),
      type: type || 'mcq'
    });

    res.json({ success: true, questions: generated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

export default router;
