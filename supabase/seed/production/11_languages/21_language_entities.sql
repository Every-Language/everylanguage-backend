-- language_entities seed data (chunk 21/21)
INSERT INTO
  language_entities (
    id,
    name,
    level,
    parent_id,
    created_at,
    updated_at
  )
VALUES
  (
    '684f63e8-4c02-4538-8e48-1e597612fe4d',
    'Mo: Longoro',
    'dialect',
    '58abea6b-c4ee-4f34-93dc-3820c39f0afd',
    NOW(),
    NOW()
  ),
  (
    'f2ead2db-5942-426b-bd38-f0fe7f696406',
    'Dinka: Malual',
    'dialect',
    'e4eb7f98-bf83-4105-bd4a-4044b760617b',
    NOW(),
    NOW()
  ),
  (
    '4f1f190c-0dec-433e-b7bf-008160013b90',
    'Katcha-Kadugli-Miri: Miri',
    'dialect',
    '0847abb0-2047-452d-b0be-55f1f4739f8d',
    NOW(),
    NOW()
  ),
  (
    'c4744bcc-8d97-46fa-ba4f-ef2d425625cc',
    'Bangla',
    'dialect',
    'd315d70a-8d48-40ff-8412-e5d1177e89c9',
    NOW(),
    NOW()
  ),
  (
    'db6e05f7-1496-4d49-b465-2a959a0a88b4',
    'Bhadrawahi: Bhalesi',
    'dialect',
    'd4369355-126f-49b3-9f9e-c446680e81df',
    NOW(),
    NOW()
  ),
  (
    'df23477f-07e3-4cf1-8d3c-cc6e87d2a85d',
    'Okinawan, Central: Torishima',
    'dialect',
    '3266e418-957e-464d-8fa0-74cf88bc45a2',
    NOW(),
    NOW()
  ),
  (
    '575c1a2f-89a0-4e2c-b00f-52b7a3a8725d',
    'Tanna',
    'dialect',
    'cb82241d-8655-45c1-84ad-306db8904e62',
    NOW(),
    NOW()
  ),
  (
    'ca8a794d-330a-4811-8129-c52aa7e4a04c',
    'Kukele: Iteeji',
    'dialect',
    '302fe973-a3ad-4614-af4d-1930dffad67d',
    NOW(),
    NOW()
  ),
  (
    '6128e76b-d7e5-45c9-8682-55877e6c0704',
    'Me''faa, Acatepec: Zapotitlan',
    'dialect',
    'fd456750-8652-4d74-93a4-b284652f5097',
    NOW(),
    NOW()
  ),
  (
    'eed7301e-bb46-45c7-a1ce-ebae91fd4864',
    'Amuku',
    'dialect',
    '6f9f1a93-c3fd-4bdc-b04f-5ffcb0a697e3',
    NOW(),
    NOW()
  ),
  (
    '3932577a-e50b-4c30-950e-55756fceae95',
    'Lori, Southern: Boyerahmadi',
    'dialect',
    '8e9b9a10-4585-4f3d-a7a3-13bd2db38bb1',
    NOW(),
    NOW()
  ),
  (
    '7154e713-7cd0-42b8-8434-1443a38cd6c8',
    'Romany: South German',
    'dialect',
    '59a6252f-3a1f-4949-9494-f4a333df6585',
    NOW(),
    NOW()
  ),
  (
    '535e6e3c-1b3c-4a0e-b616-f4c9945f0bb7',
    'Boko: Illo Busa',
    'dialect',
    '5b0239b5-105b-4bb6-ad2f-4f659a71177a',
    NOW(),
    NOW()
  ),
  (
    '433f644f-b794-409d-9a02-65e166c366fc',
    'Kuninjku',
    'dialect',
    'a2c4dd43-d317-4c1b-a526-28c8614b3983',
    NOW(),
    NOW()
  ),
  (
    '4fbd1640-0b40-4faf-a63e-b61e5a3086c9',
    'Ng''akarimojong: Napore',
    'dialect',
    '16a67340-40f3-48dd-82b6-c41b818553f9',
    NOW(),
    NOW()
  ),
  (
    '043973df-143d-48b5-a7e5-6de69cbb70db',
    'Mada: Rija',
    'dialect',
    '9405ee50-77df-4829-b57d-f076e2914560',
    NOW(),
    NOW()
  ),
  (
    'c06b43b7-643f-40b7-8c3e-cfdb4e7cf6c6',
    'Rawa: Karo',
    'dialect',
    '635f591a-d933-456e-b879-954122dac843',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
