<div align="center">
  <h1>Nextdemy</h1>
  <h3>Full-stack learning platform with a production-shaped mock payment flow</h3>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
    <img alt="Express" src="https://img.shields.io/badge/Express-4-404D59?style=for-the-badge&logo=express&logoColor=white">
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white">
    <img alt="Bun" src="https://img.shields.io/badge/Bun-1.2-000000?style=for-the-badge&logo=bun&logoColor=white">
  </p>
  <p>Built by <a href="https://github.com/AmjadIbrahim1">Amjad</a></p>
</div>

## Overview

Nextdemy is a Turborepo monorepo containing a Next.js 16 learning platform and an
Express + Bun API. Students can browse courses, enroll through a server-verified
demo checkout, watch lessons, and track progress. Instructors can create courses,
upload media, and review revenue and enrollment analytics.

Payments are intentionally **mock-only** in this build. The checkout exercises a
real order lifecycle, signature verification, idempotency, and enrollment rules
without charging money or collecting card data. A real provider can be added
behind the same `PaymentProvider` interface later.

## Tech stack

| Layer | Technology |
|---|---|
| Web | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack Query, shadcn/ui |
| API | Express 4, Bun runtime, Mongoose, Zod, JWT access/refresh tokens, Pino, Helmet, rate limiting |
| Data | MongoDB Atlas (M0 free tier) |
| Media | Cloudinary (optional in the demo) |
| Email | Resend |
| Payments | `MockPaymentProvider` (signed demo sessions) |
| Tooling | Turborepo, Bun workspaces, Biome |

## Monorepo layout

```
nextdemy/
├── apps/
│   ├── api/                    # Express API (Bun runtime)
│   │   └── src/
│   │       ├── configs/        # env, DB, Cloudinary, Resend
│   │       ├── modules/        # auth, course, payment, profile, contact, upload, health
│   │       ├── scripts/        # idempotent demo seed
│   │       ├── shared/         # middleware and utilities
│   │       └── __tests__/      # auth + payment integration tests
│   └── web/                    # Next.js 16 App Router
│       ├── app/                # public, auth, dashboard, checkout
│       ├── features/           # feature-based UI modules
│       └── lib/                # API client, currency, query keys
├── packages/
│   ├── shared-types/           # Zod contracts shared by web and API
│   ├── ui/                     # shadcn/ui component library
│   └── typescript-config/
└── docker/                     # see apps/api/dockerfile
```

## Features

### Students

- Course catalog with categories, ratings, and instructor details
- Cart and a dedicated `/checkout` page with a visible demo-payment notice
- Server-priced orders, signed checkout sessions, retry-safe verification
- Enrolled courses with lesson progress
- Payment history with explicit `Demo` labels

### Instructors

- Course builder with sections, lectures, and Cloudinary uploads
- Draft/published workflow
- Analytics dashboard for students, revenue, and top courses
- Earnings calculated from successful demo payments

### Platform

- JWT access + rotating refresh tokens in httpOnly cookies
- OTP email verification through Resend
- Zod validation at API boundaries
- Helmet, CORS allowlist, global and route-level rate limits
- Same-origin API proxy from Next.js, so refresh cookies work in Safari
- Health endpoint that reports MongoDB readiness

## Payment architecture

```
Browser
  └─ POST /api/v2/payment/checkout  (Idempotency-Key)
       ├─ validates the user and published courses
       ├─ reads prices from MongoDB (never trusts the browser)
       ├─ creates Order (pending) + Payment (pending)
       └─ asks MockPaymentProvider for a signed session
  └─ POST /api/v2/payment/verifyPayment
       ├─ verifies the provider signature server-side
       ├─ moves Order pending → paid exactly once
       ├─ enrolls the student with $addToSet / upsert (no duplicates)
       └─ sends receipt + enrollment emails once
```

- `apps/api/src/modules/payment/providers/payment-provider.interface.ts` defines the
  provider contract.
- `MockPaymentProvider` signs `providerOrderId|paymentId|amount|currency` with
  HMAC-SHA256. The outcome is controlled by `PAYMENT_MOCK_OUTCOME` on the server,
  not by a value sent from the browser.
- `PAYMENT_MODE=live` is rejected at startup until a real, reviewed provider is
  registered.
- Verification is idempotent: replaying a successful request does not enroll the
  student twice.

To test a declined demo payment, set `PAYMENT_MOCK_OUTCOME=failure` (or `cancel`)
on the API and restart it. No real money is involved in any mode.

## Getting started

### Prerequisites

- Bun 1.2+
- MongoDB (local or Atlas M0)
- Optional: Resend and Cloudinary accounts

### Setup

```bash
git clone https://github.com/AmjadIbrahim1/nextdemy.git
cd nextdemy
bun install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set at least `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in
`apps/api/.env`. Generate secrets with:

```bash
openssl rand -hex 32
```

Then run both apps:

```bash
bun run dev
```

- Web: http://localhost:3000
- API: http://localhost:5000
- Health: http://localhost:5000/api/v2/health

The web app proxies `/api/v2/*` to `API_URL` (default `http://localhost:5000`),
so the browser only talks to the Next.js origin.

### Seed demo content

The seed is idempotent and never deletes existing data. It creates categories,
an instructor, seven courses with lessons, and demo students/reviews.

```bash
cd apps/api
SEED_INSTRUCTOR_PASSWORD='choose-a-strong-password' bun run seed
```

`SEED_INSTRUCTOR_EMAIL` defaults to `amjad@nextdemy.dev`. Set it before running
if you want a different instructor account.

## Environment variables

### API (`apps/api/.env`)

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string (`MONGODB_URL` is accepted as a legacy alias) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes | 32+ random characters each |
| `FRONTEND_URL` | yes | Exact web origin, used by CORS and email links |
| `CORS_ORIGINS` | no | Comma-separated extra origins |
| `RESEND_API_KEY` | production | Without it, development skips email; production refuses to pretend |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | no | Sender identity for Resend |
| `CONTACT_MAIL` | no | Contact-form recipient |
| `PAYMENT_MODE` | no | `mock` only |
| `PAYMENT_MOCK_OUTCOME` | no | `success`, `failure`, or `cancel` |
| `PAYMENT_MOCK_SECRET` | no | Defaults to `JWT_ACCESS_SECRET` |
| `PAYMENT_CURRENCY` | no | Default `EGP` |
| `CLOUDINARY_*` | no | Uploads return a clear error when unset |
| `COOKIE_SAME_SITE` | no | `lax` by default (use with the Next proxy) |

### Web (`apps/web/.env`)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | `/api/v2` when using the proxy |
| `API_URL` | Server-side rewrite target, e.g. the Render URL |
| `NEXT_PUBLIC_CURRENCY` | Default `EGP` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact page address |

## API reference

All routes are prefixed with `/api/v2`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/sendotp` | Create and email a 5-minute OTP |
| POST | `/auth/signup` | Register with the OTP |
| POST | `/auth/login` | Returns an access token and sets the refresh cookie |
| POST | `/auth/refresh-token` | Rotates the refresh token |
| POST | `/auth/logout` | Invalidates the stored refresh token |
| POST | `/auth/changepassword` | Change password (authenticated) |
| POST | `/auth/reset-password-token` | Email a reset link |
| POST | `/auth/reset-password` | Consume the reset token |

### Payment

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payment/checkout` | Create/reuse a server-priced demo order |
| POST | `/payment/verifyPayment` | Verify the signed demo session and enroll |
| POST | `/payment/cancel` | Cancel a pending order |
| POST | `/payment/sendPaymentSuccessEmail` | Send a receipt at most once |
| GET | `/payment/history` | Authenticated payment history |
| GET | `/payment/instructor-earnings` | Instructor totals |

### Courses, profile, contact, health

The remaining modules follow the same modular `routes → controllers → services →
models` structure. Health is available at `GET /api/v2/health`.

## Testing and checks

```bash
# API integration tests (requires MongoDB on localhost:27017)
cd apps/api && bun test

# Type checks
cd apps/api && bun x tsc --noEmit
cd apps/web && bun x tsc --noEmit

# Production build
bun run build
```

The integration suite covers OTP signup, login, refresh rotation, logout,
unauthorized access, CORS rejection, server-priced checkout, tampered
signatures, cross-user order isolation, concurrent idempotency keys, and
duplicate-enrollment prevention.

## Deployment

### Database — MongoDB Atlas

1. Create a free M0 cluster.
2. Create a database user and allow the Render egress (or `0.0.0.0/0` for the demo).
3. Put the connection string in `MONGODB_URI` on Render.
4. Run `bun run seed` locally against the Atlas URI to populate demo content.

### API — Render

- Runtime: Docker
- Dockerfile: `apps/api/dockerfile`
- Build context: repository root
- Health check: `/api/v2/health`
- Set the API environment variables from the table above.
- The free plan sleeps after 15 minutes of inactivity; the first request after a
  sleep can take about a minute. A free uptime monitor can keep it warm within
  the 750-hour monthly allowance.

### Web — Vercel

- Root directory: `apps/web`
- Install command: `cd ../.. && bun install --frozen-lockfile`
- Build command: `cd ../.. && bun run build --filter=web`
- Set `API_URL` to the Render URL and `NEXT_PUBLIC_BASE_URL=/api/v2`.
- `NEXT_PUBLIC_*` values are inlined at build time; redeploy after changing them.

### Email — Resend

Verify a sending domain in Resend and set `EMAIL_FROM` to an address on that
domain. The shared `onboarding@resend.dev` sender only delivers to the account
owner, which is enough for a private demo but not for public signups.

## Security notes

- No card numbers, CVV, or real payment credentials are collected or stored.
- Prices and currency come from the database, never from the request body.
- The mock outcome is environment-controlled; the browser cannot send
  `success: true`.
- Refresh tokens are stored as an opaque rotation value per user; treat the
  database as sensitive. Tokens are never returned in JSON responses, only in
  an httpOnly cookie.
- Stack traces are never returned in production responses.
- API keys live only in server environment variables, never in the bundle.

## Author

Built and maintained by **[Amjad](https://github.com/AmjadIbrahim1)**.
