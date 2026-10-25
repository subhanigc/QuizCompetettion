export const SOCKET_EVENTS = {
  // Client to Server
  TIME_SYNC_PING: 'time_sync_ping',
  JOIN_SESSION: 'join_session',
  RECONNECT_TEAM: 'reconnect_team',
  SUBMIT_ANSWER: 'submit_answer',
  PRESS_BUZZER: 'press_buzzer',
  ADMIN_ACTION: 'admin_action',
  SUBMIT_JUDGE_SCORE: 'submit_judge_score',

  // Server to Client
  TIME_SYNC_PONG: 'time_sync_pong',
  SESSION_UPDATED: 'session_updated',
  QUESTION_STARTED: 'question_started',
  TIMER_TICK: 'timer_tick',
  TIMER_EXPIRED: 'timer_expired',
  ANSWER_REVEALED: 'answer_revealed',
  LEADERBOARD_UPDATED: 'leaderboard_updated',
  BUZZER_STATE_CHANGED: 'buzzer_state_changed',
  BUZZER_WINNER: 'buzzer_winner',
  SUBMISSION_ACK: 'submission_ack',
  TEAM_LIST_CHANGED: 'team_list_changed',
  ROUND_ADVANCED: 'round_advanced',
  ROUND_COMPLETED: 'round_completed',
  NOTIFICATION: 'notification',
  ERROR: 'socket_error'
} as const;

export const DEFAULT_PORT = 3000;
export const CLOCK_SYNC_INTERVAL_MS = 10000;
export const MAX_CLOCK_DRIFT_TOLERANCE_MS = 1500; // grace period for latency
