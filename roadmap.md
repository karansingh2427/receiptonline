# Renovi — renovation receipt tracker (German tax-ready)

Personal app: photograph/upload paper or electronic receipts, auto-extract
merchant/date/total via Lovable AI Gateway vision, group by store & month,
see running totals, add cash/eBay Kleinanzeigen purchases manually, export a
tax-ready spreadsheet.

## Decisions
- Design: direction v2 "Saturated flat ledger" (Space Grotesk + Space Mono, warm
  paper, ink, brand blue, accent orange, cash amber). Mobile-first.
- Language: English (UI), euro amounts with German formatting (1.234,56 €).
- Private: login required (email/password + Google). Data scoped per user via RLS.
- Backend: Lovable Cloud (DB, storage, auth, AI gateway).

## Backend
- [ ] enable email auth + Google social auth
- [ ] storage bucket `receipts` (private) + storage RLS (user owns own folder)
- [ ] migration: `receipts` table (user_id, merchant, purchase_date,
      total_amount, currency, payment_method, category, notes, image_path,
      source, raw_extraction) + GRANTs + RLS (auth.uid = user_id)
- [ ] regenerate TS types

## App
- [ ] design tokens in styles.css + fonts in __root
- [ ] start.ts: register attachSupabaseAuth functionMiddleware
- [ ] __root: onAuthStateChange → router.invalidate + queryClient invalidate; Toaster
- [ ] auth route /auth (signin/signup email+google)
- [ ] protected layout _authenticated/route.tsx
- [ ] index: landing / session-aware redirect to /app
- [ ] /app dashboard: grand total, by-store bars, recent receipts list, capture FAB, export
- [ ] /scan capture flow: upload image → extractReceipt AI → review editable → save
- [ ] /receipts/new manual entry (cash/eBay)
- [ ] /receipts/$id detail/edit + delete
- [ ] server fns in src/lib/receipts.functions.ts (list/get/save/delete/extract)

## Export
- [x] /app dashboard Export button → XLSX (Receipts + Summary sheets, grand total) — src/lib/export.ts

## Open
- [ ] Answer user: data ownership if Lovable license lapses (cloud pause vs deletion; export as backup)
