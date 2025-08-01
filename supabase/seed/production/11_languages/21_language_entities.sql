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
    '7cb0773d-fcf7-475a-bd49-b38e6f2657ec',
    'Mo: Longoro',
    'dialect',
    '2087b68a-0d65-432b-ae88-ba88a4f3bb73',
    NOW(),
    NOW()
  ),
  (
    '6c5107a8-eac3-4b69-904b-dee48587e081',
    'Dinka: Malual',
    'dialect',
    '51c312fe-3c46-494a-a370-7f0e7f48d293',
    NOW(),
    NOW()
  ),
  (
    '84bb3227-4728-4cda-89cf-ef2565068666',
    'Katcha-Kadugli-Miri: Miri',
    'dialect',
    '70dab781-df20-4cfe-9237-9396e14954d7',
    NOW(),
    NOW()
  ),
  (
    'fbde3217-1f8a-4654-a4ac-ce96a6119fc5',
    'Bangla',
    'dialect',
    'e5724800-9b86-4363-abab-a055853c5337',
    NOW(),
    NOW()
  ),
  (
    '206da91b-70b4-4279-b714-baa89ebb1fa9',
    'Bhadrawahi: Bhalesi',
    'dialect',
    '9f8eb20b-82b8-4557-ad95-e5d5b21e070e',
    NOW(),
    NOW()
  ),
  (
    '4d0f84b8-4f04-4daf-bc32-0261a34cc2ba',
    'Okinawan, Central: Torishima',
    'dialect',
    '37f181d8-1cbf-4fd3-8c56-cfe199946169',
    NOW(),
    NOW()
  ),
  (
    '98737ee1-7c42-45e7-b478-f8c9027e1198',
    'Tanna',
    'dialect',
    'e4b6c065-ba53-4510-8c38-da4fb298bd54',
    NOW(),
    NOW()
  ),
  (
    '682d2ad6-7c0d-48d9-a08b-69a47528f155',
    'Kukele: Iteeji',
    'dialect',
    'aa3a0f03-7a71-42e4-a93e-27a71b943a67',
    NOW(),
    NOW()
  ),
  (
    'a2122a79-c344-4be8-99e3-ebfd5d648533',
    'Me''faa, Acatepec: Zapotitlan',
    'dialect',
    '1833f5e4-d6a7-4b47-b6c9-4e5cc23c42d4',
    NOW(),
    NOW()
  ),
  (
    'b9e567f8-4ffc-4c66-99bb-85b5f6542bac',
    'Amuku',
    'dialect',
    '2bf10510-c7f9-4ce6-bd6f-32526e5284a4',
    NOW(),
    NOW()
  ),
  (
    '1d687297-36b5-48dd-85f4-04105d55b8f1',
    'Lori, Southern: Boyerahmadi',
    'dialect',
    '958b14e0-8600-4d5f-9c4e-a279a2ac51eb',
    NOW(),
    NOW()
  ),
  (
    '05eeffbc-c943-481f-be42-f8acaf9eddbe',
    'Romany: South German',
    'dialect',
    '84d0d53e-0ccf-48c7-8f4a-b91254db8758',
    NOW(),
    NOW()
  ),
  (
    '6a91ce3d-4379-4396-b67a-5212a72e3c19',
    'Boko: Illo Busa',
    'dialect',
    'a11c652b-6b5b-48cf-b881-583a7afde639',
    NOW(),
    NOW()
  ),
  (
    '183c9100-7dc4-4b46-9750-986ddb65f9bb',
    'Kuninjku',
    'dialect',
    '8ddba66a-938c-4466-9754-614bbcb611a4',
    NOW(),
    NOW()
  ),
  (
    '42098875-affb-4607-b656-0970d2ec81e9',
    'Ng''akarimojong: Napore',
    'dialect',
    '57a7a490-cdcd-47de-9f70-4e8703e6a2bf',
    NOW(),
    NOW()
  ),
  (
    '3fa5f9cc-5817-4ed4-b521-cefdc01adc07',
    'Mada: Rija',
    'dialect',
    'b49c3b69-c2bc-4b1a-b9da-a75396286cf1',
    NOW(),
    NOW()
  ),
  (
    'd75441ef-5dd7-4a9f-ac29-cbbf476f55bb',
    'Rawa: Karo',
    'dialect',
    '3d6ecccd-3ac0-4266-91b0-b8610cf32aca',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
