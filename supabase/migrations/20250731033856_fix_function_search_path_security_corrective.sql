-- Fix Function Search Path Security Issue - Corrective Migration
-- The previous migration appeared to apply but didn't work. This migration uses
-- explicit DO blocks to ensure each function gets the search_path configuration.
-- ============================================================================
-- ============================================================================
-- CORRECTIVE APPROACH: Update functions individually with error handling
-- ============================================================================
-- Fix get_language_entity_path function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_language_entity_path(entity_id UUID) 
    RETURNS TEXT
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
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
    $func$;
    
    RAISE NOTICE 'Fixed get_language_entity_path function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_language_entity_path: %', SQLERRM;
END $$;


-- Fix get_region_path function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_region_path(region_id UUID) 
    RETURNS TEXT
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
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
    $func$;
    
    RAISE NOTICE 'Fixed get_region_path function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_region_path: %', SQLERRM;
END $$;


-- Fix update_updated_at_column function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION update_updated_at_column() 
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$;
    
    RAISE NOTICE 'Fixed update_updated_at_column function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing update_updated_at_column: %', SQLERRM;
END $$;


-- Fix trigger_set_timestamp function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION trigger_set_timestamp() 
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$;
    
    RAISE NOTICE 'Fixed trigger_set_timestamp function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing trigger_set_timestamp: %', SQLERRM;
END $$;


-- Fix update_chapter_global_order function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION update_chapter_global_order() 
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    BEGIN
      NEW.global_order = (
        SELECT book_number * 1000 + NEW.chapter_number
        FROM books 
        WHERE id = NEW.book_id
      );
      RETURN NEW;
    END;
    $func$;
    
    RAISE NOTICE 'Fixed update_chapter_global_order function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing update_chapter_global_order: %', SQLERRM;
END $$;


-- Fix update_verse_global_order function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION update_verse_global_order() 
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    BEGIN
      NEW.global_order = (
        SELECT (b.book_number * 1000000) + (c.chapter_number * 1000) + NEW.verse_number
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE c.id = NEW.chapter_id
      );
      RETURN NEW;
    END;
    $func$;
    
    RAISE NOTICE 'Fixed update_verse_global_order function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing update_verse_global_order: %', SQLERRM;
END $$;


-- Fix refresh_all_global_orders function
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION refresh_all_global_orders() 
    RETURNS void
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
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
    $func$;
    
    RAISE NOTICE 'Fixed refresh_all_global_orders function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing refresh_all_global_orders: %', SQLERRM;
END $$;


-- Fix get_verse_global_order function (UUID version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_verse_global_order(verse_uuid UUID) 
    RETURNS BIGINT
    LANGUAGE plpgsql
    STABLE
    SET search_path = public
    AS $func$
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
    $func$;
    
    RAISE NOTICE 'Fixed get_verse_global_order (UUID) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_verse_global_order (UUID): %', SQLERRM;
END $$;


-- Fix get_verse_global_order function (TEXT version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_verse_global_order(verse_text_id TEXT) 
    RETURNS BIGINT
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    DECLARE
      global_order BIGINT;
    BEGIN
      SELECT v.global_order INTO global_order
      FROM verses v
      WHERE v.id = verse_text_id;
      
      RETURN COALESCE(global_order, 0);
    END;
    $func$;
    
    RAISE NOTICE 'Fixed get_verse_global_order (TEXT) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_verse_global_order (TEXT): %', SQLERRM;
END $$;


-- Fix get_chapter_global_order function (UUID version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_chapter_global_order(chapter_uuid UUID) 
    RETURNS BIGINT
    LANGUAGE plpgsql
    STABLE
    SET search_path = public
    AS $func$
    BEGIN
      RETURN (
        SELECT 
          (b.book_number * 1000) + c.chapter_number
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE c.id = chapter_uuid
      );
    END;
    $func$;
    
    RAISE NOTICE 'Fixed get_chapter_global_order (UUID) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_chapter_global_order (UUID): %', SQLERRM;
END $$;


-- Fix get_chapter_global_order function (TEXT version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_chapter_global_order(chapter_text_id TEXT) 
    RETURNS BIGINT
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    DECLARE
      global_order BIGINT;
    BEGIN
      SELECT c.global_order INTO global_order
      FROM chapters c
      WHERE c.id = chapter_text_id;
      
      RETURN COALESCE(global_order, 0);
    END;
    $func$;
    
    RAISE NOTICE 'Fixed get_chapter_global_order (TEXT) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing get_chapter_global_order (TEXT): %', SQLERRM;
END $$;


-- Fix validate_verse_range function (UUID version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION validate_verse_range(start_verse_uuid UUID, end_verse_uuid UUID) 
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    SET search_path = public
    AS $func$
    BEGIN
      RETURN get_verse_global_order(start_verse_uuid) <= get_verse_global_order(end_verse_uuid);
    END;
    $func$;
    
    RAISE NOTICE 'Fixed validate_verse_range (UUID) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing validate_verse_range (UUID): %', SQLERRM;
END $$;


-- Fix validate_verse_range function (TEXT version)
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION validate_verse_range(start_verse_text_id TEXT, end_verse_text_id TEXT) 
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SET search_path = public
    AS $func$
    DECLARE
      start_order BIGINT;
      end_order BIGINT;
    BEGIN
      SELECT global_order INTO start_order FROM verses WHERE id = start_verse_text_id;
      SELECT global_order INTO end_order FROM verses WHERE id = end_verse_text_id;
      
      RETURN start_order <= end_order;
    END;
    $func$;
    
    RAISE NOTICE 'Fixed validate_verse_range (TEXT) function';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing validate_verse_range (TEXT): %', SQLERRM;
END $$;


-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Corrective migration completed. All functions should now have search_path = public configured.';
END $$;
