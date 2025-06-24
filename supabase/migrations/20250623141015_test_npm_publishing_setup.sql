-- Test migration to verify NPM package publishing workflow
-- This table will be used to test the complete CI/CD pipeline

CREATE TABLE npm_test_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE npm_test_projects ENABLE ROW LEVEL SECURITY;

-- Add a simple RLS policy (for now, allow all reads)
CREATE POLICY "Allow public read access to test projects"
    ON npm_test_projects FOR SELECT
    USING (true);

-- Add indexes for performance
CREATE INDEX idx_npm_test_projects_status ON npm_test_projects(status);
CREATE INDEX idx_npm_test_projects_created_at ON npm_test_projects(created_at);

-- Insert some test data
INSERT INTO npm_test_projects (name, description) VALUES 
    ('Test Project 1', 'First test project for NPM workflow'),
    ('Test Project 2', 'Second test project for NPM workflow');

-- Add comment to track this is a test table
COMMENT ON TABLE npm_test_projects IS 'Test table for validating NPM types publishing workflow';
