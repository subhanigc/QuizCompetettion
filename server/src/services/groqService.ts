import { CONFIG } from '../config';
import { QuestionType, Difficulty } from '../../../shared/types';

export interface AiGeneratedQuestion {
  type: QuestionType;
  title: string;
  text: string;
  topic: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  points: number;
  negativePoints: number;
  bonusPoints: number;
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  shortAnswerAccepted?: string[];
  explanation?: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface AiScoreSuggestion {
  suggestedScore: number;
  reasoning: string;
}

export class GroqService {
  private static readonly GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private static readonly MODEL = 'llama-3.3-70b-versatile';

  public static isConfigured(): boolean {
    return Boolean(CONFIG.GROQ_API_KEY && CONFIG.GROQ_API_KEY.startsWith('gsk_'));
  }

  /**
   * Generates technical questions using Groq LLM API.
   */
  public static async generateQuestions(params: {
    topic: string;
    difficulty: Difficulty;
    count: number;
    type: QuestionType;
  }): Promise<AiGeneratedQuestion[]> {
    if (!this.isConfigured()) {
      throw new Error('Groq AI API key is not configured in .env');
    }

    const systemPrompt = `You are an expert technical quiz question author specializing in computer science, software engineering, and IT.
Generate exactly ${params.count} high-quality, technically accurate ${params.difficulty} difficulty questions of type "${params.type}" on the topic: "${params.topic}".
Output MUST be a strict JSON object with this shape:
{
  "questions": [
    {
      "type": "${params.type}",
      "title": "Short descriptive title",
      "text": "The full question text",
      "topic": "${params.topic}",
      "difficulty": "${params.difficulty}",
      "timeLimitSeconds": 30,
      "points": 1,
      "negativePoints": 0,
      "bonusPoints": 0,
      "options": [{"id": "A", "text": "Option 1"}, {"id": "B", "text": "Option 2"}, {"id": "C", "text": "Option 3"}, {"id": "D", "text": "Option 4"}],
      "correctAnswer": "A",
      "shortAnswerAccepted": ["variation1", "variation2"],
      "explanation": "Clear educational explanation of why the answer is correct",
      "codeSnippet": "code here if applicable",
      "codeLanguage": "c or python or java or sql"
    }
  ]
}
Ensure all questions are practical, modern, and free from ambiguities.`;

    const response = await fetch(this.GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${params.count} questions for ${params.topic}. Return only valid JSON.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response received from Groq AI');
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : [parsed];
  }

  /**
   * Evaluates a written student answer against rubric criteria.
   */
  public static async suggestScore(params: {
    questionTitle: string;
    questionText: string;
    writtenAnswer: string;
    rubricCriteria: { id: string; title: string; maxScore: number; description?: string }[];
  }): Promise<AiScoreSuggestion> {
    if (!this.isConfigured()) {
      throw new Error('Groq AI API key is not configured in .env');
    }

    const totalMax = params.rubricCriteria.reduce((sum, c) => sum + c.maxScore, 0);

    const systemPrompt = `You are a fair and strict university CS exam grader evaluating written answers.
Evaluate the team's written answer against the provided rubric criteria.
Output MUST be a strict JSON object:
{
  "suggestedScore": <number between 0 and ${totalMax}>,
  "reasoning": "<concise breakdown of points awarded per criterion and missing details>"
}`;

    const userMessage = `
Question: ${params.questionTitle}
Prompt: ${params.questionText}

Rubric Criteria:
${params.rubricCriteria.map(c => `- ${c.title} (Max: ${c.maxScore} pts): ${c.description || ''}`).join('\n')}

Student Written Answer:
"${params.writtenAnswer}"
`;

    const response = await fetch(this.GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      suggestedScore: typeof parsed.suggestedScore === 'number' ? parsed.suggestedScore : 0,
      reasoning: parsed.reasoning || 'Score suggested based on rubric analysis.'
    };
  }
}
