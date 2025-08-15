import { presignUrl } from '../../supabase/functions/_shared/r2-s3-signer.ts';

describe('r2-s3-signer', () => {
  it('generates a presigned GET url', async () => {
    const url = await presignUrl(
      {
        accessKeyId: 'AKIA_TEST',
        secretAccessKey: 'SECRET',
        region: 'auto',
        service: 's3',
      },
      {
        method: 'GET',
        url: 'https://example.r2.cloudflarestorage.com/bucket/object',
        expiresInSeconds: 60,
      }
    );
    const u = new URL(url);
    expect(u.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(u.searchParams.get('X-Amz-Credential')).toBeTruthy();
    expect(u.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});
