import PDFDocument from 'pdfkit';
import { db } from '../db';
import { LeaderboardEntry } from '../../../shared/types';

export class ExportService {
  /**
   * Generates CSV for questions in the question bank.
   */
  public static exportQuestionsToCsv(): string {
    const questions = db.prepare('SELECT * FROM questions ORDER BY topic, difficulty').all() as any[];
    const headers = [
      'id',
      'type',
      'title',
      'text',
      'topic',
      'difficulty',
      'timeLimitSeconds',
      'points',
      'negativePoints',
      'options',
      'correctAnswer',
      'explanation'
    ];

    const rows = questions.map(q => {
      let optionsStr = '';
      if (q.options_json) {
        try {
          const opts = JSON.parse(q.options_json);
          optionsStr = opts.map((o: any) => `${o.id}:${o.text}`).join('|');
        } catch {}
      }

      let correctStr = '';
      if (q.correct_answer_json) {
        try {
          correctStr = JSON.parse(q.correct_answer_json);
          if (Array.isArray(correctStr)) correctStr = correctStr.join('|');
        } catch {
          correctStr = q.correct_answer_json;
        }
      }

      return [
        q.id,
        q.type,
        `"${(q.title || '').replace(/"/g, '""')}"`,
        `"${(q.text || '').replace(/"/g, '""')}"`,
        `"${(q.topic || '').replace(/"/g, '""')}"`,
        q.difficulty,
        q.time_limit_seconds,
        q.points,
        q.negative_points,
        `"${optionsStr.replace(/"/g, '""')}"`,
        `"${correctStr.replace(/"/g, '""')}"`,
        `"${(q.explanation || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generates sample CSV template for bulk question import.
   */
  public static getCsvTemplate(): string {
    const headers = [
      'type',
      'title',
      'text',
      'topic',
      'difficulty',
      'timeLimitSeconds',
      'points',
      'negativePoints',
      'options',
      'correctAnswer',
      'explanation'
    ];

    const sampleRow1 = [
      'mcq',
      'Binary Search Complexity',
      'What is the worst-case runtime of binary search on a sorted array?',
      'Data Structures & Algorithms',
      'easy',
      '20',
      '1',
      '0',
      'A:O(1)|B:O(log n)|C:O(n)|D:O(n^2)',
      'B',
      'Binary search divides the search interval in half every step.'
    ].map(s => `"${s}"`).join(',');

    const sampleRow2 = [
      'short_text',
      'HTTP Secure Protocol',
      'Which port is the standard default for HTTPS traffic?',
      'Networking',
      'easy',
      '15',
      '1',
      '0',
      '',
      '443',
      'Port 443 is assigned by IANA for standard HTTPS traffic.'
    ].map(s => `"${s}"`).join(',');

    return [headers.join(','), sampleRow1, sampleRow2].join('\n');
  }

  /**
   * Generates sample JSON template for bulk question import.
   */
  public static getJsonTemplate(): object {
    return [
      {
        type: 'mcq',
        title: 'Binary Search Complexity',
        text: 'What is the worst-case runtime of binary search on a sorted array?',
        topic: 'Data Structures & Algorithms',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        options: [
          { id: 'A', text: 'O(1)' },
          { id: 'B', text: 'O(log n)' },
          { id: 'C', text: 'O(n)' },
          { id: 'D', text: 'O(n^2)' }
        ],
        correctAnswer: 'B',
        explanation: 'Binary search halves the remaining space on every step.'
      },
      {
        type: 'short_text',
        title: 'Linux Default Shell',
        text: 'What is the standard path to the bash executable on most Linux systems?',
        topic: 'Operating Systems',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 1,
        negativePoints: 0,
        shortAnswerAccepted: ['/bin/bash', 'bin/bash', '/usr/bin/bash'],
        explanation: 'The GNU Bourne-Again SHell is typically installed at /bin/bash.'
      }
    ];
  }

  /**
   * Generates CSV for session leaderboard results.
   */
  public static exportLeaderboardCsv(leaderboard: LeaderboardEntry[], sessionTitle: string): string {
    const headers = ['Rank', 'Team Name', 'Total Score', 'Total Response Time (s)', 'Questions Answered', 'Correct Answers', 'Status'];
    const rows = leaderboard.map(l => [
      l.rank,
      `"${l.teamName.replace(/"/g, '""')}"`,
      l.totalScore,
      (l.totalTimeMs / 1000).toFixed(2),
      l.questionsAnswered,
      l.correctAnswers,
      l.isEliminated ? 'Eliminated' : 'Active'
    ].join(','));

    return [`# ${sessionTitle} - Results Export`, headers.join(','), ...rows].join('\n');
  }

  /**
   * Generates a clean PDF document for the session leaderboard.
   */
  public static generateLeaderboardPdf(leaderboard: LeaderboardEntry[], sessionTitle: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fillColor('#1E1B4B').fontSize(22).font('Helvetica-Bold').text('TechQuiz Arena - Official Results', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor('#4F46E5').fontSize(14).font('Helvetica').text(sessionTitle, { align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#6B7280').fontSize(10).text(`Generated: ${new Date().toLocaleString()} (Offline LAN Platform)`, { align: 'center' });
      doc.moveDown(1.5);

      // Table Header
      const colX = [40, 80, 260, 340, 430, 500];
      let y = doc.y;

      doc.rect(40, y - 4, 515, 20).fill('#312E81');
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('Rank', colX[0] + 5, y);
      doc.text('Team Name', colX[1], y);
      doc.text('Score', colX[2], y);
      doc.text('Time (s)', colX[3], y);
      doc.text('Accuracy', colX[4], y);
      doc.text('Status', colX[5], y);
      doc.moveDown(1.2);

      // Rows
      doc.font('Helvetica').fontSize(10);
      let isAlt = false;

      for (const entry of leaderboard) {
        y = doc.y;
        if (y > 750) {
          doc.addPage();
          y = doc.y;
        }

        if (isAlt) {
          doc.rect(40, y - 3, 515, 18).fill('#F3F4F6');
        }
        isAlt = !isAlt;

        doc.fillColor(entry.rank <= 3 ? '#B45309' : '#111827');
        doc.text(String(entry.rank), colX[0] + 5, y);
        doc.text(entry.teamName, colX[1], y, { width: 170, ellipsis: true });
        doc.text(String(entry.totalScore), colX[2], y);
        doc.text((entry.totalTimeMs / 1000).toFixed(1), colX[3], y);
        
        const accuracy = entry.questionsAnswered > 0 
          ? `${Math.round((entry.correctAnswers / entry.questionsAnswered) * 100)}%` 
          : 'N/A';
        doc.text(accuracy, colX[4], y);

        doc.fillColor(entry.isEliminated ? '#EF4444' : '#10B981');
        doc.text(entry.isEliminated ? 'Eliminated' : 'Advancing', colX[5], y);

        doc.moveDown(0.9);
      }

      // Footer
      doc.moveDown(2);
      doc.fillColor('#9CA3AF').fontSize(9).text('TechQuiz Arena • High-Concurrency Self-Hosted LAN Quiz System', { align: 'center' });

      doc.end();
    });
  }
}
