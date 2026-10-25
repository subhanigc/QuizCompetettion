-- TechQuiz Arena Relational SQLite Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  allowed_question_types TEXT NOT NULL, -- JSON array
  default_time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  points_per_correct REAL NOT NULL DEFAULT 1.0,
  negative_marking REAL NOT NULL DEFAULT 0.0,
  bonus_points REAL NOT NULL DEFAULT 0.0,
  teams_advancing INTEGER NOT NULL DEFAULT 8,
  auto_advance INTEGER NOT NULL DEFAULT 1,
  show_leaderboard_between_questions INTEGER NOT NULL DEFAULT 1,
  grading_mode TEXT NOT NULL DEFAULT 'auto',
  shuffle_questions INTEGER NOT NULL DEFAULT 0,
  shuffle_options INTEGER NOT NULL DEFAULT 0,
  allow_pass_to_next_team INTEGER NOT NULL DEFAULT 0,
  pass_point_ratio REAL NOT NULL DEFAULT 0.5,
  rapid_fire_duration_seconds INTEGER DEFAULT 60,
  question_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  points REAL NOT NULL DEFAULT 1.0,
  negative_points REAL NOT NULL DEFAULT 0.0,
  bonus_points REAL NOT NULL DEFAULT 0.0,
  explanation TEXT,
  code_snippet TEXT,
  code_language TEXT,
  image_url TEXT,
  options_json TEXT, -- JSON array of { id, text }
  correct_answer_json TEXT, -- JSON string or array
  short_answer_accepted_json TEXT, -- JSON array of acceptable strings
  short_answer_regex TEXT,
  short_answer_case_sensitive INTEGER NOT NULL DEFAULT 0,
  rubric_criteria_json TEXT, -- JSON array of RubricCriterion
  staged_stages_json TEXT, -- JSON array of StagedScenarioStage
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  join_code TEXT UNIQUE NOT NULL,
  competition_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  current_question_id TEXT,
  current_stage_index INTEGER NOT NULL DEFAULT 0,
  timer_started_at INTEGER,
  timer_duration_seconds INTEGER NOT NULL DEFAULT 30,
  timer_remaining_ms INTEGER NOT NULL DEFAULT 30000,
  timer_is_running INTEGER NOT NULL DEFAULT 0,
  is_buzzer_open INTEGER NOT NULL DEFAULT 0,
  buzzer_winner_team_id TEXT,
  buzzer_winner_team_name TEXT,
  buzzer_locked_at INTEGER,
  allow_reanswer INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  bonus_score REAL NOT NULL DEFAULT 0.0,
  penalty_score REAL NOT NULL DEFAULT 0.0,
  total_time_ms REAL NOT NULL DEFAULT 0.0,
  is_eliminated INTEGER NOT NULL DEFAULT 0,
  is_connected INTEGER NOT NULL DEFAULT 1,
  joined_at INTEGER NOT NULL,
  token TEXT NOT NULL,
  UNIQUE(session_id, name),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  stage_id TEXT,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  response_time_ms REAL NOT NULL,
  is_correct INTEGER,
  points_awarded REAL NOT NULL DEFAULT 0.0,
  judge_score REAL,
  judge_comments TEXT,
  is_late INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS judge_scores (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_identifier TEXT NOT NULL,
  score REAL NOT NULL,
  criteria_scores_json TEXT,
  comments TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buzzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  buzz_time INTEGER NOT NULL,
  is_winner INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  previous_score REAL NOT NULL,
  new_score REAL NOT NULL,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rounds_comp ON rounds(competition_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_teams_session ON teams(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lookup ON submissions(session_id, question_id, team_id);
CREATE INDEX IF NOT EXISTS idx_buzzes_lookup ON buzzes(session_id, question_id);
