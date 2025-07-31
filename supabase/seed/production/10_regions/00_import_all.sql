-- Master Regions Import
-- Generated from Natural Earth v5.1.1 data
-- Run these files in order:

-- WARNING: This will DELETE all existing region data before importing!
-- Make sure you have backups if needed.

-- Clear existing data (in dependency order)
DELETE FROM region_properties WHERE region_id IN (SELECT id FROM regions);
DELETE FROM region_aliases WHERE region_id IN (SELECT id FROM regions);
DELETE FROM region_sources WHERE region_id IN (SELECT id FROM regions);
DELETE FROM language_entities_regions WHERE region_id IN (SELECT id FROM regions);
DELETE FROM regions;

\i supabase/seed/production/10_regions/01_regions_hierarchy.sql
\i supabase/seed/production/10_regions/02_regions_countries.sql
\i supabase/seed/production/10_regions/03_region_sources.sql
\i supabase/seed/production/10_regions/04_region_aliases.sql
\i supabase/seed/production/10_regions/05_region_properties.sql

-- Fix parent relationships by linking countries to their world regions
UPDATE regions 
SET parent_id = wr.id
FROM region_properties rp, regions wr
WHERE regions.id = rp.region_id 
AND regions.level = 'country'
AND rp.key = 'subregion'
AND wr.name = rp.value
AND wr.level = 'world_region';

-- Note: All region names (including primary names) are added to region_aliases 
-- for comprehensive fuzzy search functionality

-- Verify the import
SELECT 
  'regions' as table_name, 
  count(*) as count 
FROM regions
UNION ALL
SELECT 'region_sources', count(*) FROM region_sources  
UNION ALL
SELECT 'region_aliases', count(*) FROM region_aliases
UNION ALL
SELECT 'region_properties', count(*) FROM region_properties;

-- Check hierarchy
SELECT level, count(*) as count 
FROM regions 
GROUP BY level 
ORDER BY 
  CASE level 
    WHEN 'continent' THEN 1 
    WHEN 'world_region' THEN 2 
    WHEN 'country' THEN 3 
    ELSE 4 
  END;

-- Check external ID types distribution
SELECT 
  source,
  external_id_type,
  count(*) as count
FROM region_sources 
GROUP BY source, external_id_type 
ORDER BY source, external_id_type;

-- Check parent relationships (should show most countries linked to world regions)
SELECT 
  'Countries with parents' as check_type,
  count(*) as count
FROM regions 
WHERE level = 'country' AND parent_id IS NOT NULL
UNION ALL
SELECT 
  'Countries without parents',
  count(*)
FROM regions 
WHERE level = 'country' AND parent_id IS NULL;
