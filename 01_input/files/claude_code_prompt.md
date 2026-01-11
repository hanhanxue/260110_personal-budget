# Budget Tracker App — Project Brief for Claude Code

## Overview

Build a mobile-friendly expense tracking web app that writes transactions to Google Sheets. The user enters expenses in real-time (at point of purchase) instead of batch-entering at end of week.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Hosting:** Vercel
- **Database:** Google Sheets (via Google Sheets API)
- **Styling:** Tailwind CSS
- **Image uploads:** Vercel Blob (for receipt photos)
- **PWA:** Make installable on mobile

## Google Sheets Structure

The app connects to a Google Sheet with two tabs:

### Tab: `Schema`
Defines valid categories. App reads this to populate dropdowns.

| Column | Type | Description |
|--------|------|-------------|
| Table | Text | Top-level category (Housing, Essentials, etc.) |
| Subcategory | Text | Second-level grouping |
| Line Item | Text | Specific item |
| Active | Boolean | TRUE = show in app, FALSE = hidden |

### Tab: `Transactions`
Flat transaction log. App appends rows here.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| Date | Date | Yes | Transaction date (YYYY-MM-DD) |
| Table | Text | Yes | Top-level category |
| Subcategory | Text | Yes | Second-level grouping |
| Line Item | Text | Yes | Specific item |
| Amount | Number | Yes | Original transaction amount (positive) |
| Currency | Text | Yes | Original currency (CAD, USD, CNY, JPY, GBP) |
| CAD Amount | Number | Yes | Converted amount in CAD |
| CAD Rate | Number | Yes | Exchange rate to CAD (1 if CAD) |
| USD Amount | Number | Yes | Converted amount in USD |
| USD Rate | Number | Yes | Exchange rate to USD (1 if USD) |
| Vendor | Text | No | Where spent (Amazon, Metro, etc.) |
| Note | Text | No | Additional context |
| Receipt URL | URL | No | Link to uploaded receipt image |
| Account | Text | Yes | Payment method used |
| Period | Text | Yes | one-time, monthly, quarterly, yearly |
| Distribute | Boolean | Yes | TRUE = spread across period in reports |
| Tag | Text | No | Optional grouping (trip name, project, event) |

## Valid Values

### Tables (top-level categories)
- Housing
- Essentials
- Discretionary
- Subscriptions
- Large Purchases
- Travel
- Savings

### Currency
- CAD — Canadian Dollar (base currency for all calculations)
- USD — US Dollar
- CNY — Chinese Yuan
- JPY — Japanese Yen
- GBP — British Pound

### Currency Conversion
When user submits a transaction:
1. Fetch exchange rates for that day (to both CAD and USD)
2. Calculate and store both: CAD Amount + CAD Rate, USD Amount + USD Rate
3. Store original amount + currency for reference
4. All reports/calculations use the user's selected reference currency

**Reference Currency Setting:**
- User can toggle between CAD and USD as their "reference currency"
- Store preference in localStorage
- All totals, reports, and calculations display in the selected reference currency
- Switching is instant (no recalculation needed since both are stored)

**Exchange Rate API Options (pick one):**
- [Exchange Rate API](https://www.exchangerate-api.com/) — Free tier: 1500 requests/month
- [Open Exchange Rates](https://openexchangerates.org/) — Free tier: 1000 requests/month
- [Fixer.io](https://fixer.io/) — Free tier available

**Implementation notes:**
- Cache exchange rates by date (only fetch once per currency per day)
- If user enters a past date, fetch historical rate for that date
- If API fails, allow manual rate entry as fallback
- Show converted amounts (both CAD and USD) to user before submitting

### Account (user's payment methods)
- RBC Visa
- RBC Chequing
- Chase Chequing
- (Allow custom entry / remember previous values)

### Period
- one-time (default)
- monthly
- quarterly
- yearly

### Distribute
- FALSE (default)
- TRUE

## App Features

### Core: Transaction Entry Form
Mobile-first form with:

1. **Date** — Date picker, defaults to today
2. **Table** — Dropdown (populated from Schema where Active=TRUE)
3. **Subcategory** — Cascading dropdown (filters based on Table selection)
4. **Line Item** — Cascading dropdown (filters based on Subcategory selection)
5. **Amount** — Number input with decimal support
6. **Currency** — Dropdown (CAD/USD/CNY/JPY/GBP), remember last used
7. **Converted Amounts** — Auto-calculated, shows both CAD and USD equivalents (editable as fallback if API fails)
8. **Vendor** — Text input with autocomplete from previous transactions
9. **Note** — Optional text input
10. **Receipt** — Optional image upload (camera or gallery)
11. **Account** — Dropdown with autocomplete from previous values
12. **Period** — Dropdown (default: one-time)
13. **Distribute** — Toggle/checkbox (default: FALSE)
14. **Tag** — Optional text input with autocomplete from previous tags

### UX Requirements
- **Speed is critical** — User opens app, enters expense in <30 seconds, done
- **Smart defaults** — Today's date, last used currency, one-time, Distribute=FALSE
- **Remember preferences** — Last used currency, last used account, reference currency
- **Reference currency toggle** — Prominent toggle in header (CAD ↔ USD), affects all displayed amounts
- **Cascading dropdowns** — Table → Subcategory → Line Item filter correctly
- **Autocomplete** — Vendor, Account, Tag suggest from previous entries
- **Success feedback** — Clear confirmation when transaction saved
- **Offline support** — Nice to have, queue transactions if offline

### Secondary: Recent Transactions View
- Show last 10-20 transactions
- Quick edit/delete capability
- Filter by date range

## API Routes Needed

### GET /api/schema
- Fetch Schema tab from Google Sheets
- Return structured data for dropdowns
- Cache with revalidation (schema doesn't change often)

### GET /api/exchange-rate
- Params: `from` (currency code), `date` (YYYY-MM-DD)
- Returns: `{ from: string, date: string, rates: { CAD: number, USD: number } }`
- Cache rates by date (only fetch once per currency per day)
- Support historical rates for past dates

### GET /api/transactions
- Fetch recent transactions
- Support query params: limit, startDate, endDate
- For autocomplete: GET /api/transactions/vendors, /api/transactions/tags

### POST /api/transactions
- Append new row to Transactions tab
- Validate required fields
- Return success/error

### POST /api/upload
- Upload receipt image to Vercel Blob
- Return URL to store in transaction

## Environment Variables

```
GOOGLE_SHEETS_ID=<spreadsheet-id>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY=<service-account-private-key>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
EXCHANGE_RATE_API_KEY=<api-key-from-chosen-provider>
```

## File Structure Suggestion

```
/app
  /page.tsx                 # Main form
  /transactions/page.tsx    # Recent transactions view
  /api
    /schema/route.ts
    /transactions/route.ts
    /exchange-rate/route.ts
    /upload/route.ts
/components
  /TransactionForm.tsx
  /CascadingSelect.tsx
  /RecentTransactions.tsx
  /CurrencyToggle.tsx       # CAD ↔ USD toggle in header
/lib
  /google-sheets.ts         # Sheets API helper
  /exchange-rate.ts         # Exchange rate API helper with caching
  /types.ts                 # TypeScript types
  /preferences.ts           # localStorage helpers for user preferences
/public
  /manifest.json            # PWA manifest
```

## User Preferences (localStorage)

```typescript
{
  referenceCurrency: 'CAD' | 'USD',  // For displaying amounts
  lastUsedCurrency: 'CAD' | 'USD' | 'CNY' | 'JPY' | 'GBP',
  lastUsedAccount: string,
}
```

## Google Sheets API Setup

The user has already:
- Created a Google Cloud project
- Enabled Google Sheets API
- Created a Service Account with JSON credentials
- Will share the spreadsheet with the service account email

Use `googleapis` npm package:
```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
```

## UI/Design Notes

- Mobile-first, responsive
- Clean, minimal UI
- Large touch targets for form elements
- Dark mode support (nice to have)
- No heavy frameworks needed — Tailwind is sufficient

## Out of Scope for Phase 1

- Bank integration / automatic transaction import
- Analytics dashboard
- Multi-user support
- Budget goals / alerts
- Recurring transaction auto-entry

---

## Getting Started

1. Initialize Next.js project with TypeScript and Tailwind
2. Set up Google Sheets API connection
3. Build the Schema API route and test
4. Build the transaction form with cascading dropdowns
5. Build the POST endpoint to save transactions
6. Add receipt upload
7. Add recent transactions view
8. PWA setup for mobile install
