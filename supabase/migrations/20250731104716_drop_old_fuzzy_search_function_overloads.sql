-- Drop Old Fuzzy Search Function Overloads
-- This migration removes old function signatures to prevent overload conflicts
-- Keeps only the latest improved versions with boolean flags for optional data
-- ============================================================================
-- ============================================================================
-- DROP OLD LANGUAGE SEARCH FUNCTION SIGNATURES
-- ============================================================================
-- Drop the original function signature (FLOAT parameters)
DROP FUNCTION if EXISTS search_language_aliases (TEXT, INTEGER, FLOAT);


-- Drop the type-fixed function signature (DOUBLE PRECISION, no boolean)
DROP FUNCTION if EXISTS search_language_aliases (TEXT, INTEGER, DOUBLE PRECISION);


-- ============================================================================
-- DROP OLD REGION SEARCH FUNCTION SIGNATURES  
-- ============================================================================
-- Drop the original function signature (FLOAT parameters)
DROP FUNCTION if EXISTS search_region_aliases (TEXT, INTEGER, FLOAT);


-- Drop the type-fixed function signature (DOUBLE PRECISION, no boolean)
DROP FUNCTION if EXISTS search_region_aliases (TEXT, INTEGER, DOUBLE PRECISION);


-- ============================================================================
-- RESULT: ONLY IMPROVED FUNCTIONS REMAIN
-- ============================================================================
-- After this migration, only these function signatures will exist:
-- 
-- search_language_aliases(TEXT, INTEGER, DOUBLE PRECISION, BOOLEAN)
-- - Automatic deduplication (one result per language entity)
-- - Optional regions data with include_regions flag
-- 
-- search_region_aliases(TEXT, INTEGER, DOUBLE PRECISION, BOOLEAN) 
-- - Automatic deduplication (one result per region)
-- - Optional languages data with include_languages flag
-- ============================================================================
