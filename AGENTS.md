# Project Architecture Rules

- Validate creator-only identity badges in a security-definer database function, because client-side restrictions can be bypassed.
- Award upload currency with an AFTER INSERT database trigger, so every eligible video is rewarded exactly once regardless of client behavior.