// Only call with claims obtained from Auth's signature-verified getClaims API.
export function hasRecentEmailProof(claims: Record<string, unknown>, userId: string, email: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!email || claims.sub !== userId || claims.email !== email || !Array.isArray(claims.amr)) return false;
  return claims.amr.some((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return method === 'otp' && typeof timestamp === 'number' && Number.isInteger(timestamp) && timestamp <= now && now - timestamp < 600;
  });
}