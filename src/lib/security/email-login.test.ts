import { expect, it } from 'vitest';
import { isCompleteEmailOtp } from './email-login';
it('accepts supported email OTP lengths and rejects incomplete or nonnumeric codes', () => {
  expect(isCompleteEmailOtp('123456')).toBe(true);
  expect(isCompleteEmailOtp('12345678')).toBe(true);
  for (const value of ['12345','123456789','abcdef','123 456']) expect(isCompleteEmailOtp(value)).toBe(false);
});