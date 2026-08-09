# Burley Events - Backend (MVP)

Flask + MySQL backend for Burley Events. Stage 1 (foundation, auth, catalog,
SasaPay plumbing, consultation booking fork) and Stage 2 (the core money loop:
quotes → invoices → events → staff payouts) are both done below.

## What's built so far

**Stage 1**
- Full data model for the whole MVP (users, staff, CRM, catalog, quotes,
  invoices, payment schedules, payment transactions, events, staff
  assignments, vendors, expenses, staff payouts, mailing list)
- Auth: register/login/refresh (JWT), role-based access control
- Public consultation booking with the paid-vs-waived fork
- SasaPay service module (OAuth2 token handling, C2B collection,
  B2C payout, transaction status check) - isolated in `app/services/sasapay.py`
- SasaPay async callback handler that cascades success to invoices,
  consultations, and staff payouts

**Stage 2**
- Quotes: create with line items, margin-floor warnings, versioning
  (`new-version` clones a quote for renegotiation), send, accept-and-convert
  to an invoice + payment schedule (optionally creating the Event at the
  same time)
- Invoices: admin-initiated SasaPay collection per schedule item, plus a
  manual "mark paid" path for cash/bank transfers collected outside the app
- Events: CRUD, staff assignment, vendor assignment, and a live
  profitability endpoint (`GET /api/admin/events/<id>/profitability`)
  that flags anything under the 35% margin floor
- Vendors + expenses: basic CRUD, tied to events or logged as overhead
- Staff: create staff/casual accounts with a pay structure (per_event /
  weekly / monthly), plus a "pending by staff" dashboard view
- **Payouts**: `generate` batches up all unpaid assignments for one staff
  member (works for a single per-event settlement or a full week/month of
  casual work), `disburse` sends it via SasaPay B2C, with a manual fallback
- Client-facing routes: view own quotes/invoices/events, self-service
  payment against a schedule item (scoped so clients can only touch their
  own data)

## Not yet built (next stages)

- Admin reporting endpoints (cash flow, margin-by-category rollups) - the
  data is all there, just needs aggregation queries
- Mailing list -> Mailchimp/Brevo sync (currently just stores signups locally)
- React frontend (not started)

## Setup

1. Create a MySQL database:
   ```sql
   CREATE DATABASE burley_events CHARACTER SET utf8mb4;
   ```

2. Copy `.env.example` to `.env` and fill in real values (DB credentials,
   a real SECRET_KEY/JWT_SECRET_KEY, and your SasaPay sandbox credentials
   once you've completed merchant onboarding).

3. Install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate   # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   flask db init      # only the very first time
   flask db migrate -m "initial schema"
   flask db upgrade
   ```

5. Seed an admin account:
   ```bash
   python seed.py
   ```

6. Run the dev server:
   ```bash
   python run.py
   ```
   API available at `http://localhost:5000/api`. Check `/api/health` first.

## Testing the SasaPay callback locally

SasaPay needs a real public HTTPS URL to send callbacks to - localhost alone
won't work. Use ngrok (or similar) during development:

```bash
ngrok http 5000
```

Then set `SASAPAY_CALLBACK_BASE_URL` in `.env` to the ngrok HTTPS URL it gives
you, and restart the server. Test end-to-end in SasaPay's **sandbox**
environment before touching production credentials.

## The 35% margin rule, in code

Lives in `app/services/pricing.py`. `compute_selling_price`,
`compute_margin_pct`, and `margin_warning` are the three functions everything
else should call - don't reimplement the formula elsewhere. Currently wired
into the catalog service routes; needs wiring into quote-item creation next
(Stage 2) so the same warning shows up when she's building a quote, not just
when she sets up a catalog item.

## Project structure

```
backend/
  app/
    models/       - SQLAlchemy models, one file per domain
    routes/       - Flask blueprints
    services/     - business logic + external integrations (SasaPay, pricing)
    utils/        - decorators, helpers
  config.py       - environment-based config
  run.py          - entrypoint
  seed.py         - initial admin user + starter categories
  requirements.txt
  .env.example
```
