-- Add created_by column to playlist_groups table
ALTER TABLE playlist_groups
ADD COLUMN created_by UUID REFERENCES users (id);


-- Add comment for documentation
comment ON COLUMN playlist_groups.created_by IS 'User who created this playlist group';


-- Create index for better query performance
CREATE INDEX idx_playlist_groups_created_by ON playlist_groups (created_by);
