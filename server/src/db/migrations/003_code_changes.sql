-- Agent Studio Code: file edits wait in a list until the user accepts or rejects them.
ALTER TABLE sessions ADD COLUMN code_mode BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE code_changes (
  id         BIGSERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id   INT REFERENCES agents(id) ON DELETE SET NULL,
  mode       TEXT,
  file_path  TEXT NOT NULL,
  old_text   TEXT NOT NULL DEFAULT '',
  new_text   TEXT NOT NULL DEFAULT '',
  reason     TEXT NOT NULL DEFAULT '',
  -- Blocking: an agent's own edit, which waits for the answer. Otherwise a suggestion the app applies.
  blocking   BOOLEAN NOT NULL DEFAULT FALSE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX code_changes_session_idx ON code_changes (session_id, id);
