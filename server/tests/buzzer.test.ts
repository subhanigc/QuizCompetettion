import { describe, it, expect, beforeEach } from 'vitest';
import { BuzzerService } from '../src/services/buzzerService';

describe('BuzzerService', () => {
  let buzzer: BuzzerService;

  beforeEach(() => {
    buzzer = new BuzzerService();
  });

  it('rejects buzzer presses when buzzer is closed', () => {
    const res = buzzer.pressBuzzer('team1', 'Team One');
    expect(res.accepted).toBe(false);
    expect(res.isWinner).toBe(false);
  });

  it('locks atomically on first valid buzz and rejects subsequent winners', () => {
    buzzer.open();

    const buzz1 = buzzer.pressBuzzer('team1', 'Team One');
    expect(buzz1.accepted).toBe(true);
    expect(buzz1.isWinner).toBe(true);
    expect(buzz1.state.winnerTeamId).toBe('team1');
    expect(buzz1.state.isOpen).toBe(false); // Locked immediately

    // Second buzz from different team
    const buzz2 = buzzer.pressBuzzer('team2', 'Team Two');
    expect(buzz2.accepted).toBe(false);
    expect(buzz2.isWinner).toBe(false);
    expect(buzz2.state.winnerTeamId).toBe('team1');
  });

  it('allows reopening buzzer after a wrong answer', () => {
    buzzer.open();
    buzzer.pressBuzzer('team1', 'Team One');
    expect(buzzer.getState().isOpen).toBe(false);

    // Admin reopens
    buzzer.reopen();
    expect(buzzer.getState().isOpen).toBe(true);
    expect(buzzer.getState().winnerTeamId).toBeNull();

    // Now Team 2 can buzz in
    const buzz2 = buzzer.pressBuzzer('team2', 'Team Two');
    expect(buzz2.isWinner).toBe(true);
    expect(buzz2.state.winnerTeamId).toBe('team2');
  });
});
