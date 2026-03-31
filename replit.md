# ثراء المعرفة (Tharaa Al-Maarifa) - Reading Platform

## Overview

A full-stack Arabic reading program management platform with student portal and admin dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: express-session + bcryptjs (password hashing)
- **Logging**: pino + pino-http

## Default Admin Credentials

- Phone: `0500000000`
- Password: `admin123`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── tharaa/             # React frontend (SPA)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## Features

### Student Portal (/student)
- Login with phone + password (persistent session, 7 days)
- View current phase books only
- Visual distinction for completed books (green)
- PDF download links per book
- Submit weekly reading log
- Smart quota rollover: when finishing a book mid-quota, select next book and roll over remaining pages

### Admin Dashboard (/admin)
- Overview statistics (total/active/pending users, pages read, submission compliance)
- User management: approve, edit, delete, bulk import (paste "Name Phone Password" lines)
- Analytics: per-student, per-batch, program-wide
- Curriculum management: add/edit/delete books per phase/level
- Batch management
- System settings: weekly quota, submission windows, grade thresholds

## Data Models

- **users**: students and admins with hashed passwords, batch assignment, reading progress
- **batches**: program cohorts
- **curriculum**: 8 phases × levels (basic only for phases 1-3, basic+optional for phases 4-8)
- **reading_logs**: weekly submission records with on_time/late/missed status
- **system_settings**: configurable quotas, time windows, grade thresholds

## Business Logic

- **Phone normalization**: handles leading zero, +966/966 prefix stripping
- **Submission status**: calculated based on configurable day/hour windows (0=Sun..6=Sat)
- **Quota rollover**: completing a book mid-week rolls remaining pages to next book
- **Phase progression**: students assigned to specific phase+level, admins can advance them

## API Routes

All routes under `/api`:
- `POST /auth/login` — login
- `POST /auth/logout` — logout  
- `GET /auth/me` — session check
- `GET/POST /users` — list/create users (admin)
- `POST /users/bulk` — bulk import users (admin)
- `PATCH /users/:id` — update user (admin)
- `POST /users/:id/approve` — approve user (admin)
- `PATCH /users/:id/book` — update current book/progress
- `GET/POST /batches` — manage batches
- `GET/POST /curriculum` — manage curriculum
- `PATCH/DELETE /curriculum/:id` — edit/delete book
- `GET/POST /logs` — reading logs
- `GET /logs/my` — student's own logs
- `GET /settings` — system settings
- `PATCH /settings` — update settings (admin)
- `GET /analytics/overview` — program-wide analytics
- `GET /analytics/user/:id` — per-student analytics
- `GET /analytics/batch/:id` — per-batch analytics

## Seeded Data

- Admin user: phone `0500000000`, password `admin123`
- Phase 1 curriculum: 10 books (Islamic behavioral + scholarly selections)
- Default batch: "الدفعة الأولى"
- Default settings: 105 pages/week quota, Friday submission window

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Codegen

After any OpenAPI spec changes:
```bash
pnpm --filter @workspace/api-spec run codegen
```
