import { describe, expect, it } from 'vitest';
import { hasRecentEmailProof } from '../../../supabase/functions/account-security/email-proof';

const claims = { sub: 'owner', email: 'owner@example.test', amr: [{ method: 'otp', timestamp: 1000 }] };
describe('email link owner proof', () => {
  it('accepts recent verified email authentication for the same owner', () => {
    expect(hasRecentEmailProof(claims, 'owner', 'owner@example.test', 1001)).toBe(true);
  });
  it('does not authorize by entering an email alone', () => {
    expect(hasRecentEmailProof({ sub: 'owner', email: 'owner@example.test' }, 'owner', 'owner@example.test', 1001)).toBe(false);
  });
  it('rejects another account or mismatched email', () => {
    expect(hasRecentEmailProof(claims, 'other', 'owner@example.test', 1001)).toBe(false);
    expect(hasRecentEmailProof(claims, 'owner', 'other@example.test', 1001)).toBe(false);
  });
  it('rejects password and OAuth sessions as email verification', () => {
    for (const method of ['password', 'oauth']) expect(hasRecentEmailProof({ ...claims, amr: [{ method, timestamp: 1000 }] }, 'owner', 'owner@example.test', 1001)).toBe(false);
  });
  it('expires proof after ten minutes even when token is freshly issued', () => {
    expect(hasRecentEmailProof({ ...claims, iat: 1600 }, 'owner', 'owner@example.test', 1600)).toBe(false);
    expect(hasRecentEmailProof(claims, 'owner', 'owner@example.test', 1599)).toBe(true);
  });
  it('rejects future and malformed proof timestamps', () => {
    expect(hasRecentEmailProof(claims, 'owner', 'owner@example.test', 999)).toBe(false);
    expect(hasRecentEmailProof({ ...claims, amr: [{ method: 'otp', timestamp: '1000' }] }, 'owner', 'owner@example.test', 1001)).toBe(false);
  });
});