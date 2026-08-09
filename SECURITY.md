# Security model

- The site has one logical user: the owner.
- `APP_PASSWORD`, `SESSION_SECRET`, and `DASHSCOPE_API_KEY` are Cloudflare Worker secrets. They must never be committed or placed in `wrangler.jsonc`.
- Successful login creates a signed, 30-day, `HttpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookie.
- Password checks hash both inputs before a constant-time comparison.
- Failed logins are rate-limited per hashed client address in D1.
- State-changing API calls reject cross-origin browser requests.
- The browser never receives the Qwen API key or the configured password.

Report a suspected secret leak by rotating the affected Cloudflare secret and invalidating sessions by rotating `SESSION_SECRET`.
