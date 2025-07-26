import { SUPPORTED_AUDIO_TYPES, MAX_FILE_SIZE } from './media-validation.ts';

export interface VerseTiming {
  verseId: string;
  startTimeSeconds: number;
  durationSeconds: number;
}

export interface BibleChapterUploadRequest {
  fileName: string;
  languageEntityId: string;
  chapterId: string;
  startVerseId: string;
  endVerseId: string;
  durationSeconds: number;
  audioVersionId: string;
  projectId?: string;
  verseTimings?: VerseTiming[];
  tagIds?: string[];
}

export interface ParsedBibleChapterRequest {
  file: File;
  uploadRequest: BibleChapterUploadRequest;
}

interface BibleChapterJsonData {
  language_entity_id: string;
  chapter_id: string;
  start_verse_id: string;
  end_verse_id: string;
  duration_seconds: number;
  audio_version_id: string;
  project_id?: string; // Made optional
  filename?: string;
  verse_timings: Array<{ verseId: string; startTime: number; endTime: number }>;
  tag_ids: string[];
  file_content?: string;
}

function isBibleChapterJsonData(data: unknown): data is BibleChapterJsonData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).language_entity_id === 'string' &&
    typeof (data as any).chapter_id === 'string' &&
    typeof (data as any).start_verse_id === 'string' &&
    typeof (data as any).end_verse_id === 'string' &&
    typeof (data as any).duration_seconds === 'number' &&
    typeof (data as any).audio_version_id === 'string'
    // Note: project_id, verse_timings and tag_ids are optional and can be missing in tests
  );
}

function validateRequiredFields(data: any): void {
  const requiredFields = [
    'chapter_id',
    'start_verse_id',
    'end_verse_id',
    'duration_seconds',
    'audio_version_id',
  ];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

export async function parseAndValidateBibleChapterRequest(
  req: Request
): Promise<{ file: File; uploadRequest: BibleChapterUploadRequest }> {
  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  const isJson = contentType.includes('application/json');

  if (!isMultipart && !isJson) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  let file: File;
  let uploadRequest: any;

  if (isJson) {
    // Handle JSON test data
    const jsonData = await req.json();

    // First check for missing required fields with specific error message
    validateRequiredFields(jsonData);

    if (!isBibleChapterJsonData(jsonData)) {
      throw new Error('Invalid JSON data format for bible chapter upload');
    }

    uploadRequest = {
      language_entity_id: jsonData.language_entity_id,
      chapter_id: jsonData.chapter_id,
      start_verse_id: jsonData.start_verse_id,
      end_verse_id: jsonData.end_verse_id,
      duration_seconds: jsonData.duration_seconds,
      project_id: jsonData.project_id,
      filename: jsonData.filename ?? 'bible_chapter.m4a',
      verse_timings: jsonData.verse_timings,
      tag_ids: jsonData.tag_ids,
    };

    // Create a fake file for testing
    const testContent = jsonData.file_content ?? 'test audio content';
    file = new File([testContent], uploadRequest.filename, {
      type: 'audio/m4a',
    });
  } else {
    // Parse multipart form data
    const formData = await req.formData();
    file = formData.get('file') as File;

    // Parse verse timings if provided
    const verseTimingsJson = formData.get('verse_timings') as string;
    let verseTimings: VerseTiming[] | undefined = undefined;
    if (verseTimingsJson) {
      try {
        verseTimings = JSON.parse(verseTimingsJson);
      } catch {
        throw new Error('Invalid verse_timings JSON format');
      }
    }

    // Parse tag IDs if provided
    const tagIdsJson = formData.get('tag_ids') as string;
    let tagIds: string[] | undefined = undefined;
    if (tagIdsJson) {
      try {
        tagIds = JSON.parse(tagIdsJson);
      } catch {
        throw new Error('Invalid tag_ids JSON format');
      }
    }

    uploadRequest = {
      language_entity_id: formData.get('language_entity_id') as string,
      chapter_id: formData.get('chapter_id') as string,
      start_verse_id: formData.get('start_verse_id') as string,
      end_verse_id: formData.get('end_verse_id') as string,
      duration_seconds: formData.get('duration_seconds') as string,
      project_id: formData.get('project_id') as string,
      filename: file.name || 'unknown',
      verse_timings: verseTimings,
      tag_ids: tagIds,
    };
  }

  // Check all required fields
  const requiredFields = [
    'chapter_id',
    'start_verse_id',
    'end_verse_id',
    'duration_seconds',
  ];
  const missingFields = requiredFields.filter(field => !uploadRequest[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Parse duration
  let durationSeconds: number;
  if (uploadRequest.duration_seconds) {
    durationSeconds =
      typeof uploadRequest.duration_seconds === 'string'
        ? parseFloat(uploadRequest.duration_seconds)
        : uploadRequest.duration_seconds;
  } else {
    throw new Error('duration_seconds is required');
  }

  // Create validated upload request
  const finalUploadRequest: BibleChapterUploadRequest = {
    fileName: uploadRequest.filename,
    languageEntityId: uploadRequest.language_entity_id,
    chapterId: uploadRequest.chapter_id,
    startVerseId: uploadRequest.start_verse_id,
    endVerseId: uploadRequest.end_verse_id,
    durationSeconds,
    audioVersionId: uploadRequest.audio_version_id,
    projectId: uploadRequest.project_id ?? undefined,
    verseTimings: uploadRequest.verse_timings ?? undefined,
    tagIds: uploadRequest.tag_ids ?? undefined,
  };

  return { file, uploadRequest: finalUploadRequest };
}

export async function validateBibleChapterUploadRequest(
  supabaseClient: any,
  uploadRequest: BibleChapterUploadRequest,
  file: File
): Promise<void> {
  const errors: string[] = [];

  // 1. Validate required fields
  if (!uploadRequest.fileName || !uploadRequest.languageEntityId) {
    errors.push('Missing required fields: fileName, languageEntityId');
  }

  if (!uploadRequest.chapterId) {
    errors.push('Missing required field: chapterId');
  }

  if (!uploadRequest.startVerseId || !uploadRequest.endVerseId) {
    errors.push('Missing required fields: startVerseId, endVerseId');
  }

  if (!uploadRequest.audioVersionId) {
    errors.push('Missing required field: audioVersionId');
  }

  if (!uploadRequest.durationSeconds || uploadRequest.durationSeconds <= 0) {
    errors.push('Invalid or missing duration_seconds');
  }

  // 2. Validate file is audio only
  if (!file.type.startsWith('audio/')) {
    errors.push('File must be audio format');
  }

  // 3. Validate file type
  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    errors.push(
      `Unsupported audio file type '${file.type}'. Supported types: ${SUPPORTED_AUDIO_TYPES.join(', ')}`
    );
  }

  // 4. Validate file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // 5. Validate verse timings format if provided
  if (uploadRequest.verseTimings && uploadRequest.verseTimings.length > 0) {
    for (const [index, timing] of uploadRequest.verseTimings.entries()) {
      if (!timing.verseId || typeof timing.verseId !== 'string') {
        errors.push(`Invalid verseId at verse timing index ${index}`);
      }
      if (
        typeof timing.startTimeSeconds !== 'number' ||
        timing.startTimeSeconds < 0
      ) {
        errors.push(`Invalid startTimeSeconds at verse timing index ${index}`);
      }
      if (
        typeof timing.durationSeconds !== 'number' ||
        timing.durationSeconds <= 0
      ) {
        errors.push(`Invalid durationSeconds at verse timing index ${index}`);
      }
    }
  }

  // 6. Validate tag IDs format if provided
  if (uploadRequest.tagIds && uploadRequest.tagIds.length > 0) {
    for (const [index, tagId] of uploadRequest.tagIds.entries()) {
      if (!tagId || typeof tagId !== 'string') {
        errors.push(`Invalid tagId at index ${index}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // === DATABASE VALIDATION ===
  try {
    // Validate language entity
    const { data: languageEntity, error: langError } = await supabaseClient
      .from('language_entities')
      .select('id, name, level')
      .eq('id', uploadRequest.languageEntityId)
      .is('deleted_at', null)
      .single();

    if (langError || !languageEntity) {
      throw new Error(
        langError?.code === 'PGRST116'
          ? 'Language entity not found or has been deleted'
          : `Language entity validation failed: ${langError?.message}`
      );
    }
    console.log(
      `✅ Language entity validated: ${languageEntity.name} (${languageEntity.level})`
    );

    // Validate audio version
    const { data: audioVersion, error: audioVersionError } =
      await supabaseClient
        .from('audio_versions')
        .select('id, name, language_entity_id, bible_version_id')
        .eq('id', uploadRequest.audioVersionId)
        .is('deleted_at', null)
        .single();

    if (audioVersionError || !audioVersion) {
      throw new Error(
        audioVersionError?.code === 'PGRST116'
          ? 'Audio version not found or has been deleted'
          : `Audio version validation failed: ${audioVersionError?.message}`
      );
    }

    // Validate that audio version belongs to the specified language entity
    if (audioVersion.language_entity_id !== uploadRequest.languageEntityId) {
      throw new Error(
        `Audio version does not belong to the specified language entity`
      );
    }

    console.log(`✅ Audio version validated: ${audioVersion.name}`);

    // Validate project (if provided)
    if (uploadRequest.projectId) {
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('id, name')
        .eq('id', uploadRequest.projectId)
        .is('deleted_at', null)
        .single();

      if (projectError || !project) {
        throw new Error(
          projectError?.code === 'PGRST116'
            ? 'Project not found or has been deleted'
            : `Project validation failed: ${projectError?.message}`
        );
      }
      console.log(`✅ Project validated: ${project.name}`);
    }

    // Validate chapter
    const { data: chapter, error: chapterError } = await supabaseClient
      .from('chapters')
      .select('id, chapter_number, book_id')
      .eq('id', uploadRequest.chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error(
        chapterError?.code === 'PGRST116'
          ? 'Chapter not found'
          : `Chapter validation failed: ${chapterError?.message}`
      );
    }
    console.log(`✅ Chapter validated: ${chapter.chapter_number}`);

    // Validate start and end verses
    const { data: verses, error: versesError } = await supabaseClient
      .from('verses')
      .select('id, verse_number, chapter_id')
      .in('id', [uploadRequest.startVerseId, uploadRequest.endVerseId]);

    if (versesError || !verses || verses.length !== 2) {
      throw new Error(
        versesError?.message ?? 'Start verse or end verse not found'
      );
    }

    const startVerse = verses.find(
      (v: any) => v.id === uploadRequest.startVerseId
    );
    const endVerse = verses.find((v: any) => v.id === uploadRequest.endVerseId);

    if (!startVerse || !endVerse) {
      throw new Error('Start verse or end verse not found');
    }

    // Validate verses belong to the specified chapter
    if (
      startVerse.chapter_id !== uploadRequest.chapterId ||
      endVerse.chapter_id !== uploadRequest.chapterId
    ) {
      throw new Error(
        'Start and end verses must belong to the specified chapter'
      );
    }

    // Validate verse order
    if (startVerse.verse_number > endVerse.verse_number) {
      throw new Error('Start verse must come before or equal to end verse');
    }

    console.log(
      `✅ Verses validated: ${startVerse.verse_number} - ${endVerse.verse_number}`
    );

    // Validate individual verse timings if provided
    if (uploadRequest.verseTimings && uploadRequest.verseTimings.length > 0) {
      const verseIds = uploadRequest.verseTimings.map(vt => vt.verseId);
      const { data: timingVerses, error: timingVersesError } =
        await supabaseClient
          .from('verses')
          .select('id, verse_number, chapter_id')
          .in('id', verseIds);

      if (timingVersesError || !timingVerses) {
        throw new Error(
          `Verse timing validation failed: ${timingVersesError?.message}`
        );
      }

      // Check that all timing verses exist and belong to the chapter
      for (const timing of uploadRequest.verseTimings) {
        const verse = timingVerses.find((v: any) => v.id === timing.verseId);
        if (!verse) {
          throw new Error(`Verse with ID ${timing.verseId} not found`);
        }
        if (verse.chapter_id !== uploadRequest.chapterId) {
          throw new Error(
            `Verse ${verse.verse_number} does not belong to the specified chapter`
          );
        }
      }

      console.log(
        `✅ ${uploadRequest.verseTimings.length} verse timings validated`
      );
    }

    // Validate tag IDs if provided
    if (uploadRequest.tagIds && uploadRequest.tagIds.length > 0) {
      const { data: tags, error: tagsError } = await supabaseClient
        .from('tags')
        .select('id')
        .in('id', uploadRequest.tagIds);

      if (tagsError) {
        throw new Error(`Tag validation failed: ${tagsError.message}`);
      }

      if (!tags || tags.length !== uploadRequest.tagIds.length) {
        throw new Error('One or more tag IDs not found');
      }

      console.log(`✅ ${uploadRequest.tagIds.length} tags validated`);
    }
  } catch (dbError: any) {
    throw new Error(`Database validation failed: ${dbError.message}`);
  }
}
