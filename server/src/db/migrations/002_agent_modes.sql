-- Each agent now has its own mode, set by the user. Specialists start as consultants because
-- that mode never changes files; assistants are always in assistant mode.
ALTER TABLE agents ADD COLUMN mode TEXT NOT NULL DEFAULT 'consultant'
  CHECK (mode IN ('developer', 'tester', 'observer', 'consultant', 'assistant'));
UPDATE agents SET mode = 'assistant' WHERE kind = 'T';

-- The control room is a session whose agents and roles come from those modes.
ALTER TABLE sessions DROP CONSTRAINT sessions_type_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_type_check
  CHECK (type IN ('room', 'develop', 'test', 'observe', 'consult', 'assist'));
