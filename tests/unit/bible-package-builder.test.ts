import { BiblePackageBuilder } from '../../supabase/functions/_shared/bible-package-builder';
import type { PackageRequest } from '../../supabase/functions/_shared/bible-package-types';

describe('BiblePackageBuilder', () => {
  let builder: BiblePackageBuilder;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };
    builder = new BiblePackageBuilder(mockSupabaseClient);
  });

  describe('Single Package Building', () => {
    it('should build a single package when no chunking is needed', async () => {
      // Mock small package that doesn't need chunking
      const mockQueries = {
        getAudioVersionData: jest.fn().mockResolvedValue({
          audioVersion: { id: 'test-audio', name: 'Test Audio' },
          mediaFiles: [{ id: 'file1', file_size: 1024 * 1024 * 100 }], // 100MB
          verseTimings: [],
          targets: [],
          tags: [],
        }),
      };

      // Mock the queries property
      (builder as any).queries = mockQueries;

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: false,
      };

      // Mock the private methods
      (builder as any).validateRequest = jest.fn().mockResolvedValue(undefined);
      (builder as any).gatherPackageData = jest.fn().mockResolvedValue({
        packageType: 'audio',
        audioVersion: { audioVersion: { id: 'test' } },
      });
      (builder as any).createPackageDatabase = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]));
      (builder as any).prepareAudioData = jest
        .fn()
        .mockResolvedValue(new Uint8Array([4, 5, 6]));
      (builder as any).createManifest = jest.fn().mockReturnValue({
        packageId: 'test-package',
        packageType: 1,
      });
      (builder as any).assemblePackage = jest
        .fn()
        .mockReturnValue(new Uint8Array([7, 8, 9]));

      const result = await builder.build(request);

      expect(result.packageBuffer).toBeDefined();
      expect(result.manifest).toBeDefined();
      expect(result.sizeInBytes).toBe(3);
      expect(result.packages).toBeUndefined();
    });
  });

  describe('Multi-Package Building', () => {
    it('should build multiple packages when chunking is enabled and size exceeds limit', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: true,
        maxSizeMB: 100, // Small limit to force chunking
      };

      // Mock large estimated size
      (builder as any).estimatePackageSize = jest.fn().mockResolvedValue(500); // 500MB
      (builder as any).buildChunkedSeries = jest.fn().mockResolvedValue({
        packages: [
          {
            packageBuffer: new Uint8Array([1, 2]),
            manifest: { packageId: 'part-1', seriesInfo: {} },
            sizeInBytes: 2,
            partNumber: 1,
          },
          {
            packageBuffer: new Uint8Array([3, 4]),
            manifest: { packageId: 'part-2', seriesInfo: {} },
            sizeInBytes: 2,
            partNumber: 2,
          },
        ],
        seriesInfo: {
          seriesId: 'test-series',
          seriesName: 'Test Series',
          totalParts: 2,
          chunkingStrategy: 'size',
          estimatedTotalSizeMB: 500,
        },
      });

      const result = await builder.build(request);

      expect(result.packages).toHaveLength(2);
      expect(result.seriesInfo).toBeDefined();
      expect(result.seriesInfo?.totalParts).toBe(2);
      expect(result.packageBuffer).toBeUndefined();
    });

    it('should build single package when chunking enabled but size under limit', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        enableChunking: true,
        maxSizeMB: 1000, // Large limit
      };

      // Mock small estimated size
      (builder as any).estimatePackageSize = jest.fn().mockResolvedValue(50); // 50MB
      (builder as any).buildSinglePackage = jest.fn().mockResolvedValue({
        packageBuffer: new Uint8Array([1, 2, 3]),
        manifest: { packageId: 'single-package' },
        sizeInBytes: 3,
      });

      const result = await builder.build(request);

      expect(result.packageBuffer).toBeDefined();
      expect(result.packages).toBeUndefined();
      expect((builder as any).buildChunkedSeries).not.toHaveBeenCalled();
    });
  });

  describe('Package Type Conversion', () => {
    it('should convert audio package type to audio chunk', () => {
      const chunkType = (builder as any).getChunkPackageType('audio');
      expect(chunkType).toBe(4); // AUDIO_CHUNK
    });

    it('should convert text package type to text chunk', () => {
      const chunkType = (builder as any).getChunkPackageType('text');
      expect(chunkType).toBe(5); // TEXT_CHUNK
    });

    it('should convert combined package type to combined chunk', () => {
      const chunkType = (builder as any).getChunkPackageType('combined');
      expect(chunkType).toBe(6); // COMBINED_CHUNK
    });

    it('should default to audio only for unknown types', () => {
      const chunkType = (builder as any).getChunkPackageType('unknown');
      expect(chunkType).toBe(1); // AUDIO_ONLY
    });
  });

  describe('Size Estimation', () => {
    it('should estimate audio package size correctly', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'media_files') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: [
                    { file_size: 1024 * 1024 * 100 }, // 100MB
                    { file_size: 1024 * 1024 * 200 }, // 200MB
                  ],
                })),
              })),
            })),
          };
        }
        return { select: jest.fn() };
      });

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
      };

      const size = await (builder as any).estimatePackageSize(request);
      expect(size).toBe(300); // 300MB
    });

    it('should estimate text package size correctly', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'verse_texts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: [
                    { verse_text: 'a'.repeat(1000) }, // 1KB
                    { verse_text: 'b'.repeat(2000) }, // 2KB
                  ],
                })),
              })),
            })),
          };
        }
        return { select: jest.fn() };
      });

      const request: PackageRequest = {
        packageType: 'text',
        textVersionId: 'test-text-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
      };

      const size = await (builder as any).estimatePackageSize(request);
      expect(size).toBeCloseTo(0.006, 3); // ~6KB in MB
    });
  });

  describe('Error Handling', () => {
    it('should handle build failures gracefully', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
      };

      (builder as any).validateRequest = jest
        .fn()
        .mockRejectedValue(new Error('Validation failed'));

      await expect(builder.build(request)).rejects.toThrow(
        'Package build failed: Validation failed'
      );
    });
  });
});
