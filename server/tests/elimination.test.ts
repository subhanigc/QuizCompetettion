import { describe, it, expect, beforeEach } from 'vitest';
import { SessionEngine } from '../src/services/sessionEngine';
import { initDatabase, db } from '../src/db';
import { seedDatabase } from '../src/db/seed';

describe('Round Advancement & Elimination Logic', () => {
  let engine: SessionEngine;

  beforeEach(() => {
    initDatabase();
    seedDatabase();
    engine = SessionEngine.createSession('comp-techquiz-2026', 'round-1-screening');
  });

  it('ranks teams by score descending and breaks ties by cumulative response time', () => {
    const t1 = engine.registerOrReconnectTeam('Team Fast');
    const t2 = engine.registerOrReconnectTeam('Team Slow');

    // Both get 10 points, but Team Fast has lower total time
    db.prepare('UPDATE teams SET score = 10, total_time_ms = 1200 WHERE id = ?').run(t1.team.id);
    db.prepare('UPDATE teams SET score = 10, total_time_ms = 4500 WHERE id = ?').run(t2.team.id);

    const leaderboard = engine.getLeaderboard();
    expect(leaderboard[0].teamId).toBe(t1.team.id);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].teamId).toBe(t2.team.id);
    expect(leaderboard[1].rank).toBe(2);
  });

  it('advances top N teams and marks non-advancing teams as eliminated', () => {
    const t1 = engine.registerOrReconnectTeam('Team Alpha');
    const t2 = engine.registerOrReconnectTeam('Team Beta');
    const t3 = engine.registerOrReconnectTeam('Team Gamma');

    db.prepare('UPDATE teams SET score = 30 WHERE id = ?').run(t1.team.id);
    db.prepare('UPDATE teams SET score = 20 WHERE id = ?').run(t2.team.id);
    db.prepare('UPDATE teams SET score = 10 WHERE id = ?').run(t3.team.id);

    // Advance top 2 teams
    const { advancing, eliminated } = engine.advanceTeams(2);

    expect(advancing.length).toBe(2);
    expect(advancing.map(t => t.id)).toContain(t1.team.id);
    expect(advancing.map(t => t.id)).toContain(t2.team.id);

    expect(eliminated.length).toBe(1);
    expect(eliminated[0].id).toBe(t3.team.id);
    expect(eliminated[0].isEliminated).toBe(true);

    // Check database state
    const t3Db = db.prepare('SELECT is_eliminated FROM teams WHERE id = ?').get(t3.team.id) as any;
    expect(t3Db.is_eliminated).toBe(1);
  });

  it('allows eliminated teams to watch without submitting further answers', () => {
    const t = engine.registerOrReconnectTeam('Team Eliminated');
    db.prepare('UPDATE teams SET is_eliminated = 1 WHERE id = ?').run(t.team.id);

    engine.startQuestion(0);
    const subRes = engine.submitAnswer(t.team.id, 'A');

    expect(subRes.success).toBe(false);
    expect(subRes.message).toMatch(/eliminated/i);
  });
});
