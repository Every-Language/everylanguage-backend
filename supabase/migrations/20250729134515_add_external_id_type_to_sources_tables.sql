-- Add external_id_type field to language_entity_sources table
ALTER TABLE language_entity_sources
ADD COLUMN external_id_type TEXT;


-- Add external_id_type field to region_sources table
ALTER TABLE region_sources
ADD COLUMN external_id_type TEXT;
