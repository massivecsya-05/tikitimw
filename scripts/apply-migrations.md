# Supabase migrations

Apply all migrations in `supabase/migrations/` in filename order on your hosted project.

## Option A — Supabase CLI (recommended)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Option B — SQL Editor

Run these files manually in the Dashboard → SQL Editor (in order):

1. All files dated before `20260528122000` if not already applied
2. `20260528122000_ticketing_hardening.sql` — tickets, scan_ticket, quantity_sold
3. `20260528140000_event_delete_cascade.sql` — delete_event RPC, FK cascades

## Verify

```sql
SELECT to_regclass('public.tickets');
SELECT proname FROM pg_proc WHERE proname IN ('scan_ticket', 'delete_event', 'confirm_payment');
```

All three functions should exist; `tickets` should not be null.
