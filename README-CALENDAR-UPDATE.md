# Calendar Update - How to Apply

This zip contains only the two files that changed for the improved calendar,
not the whole project.

## Files

```
backend/app/routes/calendar.py   <- REPLACES your existing file
frontend/src/pages/admin/Calendar.jsx  <- REPLACES your existing file
```

## What changed

**Backend (`calendar.py`)** - the admin calendar feed now returns real
names and context instead of raw IDs:
- Consultations: lead's actual name, phone, email, mode (virtual/in-person),
  duration, fee status (waived/paid/pending)
- Events: client's actual name, phone, email, guest count
- The public availability-check logic (used by the booking page) is
  unchanged - only the admin feed was enriched.

**Frontend (`Calendar.jsx`)**:
- Type filter (All / Consultations / Events) to declutter a busy month
- Today's date is outlined on the grid
- Day panel rows now show name, contact info, status badge, and
  event/consultation-specific details (guest count, fee status)
- Clicking an event row links straight to its Event detail page
- New "Upcoming (next 7)" sidebar - see what's coming without clicking
  through individual days
- Header shows live counts of consultations/events for the visible month

## No backend route changes, no migration needed

This only touches the response shape of an existing endpoint - no model or
database changes, so no `flask db migrate` needed. Just replace the file,
restart the Flask backend, and the frontend hot-reloads.

## Test it

1. Restart backend
2. Go to Admin -> Calendar
3. Click a day with a consultation - should show the lead's real name and
   phone instead of "Lead #12"
4. Click a day with an event - should show the client's name and guest
   count, and clicking the row should navigate to the event detail page
5. Try the All / Consultations / Events filter buttons
6. Check the "Upcoming (next 7)" panel on the right
