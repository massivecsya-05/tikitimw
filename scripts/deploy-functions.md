# Edge functions deploy

From the project root, with [Supabase CLI](https://supabase.com/docs/guides/cli) linked:

```bash
npx supabase functions deploy initiate-payment --no-verify-jwt
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy payment-webhook
npx supabase functions deploy send-ticket-email --no-verify-jwt
npx supabase functions deploy admin-users
npx supabase functions deploy vendor-application
```

## Secrets (Dashboard → Project Settings → Edge Functions)

| Secret | Used by |
|--------|---------|
| `PAYCHANGU_SECRET_KEY` | initiate-payment, verify-payment, payment-webhook |
| `RESEND_API_KEY` | send-ticket-email (optional; tickets still created without it) |
| `EMAIL_FROM` | send-ticket-email (e.g. `TikitiMW <tickets@yourdomain.com>`) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## PayChangu webhook

Point your PayChangu dashboard webhook URL to:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook
```

## Frontend env (`.env`)

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

Payment return URL is built in-app: `{origin}/payment/callback?order_id={uuid}`.
