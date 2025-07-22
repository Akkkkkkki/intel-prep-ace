-- Consolidate interview questions: Remove enhanced_question_banks and enhance interview_questions
-- This migration consolidates the duplicate question storage into a single enhanced table

-- Step 1: Add enhanced fields to interview_questions table
ALTER TABLE public.interview_questions 
ADD COLUMN search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
ADD COLUMN category TEXT NOT NULL DEFAULT 'general',
ADD COLUMN question_type TEXT NOT NULL DEFAULT 'common',
ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'Medium',
ADD COLUMN rationale TEXT,
ADD COLUMN suggested_answer_approach TEXT,
ADD COLUMN evaluation_criteria TEXT[],
ADD COLUMN follow_up_questions TEXT[],
ADD COLUMN star_story_fit BOOLEAN DEFAULT false,
ADD COLUMN company_context TEXT,
ADD COLUMN usage_count INTEGER DEFAULT 0,
ADD COLUMN confidence_score FLOAT DEFAULT 0.0,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Add constraints for enhanced fields
ALTER TABLE public.interview_questions 
ADD CONSTRAINT interview_questions_category_check 
CHECK (category IN ('general', 'behavioral', 'technical', 'situational', 'company_specific', 'role_specific', 'experience_based', 'cultural_fit'));

ALTER TABLE public.interview_questions 
ADD CONSTRAINT interview_questions_difficulty_check 
CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));

-- Step 2: Migrate data from enhanced_question_banks to interview_questions
-- This is complex because enhanced_question_banks stores arrays of questions by category
-- We'll insert individual questions from each category

-- Create a function to extract and insert questions from enhanced_question_banks
CREATE OR REPLACE FUNCTION migrate_enhanced_questions() RETURNS void AS $$
DECLARE
    bank_record RECORD;
    stage_record RECORD;
    question_data RECORD;
    categories TEXT[] := ARRAY['behavioral_questions', 'technical_questions', 'situational_questions', 
                              'company_specific_questions', 'role_specific_questions', 
                              'experience_based_questions', 'cultural_fit_questions'];
    category_name TEXT;
    category_mapping JSONB := '{
        "behavioral_questions": "behavioral",
        "technical_questions": "technical", 
        "situational_questions": "situational",
        "company_specific_questions": "company_specific",
        "role_specific_questions": "role_specific",
        "experience_based_questions": "experience_based",
        "cultural_fit_questions": "cultural_fit"
    }'::jsonb;
    questions_array JSONB;
    question_obj JSONB;
BEGIN
    -- Loop through each enhanced question bank
    FOR bank_record IN 
        SELECT * FROM public.enhanced_question_banks 
    LOOP
        -- Find the corresponding stage
        FOR stage_record IN 
            SELECT id FROM public.interview_stages 
            WHERE search_id = bank_record.search_id 
            AND name = bank_record.interview_stage
            LIMIT 1
        LOOP
            -- Process each question category
            FOREACH category_name IN ARRAY categories
            LOOP
                -- Get the questions array for this category
                EXECUTE format('SELECT %I FROM public.enhanced_question_banks WHERE id = $1', category_name) 
                INTO questions_array USING bank_record.id;
                
                -- Skip if no questions in this category
                IF questions_array IS NULL OR jsonb_array_length(questions_array) = 0 THEN
                    CONTINUE;
                END IF;
                
                -- Insert each question in the category
                FOR question_obj IN SELECT * FROM jsonb_array_elements(questions_array)
                LOOP
                    INSERT INTO public.interview_questions (
                        stage_id,
                        search_id,
                        question,
                        category,
                        question_type,
                        difficulty,
                        rationale,
                        suggested_answer_approach,
                        evaluation_criteria,
                        follow_up_questions,
                        star_story_fit,
                        company_context,
                        confidence_score
                    ) VALUES (
                        stage_record.id,
                        bank_record.search_id,
                        question_obj->>'question',
                        category_mapping->>category_name,
                        COALESCE(question_obj->>'type', category_mapping->>category_name),
                        COALESCE(question_obj->>'difficulty', 'Medium'),
                        question_obj->>'rationale',
                        question_obj->>'suggested_answer_approach',
                        CASE 
                            WHEN question_obj->'evaluation_criteria' IS NOT NULL 
                            THEN ARRAY(SELECT jsonb_array_elements_text(question_obj->'evaluation_criteria'))
                            ELSE NULL 
                        END,
                        CASE 
                            WHEN question_obj->'follow_up_questions' IS NOT NULL 
                            THEN ARRAY(SELECT jsonb_array_elements_text(question_obj->'follow_up_questions'))
                            ELSE NULL 
                        END,
                        COALESCE((question_obj->>'star_story_fit')::boolean, false),
                        question_obj->>'company_context',
                        COALESCE((question_obj->>'confidence_score')::float, 0.8)
                    );
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_enhanced_questions();

-- Drop the migration function
DROP FUNCTION migrate_enhanced_questions();

-- Step 3: Remove enhanced_question_bank field from searches table
ALTER TABLE public.searches DROP COLUMN enhanced_question_bank;

-- Step 4: Drop the enhanced_question_banks table
DROP TABLE public.enhanced_question_banks;

-- Step 5: Create indexes for performance
CREATE INDEX idx_interview_questions_search_id ON public.interview_questions(search_id);
CREATE INDEX idx_interview_questions_category ON public.interview_questions(category);
CREATE INDEX idx_interview_questions_difficulty ON public.interview_questions(difficulty);

-- Step 6: Update RLS policies
-- Note: The existing interview_questions policies should still work, 
-- but we'll add one for search_id access
CREATE POLICY "Users can view questions for their searches" 
  ON public.interview_questions FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.searches WHERE id = interview_questions.search_id)); 