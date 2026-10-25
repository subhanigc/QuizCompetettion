import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionEngine } from '../src/services/sessionEngine';
import { initDatabase } from '../src/db';
import { seedDatabase } from '../src/db/seed';

describe('Session Timer & Drift Control', () => {
  let engine: SessionEngine;

  beforeEach(() => {
    initDatabase();
    seedDatabase();
    engine = SessionEngine.createSession('comp-techquiz-2026', 'round-1-screening');
  });

  afterEach(() => {
    if (engine) {
      engine.stopTimer();
    }
  });

  it('initializes timer with round default duration', () => {
    engine.startQuestion(0);
    const state = engine.getState();
    expect(state.timerIsRunning).toBe(true);
    expect(state.timerDurationSeconds).toBeGreaterThan(0);
    expect(state.timerRemainingMs).toBeGreaterThan(0);
  });

  it('pauses and resumes timer accurately', () => {
    engine.startQuestion(0);
    expect(engine.getState().timerIsRunning).toBe(true);

    engine.pauseTimer();
    expect(engine.getState().timerIsRunning).toBe(false);
    expect(engine.getState().status).toBe('paused');

    engine.resumeTimer();
    expect(engine.getState().timerIsRunning).toBe(true);
    expect(engine.getState().status).toBe('active_question');
  });

  it('strictly rejects late submissions when timer has expired', () => {
    const reg = engine.registerOrReconnectTeam('Test Team Late');
    engine.startQuestion(0);

    // Stop timer and simulate expired state past grace period
    engine.stopTimer();
    (engine as any).timerRemainingMs = 0;
    (engine as any).timerStartedAt = Date.now() - 100000;

    const res = engine.submitAnswer(reg.team.id, 'B');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/expired|rejected/i);
  });
});
