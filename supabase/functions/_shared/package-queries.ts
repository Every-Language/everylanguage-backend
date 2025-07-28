import type {
  AudioVersionData,
  TextVersionData,
  BibleStructureData,
} from './bible-package-types.ts';

export class PackageQueries {
  constructor(private supabaseClient: any) {}

  async getAudioVersionWithAllData(
    audioVersionId: string
  ): Promise<AudioVersionData> {
    try {
      // Get audio version
      const { data: audioVersion, error: audioError } =
        await this.supabaseClient
          .from('audio_versions')
          .select('*')
          .eq('id', audioVersionId)
          .single();

      if (audioError) {
        throw new Error(`Audio version not found: ${audioError.message}`);
      }

      // Get all media files for this version
      const { data: mediaFiles, error: mediaError } = await this.supabaseClient
        .from('media_files')
        .select('*')
        .eq('audio_version_id', audioVersionId)
        .eq('publish_status', 'published')
        .is('deleted_at', null)
        .order('start_verse_id');

      if (mediaError) {
        throw new Error(`Failed to fetch media files: ${mediaError.message}`);
      }

      // Get verse timing data
      const mediaFileIds = mediaFiles.map((mf: any) => mf.id);
      let verseTimings: any[] = [];

      if (mediaFileIds.length > 0) {
        const { data: timingData, error: timingError } =
          await this.supabaseClient
            .from('media_files_verses')
            .select('*')
            .in('media_file_id', mediaFileIds)
            .is('deleted_at', null)
            .order('start_time_seconds');

        if (timingError) {
          console.warn('Failed to fetch verse timings:', timingError.message);
        } else {
          verseTimings = timingData ?? [];
        }
      }

      // Get targets data (for future extensibility)
      let targets: any[] = [];
      if (mediaFileIds.length > 0) {
        const { data: targetData, error: targetError } =
          await this.supabaseClient
            .from('media_files_targets')
            .select('*')
            .in('media_file_id', mediaFileIds)
            .is('deleted_at', null);

        if (targetError) {
          console.warn('Failed to fetch targets:', targetError.message);
        } else {
          targets = targetData ?? [];
        }
      }

      // Get tags
      let tags: any[] = [];
      if (mediaFileIds.length > 0) {
        const { data: tagData, error: tagError } = await this.supabaseClient
          .from('media_files_tags')
          .select(
            `
            *,
            tags (*)
          `
          )
          .in('media_file_id', mediaFileIds);

        if (tagError) {
          console.warn('Failed to fetch tags:', tagError.message);
        } else {
          tags = tagData
            ? tagData.map((mt: any) => mt.tags).filter(Boolean)
            : [];
        }
      }

      return {
        audioVersion,
        mediaFiles: mediaFiles ?? [],
        verseTimings,
        targets,
        tags,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get audio version data: ${message}`);
    }
  }

  async getTextVersionWithAllData(
    textVersionId: string
  ): Promise<TextVersionData> {
    try {
      // Get text version
      const { data: textVersion, error: textError } = await this.supabaseClient
        .from('text_versions')
        .select('*')
        .eq('id', textVersionId)
        .single();

      if (textError) {
        throw new Error(`Text version not found: ${textError.message}`);
      }

      // Get all verse texts
      const { data: verseTexts, error: verseError } = await this.supabaseClient
        .from('verse_texts')
        .select('*')
        .eq('text_version_id', textVersionId)
        .eq('publish_status', 'published')
        .is('deleted_at', null)
        .order('verse_id');

      if (verseError) {
        throw new Error(`Failed to fetch verse texts: ${verseError.message}`);
      }

      return {
        textVersion,
        verseTexts: verseTexts ?? [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get text version data: ${message}`);
    }
  }

  async getBibleStructureData(
    bibleVersionId: string
  ): Promise<BibleStructureData> {
    try {
      // Get bible version
      const { data: bibleVersion, error: bibleError } =
        await this.supabaseClient
          .from('bible_versions')
          .select('*')
          .eq('id', bibleVersionId)
          .single();

      if (bibleError) {
        throw new Error(`Bible version not found: ${bibleError.message}`);
      }

      // Get all books
      const { data: books, error: booksError } = await this.supabaseClient
        .from('books')
        .select('*')
        .eq('bible_version_id', bibleVersionId)
        .order('book_number');

      if (booksError) {
        throw new Error(`Failed to fetch books: ${booksError.message}`);
      }

      // Get all chapters
      const bookIds = books?.map((b: any) => b.id) ?? [];
      let chapters: any[] = [];

      if (bookIds.length > 0) {
        const { data: chapterData, error: chaptersError } =
          await this.supabaseClient
            .from('chapters')
            .select('*')
            .in('book_id', bookIds)
            .order('book_id, chapter_number');

        if (chaptersError) {
          throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
        }
        chapters = chapterData ?? [];
      }

      // Get all verses
      const chapterIds = chapters.map((c: any) => c.id);
      let verses: any[] = [];

      if (chapterIds.length > 0) {
        const { data: verseData, error: versesError } =
          await this.supabaseClient
            .from('verses')
            .select('*')
            .in('chapter_id', chapterIds)
            .order('chapter_id, verse_number');

        if (versesError) {
          throw new Error(`Failed to fetch verses: ${versesError.message}`);
        }
        verses = verseData ?? [];
      }

      return {
        bibleVersion,
        books: books ?? [],
        chapters,
        verses,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get Bible structure data: ${message}`);
    }
  }

  async getLanguageEntityWithRegion(languageEntityId: string): Promise<any> {
    try {
      const { data: languageEntity, error } = await this.supabaseClient
        .from('language_entities')
        .select(
          `
          *,
          language_entities_regions (
            regions (*)
          )
        `
        )
        .eq('id', languageEntityId)
        .single();

      if (error) {
        throw new Error(`Language entity not found: ${error.message}`);
      }

      // Extract region from nested structure
      const region =
        languageEntity?.language_entities_regions?.[0]?.regions ?? null;

      return {
        languageEntity,
        region,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get language entity: ${message}`);
    }
  }

  async validateAudioVersionExists(audioVersionId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('audio_versions')
        .select('id')
        .eq('id', audioVersionId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async validateTextVersionExists(textVersionId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('text_versions')
        .select('id')
        .eq('id', textVersionId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async validateLanguageEntityExists(
    languageEntityId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('language_entities')
        .select('id')
        .eq('id', languageEntityId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}
