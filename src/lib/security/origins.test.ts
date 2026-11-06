import { describe, it, expect } from 'vitest';
import { allowedOrigin } from '../../../supabase/functions/account-security/origins';
describe('security allowed app origins', () => {
  it('accepts this app published and managed preview origins', () => {
    for (const origin of ['https://clip-universe.lovable.app','https://preview--clip-universe.lovable.app','https://8787c644-648d-490b-8a91-ad09ced1e3e0.lovableproject.com','https://id-preview--8787c644-648d-490b-8a91-ad09ced1e3e0.lovable.app']) expect(allowedOrigin(origin)).toBe(true);
  });
  it('rejects other projects, lookalike domains and insecure origins', () => {
    for (const origin of ['https://different.lovableproject.com','https://id-preview--other.lovable.app','https://clip-universe.lovable.app.evil.test','http://clip-universe.lovable.app','https://clip-universe.lovable.app/path']) expect(allowedOrigin(origin)).toBe(false);
  });
});