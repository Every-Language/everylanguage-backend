-- Regions Hierarchy Seed Data
-- Generated from Natural Earth data
-- Insert continents
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    'Africa',
    'continent',
    NULL,
    NOW()
  ),
  (
    'bbcbe8cd-2413-4a27-906d-e3b90858b73b',
    'North America',
    'continent',
    NULL,
    NOW()
  ),
  (
    'a9520987-d738-4e7b-9afa-b8a0368405ef',
    'South America',
    'continent',
    NULL,
    NOW()
  ),
  (
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    'Asia',
    'continent',
    NULL,
    NOW()
  ),
  (
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    'Europe',
    'continent',
    NULL,
    NOW()
  ),
  (
    'db2e069f-9312-4889-9bd7-77765909d56d',
    'Oceania',
    'continent',
    NULL,
    NOW()
  ),
  (
    '5134b73f-9f65-4a42-9dba-358796c9e6c3',
    'Antarctica',
    'continent',
    NULL,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Insert world regions
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '1d353662-53d1-448e-adbc-56486a6d345f',
    'Eastern Africa',
    'world_region',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    NOW()
  ),
  (
    '3876daa9-a7fa-4334-aa1c-1b9bca44da88',
    'Middle Africa',
    'world_region',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    NOW()
  ),
  (
    '51ac18cf-43e6-4973-851d-e2f05f90507a',
    'Northern Africa',
    'world_region',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    NOW()
  ),
  (
    '1ad6ee38-8748-428e-bc35-34a16e8ca19b',
    'Southern Africa',
    'world_region',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    NOW()
  ),
  (
    '8f70eb4b-f545-4d6b-983a-7e62f2b2e88d',
    'Western Africa',
    'world_region',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    NOW()
  ),
  (
    'ec5ba80a-5b3a-4994-ab40-b1215ba87c33',
    'Northern America',
    'world_region',
    'bbcbe8cd-2413-4a27-906d-e3b90858b73b',
    NOW()
  ),
  (
    '9913a1fe-06b9-4f2a-a71e-a4b84fe5b281',
    'Caribbean',
    'world_region',
    'bbcbe8cd-2413-4a27-906d-e3b90858b73b',
    NOW()
  ),
  (
    '8381c6fb-ee36-43bb-87e5-8836a214e23f',
    'Central America',
    'world_region',
    'bbcbe8cd-2413-4a27-906d-e3b90858b73b',
    NOW()
  ),
  (
    '71741f81-88aa-41c9-9775-a89fcd32a494',
    'South America',
    'world_region',
    'a9520987-d738-4e7b-9afa-b8a0368405ef',
    NOW()
  ),
  (
    '6f9d2ac5-b7e2-4c23-a147-9058ccfb327f',
    'Central Asia',
    'world_region',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    NOW()
  ),
  (
    '9ccc0e8f-f422-41d1-9c14-acb227db70fd',
    'Eastern Asia',
    'world_region',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    NOW()
  ),
  (
    'ab4aed2f-d115-4109-8837-7b1ae0435533',
    'South-Eastern Asia',
    'world_region',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    NOW()
  ),
  (
    'c79887d9-6d8d-4e75-960f-3b39c5663c2f',
    'Southern Asia',
    'world_region',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    NOW()
  ),
  (
    'd0966409-822b-4abd-83c9-e821c3b6551a',
    'Western Asia',
    'world_region',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    NOW()
  ),
  (
    '1d7c9c0b-657e-437b-bc2e-d3ac7446b96a',
    'Eastern Europe',
    'world_region',
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    NOW()
  ),
  (
    '1f2fcd16-d8d0-4c24-9d1f-f518132befa4',
    'Northern Europe',
    'world_region',
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    NOW()
  ),
  (
    '09eeca33-3db3-46f8-8ed5-3ccf19de8b5a',
    'Southern Europe',
    'world_region',
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    NOW()
  ),
  (
    '4b7602a1-7c97-4555-9938-d57ac8e40ab8',
    'Western Europe',
    'world_region',
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    NOW()
  ),
  (
    '4a5206d5-84d5-4272-b104-cbbce6154a96',
    'Australia and New Zealand',
    'world_region',
    'db2e069f-9312-4889-9bd7-77765909d56d',
    NOW()
  ),
  (
    '6c82cb74-d0fd-478a-88b9-b62d31f60a6a',
    'Melanesia',
    'world_region',
    'db2e069f-9312-4889-9bd7-77765909d56d',
    NOW()
  ),
  (
    'f9cb4948-023c-457d-ba6b-289d08a6bd04',
    'Micronesia',
    'world_region',
    'db2e069f-9312-4889-9bd7-77765909d56d',
    NOW()
  ),
  (
    'c2d3791c-c167-44be-922d-705cbab91e63',
    'Polynesia',
    'world_region',
    'db2e069f-9312-4889-9bd7-77765909d56d',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Insert aliases for continents and world regions (for fuzzy search)
INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '1a14da7c-7d51-4305-837a-41560b19451a',
    '86d38e1d-3294-4b14-930f-f1d8ce756c13',
    'Africa',
    NOW()
  ),
  (
    '992a0c1c-f683-4e37-bd83-a07a5181dffb',
    'bbcbe8cd-2413-4a27-906d-e3b90858b73b',
    'North America',
    NOW()
  ),
  (
    'aaf57709-720c-46c8-9fbd-2d27bf34db4d',
    'a9520987-d738-4e7b-9afa-b8a0368405ef',
    'South America',
    NOW()
  ),
  (
    '9ee8e2dd-4998-401d-8758-d9e19139f33a',
    '4316cae7-a6bf-4a3a-9d97-4cb309fd79bd',
    'Asia',
    NOW()
  ),
  (
    '1e255cc0-16d5-480e-b2ae-8785904c3d08',
    '2a2b4b9c-c036-47c8-8a4a-0b8a619c1a4d',
    'Europe',
    NOW()
  ),
  (
    '99eea169-0fea-44eb-a004-d88cfc5e7a35',
    'db2e069f-9312-4889-9bd7-77765909d56d',
    'Oceania',
    NOW()
  ),
  (
    '88c3d8cf-b0c2-452f-ac65-b8f9304684ce',
    '5134b73f-9f65-4a42-9dba-358796c9e6c3',
    'Antarctica',
    NOW()
  ),
  (
    'fe45f03e-2e01-4653-9b45-80ba610ffe49',
    '1d353662-53d1-448e-adbc-56486a6d345f',
    'Eastern Africa',
    NOW()
  ),
  (
    'ea08b5b1-c1bc-4baf-bcc7-f528465ae043',
    '3876daa9-a7fa-4334-aa1c-1b9bca44da88',
    'Middle Africa',
    NOW()
  ),
  (
    '7a547929-e3dd-4bf7-b144-24b980da3100',
    '51ac18cf-43e6-4973-851d-e2f05f90507a',
    'Northern Africa',
    NOW()
  ),
  (
    '353818da-04c3-45ed-a30a-da053cdb6cd0',
    '1ad6ee38-8748-428e-bc35-34a16e8ca19b',
    'Southern Africa',
    NOW()
  ),
  (
    '12a276ab-b468-4430-8416-c851eccbc22d',
    '8f70eb4b-f545-4d6b-983a-7e62f2b2e88d',
    'Western Africa',
    NOW()
  ),
  (
    '60bf044a-03d1-49f1-801e-19a7f7866cee',
    'ec5ba80a-5b3a-4994-ab40-b1215ba87c33',
    'Northern America',
    NOW()
  ),
  (
    'c9b945ad-c399-4d26-a69f-5369d9bd6464',
    '9913a1fe-06b9-4f2a-a71e-a4b84fe5b281',
    'Caribbean',
    NOW()
  ),
  (
    '90a76be7-9e39-4bb5-a61f-8382f6e0e384',
    '8381c6fb-ee36-43bb-87e5-8836a214e23f',
    'Central America',
    NOW()
  ),
  (
    '5eed81c3-127e-4179-8a29-2e619b8d3b98',
    '71741f81-88aa-41c9-9775-a89fcd32a494',
    'South America',
    NOW()
  ),
  (
    '8145aae6-b770-4482-a755-9ecb8a953af0',
    '6f9d2ac5-b7e2-4c23-a147-9058ccfb327f',
    'Central Asia',
    NOW()
  ),
  (
    'a300ce6a-0b4d-4f70-99ff-db688f5984e0',
    '9ccc0e8f-f422-41d1-9c14-acb227db70fd',
    'Eastern Asia',
    NOW()
  ),
  (
    '1a52b278-d13b-4c72-968e-3ba7cbced67c',
    'ab4aed2f-d115-4109-8837-7b1ae0435533',
    'South-Eastern Asia',
    NOW()
  ),
  (
    'cb3ddba1-f9eb-4317-a2cd-0a42c539a6c1',
    'c79887d9-6d8d-4e75-960f-3b39c5663c2f',
    'Southern Asia',
    NOW()
  ),
  (
    'f61ce1fb-6acb-4bb1-b6e9-87570d1a0b5e',
    'd0966409-822b-4abd-83c9-e821c3b6551a',
    'Western Asia',
    NOW()
  ),
  (
    '34e100db-9eb3-4a6b-b8eb-32ea947ff554',
    '1d7c9c0b-657e-437b-bc2e-d3ac7446b96a',
    'Eastern Europe',
    NOW()
  ),
  (
    'a3c003d5-de87-43d6-b56f-8697e46b2236',
    '1f2fcd16-d8d0-4c24-9d1f-f518132befa4',
    'Northern Europe',
    NOW()
  ),
  (
    'd7076804-24f7-4ad5-910e-9fa99047360e',
    '09eeca33-3db3-46f8-8ed5-3ccf19de8b5a',
    'Southern Europe',
    NOW()
  ),
  (
    'c3f472cf-4380-4e2b-8681-9a28a0f9deab',
    '4b7602a1-7c97-4555-9938-d57ac8e40ab8',
    'Western Europe',
    NOW()
  ),
  (
    'b394487d-250e-4fd0-b5b3-84bd9131affa',
    '4a5206d5-84d5-4272-b104-cbbce6154a96',
    'Australia and New Zealand',
    NOW()
  ),
  (
    '5f15650a-b367-4afd-b2eb-82b648552a91',
    '6c82cb74-d0fd-478a-88b9-b62d31f60a6a',
    'Melanesia',
    NOW()
  ),
  (
    '0dd3ffb1-60fe-4a41-917d-9fd5a807bd53',
    'f9cb4948-023c-457d-ba6b-289d08a6bd04',
    'Micronesia',
    NOW()
  ),
  (
    '524fdc5e-26b1-4fd0-adb6-0dbf869542eb',
    'c2d3791c-c167-44be-922d-705cbab91e63',
    'Polynesia',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
