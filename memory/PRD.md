# Lineup — Queue Management System

## Overview
Mobile-first queue system (Expo RN + FastAPI + MongoDB) supporting four roles: Admin, Merchant (multi-shop), Customer/Member, and public TV Display. Professional iOS-styled UI with dynamic themes, subscription quota system, and QRIS payment flow.

## Architecture
- **Backend**: FastAPI + MongoDB (motor), bcrypt + JWT auth. All endpoints prefixed `/api`.
- **Frontend**: Expo Router file-based routing. `ThemeProvider` fetches `/api/settings` so admin-selected theme + app logo propagate app-wide live.
- **Design**: System iOS font (`-apple-system`, SF Pro Display), professional palette, soft shadows, rounded cards, glassmorphism accents on TV.

## Roles & UX
- **Home (public)** — Merchant list with photo, logo, address, hours, open/closed pill, service count. Header shows app logo + "Masuk" button (or settings/dashboard icons when authenticated).
- **Admin** — Seeded from env. Sees app settings (logo, theme, app name), subscription package CRUD, user subscription management, per-merchant queue stats, merchant approval workflow, global stats.
- **Merchant** — Multi-merchant support. Dashboard shows now-serving, call next/serve/skip, categories. Settings lets them edit logo, home photo, TV-background photo, address, hours, open/closed toggle. Can generate & share QR code linking to their merchant page.
- **Customer** — Browses merchants, picks service category, takes number, sees live position + ETA. Buys subscription packages (priced in Rupiah) via QRIS payment flow. Current MVP uses a mock QRIS confirmation — will be swapped to Midtrans QRIS once merchant keys are provided.
- **TV Display** — Full-screen merchant photo as background with dark overlay; merchant logo + big "NOW SERVING" number + upcoming queue list. Responsive landscape/portrait.

## Subscription system
- Admin creates packages: name, description, price (Rp), quota count, duration (days), active toggle.
- User buys a package → payment record created with QR data → user confirms (mock) → subscription created with `credits_remaining` = quota_count and `expires_at` = now + duration.
- Each queue join decrements 1 credit. When 0 or expired, user is blocked and prompted to buy.
- Admin can change subscription status (active/suspended/expired) and credits directly.

## Themes (admin-selectable)
1. **Slate & Emerald** (default, professional)
2. **Navy & Gold**
3. **Graphite Mono**
4. **Plum & Lavender**
5. **Teal & Coral**

## Integrations roadmap
- **QRIS payment**: Currently mocked. Midtrans playbook gathered; will swap in real Snap API + webhook + HMAC-SHA512 signature verification once `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` are provided.
- **Emergent Google OAuth**: ✅ IMPLEMENTED. Frontend `signInWithGoogle()` redirects to `auth.emergentagent.com` with dynamic `window.location.origin + '/'` as redirect. Hash-based `session_id` caught on app mount, exchanged via `POST /api/auth/oauth/process` → backend calls `demobackend.emergentagent.com/auth/v1/env/oauth/session-data` → user auto-created with role `customer`, JWT returned. `/app/auth_testing.md` documents the flow for the testing agent.
- **Cross-platform notifications**: ✅ IMPLEMENTED. `src/notifications.ts` uses browser Notification API on web (with `navigator.vibrate`) and `expo-notifications` on native. Triggered when queue position ≤ 1 or status becomes `called`. Permission requested on home mount (when authenticated) and queue-status screen mount.

## Data model
- `users`: id, email (unique), password_hash, name, role, created_at
- `merchants`: id, owner_id, name, description, address, logo_url, photo_url, tv_photo_url, hours_text, is_open, status, categories[], created_at
- `packages`: id, name, description, price_idr, quota_count, duration_days, active, created_at
- `subscriptions`: id, user_id, package_id, package_name, credits_remaining, status, expires_at, created_at
- `payments`: id, user_id, package_id, amount_idr, status, order_id, qr_string, created_at, paid_at
- `queue_entries`: id, merchant_id, category_id, category_name, user_id?, customer_name, queue_number, status, created_at, called_at, served_at
- `queue_counters`: key (merchantId:YYYY-MM-DD), seq
- `app_settings`: singleton — app_logo_url, theme_key, app_name
