CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'link',
  status TEXT NOT NULL DEFAULT 'draft',
  audience TEXT NOT NULL DEFAULT 'All users',
  trigger TEXT NOT NULL DEFAULT 'Manual link share',
  completion TEXT NOT NULL DEFAULT 'Thanks for the feedback.',
  questions_json TEXT NOT NULL DEFAULT '[]',
  hidden_fields_json TEXT NOT NULL DEFAULT '{}',
  styling_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS respondents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT 'Anonymous',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  survey_id TEXT NOT NULL REFERENCES surveys(id),
  respondent_id TEXT NOT NULL REFERENCES respondents(id),
  status TEXT NOT NULL DEFAULT 'completed',
  score INTEGER,
  answers_json TEXT NOT NULL DEFAULT '{}',
  hidden_fields_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'api',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  integration TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared',
  payload_json TEXT NOT NULL DEFAULT '{}',
  response_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sdk_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  event_type TEXT NOT NULL,
  environment_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default-workspace',
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS surveys_workspace_id_idx ON surveys (workspace_id);
CREATE INDEX IF NOT EXISTS accounts_workspace_id_idx ON accounts (workspace_id);
CREATE INDEX IF NOT EXISTS respondents_workspace_id_idx ON respondents (workspace_id);
CREATE INDEX IF NOT EXISTS responses_workspace_id_idx ON responses (workspace_id);
CREATE INDEX IF NOT EXISTS responses_survey_id_idx ON responses (survey_id);
CREATE INDEX IF NOT EXISTS integration_events_workspace_id_idx ON integration_events (workspace_id);
CREATE INDEX IF NOT EXISTS sdk_events_workspace_id_idx ON sdk_events (workspace_id);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_id_idx ON audit_logs (workspace_id);
