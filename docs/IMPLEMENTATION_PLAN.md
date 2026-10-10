# Implementation plan

## Completed in this isolated foundation

1. Preserve the existing Outlyride prototype and create a separate DirectBelgium work area.
2. Create the mobile-responsive public marketplace, fictional-development inventory and safe booking/tracking request surfaces.
3. Define a dedicated Supabase schema with RLS for customer-owned information and immutable financial/audit-oriented records.
4. Capture the non-negotiable workflow: inquiry → consultation → verified quote → full verified payment → procurement → shipment events.

## Before going live

1. Provision a dedicated Supabase project; create migrations through the CLI and apply the reviewed schema.
2. Replace this static preview with a Next.js App Router application. Add server components for listings and route handlers for all mutation paths.
3. Add Supabase Auth and server-side RBAC. The `user_roles` table must only be managed by super-admin server flows.
4. Implement staff appointment availability and conflict prevention in a transaction; email only after a successful save.
5. Implement versioned PDF quotations and explicit acceptance recording.
6. Integrate Paystack test mode. Create payment references server-side; verify signed webhooks idempotently and independently query the provider before authorising procurement.
7. Add staff-only procurement, shipment, customs and audit-log interfaces. Do not expose supplier or margin fields through customer APIs.
8. Add tests for quote expiry, authorization, duplicate webhook handling, customer ownership/RLS, and payment-to-procurement transitions.
