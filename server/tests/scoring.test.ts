import { describe, it, expect } from 'vitest';
import { ScoringService } from '../src/services/scoringService';
import { Question } from '../../shared/types';

describe('ScoringService', () => {
  it('correctly scores MCQ questions with single correct choice', () => {
    const q: Question = {
      id: 'q1',
      type: 'mcq',
      title: 'Test MCQ',
      text: 'Sample',
      topic: 'CS',
      difficulty: 'easy',
      timeLimitSeconds: 20,
      points: 2,
      negativePoints: 1,
      bonusPoints: 0,
      correctAnswer: 'B',
      createdAt: ''
    };

    const correctRes = ScoringService.gradeSubmission(q, 'B', 2, 1);
    expect(correctRes.isCorrect).toBe(true);
    expect(correctRes.pointsAwarded).toBe(2);

    const wrongRes = ScoringService.gradeSubmission(q, 'A', 2, 1);
    expect(wrongRes.isCorrect).toBe(false);
    expect(wrongRes.pointsAwarded).toBe(-1);
  });

  it('correctly scores Multiple Select questions requiring all matches', () => {
    const q: Question = {
      id: 'q2',
      type: 'multiple_select',
      title: 'Test Multi',
      text: 'Sample',
      topic: 'CS',
      difficulty: 'medium',
      timeLimitSeconds: 30,
      points: 3,
      negativePoints: 0,
      bonusPoints: 0,
      correctAnswer: ['A', 'C'],
      createdAt: ''
    };

    const correctRes = ScoringService.gradeSubmission(q, ['C', 'A'], 3, 0);
    expect(correctRes.isCorrect).toBe(true);
    expect(correctRes.pointsAwarded).toBe(3);

    const wrongRes = ScoringService.gradeSubmission(q, ['A'], 3, 0);
    expect(wrongRes.isCorrect).toBe(false);
    expect(wrongRes.pointsAwarded).toBe(0);
  });

  it('correctly evaluates Short Typed answers with case-insensitivity, synonyms, and regex', () => {
    const q: Question = {
      id: 'q3',
      type: 'short_text',
      title: 'HTTP Method',
      text: 'Sample',
      topic: 'Web',
      difficulty: 'easy',
      timeLimitSeconds: 20,
      points: 1,
      negativePoints: 0,
      bonusPoints: 0,
      shortAnswerAccepted: ['PATCH', 'patch method', 'http patch'],
      shortAnswerCaseSensitive: false,
      shortAnswerRegex: '^patch$',
      createdAt: ''
    };

    // Case-insensitive match
    expect(ScoringService.gradeSubmission(q, 'patch', 1, 0).isCorrect).toBe(true);
    // Accepted synonym
    expect(ScoringService.gradeSubmission(q, 'http patch', 1, 0).isCorrect).toBe(true);
    // Whitespace trimming
    expect(ScoringService.gradeSubmission(q, '   PATCH   ', 1, 0).isCorrect).toBe(true);
    // Wrong answer
    expect(ScoringService.gradeSubmission(q, 'POST', 1, 0).isCorrect).toBe(false);
  });

  it('calculates Rubric criteria totals clamping max scores', () => {
    const criteria = [
      { id: 'c1', title: 'Root Cause', maxScore: 5 },
      { id: 'c2', title: 'Fix', maxScore: 3 },
      { id: 'c3', title: 'Prevention', maxScore: 2 }
    ];

    const scores = { c1: 4, c2: 3, c3: 2 };
    expect(ScoringService.calculateRubricScore(criteria, scores)).toBe(9);

    // Over-max clamping test
    const overflowScores = { c1: 10, c2: 3, c3: -1 };
    expect(ScoringService.calculateRubricScore(criteria, overflowScores)).toBe(8); // 5 + 3 + 0
  });
});
