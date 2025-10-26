-- Migration: Add user_question_flags table for favoriting and flagging questions
-- Epic 1.3: Favorite & Flag Questions

-- Create user_question_flags table
CREATE TABLE IF NOT EXISTS user_question_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('favorite', 'needs_work', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, question_id)  -- Only one flag per user per question
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_question_flags_user_id ON user_question_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_flags_question_id ON user_question_flags(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_flags_flag_type ON user_question_flags(flag_type);

-- Enable Row Level Security
ALTER TABLE user_question_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own flags
CREATE POLICY "Users can view their own question flags"
  ON user_question_flags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question flags"
  ON user_question_flags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question flags"
  ON user_question_flags
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question flags"
  ON user_question_flags
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_question_flags_updated_at
  BEFORE UPDATE ON user_question_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

