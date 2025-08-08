-- Drop the PowerSync view since we're denormalizing the data instead
DROP VIEW if EXISTS media_files_verses_with_audio_version;


-- Add denormalized audio_version_id column to media_files_verses
ALTER TABLE media_files_verses
ADD COLUMN denormalized_audio_version_id UUID;


-- Add foreign key constraint for referential integrity
ALTER TABLE media_files_verses
ADD CONSTRAINT media_files_verses_denormalized_audio_version_id_fkey FOREIGN key (denormalized_audio_version_id) REFERENCES audio_versions (id);


-- Create index on the new denormalized column for PowerSync performance
CREATE INDEX idx_media_files_verses_denormalized_audio_version_id ON media_files_verses (denormalized_audio_version_id)
WHERE
  denormalized_audio_version_id IS NOT NULL;


-- Function to update denormalized_audio_version_id in media_files_verses
CREATE OR REPLACE FUNCTION update_media_files_verses_audio_version () returns trigger AS $$
BEGIN
    -- Handle INSERT/UPDATE on media_files
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update all media_files_verses records for this media_file
        UPDATE media_files_verses 
        SET denormalized_audio_version_id = NEW.audio_version_id
        WHERE media_file_id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE on media_files
    IF TG_OP = 'DELETE' THEN
        -- Clear the denormalized field for orphaned records
        UPDATE media_files_verses 
        SET denormalized_audio_version_id = NULL
        WHERE media_file_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language plpgsql;


-- Function to set denormalized_audio_version_id when media_files_verses is inserted/updated
CREATE OR REPLACE FUNCTION set_media_files_verses_audio_version () returns trigger AS $$
BEGIN
    -- Get audio_version_id from the associated media_file
    SELECT audio_version_id INTO NEW.denormalized_audio_version_id
    FROM media_files 
    WHERE id = NEW.media_file_id;
    
    RETURN NEW;
END;
$$ language plpgsql;


-- Trigger on media_files table to update existing media_files_verses records
CREATE TRIGGER trg_media_files_update_verses_audio_version
AFTER insert
OR
UPDATE of audio_version_id
OR delete ON media_files FOR each ROW
EXECUTE function update_media_files_verses_audio_version ();


-- Trigger on media_files_verses table to set denormalized field on insert/update
CREATE TRIGGER trg_media_files_verses_set_audio_version before insert
OR
UPDATE of media_file_id ON media_files_verses FOR each ROW
EXECUTE function set_media_files_verses_audio_version ();


-- Backfill existing data
UPDATE media_files_verses
SET
  denormalized_audio_version_id = mf.audio_version_id
FROM
  media_files mf
WHERE
  media_files_verses.media_file_id = mf.id
  AND mf.audio_version_id IS NOT NULL;
