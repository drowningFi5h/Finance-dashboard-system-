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

Base URL: `http://localhost:4000/api`

## Demo users
- `admin@student.local / admin123`
- `analyst@student.local / analyst123`
- `viewer@student.local / viewer123`

## Key endpoints
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users` (admin)
- `POST /api/users` (admin)
- `PATCH /api/users/:id` (admin)
- `GET /api/records` (analyst/admin)
- `POST /api/records` (admin)
- `PATCH /api/records/:id` (admin)
- `DELETE /api/records/:id` (admin)
- `POST /api/records/:id/revert` (admin)
- `GET /api/dashboard/summary` (viewer/analyst/admin)
