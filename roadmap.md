# Roadmap

- [ ] Fix security requests from this project's managed preview origins and verify rejection of unrelated sites

- [x] Replace password/code proof controls with account-bound email-link verification for code reveal/rotation and session termination; keep only email entry, never authorize by an address alone
- [x] Verify email proof rejection rules, authenticated UI, wrong-email refusal and real email send request
- [ ] Complete security email link and reveal end-to-end — blocked: mailbox link access unavailable

- [x] Account security: permanent unique recovery codes, encrypted private settings and atomic confirmed rotation
- [x] Code-verified recovery requests, temporary attempt protection and standard email reset pages
- [x] Private security events, new-browser notifications, password changes and global session termination
- [x] Admin-only support request review and replies; no account takeover from unverified appeals
- [x] Seven automated tests; authenticated code creation/copy/hide/rotation, failed replacement preservation, password change, signout, request creation and attempt blocking verified; mobile layout checked
- [ ] Direct login by security code — blocked: not a supported Cloud Auth method; do not bypass session-mint restrictions
- [ ] Telegram recovery bot — blocked: bot credentials and connection are absent; interface and actual in-app requests provided
- [ ] Email reset delivery and password-reset link completion — blocked: test mailbox access unavailable
- [ ] Dedicated distributed bot protection — blocked: external anti-abuse infrastructure not connected; approved temporary database counters active
- [ ] Plugin security foundations — paused by user's account-security request

- [x] Channel posts (channel_posts table + Posts tab)
- [x] Currency ViewTubdolar: +20 per published video ≥2 min; only admin + moderators can grant any amount
- [x] Avatar frame shop (diamond-red = 5000) + backpack + equip frame
- [x] Homepage video pinning for admin + moderators, max 10
- [x] Creator-only light-gray verification badge
- [x] Cyberpunk neon-red avatar frame (4000 VTD)
