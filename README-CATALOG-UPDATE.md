# Catalog Update - Add Category Creation

This zip contains one file - the fix for a real gap: there was no way to
create a new service category from the admin UI. The backend endpoint
(`POST /api/admin/categories`) already existed, it just had no form
pointing at it.

## File

```
frontend/src/pages/admin/Catalog.jsx   <- REPLACES your existing file
```

## What changed

- New "Add a Category" form on the Services & Pricing page (top right)
- A small chip-list showing all existing categories, so you can see what's
  already there at a glance
- Newly created categories are automatically pre-selected in the "Add a
  Service" form below, so the natural flow is: add category -> immediately
  add a service into it, no extra clicking
- Added the `unit` selector (flat / per guest / per hour) to the Add
  Service form - this field existed in the data model already but wasn't
  exposed in this form before
- A small warning appears in the Add Service form if no categories exist
  yet, pointing you at the form above it

## No backend changes, no migration needed

The `POST /api/admin/categories` endpoint already existed - this is purely
a frontend fix. Just replace the file and the frontend hot-reloads (or
redeploy if this is already live).

## Test it

1. Admin -> Services & Pricing
2. Add a new category (e.g. "Lighting")
3. Confirm it appears in the chip list and gets pre-selected in the Add
   Service form below
4. Add a service into that new category, confirm it shows up in the table
