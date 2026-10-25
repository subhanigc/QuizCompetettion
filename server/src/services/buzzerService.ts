import { BuzzerState } from '../../../shared/types';

export class BuzzerService {
  private isOpen: boolean = false;
  private winnerTeamId: string | null = null;
  private winnerTeamName: string | null = null;
  private lockedAt: number | null = null;
  private buzzQueue: { teamId: string; teamName: string; buzzTime: number }[] = [];

  public open(): BuzzerState {
    this.isOpen = true;
    this.winnerTeamId = null;
    this.winnerTeamName = null;
    this.lockedAt = null;
    this.buzzQueue = [];
    return this.getState();
  }

  public lock(): BuzzerState {
    this.isOpen = false;
    return this.getState();
  }

  public reopen(): BuzzerState {
    this.isOpen = true;
    this.winnerTeamId = null;
    this.winnerTeamName = null;
    this.lockedAt = null;
    // Retain previous queue for inspection, but allow new winner buzz
    return this.getState();
  }

  public reset(): BuzzerState {
    this.isOpen = false;
    this.winnerTeamId = null;
    this.winnerTeamName = null;
    this.lockedAt = null;
    this.buzzQueue = [];
    return this.getState();
  }

  /**
   * Thread-safe atomic first-buzz resolution on Node.js single-threaded event loop.
   */
  public pressBuzzer(teamId: string, teamName: string): {
    accepted: boolean;
    isWinner: boolean;
    buzzTime: number;
    state: BuzzerState;
  } {
    const now = Date.now();

    if (!this.isOpen) {
      return {
        accepted: false,
        isWinner: false,
        buzzTime: now,
        state: this.getState()
      };
    }

    // Check if team already buzzed in current cycle
    const alreadyBuzzed = this.buzzQueue.some(b => b.teamId === teamId);
    if (alreadyBuzzed) {
      return {
        accepted: false,
        isWinner: this.winnerTeamId === teamId,
        buzzTime: now,
        state: this.getState()
      };
    }

    if (this.winnerTeamId === null) {
      // First valid buzz locks the buzzer
      this.winnerTeamId = teamId;
      this.winnerTeamName = teamName;
      this.lockedAt = now;
      this.isOpen = false; // Immediately lock out subsequent teams
      this.buzzQueue.push({ teamId, teamName, buzzTime: now });

      return {
        accepted: true,
        isWinner: true,
        buzzTime: now,
        state: this.getState()
      };
    } else {
      // Runner-up buzz
      this.buzzQueue.push({ teamId, teamName, buzzTime: now });
      return {
        accepted: true,
        isWinner: false,
        buzzTime: now,
        state: this.getState()
      };
    }
  }

  public getState(): BuzzerState {
    return {
      isOpen: this.isOpen,
      winnerTeamId: this.winnerTeamId,
      winnerTeamName: this.winnerTeamName,
      lockedAt: this.lockedAt,
      buzzQueue: [...this.buzzQueue]
    };
  }
}
