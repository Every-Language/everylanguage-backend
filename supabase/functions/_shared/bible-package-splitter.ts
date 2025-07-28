import type {
  PackageRequest,
  ChunkingPlan,
  ChunkInfo,
  BookWithSize,
} from './bible-package-types.ts';

// New class for intelligent package splitting
export class BiblePackageSplitter {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async createChunkingPlan(request: PackageRequest): Promise<ChunkingPlan> {
    const strategy = request.chunkingStrategy ?? 'size';
    const maxSizeMB = request.maxSizeMB ?? 2048;

    switch (strategy) {
      case 'testament':
        return await this.createTestamentChunks(request);
      case 'book_group':
        return await this.createBookGroupChunks(request, maxSizeMB);
      case 'size':
        return await this.createSizeBasedChunks(request, maxSizeMB);
      case 'custom':
        return await this.createCustomChunks(request);
      default:
        throw new Error(`Unknown chunking strategy: ${String(strategy)}`);
    }
  }

  private async createTestamentChunks(
    request: PackageRequest
  ): Promise<ChunkingPlan> {
    const versionId = request.audioVersionId ?? request.textVersionId;
    const seriesId = versionId
      ? `${versionId}-testament-split`
      : 'unknown-testament-split';
    const versionName = await this.getVersionName(request);

    return {
      seriesId,
      seriesName: `${versionName} (Testament Split)`,
      estimatedTotalSizeMB: await this.estimateTotalSize(request),
      chunks: [
        {
          range: { startBook: 'gen', endBook: 'mal' },
          description: 'Old Testament',
          isComplete: true,
          estimatedSizeMB: 0, // Will be calculated
        },
        {
          range: { startBook: 'mat', endBook: 'rev' },
          description: 'New Testament',
          isComplete: true,
          estimatedSizeMB: 0,
        },
      ],
    };
  }

  private async createBookGroupChunks(
    request: PackageRequest,
    _maxSizeMB: number
  ): Promise<ChunkingPlan> {
    const bookGroups = [
      {
        range: { startBook: 'gen', endBook: 'est' },
        description: 'Law & History',
      },
      {
        range: { startBook: 'job', endBook: 'sol' },
        description: 'Wisdom & Poetry',
      },
      {
        range: { startBook: 'isa', endBook: 'mal' },
        description: 'Prophets',
      },
      {
        range: { startBook: 'mat', endBook: 'act' },
        description: 'Gospels & Acts',
      },
      {
        range: { startBook: 'rom', endBook: 'rev' },
        description: 'Epistles & Revelation',
      },
    ];

    // Filter groups that have content and estimate sizes
    const validChunks = [];
    for (const group of bookGroups) {
      const estimatedSize = await this.estimateChunkSize(request, group.range);
      if (estimatedSize > 0) {
        validChunks.push({
          ...group,
          isComplete: true,
          estimatedSizeMB: estimatedSize,
        });
      }
    }

    const versionId = request.audioVersionId ?? request.textVersionId;
    const seriesId = versionId
      ? `${versionId}-bookgroup-split`
      : 'unknown-bookgroup-split';
    const versionName = await this.getVersionName(request);

    return {
      seriesId,
      seriesName: `${versionName} (Book Groups)`,
      estimatedTotalSizeMB: validChunks.reduce(
        (sum, chunk) => sum + chunk.estimatedSizeMB,
        0
      ),
      chunks: validChunks,
    };
  }

  private async createSizeBasedChunks(
    request: PackageRequest,
    maxSizeMB: number
  ): Promise<ChunkingPlan> {
    // Get all books and their estimated sizes
    const books = await this.getBooksWithSizes(request);
    const chunks: ChunkInfo[] = [];

    let currentChunk: ChunkInfo | null = null;
    let currentSizeMB = 0;

    for (const book of books) {
      if (!currentChunk || currentSizeMB + book.sizeMB > maxSizeMB) {
        // Start new chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        currentChunk = {
          range: { startBook: book.osisId, endBook: book.osisId },
          description: `Books: ${book.name}`,
          isComplete: true,
          estimatedSizeMB: book.sizeMB,
        };
        currentSizeMB = book.sizeMB;
      } else {
        // Add to current chunk
        currentChunk.range.endBook = book.osisId;
        const separator = currentChunk.description.includes('..') ? '' : ' .. ';
        currentChunk.description = currentChunk.description.includes('..')
          ? currentChunk.description
          : currentChunk.description + separator + book.name;
        currentChunk.estimatedSizeMB += book.sizeMB;
        currentSizeMB += book.sizeMB;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    const versionId = request.audioVersionId ?? request.textVersionId;
    const seriesId = versionId
      ? `${versionId}-size-split`
      : 'unknown-size-split';
    const versionName = await this.getVersionName(request);

    return {
      seriesId,
      seriesName: `${versionName} (Size-Based Split)`,
      estimatedTotalSizeMB: chunks.reduce(
        (sum, chunk) => sum + chunk.estimatedSizeMB,
        0
      ),
      chunks,
    };
  }

  private async createCustomChunks(
    request: PackageRequest
  ): Promise<ChunkingPlan> {
    if (!request.customChunkRange) {
      throw new Error(
        'Custom chunking requires customChunkRange to be specified'
      );
    }

    const estimatedSize = await this.estimateChunkSize(
      request,
      request.customChunkRange
    );

    const versionId = request.audioVersionId ?? request.textVersionId;
    const seriesId = versionId
      ? `${versionId}-custom-split`
      : 'unknown-custom-split';
    const versionName = await this.getVersionName(request);
    const rangeDesc = `${request.customChunkRange.startBook} - ${
      request.customChunkRange.endBook
    }`;

    return {
      seriesId,
      seriesName: `${versionName} (Custom Split)`,
      estimatedTotalSizeMB: estimatedSize,
      chunks: [
        {
          range: request.customChunkRange,
          description: rangeDesc,
          isComplete: true,
          estimatedSizeMB: estimatedSize,
        },
      ],
    };
  }

  private async getBooksWithSizes(
    request: PackageRequest
  ): Promise<BookWithSize[]> {
    // Get all books for the bible version
    const versionId = request.audioVersionId ?? request.textVersionId;
    if (!versionId) {
      throw new Error(
        'Either audioVersionId or textVersionId must be provided'
      );
    }

    // Get bible version ID to find books
    let bibleVersionId: string;
    if (request.audioVersionId) {
      const { data: audioVersion } = await this.supabaseClient
        .from('audio_versions')
        .select('bible_version_id')
        .eq('id', request.audioVersionId)
        .single();
      bibleVersionId = audioVersion?.bible_version_id;
    } else {
      const { data: textVersion } = await this.supabaseClient
        .from('text_versions')
        .select('bible_version_id')
        .eq('id', request.textVersionId)
        .single();
      bibleVersionId = textVersion?.bible_version_id;
    }

    if (!bibleVersionId) {
      throw new Error('Could not find bible version');
    }

    const { data: books } = await this.supabaseClient
      .from('books')
      .select('id, name, osis_id, book_number')
      .eq('bible_version_id', bibleVersionId)
      .order('book_number');

    const booksWithSizes: BookWithSize[] = [];

    for (const book of books ?? []) {
      const sizeMB = await this.estimateBookSize(request, book.osis_id);
      booksWithSizes.push({
        osisId: book.osis_id,
        name: book.name,
        sizeMB,
      });
    }

    return booksWithSizes;
  }

  private async estimateBookSize(
    request: PackageRequest,
    bookOsisId: string
  ): Promise<number> {
    // Estimate size based on audio files or text content
    if (request.audioVersionId) {
      const { data: mediaFiles } = await this.supabaseClient
        .from('media_files')
        .select('file_size')
        .eq('audio_version_id', request.audioVersionId)
        .like('start_verse_id', `${bookOsisId}-%`);

      const totalBytes =
        mediaFiles?.reduce(
          (sum: number, file: any) => sum + (file.file_size ?? 0),
          0
        ) ?? 0;
      return totalBytes / (1024 * 1024); // Convert to MB
    } else {
      // For text versions, estimate based on verse count
      const { data: verses } = await this.supabaseClient
        .from('verse_texts')
        .select('verse_text')
        .eq('text_version_id', request.textVersionId)
        .like('verse_id', `${bookOsisId}-%`);

      const totalChars =
        verses?.reduce(
          (sum: number, verse: any) => sum + verse.verse_text.length,
          0
        ) ?? 0;
      return (totalChars * 2) / (1024 * 1024); // Estimate 2 bytes per char, convert to MB
    }
  }

  private async estimateChunkSize(
    request: PackageRequest,
    range: { startBook: string; endBook: string }
  ): Promise<number> {
    // Get all books in range and sum their sizes
    const books = await this.getBooksWithSizes(request);
    const startIndex = books.findIndex(book => book.osisId === range.startBook);
    const endIndex = books.findIndex(book => book.osisId === range.endBook);

    if (startIndex === -1 || endIndex === -1) {
      return 0;
    }

    const booksInRange = books.slice(startIndex, endIndex + 1);
    return booksInRange.reduce((sum, book) => sum + book.sizeMB, 0);
  }

  private async getVersionName(request: PackageRequest): Promise<string> {
    if (request.audioVersionId) {
      const { data: version } = await this.supabaseClient
        .from('audio_versions')
        .select('name')
        .eq('id', request.audioVersionId)
        .single();
      return version?.name ?? 'Unknown Audio Version';
    } else if (request.textVersionId) {
      const { data: version } = await this.supabaseClient
        .from('text_versions')
        .select('name')
        .eq('id', request.textVersionId)
        .single();
      return version?.name ?? 'Unknown Text Version';
    }
    return 'Unknown Version';
  }

  private async estimateTotalSize(request: PackageRequest): Promise<number> {
    const books = await this.getBooksWithSizes(request);
    return books.reduce((sum, book) => sum + book.sizeMB, 0);
  }
}
