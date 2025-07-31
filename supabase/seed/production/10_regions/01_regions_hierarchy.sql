-- Regions Hierarchy Seed Data
-- Generated from Natural Earth data
-- Insert continents
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    'Africa',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'c1c55ffd-5632-4655-a48f-b8a1ca1b2759',
    'North America',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '49604cd6-7c8c-4865-aeda-789f1e2d206a',
    'South America',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'a5339695-5236-40ea-9267-28f8bab027ea',
    'Asia',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'ec0ad816-38ce-4b08-852c-2c9c23920f48',
    'Europe',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '27b9ca4c-76e0-4d1a-b065-947bf7054262',
    'Oceania',
    'continent',
    NULL,
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '770188b9-c563-4bac-ba3f-fc050505c30e',
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
    'a27fb490-c50f-4159-9b7a-a26018f3ebf4',
    'Eastern Africa',
    'world_region',
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'dcd0a097-d513-489a-8a65-fc568b2b8fbf',
    'Middle Africa',
    'world_region',
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '46327128-2192-47ad-97e2-9d2ca2217032',
    'Northern Africa',
    'world_region',
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '47b4e61f-1a26-4582-bf7f-ce2fb3c247d2',
    'Southern Africa',
    'world_region',
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '147acab0-032b-491c-a2da-c454d3ebcb54',
    'Western Africa',
    'world_region',
    '2b50c318-cd67-4d8d-a3b4-c05eb0ffb221',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '7033a72b-f8b6-4a86-af9e-aa91aecfb5e0',
    'Northern America',
    'world_region',
    'c1c55ffd-5632-4655-a48f-b8a1ca1b2759',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'd59cce6e-3559-40a8-a281-2244a3447a42',
    'Caribbean',
    'world_region',
    'c1c55ffd-5632-4655-a48f-b8a1ca1b2759',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'fde1bd47-20b3-4d60-9c29-e7240afde0bf',
    'Central America',
    'world_region',
    'c1c55ffd-5632-4655-a48f-b8a1ca1b2759',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'a86cacc6-189e-4151-b6f0-ecf046dcfe1d',
    'South America',
    'world_region',
    '49604cd6-7c8c-4865-aeda-789f1e2d206a',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '1bf42d75-1339-4994-9611-7bc8c7476cd8',
    'Central Asia',
    'world_region',
    'a5339695-5236-40ea-9267-28f8bab027ea',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '4232c7cf-df40-4e86-bccc-0f3d39be302b',
    'Eastern Asia',
    'world_region',
    'a5339695-5236-40ea-9267-28f8bab027ea',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0abb5de3-18dc-49e3-9d28-40e629951a23',
    'South-Eastern Asia',
    'world_region',
    'a5339695-5236-40ea-9267-28f8bab027ea',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '50413f7a-8658-45f7-bcf5-26f9bd8ef0d5',
    'Southern Asia',
    'world_region',
    'a5339695-5236-40ea-9267-28f8bab027ea',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '3fecbed4-5001-4e84-a0b2-9d30cbd1d1e5',
    'Western Asia',
    'world_region',
    'a5339695-5236-40ea-9267-28f8bab027ea',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '76f7f73b-13c8-4039-9bc8-69bd253d9eb1',
    'Eastern Europe',
    'world_region',
    'ec0ad816-38ce-4b08-852c-2c9c23920f48',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '2d73b764-dc59-4b8e-bf2f-14120f7db7b7',
    'Northern Europe',
    'world_region',
    'ec0ad816-38ce-4b08-852c-2c9c23920f48',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '224fc8ff-3829-45d8-a183-65877ffc7dde',
    'Southern Europe',
    'world_region',
    'ec0ad816-38ce-4b08-852c-2c9c23920f48',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0b026b95-c901-4b33-ab0a-023f76c42c9a',
    'Western Europe',
    'world_region',
    'ec0ad816-38ce-4b08-852c-2c9c23920f48',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '613fdbdb-7c50-4471-b12e-8daeb00ddc88',
    'Australia and New Zealand',
    'world_region',
    '27b9ca4c-76e0-4d1a-b065-947bf7054262',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '0acf70b7-0ba1-4a26-9c01-a32873130597',
    'Melanesia',
    'world_region',
    '27b9ca4c-76e0-4d1a-b065-947bf7054262',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    'd5e68069-a26a-4b58-8fd2-7475a01410d1',
    'Micronesia',
    'world_region',
    '27b9ca4c-76e0-4d1a-b065-947bf7054262',
    NOW()
  );


INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '095db708-8785-42a7-8b30-5198bd496d72',
    'Polynesia',
    'world_region',
    '27b9ca4c-76e0-4d1a-b065-947bf7054262',
    NOW()
  );
