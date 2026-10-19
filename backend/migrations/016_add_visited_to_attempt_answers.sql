-- Migration: 016_add_visited_to_attempt_answers.sql
-- Description: Add visited column to attempt_answers to track question visit status

ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS visited BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_q ON attempt_answers(attempt_id, question_id);
