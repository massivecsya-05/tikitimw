# Manual smoke test (E2E)

Run after migrations and edge functions are deployed.

1. **Home** — `/` shows categories and events (or subscribe empty state).
2. **Checkout** — Sign in, open a published event, buy 1 ticket with `+265…` phone and valid email.
3. **Pay** — Complete PayChangu sandbox payment.
4. **Callback** — `/payment/callback?order_id=…` shows success and QR (or link to My Tickets).
5. **My Tickets** — `/my-tickets` lists the ticket with QR.
6. **Scan** — Vendor/admin opens `/organiser/scan`, scans ticket UUID → `used_ok`.
7. **Admin delete** — Admin deletes a test event (no FK error after `delete_event` migration).
