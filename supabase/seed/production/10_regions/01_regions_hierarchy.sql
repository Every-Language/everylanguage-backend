-- Regions Hierarchy Seed Data
-- Generated from Natural Earth data
-- Insert continents
INSERT INTO
  regions (id, name, level, parent_id, created_at)
VALUES
  (
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    'Africa',
    'continent',
    NULL,
    NOW()
  ),
  (
    '3eb65d9f-7476-4c8a-8708-d283dbfdbef8',
    'North America',
    'continent',
    NULL,
    NOW()
  ),
  (
    '27c9f1cf-5e56-4956-bda4-518145846aa8',
    'South America',
    'continent',
    NULL,
    NOW()
  ),
  (
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    'Asia',
    'continent',
    NULL,
    NOW()
  ),
  (
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    'Europe',
    'continent',
    NULL,
    NOW()
  ),
  (
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    'Oceania',
    'continent',
    NULL,
    NOW()
  ),
  (
    'aa3eeb58-c3f2-4b70-b1f0-da745139f1d6',
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
    'c8296f1b-3965-46cc-a17a-166d660cbac8',
    'Eastern Africa',
    'world_region',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    NOW()
  ),
  (
    'affccec7-e514-4388-85a7-201fa2726c38',
    'Middle Africa',
    'world_region',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    NOW()
  ),
  (
    '9055a0f6-7529-4259-aa79-37a2f6ce57fa',
    'Northern Africa',
    'world_region',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    NOW()
  ),
  (
    '55e17c46-a55c-4cfd-a93a-061c5f3c454d',
    'Southern Africa',
    'world_region',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    NOW()
  ),
  (
    '6cfc1cca-5946-41e6-832b-4da4a9d50139',
    'Western Africa',
    'world_region',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    NOW()
  ),
  (
    '7acd80f1-667b-40d1-b5c5-bc9d69a5f2fd',
    'Northern America',
    'world_region',
    '3eb65d9f-7476-4c8a-8708-d283dbfdbef8',
    NOW()
  ),
  (
    'f1105e5e-93cf-47cb-9b01-e2a01da9336d',
    'Caribbean',
    'world_region',
    '3eb65d9f-7476-4c8a-8708-d283dbfdbef8',
    NOW()
  ),
  (
    '3501917b-9be6-4ac2-9bad-b9ee1d203236',
    'Central America',
    'world_region',
    '3eb65d9f-7476-4c8a-8708-d283dbfdbef8',
    NOW()
  ),
  (
    '17cc94ab-c2cf-48a6-aee8-be041f3b241f',
    'South America',
    'world_region',
    '27c9f1cf-5e56-4956-bda4-518145846aa8',
    NOW()
  ),
  (
    '7db08212-7620-475c-a134-23f1e522ced6',
    'Central Asia',
    'world_region',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    NOW()
  ),
  (
    'a1a52735-8d07-451e-b240-34501dbe5ba0',
    'Eastern Asia',
    'world_region',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    NOW()
  ),
  (
    '5a2dcbd5-9436-4fb0-b61f-622b48f003a7',
    'South-Eastern Asia',
    'world_region',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    NOW()
  ),
  (
    'f3fbc4b8-69bc-4d51-ad33-6f4e57cc8ff9',
    'Southern Asia',
    'world_region',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    NOW()
  ),
  (
    'c74ba494-5eb2-4775-b99a-33f99d6e1e4f',
    'Western Asia',
    'world_region',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    NOW()
  ),
  (
    'aacd5da3-5256-4435-8e5b-582624de6062',
    'Eastern Europe',
    'world_region',
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    NOW()
  ),
  (
    'b3d5dd93-2b7c-4f24-9daa-b741f67e7b55',
    'Northern Europe',
    'world_region',
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    NOW()
  ),
  (
    'd22d0a26-937e-46ab-b378-1e85cc7cbd9f',
    'Southern Europe',
    'world_region',
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    NOW()
  ),
  (
    '19d28ea8-c9c8-45d0-87e3-f8e2945dff95',
    'Western Europe',
    'world_region',
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    NOW()
  ),
  (
    '32845143-cc0a-47f6-b6dc-b6b8754dc0c5',
    'Australia and New Zealand',
    'world_region',
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    NOW()
  ),
  (
    'ee7db8ca-9bb9-4f44-a223-c8538054b961',
    'Melanesia',
    'world_region',
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    NOW()
  ),
  (
    'e8ace01d-109e-40e7-bd6f-d3e09204e660',
    'Micronesia',
    'world_region',
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    NOW()
  ),
  (
    '6ac791f2-842a-4de9-9f29-8d6894da9492',
    'Polynesia',
    'world_region',
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Insert aliases for continents and world regions (for fuzzy search)
INSERT INTO
  region_aliases (id, region_id, alias_name, created_at)
VALUES
  (
    '0f998fc1-658a-4ad1-8e30-19be878fd072',
    '8e0f6ace-94de-4fb7-b9bf-d61bd6ca5e13',
    'Africa',
    NOW()
  ),
  (
    '64fac8aa-39fd-48b4-96b9-eec14f92ec3a',
    '3eb65d9f-7476-4c8a-8708-d283dbfdbef8',
    'North America',
    NOW()
  ),
  (
    '9f5069e5-cf39-4b3b-9938-16faf0d6d08f',
    '27c9f1cf-5e56-4956-bda4-518145846aa8',
    'South America',
    NOW()
  ),
  (
    '5c291536-89ba-4cea-9785-21a8108f7828',
    'a9e0a55e-d8e1-409d-814f-491b76140a3b',
    'Asia',
    NOW()
  ),
  (
    'e35d0be8-08eb-4239-ae83-bdc8094019b9',
    '64632dba-d616-4c44-a965-6de2f0ed5e1d',
    'Europe',
    NOW()
  ),
  (
    '89c6a5a3-e11e-4d94-842c-9946c1055f4e',
    '19a302ce-df34-46d1-83db-e92fa2e36186',
    'Oceania',
    NOW()
  ),
  (
    '144a6ea4-4301-4ab4-a5c6-8a61fb9c2924',
    'aa3eeb58-c3f2-4b70-b1f0-da745139f1d6',
    'Antarctica',
    NOW()
  ),
  (
    'e30d5f1e-7ad7-4adf-a072-a532292819ce',
    'c8296f1b-3965-46cc-a17a-166d660cbac8',
    'Eastern Africa',
    NOW()
  ),
  (
    'c21a4774-5121-4b9d-8d46-f7380cb523a2',
    'affccec7-e514-4388-85a7-201fa2726c38',
    'Middle Africa',
    NOW()
  ),
  (
    '2b7fd7dd-dd66-4c00-a558-bb28ed886fe2',
    '9055a0f6-7529-4259-aa79-37a2f6ce57fa',
    'Northern Africa',
    NOW()
  ),
  (
    'facde586-d616-45a4-87de-466f62f186bc',
    '55e17c46-a55c-4cfd-a93a-061c5f3c454d',
    'Southern Africa',
    NOW()
  ),
  (
    '1d9596a5-8b97-4045-856b-75c53d6c130d',
    '6cfc1cca-5946-41e6-832b-4da4a9d50139',
    'Western Africa',
    NOW()
  ),
  (
    '9363abb0-7fa2-45cb-a6ab-566260ba6d1d',
    '7acd80f1-667b-40d1-b5c5-bc9d69a5f2fd',
    'Northern America',
    NOW()
  ),
  (
    'c395fdb4-b55f-4a4a-85aa-7037e2e60698',
    'f1105e5e-93cf-47cb-9b01-e2a01da9336d',
    'Caribbean',
    NOW()
  ),
  (
    '7b78b8fc-91d7-471e-933a-c3c933d3fc42',
    '3501917b-9be6-4ac2-9bad-b9ee1d203236',
    'Central America',
    NOW()
  ),
  (
    'b2e3cb53-fff5-48a3-bef4-9a3724116e08',
    '17cc94ab-c2cf-48a6-aee8-be041f3b241f',
    'South America',
    NOW()
  ),
  (
    '25fd8826-63a8-47f7-acca-fba238d229be',
    '7db08212-7620-475c-a134-23f1e522ced6',
    'Central Asia',
    NOW()
  ),
  (
    '9f41a989-c6c1-46f1-a560-aada13364250',
    'a1a52735-8d07-451e-b240-34501dbe5ba0',
    'Eastern Asia',
    NOW()
  ),
  (
    '98897e3d-8ece-4b13-a03b-7b2fb996d21d',
    '5a2dcbd5-9436-4fb0-b61f-622b48f003a7',
    'South-Eastern Asia',
    NOW()
  ),
  (
    'd3d1e62e-1cd6-4145-8dd9-9ee7ec64de1f',
    'f3fbc4b8-69bc-4d51-ad33-6f4e57cc8ff9',
    'Southern Asia',
    NOW()
  ),
  (
    '7b95f40f-e4fd-4f32-9d9d-a444bfb91e63',
    'c74ba494-5eb2-4775-b99a-33f99d6e1e4f',
    'Western Asia',
    NOW()
  ),
  (
    '11686c04-a11b-43bd-9fe8-2fd16f4d4b61',
    'aacd5da3-5256-4435-8e5b-582624de6062',
    'Eastern Europe',
    NOW()
  ),
  (
    '70e4bc1f-4372-4625-9e15-eca5a0a2b5f9',
    'b3d5dd93-2b7c-4f24-9daa-b741f67e7b55',
    'Northern Europe',
    NOW()
  ),
  (
    'e15aa8cf-85d6-419c-a673-41891a380d29',
    'd22d0a26-937e-46ab-b378-1e85cc7cbd9f',
    'Southern Europe',
    NOW()
  ),
  (
    '4c3efdff-e29a-4cbe-8d3b-f35784fc065b',
    '19d28ea8-c9c8-45d0-87e3-f8e2945dff95',
    'Western Europe',
    NOW()
  ),
  (
    '66dc5c82-6204-4479-a290-abd70229a4bf',
    '32845143-cc0a-47f6-b6dc-b6b8754dc0c5',
    'Australia and New Zealand',
    NOW()
  ),
  (
    '9e622270-1127-4a72-9e63-4ba7725b19a1',
    'ee7db8ca-9bb9-4f44-a223-c8538054b961',
    'Melanesia',
    NOW()
  ),
  (
    '2c6106af-9a5a-4719-a996-6b3b9a9debab',
    'e8ace01d-109e-40e7-bd6f-d3e09204e660',
    'Micronesia',
    NOW()
  ),
  (
    '37eb31c9-0bf9-42f2-9ead-a58a5a09f35b',
    '6ac791f2-842a-4de9-9f29-8d6894da9492',
    'Polynesia',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
