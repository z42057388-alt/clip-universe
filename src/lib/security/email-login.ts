export function isCompleteEmailOtp(value: string) {
  return /^\d{6,8}$/.test(value);
}