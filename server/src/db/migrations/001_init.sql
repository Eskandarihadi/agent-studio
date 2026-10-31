CREATE TABLE agents (
  id           SERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  kind         CHAR(1) NOT NULL CHECK (kind IN ('S', 'T')),
  description  TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  model        TEXT,
  tools        TEXT NOT NULL DEFAULT 'read' CHECK (tools IN ('none', 'read', 'write')),
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skills (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_skills (
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, skill_id)
);

-- One conversation. type decides the flow: develop, test, observe, consult or assist.
CREATE TABLE sessions (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('develop', 'test', 'observe', 'consult', 'assist')),
  workdir       TEXT NOT NULL,
  lead_agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  member_ids    INT[] NOT NULL DEFAULT '{}',
  style         TEXT NOT NULL DEFAULT 'panel' CHECK (style IN ('panel', 'lead')),
  status        TEXT NOT NULL DEFAULT 'idle',
  pending       JSONB,
  sdk_sessions  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id         BIGSERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author     TEXT NOT NULL CHECK (author IN ('user', 'agent', 'system')),
  agent_id   INT REFERENCES agents(id) ON DELETE SET NULL,
  mode       TEXT,
  kind       TEXT NOT NULL DEFAULT 'text',
  content    TEXT NOT NULL,
  meta       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_session_idx ON messages (session_id, id);
