#!/usr/bin/env node
/*
Fetch OMT dev translations from AppSync, filter to those that have audio files,
then write rows to el-backend/docs/migration/artifacts/language-mapping.dev.template.csv

Env:
  OMT_DEV_APPSYNC_URL
  OMT_DEV_APPSYNC_API_KEY

Usage:
  node scripts/fetch_omt_translations_dev.cjs --out el-backend/docs/migration/artifacts/language-mapping.dev.template.csv
*/

const fs = require('fs');
const path = require('path');

const APPSYNC_URL = process.env.OMT_DEV_APPSYNC_URL;
const APPSYNC_API_KEY = process.env.OMT_DEV_APPSYNC_API_KEY;

if (!APPSYNC_URL || !APPSYNC_API_KEY) {
  console.error('Missing env: OMT_DEV_APPSYNC_URL and/or OMT_DEV_APPSYNC_API_KEY');
  process.exit(1);
}

function parseArgs(argv) {
  const outIndex = argv.indexOf('--out');
  let outPath = path.resolve(__dirname, '../docs/migration/artifacts/language-mapping.dev.template.csv');
  if (outIndex !== -1 && argv[outIndex + 1]) {
    outPath = path.resolve(process.cwd(), argv[outIndex + 1]);
  }
  return { outPath };
}

async function gql(query, variables = {}) {
  const res = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GraphQL HTTP ${res.status}: ${txt}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

const LIST_TRANSLATIONS = /* GraphQL */ `
query ListOmtTranslations($limit: Int, $nextToken: String) {
  listOmtTranslations(limit: $limit, nextToken: $nextToken) {
    items {
      id
      translationName
      sourceLanguageId
      motherTongueId
    }
    nextToken
  }
}`;

const LIST_AUDIO_BY_TRANSLATION = /* GraphQL */ `
query ListAudioByTranslation($translationId: ID!, $limit: Int) {
  listAudioFilesByTranslation(translationId: $translationId, limit: $limit) {
    items { id }
    nextToken
  }
}`;

async function* iterateTranslations(pageSize = 1000) {
  let nextToken = null;
  do {
    const data = await gql(LIST_TRANSLATIONS, { limit: pageSize, nextToken });
    const page = data?.listOmtTranslations;
    const items = page?.items || [];
    for (const it of items) yield it;
    nextToken = page?.nextToken || null;
  } while (nextToken);
}

async function translationHasAudio(translationId) {
  const data = await gql(LIST_AUDIO_BY_TRANSLATION, { translationId, limit: 1 });
  const items = data?.listAudioFilesByTranslation?.items || [];
  return items.length > 0;
}

(async () => {
  try {
    const { outPath } = parseArgs(process.argv);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const header = 'omt_translation_id,omt_translation_name,sourceLanguageId,motherTongueId,candidate_source_language_entity_ids,candidate_target_language_entity_ids,source_language_entity_id,target_language_entity_id,notes\n';
    fs.writeFileSync(outPath, header, 'utf8');

    let countSeen = 0;
    let countKept = 0;
    for await (const t of iterateTranslations(500)) {
      countSeen++;
      if (!t?.id) continue;
      let keep = false;
      try {
        keep = await translationHasAudio(t.id);
      } catch (e) {
        console.error(`Error checking audio for translation ${t.id}: ${e.message}`);
      }
      if (!keep) continue;
      countKept++;
      const row = [
        t.id,
        (t.translationName || '').replaceAll(',', ' '),
        t.sourceLanguageId || '',
        t.motherTongueId || '',
        '',
        '',
        '',
        '',
        ''
      ].join(',') + '\n';
      fs.appendFileSync(outPath, row, 'utf8');
    }

    console.log(`Wrote ${outPath}`);
    console.log(`Seen translations: ${countSeen}, kept (with audio): ${countKept}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
