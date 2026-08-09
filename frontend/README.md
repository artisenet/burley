# Burley Events - Frontend

React (Vite) + Tailwind. Talks to the Flask backend in `../backend`.

## Setup

```bash
npm install
cp .env.example .env    # adjust VITE_API_BASE_URL if the backend isn't on localhost:5000
npm run dev
```

Runs at `http://localhost:5173`. Make sure the backend is running first and
`FRONTEND_ORIGIN` in the backend's `.env` matches this URL (CORS).

## Structure

```
src/
  api/client.js          - axios instance, attaches JWT, auto-refreshes on 401
  context/AuthContext.jsx - session state, login/register/logout
  components/             - shared components (ProtectedRoute, etc.)
  layouts/                - PublicLayout, AdminLayout, ClientLayout
  pages/
    public/    - Landing, Booking (the consultation/deposit fork)
    auth/      - Login, Register
    admin/     - Overview, Leads, Quotes, Invoices, Events, Catalog,
                 Staff, Payouts, Vendors, Expenses, Reports
    client/    - MyEvents, MyInvoices (client self-service portal)
```

## What's built vs. what's stubbed

Every page listed above makes real API calls against the routes documented
in the backend README and renders real data - none of this is mocked.

Known gaps to close next:
- **Event detail page** - staff/vendor assignment currently has backend
  routes (`POST /api/admin/events/<id>/staff`, `/vendors`) but no dedicated
  UI screen yet; the Events list only shows the profitability rollup.
- **Quote actions** - "send" and "accept -> convert to invoice" backend
  routes exist but aren't wired to buttons in the Quotes page yet.
- **Portfolio/gallery** - Landing page uses placeholder blocks; swap in
  real photos (and probably a proper image upload/CMS flow) once available.
- No form validation library - forms use plain HTML `required` attributes
  only. Fine for MVP, worth revisiting if data quality issues show up.

## Testing note

This was built without live `npm install` / dev server access in the build
environment - every `.jsx`/`.js` file was run through esbuild's transform to
catch syntax errors, but nothing has been executed in a browser yet. Treat
the first `npm run dev` as your real first test pass, and expect a handful
of small runtime issues (prop mismatches, missing null checks) typical of
an untested first cut - nothing structural, but budget an afternoon for it.
