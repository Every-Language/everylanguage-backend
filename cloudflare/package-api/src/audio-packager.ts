import { createDb } from './db';
import {
  insertIgnore,
  insertOrReplace,
  sqlFooter,
  sqlHeader,
} from './sql-writer';
import { ZipStreamWriter } from './zip-stream';
import { R2MultipartWriter } from './r2-multipart-writer';

interface AudioBookSize {
  id: string;
  name: string;
  book_number: number;
  testament: string | null;
  total_bytes: number;
}

export interface AudioJobRequest {
  audioVersionId: string;
  maxSizeMB?: number;
  books?: string[];
  chapters?: string[];
}

export async function runAudioPackaging(
  env: any,
  project: 'dev' | 'prod',
  jobId: string,
  req: AudioJobRequest
): Promise<void> {
  const db = createDb(env, project);
  console.log(
    `[audio-packaging-start] jobId=${jobId} project=${project} audioVersionId=${req.audioVersionId}`
  );

  // Load audio version and bible version
  const avRows =
    await db`select * from audio_versions where id = ${req.audioVersionId}`;
  if (avRows.length === 0) throw new Error('Audio version not found');
  const audioVersion: any = avRows[0];

  // Load all books for the bible version
  const allBooks =
    await db`select * from books where bible_version_id = ${audioVersion.bible_version_id} order by book_number`;

  // Determine selection mode
  let selectedBookIds: string[] = [];
  const notes: string[] = [];

  if (req.books && req.books.length > 0) {
    const existing = new Set(allBooks.map((b: any) => b.id));
    const missing = req.books.filter(id => !existing.has(id));
    if (missing.length)
      notes.push(`Missing books skipped: ${missing.join(', ')}`);
    selectedBookIds = req.books.filter(id => existing.has(id));
  } else if (req.chapters && req.chapters.length > 0) {
    // Map chapters to books
    const chapterRows = req.chapters.length
      ? await db`select id, book_id from chapters where id in ${db(req.chapters)}`
      : [];
    const chapterBookIds = Array.from(
      new Set(chapterRows.map((c: any) => c.book_id))
    );
    selectedBookIds = chapterBookIds;
    const missing = req.chapters.filter(
      cid => !chapterRows.find((c: any) => c.id === cid)
    );
    if (missing.length)
      notes.push(`Missing chapters skipped: ${missing.join(', ')}`);
  } else if (req.maxSizeMB && req.maxSizeMB > 0) {
    // Build size per book for this audio version
    const sizeRows = await db`select b.id, b.name, b.book_number, b.testament,
              coalesce(sum(mf.file_size),0) as total_bytes
       from books b
       left join chapters c on c.book_id = b.id
       left join media_files mf on mf.audio_version_id = ${req.audioVersionId} and mf.publish_status = 'published'
            and mf.start_verse_id like (c.id || '-%')
       where b.bible_version_id = ${audioVersion.bible_version_id}
       group by b.id, b.name, b.book_number, b.testament
       order by b.book_number`;
    const maxBytes = Math.floor(req.maxSizeMB * 1024 * 1024);
    let acc = 0;
    for (const r of sizeRows as any as AudioBookSize[]) {
      if (acc + Number(r.total_bytes) > maxBytes) break;
      if (Number(r.total_bytes) === 0) continue; // skip empty
      selectedBookIds.push(r.id);
      acc += Number(r.total_bytes);
    }
    if (selectedBookIds.length === 0) {
      // Fallback: include first non-empty book even if it exceeds limit slightly
      const first = (sizeRows as any as AudioBookSize[]).find(
        r => Number(r.total_bytes) > 0
      );
      if (first) selectedBookIds.push(first.id);
    }
  } else {
    // Default: full version (all books with any content)
    selectedBookIds = allBooks.map((b: any) => b.id);
  }

  // Fetch media files for selection
  let mediaRows: any[] = [];
  if (req.chapters && req.chapters.length > 0) {
    // Use EXISTS with IN over chapters to avoid LIKE ANY array
    mediaRows = await db`select mf.* from media_files mf
       where mf.audio_version_id = ${req.audioVersionId} and mf.publish_status = 'published'
         and EXISTS (
           select 1 from chapters c where c.id in ${db(req.chapters)}
           and mf.start_verse_id like (c.id || '-%')
         )
       order by mf.start_verse_id`;
  } else {
    // By books
    if (selectedBookIds.length === 0) {
      mediaRows = [];
    } else {
      mediaRows = await db`select mf.* from media_files mf
         where mf.audio_version_id = ${req.audioVersionId} and mf.publish_status = 'published'
           and EXISTS (
             select 1 from chapters c where c.book_id in ${db(selectedBookIds)}
             and mf.start_verse_id like (c.id || '-%')
           )
         order by mf.start_verse_id`;
    }
  }

  // Load related structure for selected books
  const selBooks = selectedBookIds.length
    ? await db`select * from books where id in ${db(selectedBookIds)} order by book_number`
    : [];
  const selChapters = selectedBookIds.length
    ? await db`select * from chapters where book_id in ${db(selectedBookIds)} order by chapter_number`
    : [];
  const selVerses = selectedBookIds.length
    ? await db`select v.* from verses v join chapters c on c.id = v.chapter_id where c.book_id in ${db(selectedBookIds)} order by c.chapter_number, v.verse_number`
    : [];

  // Build SQL files (to-sync and offline-only)
  let toSync = sqlHeader();
  toSync += insertOrReplace('audio_versions', audioVersion) + '\n';
  for (const m of mediaRows) toSync += insertOrReplace('media_files', m) + '\n';
  let mft: any[] = [];
  let mfv: any[] = [];
  let mftags: any[] = [];
  if (mediaRows.length) {
    const ids = mediaRows.map((m: any) => m.id);
    mft =
      await db`select * from media_files_targets where media_file_id in ${db(ids)}`;
    for (const r of mft)
      toSync += insertOrReplace('media_files_targets', r) + '\n';
    mfv =
      await db`select * from media_files_verses where media_file_id in ${db(ids)}`;
    for (const r of mfv)
      toSync += insertOrReplace('media_files_verses', r) + '\n';
    mftags =
      await db`select * from media_files_tags where media_file_id in ${db(ids)}`;
    for (const r of mftags)
      toSync += insertOrReplace('media_files_tags', r) + '\n';
    if (mftags.length) {
      const tagIds = Array.from(new Set(mftags.map((t: any) => t.tag_id)));
      if (tagIds.length) {
        const tags = await db`select * from tags where id in ${db(tagIds)}`;
        for (const t of tags) toSync += insertOrReplace('tags', t) + '\n';
      }
    }
  }
  toSync += sqlFooter();

  // Offline-only SQL
  const now = new Date().toISOString();
  let offlineOnly = sqlHeader();
  offlineOnly +=
    insertIgnore('user_saved_audio_versions_downloads', {
      audio_version_id: audioVersion.id,
      created_at: now,
    }) + '\n';
  const lang =
    await db`select * from language_entities where id = ${audioVersion.language_entity_id}`;
  const regions2 =
    await db`select r.* from regions r join language_entities_regions ler on ler.region_id = r.id where ler.language_entity_id = ${audioVersion.language_entity_id}`;
  if (regions2.length === 0) {
    offlineOnly +=
      insertOrReplace('version_language_lookup', {
        version_type: 'audio',
        version_id: audioVersion.id,
        language_entity_id: lang[0]?.id ?? '',
        language_entity_name: lang[0]?.name ?? '',
        language_alias_name: '',
        region_name: '',
        created_at: now,
        updated_at: now,
      }) + '\n';
  } else {
    for (const r of regions2) {
      offlineOnly +=
        insertOrReplace('version_language_lookup', {
          version_type: 'audio',
          version_id: audioVersion.id,
          language_entity_id: lang[0]?.id ?? '',
          language_entity_name: lang[0]?.name ?? '',
          language_alias_name: '',
          region_name: r.name,
          created_at: now,
          updated_at: now,
        }) + '\n';
    }
  }
  const mediaRelative = (m: any) => {
    const key: string = m.object_key || m.remote_path || `${m.id}`;
    const name = key.split('/').pop() || `${m.id}`;
    return `media/${name}`;
  };
  for (const m of mediaRows) {
    offlineOnly +=
      insertOrReplace('media_files_downloads', {
        media_file_id: m.id,
        local_file_path: mediaRelative(m),
        download_status: 'completed',
        progress: 1,
        downloaded_bytes: m.file_size ?? 0,
        file_size_bytes: m.file_size ?? 0,
        error_message: '',
        priority: 0,
        retry_count: 0,
        last_attempt_at: now,
        downloaded_at: now,
        created_at: now,
        updated_at: now,
      }) + '\n';
  }
  offlineOnly += sqlFooter();

  const audioManifest = {
    packageId: `${req.audioVersionId}-audio-${jobId}`,
    packageType: 'audio',
    createdAt: new Date().toISOString(),
    audioVersionId: req.audioVersionId,
    selectedBooks: selectedBookIds,
    mediaFiles: mediaRows.length,
    notes,
  };

  // Build streaming ZIP and upload via R2 multipart (no known-length requirement)
  const bucket = project === 'dev' ? env.R2_MEDIA_DEV : env.R2_MEDIA_PROD;
  const multipart = await bucket.createMultipartUpload(
    `packages/artifacts/${jobId}.zip`,
    {
      httpMetadata: { contentType: 'application/zip' },
    }
  );
  const sink = new R2MultipartWriter(multipart);
  const z = new ZipStreamWriter({ write: b => sink.write(b) });
  await z.addFile(
    'manifest.json',
    new TextEncoder().encode(JSON.stringify(audioManifest, null, 2))
  );
  await z.addFile('to-sync.sql', new TextEncoder().encode(toSync));
  await z.addFile('offline-only.sql', new TextEncoder().encode(offlineOnly));
  // media streams
  for (const m of mediaRows) {
    const key: string = m.object_key || m.remote_path;
    if (!key) continue;
    const obj = await bucket.get(key);
    if (!obj || !obj.body) continue;
    const filename = mediaRelative(m).split('/').pop() as string;
    await z.addStream(
      `media/${filename}`,
      obj.body as ReadableStream<Uint8Array>
    );
  }
  await z.finalize();
  await sink.close();

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
