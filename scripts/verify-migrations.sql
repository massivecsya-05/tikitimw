-- Run in Supabase SQL Editor to verify ticketing migrations are applied.

SELECT
  to_regclass('public.tickets') IS NOT NULL AS tickets_table,
  to_regclass('public.scan_logs') IS NOT NULL AS scan_logs_table,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ticket_tiers' AND column_name = 'quantity_sold'
  ) AS quantity_sold_column,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'scan_ticket'
  ) AS scan_ticket_rpc,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'delete_event'
  ) AS delete_event_rpc;
