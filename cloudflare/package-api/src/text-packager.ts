import { createDb } from './db';
import JSZip from 'jszip';
import { insertOrReplace, sqlFooter, sqlHeader } from './sql-writer';

export interface TextJobRequest {
  textVersionId: string;
}

export async function buildTextPackageZip(
  env: any,
  project: 'dev' | 'prod',
  req: TextJobRequest
): Promise<Uint8Array> {
  const db = createDb(env, project);
  const [textVersionRows, books, chapters, verses, verseTexts] =
    await Promise.all([
      db`select * from text_versions where id = ${req.textVersionId}`,
      db`select * from books where bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by book_number`,
      db`select c.* from chapters c join books b on b.id = c.book_id where b.bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by b.book_number, c.chapter_number`,
      db`select v.* from verses v join chapters c on c.id = v.chapter_id join books b on b.id = c.book_id where b.bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by b.book_number, c.chapter_number, v.verse_number`,
      db`select * from verse_texts where text_version_id = ${req.textVersionId} and publish_status = 'published' order by verse_id`,
    ]);
  if (textVersionRows.length === 0) throw new Error('Text version not found');

  let toSync = sqlHeader();
  for (const tv of textVersionRows)
    toSync += insertOrReplace('text_versions', tv) + '\n';
  for (const vt of verseTexts)
    toSync += insertOrReplace('verse_texts', vt) + '\n';
  toSync += sqlFooter();

  const lang =
    await db`select * from language_entities where id = ${textVersionRows[0].language_entity_id}`;
  const regions =
    await db`select r.* from regions r join language_entities_regions ler on ler.region_id = r.id where ler.language_entity_id = ${textVersionRows[0].language_entity_id}`;
  let offlineOnly = sqlHeader();
  const now = new Date().toISOString();
  if (regions.length === 0) {
    offlineOnly +=
      insertOrReplace('version_language_lookup', {
        version_type: 'text',
        version_id: textVersionRows[0].id,
        language_entity_id: lang[0]?.id ?? '',
        language_entity_name: lang[0]?.name ?? '',
        language_alias_name: '',
        region_name: '',
        created_at: now,
        updated_at: now,
      }) + '\n';
  } else {
    for (const r of regions) {
      offlineOnly +=
        insertOrReplace('version_language_lookup', {
          version_type: 'text',
          version_id: textVersionRows[0].id,
          language_entity_id: lang[0]?.id ?? '',
          language_entity_name: lang[0]?.name ?? '',
          language_alias_name: '',
          region_name: r.name,
          created_at: now,
          updated_at: now,
        }) + '\n';
    }
  }
  offlineOnly += sqlFooter();

  const manifest = {
    packageId: `${req.textVersionId}-text`,
    packageType: 'text',
    createdAt: new Date().toISOString(),
    textVersionId: req.textVersionId,
    totalBooks: books.length,
    totalChapters: chapters.length,
    totalVerses: verses.length,
    notes: [],
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('to-sync.sql', toSync);
  zip.file('offline-only.sql', offlineOnly);
  const zipBuffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
  return zipBuffer;
}

export async function runTextPackaging(
  env: any,
  project: 'dev' | 'prod',
  jobId: string,
  req: TextJobRequest
): Promise<void> {
  const db = createDb(env, project);
  console.log(
    `[text-packaging-start] jobId=${jobId} project=${project} textVersionId=${req.textVersionId}`
  );

  // Fetch basic data using neon SQL template literals
  const [textVersionRows, books, chapters, verses, verseTexts] =
    await Promise.all([
      db`select * from text_versions where id = ${req.textVersionId}`,
      db`select * from books where bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by book_number`,
      db`select c.* from chapters c join books b on b.id = c.book_id where b.bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by b.book_number, c.chapter_number`,
      db`select v.* from verses v join chapters c on c.id = v.chapter_id join books b on b.id = c.book_id where b.bible_version_id = (select bible_version_id from text_versions where id = ${req.textVersionId}) order by b.book_number, c.chapter_number, v.verse_number`,
      db`select * from verse_texts where text_version_id = ${req.textVersionId} and publish_status = 'published' order by verse_id`,
    ]);
  console.log(
    `[text-packaging-fetched] jobId=${jobId} tv=${textVersionRows.length} books=${books.length} chapters=${chapters.length} verses=${verses.length} verseTexts=${verseTexts.length}`
  );

  if (textVersionRows.length === 0) {
    throw new Error('Text version not found');
  }

  // Build SQL files instead of SQLite
  let toSync = sqlHeader();
  // Include current text_version and verse_texts only (client already has structure)
  for (const tv of textVersionRows) {
    toSync += insertOrReplace('text_versions', tv) + '\n';
  }
  for (const vt of verseTexts) {
    toSync += insertOrReplace('verse_texts', vt) + '\n';
  }
  toSync += sqlFooter();

  // Offline-only SQL: version_language_lookup entry
  // Fetch language + regions for label cache
  const lang =
    await db`select * from language_entities where id = ${textVersionRows[0].language_entity_id}`;
  const regions =
    await db`select r.* from regions r join language_entities_regions ler on ler.region_id = r.id where ler.language_entity_id = ${textVersionRows[0].language_entity_id}`;
  let offlineOnly = sqlHeader();
  // We create one lookup row per region (or one if none)
  const now = new Date().toISOString();
  if (regions.length === 0) {
    offlineOnly +=
      insertOrReplace('version_language_lookup', {
        version_type: 'text',
        version_id: textVersionRows[0].id,
        language_entity_id: lang[0]?.id ?? '',
        language_entity_name: lang[0]?.name ?? '',
        language_alias_name: '',
        region_name: '',
        created_at: now,
        updated_at: now,
      }) + '\n';
  } else {
    for (const r of regions) {
      offlineOnly +=
        insertOrReplace('version_language_lookup', {
          version_type: 'text',
          version_id: textVersionRows[0].id,
          language_entity_id: lang[0]?.id ?? '',
          language_entity_name: lang[0]?.name ?? '',
          language_alias_name: '',
          region_name: r.name,
          created_at: now,
          updated_at: now,
        }) + '\n';
    }
  }
  offlineOnly += sqlFooter();
  const manifest = {
    packageId: `${req.textVersionId}-text`,
    packageType: 'text',
    createdAt: new Date().toISOString(),
    textVersionId: req.textVersionId,
    totalBooks: books.length,
    totalChapters: chapters.length,
    totalVerses: verses.length,
    notes: [],
  };

  // Build ZIP with JSZip
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('to-sync.sql', toSync);
  zip.file('offline-only.sql', offlineOnly);
  const zipBuffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  const bucket = project === 'dev' ? env.R2_MEDIA_DEV : env.R2_MEDIA_PROD;
  await bucket.put(`packages/artifacts/${jobId}.zip`, zipBuffer, {
    httpMetadata: { contentType: 'application/zip' },
  });
  console.log(
    `[text-packaging-uploaded] jobId=${jobId} size=${zipBuffer.byteLength}`
  );

  // Update job status
  const jobObj = await bucket.get(`packages/jobs/${jobId}.json`);
  if (jobObj) {
    const job = (await jobObj.json()) as any;
    job.status = 'ready';
    await bucket.put(`packages/jobs/${jobId}.json`, JSON.stringify(job), {
      httpMetadata: { contentType: 'application/json' },
    });
  }
}
