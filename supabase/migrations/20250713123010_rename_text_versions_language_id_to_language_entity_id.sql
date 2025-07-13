-- Rename language_id to language_entity_id in text_versions table

-- First, drop the existing foreign key constraint
ALTER TABLE public.text_versions 
DROP CONSTRAINT IF EXISTS text_versions_language_id_fkey;

-- Rename the column
ALTER TABLE public.text_versions 
RENAME COLUMN language_id TO language_entity_id;

-- Add the foreign key constraint back with the new column name
ALTER TABLE public.text_versions 
ADD CONSTRAINT text_versions_language_entity_id_fkey 
FOREIGN KEY (language_entity_id) REFERENCES public.language_entities(id);
