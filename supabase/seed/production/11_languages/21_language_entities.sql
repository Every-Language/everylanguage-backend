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
    'a8249ff9-0872-4156-bdae-171235eb2b52',
    'Mo: Longoro',
    'dialect',
    'd6fd6c9e-25bc-48fc-9ffb-d87da748c404',
    NOW(),
    NOW()
  ),
  (
    'b2435b32-3734-4f43-96db-4bcc811949e0',
    'Dinka: Malual',
    'dialect',
    '2b9fd59c-6bc0-4f1b-9bc2-c31b25ce06f5',
    NOW(),
    NOW()
  ),
  (
    '4d502c28-b67c-454c-8dd5-71196cdc035b',
    'Katcha-Kadugli-Miri: Miri',
    'dialect',
    '9684a97b-81e7-4f1c-ab5c-33f5182ae2c3',
    NOW(),
    NOW()
  ),
  (
    'db3e4ea6-0d45-413a-9291-f1ad74efb74f',
    'Bangla',
    'dialect',
    '5dfdf73c-3cfb-4e9d-a247-42c8d5d50e4b',
    NOW(),
    NOW()
  ),
  (
    '99f8a5f1-7486-480f-8ec6-e50055c81090',
    'Bhadrawahi: Bhalesi',
    'dialect',
    'c24f5386-b704-4c4c-abb6-f8e5a85979f9',
    NOW(),
    NOW()
  ),
  (
    '983bf626-a955-45ff-abd4-9098ebc701fb',
    'Okinawan, Central: Torishima',
    'dialect',
    '214dfcf5-c84f-4470-abd7-b1e553f41c07',
    NOW(),
    NOW()
  ),
  (
    '83c44552-7c00-4f8c-9d4f-da728dc8c248',
    'Tanna',
    'dialect',
    'ec7fb4ba-ba48-45ba-a68d-f380069025b9',
    NOW(),
    NOW()
  ),
  (
    'ca0034b4-da76-41b4-98b0-e5b9616ee516',
    'Kukele: Iteeji',
    'dialect',
    'a79d12e7-84cb-4865-bbce-4791f1ab3653',
    NOW(),
    NOW()
  ),
  (
    'a4910fe3-3e29-4413-9e9d-19ac2a7ec9ca',
    'Me''faa, Acatepec: Zapotitlan',
    'dialect',
    '9bc4189b-3caf-4984-b63c-46959b544e3b',
    NOW(),
    NOW()
  ),
  (
    '7b8eb139-b224-4ab7-ae01-74619d71d164',
    'Amuku',
    'dialect',
    'e6d43642-2d0e-4d88-acbc-71a0deff79db',
    NOW(),
    NOW()
  ),
  (
    '4438a199-fab1-41d5-803d-c83f147e5ed9',
    'Lori, Southern: Boyerahmadi',
    'dialect',
    '6b2ec793-d7f7-4935-9c5f-03138bdaee4d',
    NOW(),
    NOW()
  ),
  (
    '92280d5d-25c1-4521-aa88-45bf848e94a2',
    'Romany: South German',
    'dialect',
    'a39d42eb-c356-40f9-a32a-a65c433459a2',
    NOW(),
    NOW()
  ),
  (
    '7a0523d0-1056-4bfc-8e1f-f12986b7d15e',
    'Boko: Illo Busa',
    'dialect',
    'e88fed27-ae7f-4ab5-9a55-1ca364984024',
    NOW(),
    NOW()
  ),
  (
    '11080f5e-6d96-40d8-b815-a82f7716f18d',
    'Kuninjku',
    'dialect',
    '85df7c95-4d99-4c4f-adb1-732501ecc9e6',
    NOW(),
    NOW()
  ),
  (
    '98a98374-ef8c-4b7a-a1e1-be8320f17fc4',
    'Ng''akarimojong: Napore',
    'dialect',
    'fc40a7a6-5113-48f9-9928-a158e6e142d9',
    NOW(),
    NOW()
  ),
  (
    '6f888b2c-89e4-45e0-9de4-c016a814a5cd',
    'Mada: Rija',
    'dialect',
    '2763ad82-1599-4881-a678-ace5da064d9e',
    NOW(),
    NOW()
  ),
  (
    'b21efcda-290c-44b3-8e38-0702e0c4439d',
    'Rawa: Karo',
    'dialect',
    'b0e4c113-5a2e-4f3c-9923-b407115d09b7',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
