-- Add Version and Publish Status to Images and Verse Texts
-- This migration adds version tracking and publishing status columns 
-- to both the images and verse_texts tables for content management
-- ============================================================================
-- ============================================================================
-- ADD COLUMNS TO IMAGES TABLE
-- ============================================================================
-- Add version column to images table
ALTER TABLE images
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;


-- Add publish_status column to images table
ALTER TABLE images
ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;


-- ============================================================================
-- ADD COLUMNS TO VERSE_TEXTS TABLE
-- ============================================================================
-- Add version column to verse_texts table
ALTER TABLE verse_texts
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;


-- Add publish_status column to verse_texts table
ALTER TABLE verse_texts
ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;


-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Indexes for images table
CREATE INDEX idx_images_version ON images (version);


CREATE INDEX idx_images_publish_status ON images (publish_status);


-- Indexes for verse_texts table
CREATE INDEX idx_verse_texts_version ON verse_texts (version);


CREATE INDEX idx_verse_texts_publish_status ON verse_texts (publish_status);


-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================
-- Add comments for new columns
comment ON COLUMN images.version IS 'Version number for tracking image iterations (starts at 1)';


comment ON COLUMN images.publish_status IS 'Publishing status: pending, published, or archived';


comment ON COLUMN verse_texts.version IS 'Version number for tracking text iterations (starts at 1)';


comment ON COLUMN verse_texts.publish_status IS 'Publishing status: pending, published, or archived';
