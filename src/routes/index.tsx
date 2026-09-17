import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Renovi — track your renovation receipts" },
      { name: "description", content: "Photograph renovation receipts, see a running total per store and date, and export everything for your tax return." },
      { property: "og:title", content: "Renovi — track your renovation receipts" },
      { property: "og:description", content: "Scan renovation receipts and get a running total, ready for your tax return." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-ink text-paper">
              <span className="text-[15px] font-bold leading-none">R</span>
            </div>
            <span className="font-display text-[16px] font-semibold tracking-tight text-ink">Renovi</span>
          </div>
          <Link
            to="/auth"
            className="rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-paper transition active:scale-95"
          >
            Sign in
          </Link>
        </header>

        <section className="mt-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft ring-1 ring-line">
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            Flat renovation · German tax-ready
          </span>
          <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.05] tracking-tight text-ink">
            Every receipt,
            <br />
            one clear total.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Snap photos of paper bills, add eBay Kleinanzeigen cash buys, and paste
            emailed e-receipts. Renovi reads each one, sorts it by store and date,
            and keeps a running total so your year-end declaration is done.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand/90 active:scale-95"
            >
              Get started
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full bg-panel px-6 py-3.5 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition active:scale-95"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-14 grid gap-3">
          {[
            { k: "Scan", v: "Photograph a receipt; the merchant, date and total are read automatically." },
            { k: "Cash buys", v: "Add eBay Kleinanzeigen cash deals with a typed amount and a note." },
            { k: "Running total", v: "See totals per store and per month, updating as you add receipts." },
            { k: "Export", v: "Download a spreadsheet of every receipt for your tax return." },
          ].map((f) => (
            <div key={f.k} className="flex items-start gap-4 rounded-2xl bg-panel px-5 py-4 ring-1 ring-line">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-paper text-[12px] font-bold text-brand ring-1 ring-line">
                {f.k.slice(0, 1)}
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink">{f.k}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{f.v}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
