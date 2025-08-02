import { createHash } from 'crypto';

// Mock Deno's crypto module for Jest testing
export const crypto = {
  subtle: {
    digestSync(algorithm: string, data: Uint8Array): ArrayBuffer {
      const nodeAlgorithm = algorithm.toLowerCase().replace('-', '');
      const hash = createHash(nodeAlgorithm);
      hash.update(data);
      return hash.digest().buffer;
    },
  },
};
