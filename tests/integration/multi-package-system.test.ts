import { BiblePackageBuilder } from '../../supabase/functions/_shared/bible-package-builder';
import { BiblePackageSplitter } from '../../supabase/functions/_shared/bible-package-splitter';
import type { PackageRequest } from '../../supabase/functions/_shared/bible-package-types';

// Mock the B2 services to prevent authentication issues during testing
jest.mock('../../supabase/functions/_shared/b2-auth-service');
jest.mock('../../supabase/functions/_shared/b2-file-service');
jest.mock('../../supabase/functions/_shared/b2-stream-service');
jest.mock('../../supabase/functions/_shared/b2-storage-service');

describe('Multi-Package System Integration', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Comprehensive mock for integration testing
    mockSupabaseClient = {
      from: jest.fn((table: string) => {
        // Audio versions
        if (table === 'audio_versions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'audio-version-1',
                    name: 'Large Audio Bible',
                    bible_version_id: 'bible-1',
                  },
                })),
              })),
            })),
          };
        }

        // Media files - simulate large Bible
        if (table === 'media_files') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: Array.from({ length: 100 }, (_, i) => ({
                    id: `file-${i}`,
                    file_size: 1024 * 1024 * 50, // 50MB each = 5GB total
                    start_verse_id: `gen-1-${i + 1}`,
                    end_verse_id: `gen-1-${i + 2}`,
                  })),
                })),
                like: jest.fn((pattern: string) => {
                  const bookMatch = pattern.match(/^(\w+)-/);
                  const book = bookMatch ? bookMatch[1] : 'gen';

                  // Different sizes for different books
                  const sizes: { [key: string]: number } = {
                    gen: 100, // MB
                    exo: 80,
                    mat: 60,
                    rev: 40,
                  };

                  const fileSize = (sizes[book] || 50) * 1024 * 1024;
                  return {
                    data: [{ file_size: fileSize }],
                  };
                }),
              })),
            })),
          };
        }

        // Books
        if (table === 'books') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: [
                    { osis_id: 'gen', name: 'Genesis', book_number: 1 },
                    { osis_id: 'exo', name: 'Exodus', book_number: 2 },
                    { osis_id: 'mat', name: 'Matthew', book_number: 40 },
                    { osis_id: 'rev', name: 'Revelation', book_number: 66 },
                  ],
                })),
              })),
            })),
          };
        }

        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ data: [] })),
            like: jest.fn(() => ({ data: [] })),
          })),
        };
      }),
    };
  });

  describe('Size-Based Chunking Integration', () => {
    it('should automatically chunk large Bible into multiple packages', async () => {
      const splitter = new BiblePackageSplitter(mockSupabaseClient);

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'audio-version-1',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'size',
        maxSizeMB: 200, // 200MB limit
      };

      const plan = await splitter.createChunkingPlan(request);

      // Should create multiple chunks due to size constraints
      expect(plan.chunks.length).toBeGreaterThan(1);
      expect(plan.seriesId).toContain('size-split');
      expect(plan.seriesName).toContain('Large Audio Bible');

      // Each chunk should respect size limits
      for (const chunk of plan.chunks) {
        expect(chunk.estimatedSizeMB).toBeLessThanOrEqual(200);
        expect(chunk.isComplete).toBe(true);
      }
    });
  });

  describe('Testament-Based Chunking Integration', () => {
    it('should create exactly two chunks for testament splitting', async () => {
      const splitter = new BiblePackageSplitter(mockSupabaseClient);

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'audio-version-1',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'testament',
      };

      const plan = await splitter.createChunkingPlan(request);

      expect(plan.chunks).toHaveLength(2);

      // Old Testament
      expect(plan.chunks[0]).toMatchObject({
        range: { startBook: 'gen', endBook: 'mal' },
        description: 'Old Testament',
        isComplete: true,
      });

      // New Testament
      expect(plan.chunks[1]).toMatchObject({
        range: { startBook: 'mat', endBook: 'rev' },
        description: 'New Testament',
        isComplete: true,
      });
    });
  });

  describe('Package Builder Integration', () => {
    it('should build multiple packages when size exceeds limits', async () => {
      const builder = new BiblePackageBuilder(mockSupabaseClient);

      // Mock the internal methods that would normally interact with database/storage
      (builder as any).validateRequest = jest.fn().mockResolvedValue(undefined);
      (builder as any).gatherPackageData = jest.fn().mockResolvedValue({
        packageType: 'audio',
        languageEntityId: 'english',
        audioVersion: {
          audioVersion: { id: 'audio-version-1', name: 'Large Audio Bible' },
          mediaFiles: [],
          verseTimings: [],
          targets: [],
          tags: [],
        },
        bibleStructure: {
          bibleVersion: { id: 'bible-1', name: 'Test Bible' },
          books: [],
          chapters: [],
          verses: [],
        },
      });
      (builder as any).createPackageDatabase = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]));
      (builder as any).prepareAudioData = jest
        .fn()
        .mockResolvedValue(new Uint8Array([4, 5, 6]));
      (builder as any).createManifest = jest.fn().mockReturnValue({
        packageId: 'test-package',
        packageType: 4, // AUDIO_CHUNK
        seriesInfo: {
          seriesId: 'test-series',
          seriesName: 'Test Series',
          partNumber: 1,
          totalParts: 2,
          chunkingStrategy: 'size',
          isComplete: true,
          estimatedSeriesSizeMB: 1000,
          contentRange: {
            startBook: 'gen',
            endBook: 'exo',
            description: 'Part 1',
          },
        },
      });
      (builder as any).assemblePackage = jest
        .fn()
        .mockReturnValue(new Uint8Array([7, 8, 9]));

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'audio-version-1',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: true,
        maxSizeMB: 100, // Small limit to force chunking
      };

      // Mock size estimation to trigger chunking
      (builder as any).estimatePackageSize = jest.fn().mockResolvedValue(500);

      const result = await builder.build(request);

      expect(result.packages).toBeDefined();
      expect(result.seriesInfo).toBeDefined();
      expect(result.packageBuffer).toBeUndefined(); // Should not have single package
    });

    it('should preserve single package when size is under limit', async () => {
      const builder = new BiblePackageBuilder(mockSupabaseClient);

      // Mock for small package
      (builder as any).validateRequest = jest.fn().mockResolvedValue(undefined);
      (builder as any).gatherPackageData = jest.fn().mockResolvedValue({
        packageType: 'audio',
      });
      (builder as any).createPackageDatabase = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]));
      (builder as any).prepareAudioData = jest
        .fn()
        .mockResolvedValue(new Uint8Array([4, 5, 6]));
      (builder as any).createManifest = jest.fn().mockReturnValue({
        packageId: 'small-package',
        packageType: 1, // AUDIO_ONLY
      });
      (builder as any).assemblePackage = jest
        .fn()
        .mockReturnValue(new Uint8Array([7, 8, 9]));

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'audio-version-1',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: true,
        maxSizeMB: 1000, // Large limit
      };

      // Mock small size estimation
      (builder as any).estimatePackageSize = jest.fn().mockResolvedValue(50);

      const result = await builder.build(request);

      expect(result.packageBuffer).toBeDefined();
      expect(result.manifest).toBeDefined();
      expect(result.packages).toBeUndefined(); // Should not have multi-package
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete package creation workflow', async () => {
      // Test the full workflow from request to package creation
      const builder = new BiblePackageBuilder(mockSupabaseClient);

      // Mock all required methods
      (builder as any).validateRequest = jest.fn().mockResolvedValue(undefined);
      (builder as any).estimatePackageSize = jest.fn().mockResolvedValue(300); // Force chunking
      (builder as any).buildChunkedSeries = jest.fn().mockResolvedValue({
        packages: [
          {
            packageBuffer: new Uint8Array([1, 2, 3]),
            manifest: {
              packageId: 'bible-part-1',
              packageType: 4,
              seriesInfo: {
                seriesId: 'bible-series-1',
                partNumber: 1,
                totalParts: 2,
              },
            },
            sizeInBytes: 3,
            partNumber: 1,
          },
          {
            packageBuffer: new Uint8Array([4, 5, 6]),
            manifest: {
              packageId: 'bible-part-2',
              packageType: 4,
              seriesInfo: {
                seriesId: 'bible-series-1',
                partNumber: 2,
                totalParts: 2,
              },
            },
            sizeInBytes: 3,
            partNumber: 2,
          },
        ],
        seriesInfo: {
          seriesId: 'bible-series-1',
          seriesName: 'Complete Bible Series',
          totalParts: 2,
          chunkingStrategy: 'testament',
          estimatedTotalSizeMB: 300,
        },
      });

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'audio-version-1',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: true,
        maxSizeMB: 200,
        chunkingStrategy: 'testament',
      };

      const result = await builder.build(request);

      // Verify multi-package result
      expect(result.packages).toHaveLength(2);
      expect(result.seriesInfo).toBeDefined();
      expect(result.seriesInfo?.totalParts).toBe(2);
      expect(result.seriesInfo?.seriesId).toBe('bible-series-1');

      // Verify each package has correct series info
      for (const pkg of result.packages!) {
        expect(pkg.manifest.seriesInfo).toBeDefined();
        expect(pkg.manifest.seriesInfo?.seriesId).toBe('bible-series-1');
        expect(pkg.manifest.seriesInfo?.totalParts).toBe(2);
      }
    });
  });
});
