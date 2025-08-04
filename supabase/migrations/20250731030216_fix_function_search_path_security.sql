-- Fix Function Search Path Security Issue
-- This migration addresses the "Function Search Path Mutable" security warnings
-- by explicitly setting search_path = public on all user-defined functions.
-- This prevents search path injection attacks where malicious schemas could
-- hijack table references within functions.
-- ============================================================================
-- ============================================================================
-- LANGUAGE AND REGION UTILITY FUNCTIONS
-- ============================================================================
-- Function to get language entity hierarchy path
CREATE OR REPLACE FUNCTION get_language_entity_path (entity_id UUID) returns TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := entity_id;
  current_name TEXT;
  current_parent UUID;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, current_parent
    FROM language_entities 
    WHERE id = current_id AND deleted_at IS NULL;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := current_parent;
  END LOOP;
  
  RETURN path;
END;
$$ language plpgsql
SET
  search_path = public;


-- Function to get region hierarchy path
CREATE OR REPLACE FUNCTION get_region_path (region_id UUID) returns TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := region_id;
  current_name TEXT;
  current_parent UUID;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, current_parent
    FROM regions 
    WHERE id = current_id AND deleted_at IS NULL;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := current_parent;
  END LOOP;
  
  RETURN path;
END;
$$ language plpgsql
SET
  search_path = public;


-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column () returns trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql
SET
  search_path = public;


-- Trigger function for setting timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp () returns trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql
SET
  search_path = public;


-- Function to update chapter global order
CREATE OR REPLACE FUNCTION update_chapter_global_order () returns trigger AS $$
BEGIN
  NEW.global_order = (
    SELECT book_number * 1000 + NEW.chapter_number
    FROM books 
    WHERE id = NEW.book_id
  );
  RETURN NEW;
END;
$$ language plpgsql
SET
  search_path = public;


-- Function to update verse global order
CREATE OR REPLACE FUNCTION update_verse_global_order () returns trigger AS $$
BEGIN
  NEW.global_order = (
    SELECT (b.book_number * 1000000) + (c.chapter_number * 1000) + NEW.verse_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = NEW.chapter_id
  );
  RETURN NEW;
END;
$$ language plpgsql
SET
  search_path = public;


-- ============================================================================
-- BIBLE CONTENT UTILITY FUNCTIONS (UUID VERSION)
-- ============================================================================
-- Function to get the global order of a verse within its Bible version
-- Uses: (book_number * 1000000) + (chapter_number * 1000) + verse_number
CREATE OR REPLACE FUNCTION get_verse_global_order (verse_uuid UUID) returns BIGINT AS $$
BEGIN
  RETURN (
    SELECT 
      (b.book_number * 1000000) + (c.chapter_number * 1000) + v.verse_number
    FROM verses v
    JOIN chapters c ON v.chapter_id = c.id
    JOIN books b ON c.book_id = b.id
    WHERE v.id = verse_uuid
  );
END;
$$ language plpgsql stable
SET
  search_path = public;


-- Function to get the global order of a chapter within its Bible version
-- Uses: (book_number * 1000) + chapter_number
CREATE OR REPLACE FUNCTION get_chapter_global_order (chapter_uuid UUID) returns BIGINT AS $$
BEGIN
  RETURN (
    SELECT 
      (b.book_number * 1000) + c.chapter_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = chapter_uuid
  );
END;
$$ language plpgsql stable
SET
  search_path = public;


-- Function to validate that verse range is in correct order
CREATE OR REPLACE FUNCTION validate_verse_range (start_verse_uuid UUID, end_verse_uuid UUID) returns BOOLEAN AS $$
BEGIN
  RETURN get_verse_global_order(start_verse_uuid) <= get_verse_global_order(end_verse_uuid);
END;
$$ language plpgsql stable
SET
  search_path = public;


-- ============================================================================
-- BIBLE CONTENT UTILITY FUNCTIONS (TEXT ID VERSION)
-- ============================================================================
-- Function to get verse global order (TEXT version)
CREATE OR REPLACE FUNCTION get_verse_global_order (verse_text_id TEXT) returns BIGINT AS $$
DECLARE
  global_order BIGINT;
BEGIN
  SELECT v.global_order INTO global_order
  FROM verses v
  WHERE v.id = verse_text_id;
  
  RETURN COALESCE(global_order, 0);
END;
$$ language plpgsql
SET
  search_path = public;


-- Function to get chapter global order (TEXT version)
CREATE OR REPLACE FUNCTION get_chapter_global_order (chapter_text_id TEXT) returns BIGINT AS $$
DECLARE
  global_order BIGINT;
BEGIN
  SELECT c.global_order INTO global_order
  FROM chapters c
  WHERE c.id = chapter_text_id;
  
  RETURN COALESCE(global_order, 0);
END;
$$ language plpgsql
SET
  search_path = public;


-- Function to validate verse range (TEXT version)
CREATE OR REPLACE FUNCTION validate_verse_range (start_verse_text_id TEXT, end_verse_text_id TEXT) returns BOOLEAN AS $$
DECLARE
  start_order BIGINT;
  end_order BIGINT;
BEGIN
  SELECT global_order INTO start_order FROM verses WHERE id = start_verse_text_id;
  SELECT global_order INTO end_order FROM verses WHERE id = end_verse_text_id;
  
  RETURN start_order <= end_order;
END;
$$ language plpgsql
SET
  search_path = public;


-- ============================================================================
-- DATA MAINTENANCE FUNCTIONS
-- ============================================================================
-- Function to update all existing records (run after initial data load)
CREATE OR REPLACE FUNCTION refresh_all_global_orders () returns void AS $$
BEGIN
  -- Update chapters
  UPDATE chapters SET global_order = (
    SELECT book_number * 1000 + chapter_number
    FROM books
    WHERE id = book_id
  );
  
  -- Update verses  
  UPDATE verses SET global_order = (
    SELECT (b.book_number * 1000000) + (c.chapter_number * 1000) + verse_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = chapter_id
  );
END;
$$ language plpgsql
SET
  search_path = public;
