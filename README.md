# Finance Dashboard Backend

Backend API for the assignment using Express, TypeScript, and Supabase Postgres.

## Stack
- Express
- TypeScript
- Supabase Postgres
- Zod validation
- JWT + DB-backed sessions

## Features
- Role-based access (`viewer`, `analyst`, `admin`)
- User management (admin)
- Financial records CRUD
- Soft delete for records
- Revert flow (creates reversal record, marks original as reverted)
- Dashboard summary (totals, category totals, monthly trends, recent activity)
- Audit logs for sensitive actions
- Session inactivity timeout and absolute expiry
- RLS enabled with deny-by-default policies for direct anon/auth access

## Setup
1. Copy env file:
   - `cp .env.example .env`
2. Fill values in `.env`
3. Install dependencies:
   - `npm install`
4. Run schema SQL in Supabase SQL Editor:
   - `src/db/schema.sql`
5. Seed demo users:
   - `npm run seed`
6. Start server:
   - `npm run dev`

Base URL: `http://localhost:4000`

## Demo users
- `admin@student.local / admin123`
- `analyst@student.local / analyst123`
- `viewer@student.local / viewer123`

## Key endpoints
- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users` (admin)
- `POST /users` (admin)
- `PATCH /users/:id` (admin)
- `GET /records` (analyst/admin)
- `GET /records/:id` (analyst/admin)
- `POST /records` (admin)
- `PATCH /records/:id` (admin)
- `DELETE /records/:id` (admin)
- `POST /records/:id/revert` (admin)
- `GET /dashboard/summary` (viewer/analyst/admin)
