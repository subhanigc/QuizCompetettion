import { Question, StagedScenarioStage } from '../../../shared/types';

export interface ScoreResult {
  isCorrect: boolean;
  pointsAwarded: number;
  reason?: string;
}

export class ScoringService {
  /**
   * Evaluates an answer for a standard question or staged sub-question.
   */
  public static gradeSubmission(
    question: Question | StagedScenarioStage,
    rawAnswer: any,
    basePoints: number,
    negativePoints: number = 0,
    bonusPoints: number = 0,
    hasBonus: boolean = false
  ): ScoreResult {
    const qType = 'questionType' in question ? (question as any).questionType : (question as Question).type;
    const correctAnswer = question.correctAnswer;

    // 1. Multiple Choice (MCQ), Code MCQ, or True/False
    if (qType === 'mcq' || qType === 'true_false' || (qType === 'code' && question.options && question.options.length > 0)) {
      if (typeof rawAnswer !== 'string' || !correctAnswer) {
        return { isCorrect: false, pointsAwarded: -negativePoints, reason: 'Invalid or missing answer format' };
      }

      const cleanAns = String(rawAnswer).trim().toUpperCase();
      const cleanExpected = String(correctAnswer).trim().toUpperCase();
      const isCorrect = cleanAns === cleanExpected;

      let points = isCorrect ? basePoints : (negativePoints > 0 ? -negativePoints : 0);
      if (isCorrect && hasBonus) {
        points += bonusPoints;
      }

      return {
        isCorrect,
        pointsAwarded: points,
        reason: isCorrect ? 'Correct choice selected' : `Selected ${cleanAns}, expected ${cleanExpected}`
      };
    }

    // 2. Multiple Select
    if (qType === 'multiple_select') {
      if (!Array.isArray(rawAnswer) || !Array.isArray(correctAnswer)) {
        return { isCorrect: false, pointsAwarded: -negativePoints, reason: 'Multiple select requires array format' };
      }

      const selected = [...rawAnswer].map((s: string) => String(s).trim().toUpperCase()).sort();
      const expected = [...correctAnswer].map((s: string) => String(s).trim().toUpperCase()).sort();

      const isCorrect = selected.length === expected.length && selected.every((val, idx) => val === expected[idx]);
      let points = isCorrect ? basePoints : (negativePoints > 0 ? -negativePoints : 0);
      if (isCorrect && hasBonus) points += bonusPoints;

      return {
        isCorrect,
        pointsAwarded: points,
        reason: isCorrect ? 'All correct options selected' : 'Incorrect selection of multiple options'
      };
    }

    // 3. Short Typed Answer (or Code typed output)
    if (qType === 'short_text' || (qType === 'code' && (!question.options || question.options.length === 0))) {
      if (typeof rawAnswer !== 'string') {
        return { isCorrect: false, pointsAwarded: -negativePoints, reason: 'Answer must be a string' };
      }

      const input = String(rawAnswer).trim();
      const caseSensitive = (question as Question).shortAnswerCaseSensitive || false;
      const acceptedList: string[] = [];

      if ((question as Question).shortAnswerAccepted && Array.isArray((question as Question).shortAnswerAccepted)) {
        acceptedList.push(...((question as Question).shortAnswerAccepted || []));
      }
      if (correctAnswer) {
        if (Array.isArray(correctAnswer)) {
          acceptedList.push(...correctAnswer);
        } else {
          acceptedList.push(String(correctAnswer));
        }
      }

      let isCorrect = false;

      // Check accepted list
      for (const accepted of acceptedList) {
        if (caseSensitive) {
          if (input === accepted.trim()) {
            isCorrect = true;
            break;
          }
        } else {
          if (input.toLowerCase() === accepted.trim().toLowerCase()) {
            isCorrect = true;
            break;
          }
        }
      }

      // Check regex if provided
      const regexStr = (question as Question).shortAnswerRegex;
      if (!isCorrect && regexStr) {
        try {
          const reg = new RegExp(regexStr, caseSensitive ? '' : 'i');
          if (reg.test(input)) {
            isCorrect = true;
          }
        } catch {
          // Invalid regex in question definition - ignore
        }
      }

      let points = isCorrect ? basePoints : (negativePoints > 0 ? -negativePoints : 0);
      if (isCorrect && hasBonus) points += bonusPoints;

      return {
        isCorrect,
        pointsAwarded: points,
        reason: isCorrect ? 'Typed answer matched acceptable criteria' : 'Answer did not match acceptable criteria'
      };
    }

    // 4. Buzzer Question
    if (qType === 'buzzer') {
      const cleanAns = String(rawAnswer).trim().toUpperCase();
      const cleanExpected = String(correctAnswer).trim().toUpperCase();
      const isCorrect = cleanAns === cleanExpected;
      const points = isCorrect ? basePoints : (negativePoints > 0 ? -negativePoints : 0);

      return {
        isCorrect,
        pointsAwarded: points,
        reason: isCorrect ? 'Buzzer answer correct' : 'Buzzer answer incorrect (penalty applied)'
      };
    }

    // 5. Written Rubric / Manual grading placeholder
    if (qType === 'written_rubric') {
      return {
        isCorrect: false,
        pointsAwarded: 0,
        reason: 'Pending judge evaluation'
      };
    }

    return {
      isCorrect: false,
      pointsAwarded: 0,
      reason: 'Unknown question type'
    };
  }

  /**
   * Calculates final score for a judge rubric evaluation
   */
  public static calculateRubricScore(
    criteria: { id: string; maxScore: number }[],
    scores: Record<string, number>
  ): number {
    let total = 0;
    for (const c of criteria) {
      const score = scores[c.id];
      if (typeof score === 'number' && !isNaN(score)) {
        // Clamp score between 0 and maxScore
        total += Math.max(0, Math.min(score, c.maxScore));
      }
    }
    return total;
  }
}
