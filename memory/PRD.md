# Queue Management System — PRD

## Overview
Lineup is a cross-platform queue management system for merchants and customers. It includes:
- Mobile app (Expo React Native) for customers, merchants, and admins
- Responsive TV display view (landscape) served from the same app (accessible via browser)
- FastAPI + MongoDB backend

## Roles
- **Admin** — Seeded from env (ADMIN_EMAIL / ADMIN_PASSWORD). Manages all merchants (approve/reject/suspend), views users, global stats.
- **Merchant** — Can own multiple merchant profiles. Each new merchant is `pending` until admin approves. Manages service categories, calls next, marks served/skipped.
- **Customer (Member)** — Browses approved merchants, picks a service category, takes queue number, sees live position + ETA, gets alert when it is almost their turn.
- **TV Display** — Public, no login. Shows "now serving", upcoming queue list, recent served.

## Key Features
- JWT auth (register/login/me) with roles
- Per-merchant daily queue numbering
- Multiple service categories per merchant (with configurable avg service time → ETA)
- Live queue updates via polling (2.5–4 s)
- In-app alerts when customer is next or called
- Admin approval workflow for new merchants
- Pastel iOS-style glassmorphism UI

## Data model (MongoDB)
- `users`: id (uuid), email (unique), password_hash, name, role, created_at
- `merchants`: id, owner_id, name, description, address, image_url, status, categories[], created_at
- `queue_entries`: id, merchant_id, category_id, category_name, user_id?, customer_name, queue_number, status, created_at, called_at, served_at
- `queue_counters`: key (merchantId:YYYY-MM-DD), seq

## Frontend routes (Expo Router)
- `/` — Welcome / login / register
- `/customer/merchants` — Merchant list
- `/customer/merchant/[id]` — Merchant detail + choose category
- `/customer/queue/[id]` — Live queue status
- `/customer/my-queue` — My active queues
- `/merchant/dashboard` — Merchant dashboard (queue, categories)
- `/merchant/register` — Create merchant profile
- `/admin` — Admin panel (stats, approvals, users)
- `/tv` — Pick merchant for TV display
- `/tv/[merchantId]` — TV display (landscape)

## Integrations
- Authentication: custom JWT (email + password). Emergent Google OAuth is planned for future iterations; current MVP ships with custom JWT only.
