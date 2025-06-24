-- Test migration for improved CI/CD pipeline
-- This will trigger the complete workflow: CI → Deploy → Publish Types
CREATE TABLE workflow_test_v2 (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  test_status TEXT DEFAULT 'pending' CHECK (
    test_status IN ('pending', 'running', 'completed', 'failed')
  ),
  workflow_version TEXT DEFAULT 'v2.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Enable RLS
ALTER TABLE workflow_test_v2 enable ROW level security;


-- Add a simple RLS policy (allow all reads for testing)
CREATE POLICY "Allow public read access to workflow tests" ON workflow_test_v2 FOR
SELECT
  USING (TRUE);


-- Add indexes for performance
CREATE INDEX idx_workflow_test_v2_status ON workflow_test_v2 (test_status);


CREATE INDEX idx_workflow_test_v2_created_at ON workflow_test_v2 (created_at);


-- Insert test data
INSERT INTO
  workflow_test_v2 (name, description)
VALUES
  (
    'CI/CD Pipeline Test',
    'Testing improved branch protection compatible workflow'
  ),
  (
    'NPM Publishing Test',
    'Testing automatic type publishing without branch conflicts'
  ),
  (
    'Notification Test',
    'Testing GitHub issue notification system'
  );


-- Add comment to track this is a test table
comment ON TABLE workflow_test_v2 IS 'Test table for validating improved CI/CD pipeline v2.0';
