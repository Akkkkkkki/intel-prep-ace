-- Add async job processing support to searches table
-- This enables fire-and-forget pattern with real-time progress updates

-- Add async processing columns to searches table (one by one for compatibility)
ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  status TEXT DEFAULT 'pending';

ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  progress_step TEXT DEFAULT 'Initializing...';

ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  progress_percentage INTEGER DEFAULT 0;

ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  error_message TEXT;

ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.searches ADD COLUMN IF NOT EXISTS
  completed_at TIMESTAMP WITH TIME ZONE;

-- Add constraints after columns are created (with safe error handling)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'searches_status_check'
  ) THEN
    ALTER TABLE public.searches ADD CONSTRAINT searches_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'searches_progress_check'
  ) THEN
    ALTER TABLE public.searches ADD CONSTRAINT searches_progress_check 
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;
END $$;

-- Add performance index for status queries
CREATE INDEX IF NOT EXISTS idx_searches_status_created 
ON public.searches(status, created_at) 
WHERE status IN ('processing', 'pending');

-- Add index for progress polling queries
CREATE INDEX IF NOT EXISTS idx_searches_user_status 
ON public.searches(user_id, status, created_at) 
WHERE status IN ('processing', 'pending', 'completed');

-- Update RLS policy for progress updates
DROP POLICY IF EXISTS "Users can update their own search progress" ON public.searches;
CREATE POLICY "Users can update their own search progress" ON public.searches
  FOR UPDATE USING (auth.uid() = user_id);

-- Add function to update search progress (for Edge Functions)
CREATE OR REPLACE FUNCTION public.update_search_progress(
  search_uuid UUID,
  new_status TEXT,
  new_step TEXT DEFAULT NULL,
  new_percentage INTEGER DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.searches 
  SET 
    status = new_status,
    progress_step = COALESCE(new_step, progress_step),
    progress_percentage = COALESCE(new_percentage, progress_percentage),
    error_message = error_msg,
    started_at = CASE WHEN new_status = 'processing' AND started_at IS NULL THEN now() ELSE started_at END,
    completed_at = CASE WHEN new_status IN ('completed', 'failed') THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = search_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.update_search_progress TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_search_progress IS 'Updates search progress for async job processing. Used by Edge Functions to provide real-time status updates.';