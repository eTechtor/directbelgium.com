# DirectBelgium MVP foundation

This folder is deliberately isolated from the existing Outlyride mobile prototype. The root project has protected runtime and product-direction instructions, so DirectBelgium is not mixed into it.

## What is included

- A polished, responsive, dependency-free public marketplace in `index.html`.
- Search, make/body-style filters, sorting, pagination, appointment and order-tracking request dialogs.
- A catalog of 160 listings (134 currently available and 26 marked sold), including the newly imported October 10, 2026 listings.
- Vehicle cards show estimated prices in naira, condition notes and available photos; details and availability are verified before quotation.
- A PostgreSQL/Supabase migration that establishes role-aware profiles, products, inquiries, appointments, quote acceptance, orders, payments, procurement records and shipment events.
- Architecture, operating assumptions and integration boundaries in `docs/`.

## Intentional limits

No supplier, payment, email, shipping or authentication credential was provided. Therefore the browser experience **does not** claim live inventory, booking confirmation, payment, or tracking. The migration is not applied to the existing Outlyride Supabase project because that would mix unrelated production domains without authorization.

## Preview

Serve this folder with a static HTTP server and open the resulting local URL. The catalog is fetched from `public/catalog/inventory.json`, so opening the HTML directly through `file://` is not supported.

Inventory snapshots were captured on October 4 and 10, 2026. Availability, pricing and condition must be reverified before publishing a quotation or taking payment.

## Next implementation slice

Create a dedicated Supabase project, apply `supabase/migrations/20261010000000_directbelgium_core.sql`, then introduce a Next.js App Router application with server-only Supabase access, Paystack webhook verification, Resend integration, and admin routes protected by a server-side role check.
