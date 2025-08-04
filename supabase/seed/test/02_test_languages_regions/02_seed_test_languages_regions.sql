-- Sample seed data for Language and Region models
-- This provides example data to test the schema and relationships
-- ============================================================================
-- ============================================================================
-- SAMPLE REGIONS (Hierarchical)
-- ============================================================================
-- Continents
INSERT INTO
  regions (id, name, level, boundary)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Asia',
    'continent',
    NULL
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    'Africa',
    'continent',
    NULL
  ),
  (
    '11111111-1111-1111-1111-111111111113',
    'North America',
    'continent',
    NULL
  );


-- Countries (under continents)
INSERT INTO
  regions (id, parent_id, name, level, boundary)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Nepal',
    'country',
    NULL
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111112',
    'Nigeria',
    'country',
    NULL
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111113',
    'United States',
    'country',
    NULL
  );


-- States/Provinces (under countries)
INSERT INTO
  regions (id, parent_id, name, level, boundary)
VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222221',
    'Gandaki Province',
    'province',
    NULL
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    'Rivers State',
    'state',
    NULL
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222223',
    'Hawaii',
    'state',
    NULL
  );


-- Districts/Cities (under states/provinces)
INSERT INTO
  regions (id, parent_id, name, level, boundary)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333331',
    'Kaski District',
    'district',
    NULL
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333332',
    'Port Harcourt',
    'town',
    NULL
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-3333-3333-333333333333',
    'Kona',
    'town',
    NULL
  );


-- Towns/Villages (under districts)
INSERT INTO
  regions (id, parent_id, name, level, boundary)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    'Pokhara',
    'town',
    NULL
  );


-- ============================================================================
-- SAMPLE LANGUAGE ENTITIES (Hierarchical)
-- ============================================================================
-- Language Families
INSERT INTO
  language_entities (id, name, level)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Sino-Tibetan',
    'family'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    'Niger-Congo',
    'family'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
    'Austronesian',
    'family'
  );


-- Languages (under families)
INSERT INTO
  language_entities (id, parent_id, name, level)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Nepali',
    'language'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    'Igbo',
    'language'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
    'Hawaiian',
    'language'
  );


-- Dialects (under languages)
INSERT INTO
  language_entities (id, parent_id, name, level)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccca1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'Kathmandu Nepali',
    'dialect'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccca2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'Pokhara Nepali',
    'dialect'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccb1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Central Igbo',
    'dialect'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccb2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Northern Igbo',
    'dialect'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'Big Island Hawaiian',
    'dialect'
  );


-- Mother Tongues (under dialects)
INSERT INTO
  language_entities (id, parent_id, name, level)
VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd01',
    'cccccccc-cccc-cccc-cccc-cccccccccca2',
    'Pokhara Valley Nepali',
    'mother_tongue'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd02',
    'cccccccc-cccc-cccc-cccc-ccccccccccb1',
    'Onitsha Igbo',
    'mother_tongue'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd03',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'Kona Hawaiian',
    'mother_tongue'
  );


-- ============================================================================
-- LANGUAGE-REGION RELATIONSHIPS
-- ============================================================================
INSERT INTO
  language_entities_regions (language_entity_id, region_id, dominance_level)
VALUES
  -- Nepali in Nepal regions
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    '22222222-2222-2222-2222-222222222221',
    0.9
  ), -- Nepal
  (
    'cccccccc-cccc-cccc-cccc-cccccccccca2',
    '44444444-4444-4444-4444-444444444441',
    0.8
  ), -- Pokhara dialect in Kaski
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd01',
    '55555555-5555-5555-5555-555555555551',
    0.95
  ), -- Pokhara Valley in Pokhara
  -- Igbo in Nigeria regions  
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    0.7
  ), -- Nigeria
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccb1',
    '33333333-3333-3333-3333-333333333332',
    0.6
  ), -- Central Igbo in Rivers State
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd02',
    '44444444-4444-4444-4444-444444444442',
    0.4
  ), -- Onitsha Igbo in Port Harcourt
  -- Hawaiian in Hawaii regions
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    '33333333-3333-3333-3333-333333333333',
    0.3
  ), -- Hawaiian in Hawaii
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '44444444-4444-4444-4444-444444444443',
    0.2
  ), -- Big Island Hawaiian in Kona
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd03',
    '44444444-4444-4444-4444-444444444443',
    0.15
  );


-- Kona Hawaiian in Kona
-- ============================================================================
-- ALIASES
-- ============================================================================
-- Language aliases
INSERT INTO
  language_aliases (language_entity_id, alias_name)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba', 'Nepali'),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'Gorkhali'
  ),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Igbo'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ibo'),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'Hawaiian'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'ʻŌlelo Hawaiʻi'
  );


-- Region aliases
INSERT INTO
  region_aliases (region_id, alias_name)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    'Federal Democratic Republic of Nepal'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Federal Republic of Nigeria'
  ),
  ('44444444-4444-4444-4444-444444444441', 'Kaski'),
  (
    '55555555-5555-5555-5555-555555555551',
    'Pokhara Metropolitan City'
  );


-- ============================================================================
-- SOURCES (Using existing users from the user seed)
-- ============================================================================
-- Language entity sources
INSERT INTO
  language_entity_sources (
    language_entity_id,
    source,
    version,
    is_external,
    external_id
  )
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Ethnologue',
    '26th edition',
    TRUE,
    'ETH-sino-tibetan'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'ISO 639-3',
    '2023',
    TRUE,
    'nep'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'ISO 639-3',
    '2023',
    TRUE,
    'ibo'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'ISO 639-3',
    '2023',
    TRUE,
    'haw'
  );


-- Region sources
INSERT INTO
  region_sources (
    region_id,
    source,
    version,
    is_external,
    external_id
  )
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    'ISO 3166-1',
    '2023',
    TRUE,
    'NP'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'ISO 3166-1',
    '2023',
    TRUE,
    'NG'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'ISO 3166-1',
    '2023',
    TRUE,
    'US'
  );


-- ============================================================================
-- PROPERTIES (Key-Value data)
-- ============================================================================
-- Language properties
INSERT INTO
  language_properties (language_entity_id, key, value)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'iso_639_1',
    'ne'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'iso_639_2',
    'nep'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'iso_639_3',
    'nep'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'script',
    'Devanagari'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    'speakers',
    '16000000'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'iso_639_1',
    'ig'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'iso_639_2',
    'ibo'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'iso_639_3',
    'ibo'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'script',
    'Latin'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'speakers',
    '24000000'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'iso_639_1',
    'haw'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'iso_639_2',
    'haw'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'iso_639_3',
    'haw'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'script',
    'Latin'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
    'speakers',
    '2000'
  );


-- Region properties
INSERT INTO
  region_properties (region_id, key, value)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    'iso_3166_1_alpha_2',
    'NP'
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    'iso_3166_1_alpha_3',
    'NPL'
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    'iso_3166_1_numeric',
    '524'
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    'capital',
    'Kathmandu'
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    'population',
    '29192480'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'iso_3166_1_alpha_2',
    'NG'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'iso_3166_1_alpha_3',
    'NGA'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'iso_3166_1_numeric',
    '566'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'capital',
    'Abuja'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'population',
    '218541000'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'iso_3166_1_alpha_2',
    'US'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'iso_3166_1_alpha_3',
    'USA'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'iso_3166_1_numeric',
    '840'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'capital',
    'Washington, D.C.'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    'population',
    '331900000'
  );


-- ============================================================================
-- VERIFICATION QUERIES (run these to test the schema)
-- ============================================================================
/*
-- Test hierarchical path functions
SELECT 
le.name,
le.level,
get_language_entity_path(le.id) as full_path
FROM language_entities le
WHERE le.deleted_at IS NULL
ORDER BY le.level, le.name;

-- Test region hierarchy
SELECT 
r.name,
r.level,
get_region_path(r.id) as full_path
FROM regions r
WHERE r.deleted_at IS NULL
ORDER BY r.level, r.name;

-- Test language-region relationships with dominance
SELECT 
le.name as language,
r.name as region,
ler.dominance_level,
get_language_entity_path(le.id) as language_path,
get_region_path(r.id) as region_path
FROM language_entities_regions ler
JOIN language_entities le ON ler.language_entity_id = le.id
JOIN regions r ON ler.region_id = r.id
WHERE ler.deleted_at IS NULL
ORDER BY ler.dominance_level DESC;

-- Test aliases
SELECT 
le.name as primary_name,
la.alias_name,
le.level
FROM language_entities le
JOIN language_aliases la ON le.id = la.language_entity_id
WHERE le.deleted_at IS NULL AND la.deleted_at IS NULL
ORDER BY le.name;

-- Test properties
SELECT 
le.name as language,
lp.key,
lp.value
FROM language_entities le
JOIN language_properties lp ON le.id = lp.language_entity_id
WHERE le.deleted_at IS NULL AND lp.deleted_at IS NULL
ORDER BY le.name, lp.key;
*/
