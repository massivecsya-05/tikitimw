# TikitiMW

Event ticketing for Malawi — discover events, pay with Airtel Money / TNM Mpamba / card, receive QR tickets, and check in at the gate.

## Stack

- **Frontend:** React, Vite, TypeScript, Tailwind, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions)
- **Payments:** PayChangu
- **Email:** Resend (optional)

## Local development

```bash
npm install
cp .env.example .env   # if present; otherwise create .env
npm run dev
```

### Environment (`.env`)

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Database migrations

Apply all SQL files in `supabase/migrations/` in filename order. See [scripts/apply-migrations.md](scripts/apply-migrations.md).

Critical recent migrations:

- `20260528122000_ticketing_hardening.sql` — `tickets`, `scan_ticket`, inventory
- `20260528140000_event_delete_cascade.sql` — `delete_event` RPC

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

## Regenerate TypeScript types

After migrations:

```bash
npm run gen:types
```

Or with a linked remote project:

```bash
npx supabase gen types typescript --project-id YOUR_REF > src/integrations/supabase/types.ts
```

## Edge functions

Deploy and configure secrets — see [scripts/deploy-functions.md](scripts/deploy-functions.md).

```bash
npx supabase functions deploy initiate-payment verify-payment payment-webhook send-ticket-email admin-users vendor-application
```

## Payment flow

1. Customer checks out → pending `orders` + `order_items`
2. `initiate-payment` → PayChangu checkout URL
3. Webhook / `verify-payment` → `confirm_payment` RPC (inventory + payouts)
4. `send-ticket-email` → `tickets` rows + optional Resend email
5. `/payment/callback` shows QR; **My Tickets** lists paid tickets

Return URL: `{APP_ORIGIN}/payment/callback?order_id={uuid}`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run gen:types` | Regenerate Supabase types (requires linked project) |

## Smoke test checklist

- [ ] Published event with future `starts_at` appears on home
- [ ] Checkout requires name, +265 phone, email
- [ ] Payment completes → tickets visible on callback and My Tickets
- [ ] Organiser scan accepts ticket UUID at `/organiser/scan`
- [ ] Admin can delete event (after `delete_event` migration)
