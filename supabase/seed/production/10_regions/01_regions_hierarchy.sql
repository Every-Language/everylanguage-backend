-- Regions Hierarchy Seed Data
-- Generated from Natural Earth data
-- Insert continents
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    'Africa',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '6108b536-b8ec-4129-b291-6bb6b0ae5340',
    'North America',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0bb5e7f6-e735-429b-93d3-8f25d3de3f8a',
    'South America',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    'Asia',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    'Europe',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    'Oceania',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0f965532-dfbc-4734-bdf1-1d682e73552b',
    'Antarctica',
    'continent',
    NULL,
    NOW()
  );


-- Insert world regions
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'b663da17-2e4f-4200-81ad-d472fb782211',
    'Eastern Africa',
    'world_region',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '8e2cb39b-461f-4ce3-b899-cdcb8738b766',
    'Middle Africa',
    'world_region',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'ba437f69-f1c8-4a1e-9fae-3ee020e40255',
    'Northern Africa',
    'world_region',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '003c5a88-c08c-4e9d-92d3-4575a34b6e04',
    'Southern Africa',
    'world_region',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'd758b148-64b2-49af-95ca-92cd8007e7f9',
    'Western Africa',
    'world_region',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'b8e1c8be-1319-4776-9d3f-20206a13fd48',
    'Northern America',
    'world_region',
    '6108b536-b8ec-4129-b291-6bb6b0ae5340',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '39ac018b-4bac-4ade-ada9-4812c114df65',
    'Caribbean',
    'world_region',
    '6108b536-b8ec-4129-b291-6bb6b0ae5340',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'e7696761-d436-4caf-95ff-48ca1818421c',
    'Central America',
    'world_region',
    '6108b536-b8ec-4129-b291-6bb6b0ae5340',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'd6635ced-f3d9-4f7e-8bfb-f4ef9c6a08ba',
    'South America',
    'world_region',
    '0bb5e7f6-e735-429b-93d3-8f25d3de3f8a',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'b2ac40c4-8066-40e6-a97b-90316b4836c9',
    'Central Asia',
    'world_region',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '7670f98c-546f-483f-b303-90122ff7e2ea',
    'Eastern Asia',
    'world_region',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '3dc850d8-1390-48a9-b043-7a48fccff172',
    'South-Eastern Asia',
    'world_region',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '5de86d8a-a8fb-45bf-8f95-0dcf4e0148f6',
    'Southern Asia',
    'world_region',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0b1d2019-f2f4-427e-8f7b-92c692be187b',
    'Western Asia',
    'world_region',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '8a5a8a8c-6b06-4593-8d1f-3bb04d757b58',
    'Eastern Europe',
    'world_region',
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '11826553-8367-4db1-a5c8-0cd0eaf22910',
    'Northern Europe',
    'world_region',
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'e5e09c05-2381-4e28-9e06-92fb8d1c5872',
    'Southern Europe',
    'world_region',
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '96e49e40-4e92-402c-947f-22885ba1ecf6',
    'Western Europe',
    'world_region',
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '91cced43-ff31-4ee7-841b-3ffd1733ced8',
    'Australia and New Zealand',
    'world_region',
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'dace5f12-f1e6-442a-a30b-6abd52bdf10b',
    'Melanesia',
    'world_region',
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '013a1791-1cca-4928-ae01-ae9b50baba85',
    'Micronesia',
    'world_region',
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '98de4b29-74c8-436d-9ca9-bb4ad4700bb0',
    'Polynesia',
    'world_region',
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    NOW()
  );


-- Insert aliases for continents and world regions (for fuzzy search)
INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '34017e0b-dfcb-4b82-9138-6b63841cc30a',
    '4f91a123-612f-4db0-8290-bde21ca62fc0',
    'Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'f782a604-de92-4fa8-89f5-5f0007cd80a5',
    '6108b536-b8ec-4129-b291-6bb6b0ae5340',
    'North America',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '3db1ced4-397c-449f-bc58-86c547c9812f',
    '0bb5e7f6-e735-429b-93d3-8f25d3de3f8a',
    'South America',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '7e6d437e-9a01-4011-8dc0-8b27cca609d9',
    'f6c39656-459f-4995-8c06-1789a4fe7cd2',
    'Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '80d35065-cc73-4a50-8d1a-f130480900ee',
    '56fcd862-dff0-47c9-84eb-9b3bd46de092',
    'Europe',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'd392726a-d402-4c07-9689-53a65492adcb',
    '62239dfd-f342-4c3e-add9-4e2ac26b2bfd',
    'Oceania',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'ab6a23ef-fa43-44d7-a783-976d75a9c801',
    '0f965532-dfbc-4734-bdf1-1d682e73552b',
    'Antarctica',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'd87fef67-5fa2-44e4-9635-03793bc2f983',
    'b663da17-2e4f-4200-81ad-d472fb782211',
    'Eastern Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'f0e16ad7-8a5b-484e-a243-473c9c8e1914',
    '8e2cb39b-461f-4ce3-b899-cdcb8738b766',
    'Middle Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'f3e3bc44-479d-43ab-b947-c1251a0e7dd7',
    'ba437f69-f1c8-4a1e-9fae-3ee020e40255',
    'Northern Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '85c5506d-1bca-4bdb-a951-f3b33516a49e',
    '003c5a88-c08c-4e9d-92d3-4575a34b6e04',
    'Southern Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'dda8263a-94d0-4ae4-b330-93ee89756c5f',
    'd758b148-64b2-49af-95ca-92cd8007e7f9',
    'Western Africa',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '0be52fc9-0a74-446e-b2d0-6f284010b5ef',
    'b8e1c8be-1319-4776-9d3f-20206a13fd48',
    'Northern America',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'b4a72835-86bd-4c71-ad05-147ceee6a47b',
    '39ac018b-4bac-4ade-ada9-4812c114df65',
    'Caribbean',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '5d3c3930-ed05-40d3-a5ee-21c50bd50aef',
    'e7696761-d436-4caf-95ff-48ca1818421c',
    'Central America',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'b57b9f40-365b-4167-b2b5-3bd289c7383c',
    'd6635ced-f3d9-4f7e-8bfb-f4ef9c6a08ba',
    'South America',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'bbdb1f6d-a4e2-417a-a93d-229927df5836',
    'b2ac40c4-8066-40e6-a97b-90316b4836c9',
    'Central Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '930e737e-f5ee-46c0-a167-a92af069a022',
    '7670f98c-546f-483f-b303-90122ff7e2ea',
    'Eastern Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'f9fa5ca5-bc41-44d0-a9ad-bd726b3e25b8',
    '3dc850d8-1390-48a9-b043-7a48fccff172',
    'South-Eastern Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'a7bfdefc-1c67-4f87-bd80-6bb0d6dbadab',
    '5de86d8a-a8fb-45bf-8f95-0dcf4e0148f6',
    'Southern Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '32e7f5e5-cb9a-450d-8bf7-7807f61d168b',
    '0b1d2019-f2f4-427e-8f7b-92c692be187b',
    'Western Asia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '2e20648f-49d4-443f-a266-84629427a1a9',
    '8a5a8a8c-6b06-4593-8d1f-3bb04d757b58',
    'Eastern Europe',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'd683391b-9f4f-47ea-861b-dfd92d115d72',
    '11826553-8367-4db1-a5c8-0cd0eaf22910',
    'Northern Europe',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '17b18344-621c-46c2-8872-d04ede9893a2',
    'e5e09c05-2381-4e28-9e06-92fb8d1c5872',
    'Southern Europe',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '401771d8-0d43-4b58-88b4-905d3de74f77',
    '96e49e40-4e92-402c-947f-22885ba1ecf6',
    'Western Europe',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '36c49aaf-b42b-47dd-abeb-b446937f5f0e',
    '91cced43-ff31-4ee7-841b-3ffd1733ced8',
    'Australia and New Zealand',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '6d428fc2-301a-4dff-9c23-882dedaa428a',
    'dace5f12-f1e6-442a-a30b-6abd52bdf10b',
    'Melanesia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    'c60bad1a-55f2-440b-b37d-17d0e2eebe91',
    '013a1791-1cca-4928-ae01-ae9b50baba85',
    'Micronesia',
    NOW()
  );


INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '08ea3477-0fae-46d4-aec5-c3a1840ddc63',
    '98de4b29-74c8-436d-9ca9-bb4ad4700bb0',
    'Polynesia',
    NOW()
  );
