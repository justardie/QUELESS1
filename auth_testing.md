# Emergent Google OAuth Testing Playbook

This file is read by the testing agent before testing auth-gated flows.

## Flow
1. User taps "Sign in with Google" on `/auth` → redirected to `https://auth.emergentagent.com/?redirect={frontend_origin}/`
2. After Google auth, user returns to `{frontend_origin}/#session_id=...`
3. Frontend detects the hash in `app/_layout.tsx` on mount, calls backend `POST /api/auth/oauth/process` with `{session_id}`, backend exchanges it via Emergent `/session-data`, stores user + session, and returns `{token, user}` (JWT) so mobile + web can both use `Authorization: Bearer <token>`.
4. Token is saved to AsyncStorage under `qms_token` and the hash is cleaned from URL.

## Test accounts
Use any real Google account — the backend creates a matching customer user on first login.

## Backend endpoints
- `POST /api/auth/oauth/process` — body: `{"session_id": "..."}` → returns `{token, user}`

## Quick test (curl)
A Google account is required to obtain a `session_id`. Once you have one:
```
curl -X POST https://<app>.preview.emergentagent.com/api/auth/oauth/process \
  -H 'Content-Type: application/json' \
  -d '{"session_id": "<id-from-url-hash>"}'
```

## Success indicators
- Tapping Google sign-in redirects to auth.emergentagent.com
- After return, `/` is reached with user signed in (AsyncStorage has qms_token)
- `GET /api/auth/me` with that token returns the synced user

## Failure indicators
- Redirect loop
- Hash still present on URL after processing
- 401 from /api/auth/me
