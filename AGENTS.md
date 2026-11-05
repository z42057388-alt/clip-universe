# Project Architecture Rules

- Validate creator-only identity badges in a security-definer database function, because client-side restrictions can be bypassed.
- Award upload currency with an AFTER INSERT database trigger, so every eligible video is rewarded exactly once regardless of client behavior.
- Keep recovery-code HMAC verifiers and owner-bound AES-GCM ciphertext accessible only to service-role account-security code; require owner re-verification to reveal or rotate, because a browser session alone must not expose recovery credentials.
- Replace recovery codes through an atomic revision-checked database function with a unique verifier constraint, so failed or concurrent replacement cannot invalidate the previous code.
- Use supported Cloud Auth recovery flows only; code-verified support requests must not mint sessions or claim login until a supported production method exists.
- Authorize email-based security actions only with signature-verified Auth claims bound to the current user and email and a recent OTP AMR timestamp; refreshed token issuance and typed email do not prove mailbox access.