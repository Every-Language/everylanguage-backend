import { BiblePackageSplitter } from '../../supabase/functions/_shared/bible-package-splitter';
import type { PackageRequest } from '../../supabase/functions/_shared/bible-package-types';

describe('BiblePackageSplitter', () => {
  let splitter: BiblePackageSplitter;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn((table: string) => {
        if (table === 'audio_versions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    bible_version_id: 'test-bible-version',
                    name: 'Test Audio Version',
                  },
                })),
              })),
            })),
          };
        }
        if (table === 'text_versions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    bible_version_id: 'test-bible-version',
                    name: 'Test Text Version',
                  },
                })),
              })),
            })),
          };
        }
        if (table === 'books') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: [
                    {
                      id: 'gen',
                      name: 'Genesis',
                      osis_id: 'gen',
                      book_number: 1,
                    },
                    {
                      id: 'exo',
                      name: 'Exodus',
                      osis_id: 'exo',
                      book_number: 2,
                    },
                    {
                      id: 'mal',
                      name: 'Malachi',
                      osis_id: 'mal',
                      book_number: 39,
                    },
                    {
                      id: 'mat',
                      name: 'Matthew',
                      osis_id: 'mat',
                      book_number: 40,
                    },
                    {
                      id: 'rev',
                      name: 'Revelation',
                      osis_id: 'rev',
                      book_number: 66,
                    },
                  ],
                })),
              })),
            })),
          };
        }
        if (table === 'media_files') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                like: jest.fn(() => ({
                  data: [
                    { file_size: 1024 * 1024 * 50 }, // 50MB
                    { file_size: 1024 * 1024 * 30 }, // 30MB
                  ],
                })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: null })),
              order: jest.fn(() => ({ data: [] })),
              like: jest.fn(() => ({ data: [] })),
            })),
            like: jest.fn(() => ({ data: [] })),
            order: jest.fn(() => ({ data: [] })),
          })),
        };
      }),
    };
    splitter = new BiblePackageSplitter(mockSupabaseClient);
  });

  describe('Testament-Based Chunking', () => {
    it('should create Old Testament and New Testament chunks', async () => {
      // Remove the duplicate mock - already handled in beforeEach

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'testament',
      };

      const plan = await splitter.createChunkingPlan(request);

      expect(plan.seriesId).toContain('testament-split');
      expect(plan.seriesName).toBe('Test Audio Version (Testament Split)');
      expect(plan.chunks).toHaveLength(2);

      expect(plan.chunks[0]).toMatchObject({
        range: { startBook: 'gen', endBook: 'mal' },
        description: 'Old Testament',
        isComplete: true,
      });

      expect(plan.chunks[1]).toMatchObject({
        range: { startBook: 'mat', endBook: 'rev' },
        description: 'New Testament',
        isComplete: true,
      });
    });
  });

  describe('Custom Chunking', () => {
    it('should create custom chunks based on specified range', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'custom',
        customChunkRange: {
          startBook: 'mat',
          endBook: 'joh',
        },
      };

      const plan = await splitter.createChunkingPlan(request);

      expect(plan.chunks).toHaveLength(1);
      expect(plan.chunks[0].range).toEqual({
        startBook: 'mat',
        endBook: 'joh',
      });
      expect(plan.chunks[0].description).toBe('mat - joh');
    });

    it('should throw error for custom chunking without range', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'custom',
        // Missing customChunkRange
      };

      await expect(splitter.createChunkingPlan(request)).rejects.toThrow(
        'Custom chunking requires customChunkRange to be specified'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown chunking strategy', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'unknown' as any,
      };

      await expect(splitter.createChunkingPlan(request)).rejects.toThrow(
        'Unknown chunking strategy: unknown'
      );
    });

    it('should handle missing version IDs', async () => {
      const request: PackageRequest = {
        packageType: 'audio',
        // Missing both audioVersionId and textVersionId
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'size',
      };

      await expect(splitter.createChunkingPlan(request)).rejects.toThrow(
        'Either audioVersionId or textVersionId must be provided'
      );
    });
  });
});
