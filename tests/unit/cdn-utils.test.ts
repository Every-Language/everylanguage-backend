import { createSignedCdnUrl } from '../../supabase/functions/_shared/cdn-utils.ts';

describe('cdn-utils', () => {
  it('creates signed CDN URL with token and exp', async () => {
    const base = 'https://cdn.everylanguage.com';
    const key = 'path/to/file.mp3';
    const secret = 'test-secret';
    const url = await createSignedCdnUrl(base, key, secret, 60);
    const u = new URL(url);
    expect(u.origin).toBe(base);
    expect(u.pathname).toBe('/path/to/file.mp3');
    expect(u.searchParams.get('token')).toBeTruthy();
    const exp = Number(u.searchParams.get('exp'));
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
