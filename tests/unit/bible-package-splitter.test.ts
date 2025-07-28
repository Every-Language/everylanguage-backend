import { BiblePackageSplitter } from '../../supabase/functions/_shared/bible-package-splitter';
import type { PackageRequest } from '../../supabase/functions/_shared/bible-package-types';

describe('BiblePackageSplitter', () => {
  let splitter: BiblePackageSplitter;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(() => ({ data: [] })),
          })),
          like: jest.fn(() => ({ data: [] })),
          order: jest.fn(() => ({ data: [] })),
        })),
      })),
    };
    splitter = new BiblePackageSplitter(mockSupabaseClient);
  });

  describe('Testament-Based Chunking', () => {
    it('should create Old Testament and New Testament chunks', async () => {
      // Mock version name
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'audio_versions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { name: 'NIV English Audio' },
                })),
              })),
            })),
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(), like: jest.fn() })) };
      });

      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version',
        languageEntityId: 'english',
        requestedBy: 'test-user',
        chunkingStrategy: 'testament',
      };

      const plan = await splitter.createChunkingPlan(request);

      expect(plan.seriesId).toContain('testament-split');
      expect(plan.seriesName).toBe('NIV English Audio (Testament Split)');
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
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'audio_versions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { name: 'Custom Audio Bible' },
                })),
              })),
            })),
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(), like: jest.fn() })) };
      });

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
