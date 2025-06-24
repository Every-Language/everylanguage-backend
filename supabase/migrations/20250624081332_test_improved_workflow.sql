-- Test migration for improved CI/CD workflow
-- This table tests the complete pipeline: CI → Deploy → Publish Types
CREATE TABLE workflow_test_results (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  test_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'success', 'failed')
  ),
  results JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Enable RLS
ALTER TABLE workflow_test_results enable ROW level security;


-- Add a simple RLS policy (allow all for now, this is just a test table)
CREATE POLICY "Allow all access to workflow test results" ON workflow_test_results FOR ALL USING (TRUE);


-- Add indexes for performance
CREATE INDEX idx_workflow_test_results_status ON workflow_test_results (status);


CREATE INDEX idx_workflow_test_results_executed_at ON workflow_test_results (executed_at);


-- Insert a test record to verify the migration works
INSERT INTO
  workflow_test_results (test_name, status, results)
VALUES
  (
    'improved_ci_cd_workflow',
    'success',
    '{"message": "Testing improved workflow", "timestamp": "2025-06-24"}'
  );


-- Add comment to track this is a test table
comment ON TABLE workflow_test_results IS 'Test table for validating improved CI/CD workflow with branch protection compatibility';
