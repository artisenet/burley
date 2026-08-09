# Burley Events - Full Platform

Consultation booking, service booking, quoting, invoicing, payments (SasaPay),
event management, staff/casual payouts, vendor & expense tracking, and a
35%-margin-floor guardrail built in throughout.

```
events-platform/
  backend/    - Flask + MySQL API (see backend/README.md)
  frontend/   - React + Vite + Tailwind (see frontend/README.md)
```

## Quick start

1. **Database**: create a MySQL database called `burley_events`.
2. **Backend**: follow `backend/README.md` - venv, `pip install -r requirements.txt`,
   `.env` setup, `flask db upgrade`, `python seed.py`, `python run.py`.
3. **Frontend**: follow `frontend/README.md` - `npm install`, `.env` setup, `npm run dev`.
4. Log in as the seeded admin (`admin@example.com` / `changeme123` - **change
   this immediately**), or register as a client via the public site.

## Build status, honestly

This was built end-to-end by an AI pair-programmer without a live network
connection to actually install dependencies or run either server. Every
Python file passed `py_compile`; every JS/JSX file passed an esbuild syntax
transform. That catches typos and structural errors but **not** runtime bugs,
API mismatches you'll only see once real requests flow, or MySQL-specific
quirks. Treat your first full local run-through as real testing, not a
formality - budget time for it before showing this to your client.

## Recommended next session's punch list

1. Get it running locally end-to-end (backend + MySQL + frontend) and fix
   whatever breaks on first contact.
2. Wire the two known frontend gaps: quote "send"/"accept" buttons, and an
   event detail page for staff/vendor assignment.
3. Get SasaPay sandbox credentials from your client (merchant application is
   the long pole - start that now if it isn't already in motion) and do a
   real STK push test end-to-end using ngrok for the callback URL.
4. Swap the landing page portfolio placeholders for real photography.
5. Decide on a mailing-list provider (Mailchimp/Brevo/SendGrid) and wire the
   sync - currently signups just land in the local `mailing_list` table.

## Where the business logic lives (for when you need to change it)

- **35% margin floor**: `backend/app/services/pricing.py` - one place, used
  by catalog creation, quote-item creation, and event profitability.
- **Consultation fee waiver logic**: `backend/app/routes/public.py`,
  `book_consultation()` - the fork we discussed (paid unless tied to a
  deposit-paying quote).
- **SasaPay integration**: `backend/app/services/sasapay.py` - isolated so
  it's the only file that needs to change if the API shifts or you swap
  providers.
- **Staff payout batching** (per-event/weekly/monthly): `backend/app/routes/admin_payouts.py`.
