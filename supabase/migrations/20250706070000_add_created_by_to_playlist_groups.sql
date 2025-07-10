-- Add created_by column to tables
ALTER TABLE playlist_groups
ADD COLUMN created_by UUID REFERENCES users (id);
