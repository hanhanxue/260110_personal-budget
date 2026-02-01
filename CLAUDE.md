# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm start        # Run production server
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

Dual-budget (Personal + Business) tracker built with **Next.js 14 (App Router)**, **TypeScript (strict)**, and **Tailwind CSS**. Uses **Google Sheets** as the database (one sheet per budget), **Cloudflare R2** (via AWS S3 SDK) for receipt image uploads, and **Frankfurter API** for exchange rates.

### Dual-budget design

The app supports two independent budgets: **Personal** and **Business**. Each has its own Google Sheet (`PERSONAL_GOOGLE_SHEETS_ID` / `BUSINESS_GOOGLE_SHEETS_ID`) and column layout:

- **Personal** (17 cols, A:Q): ...Account, Distribute, Tag, Submitted At
- **Business** (18 cols, A:R): ...Account, Tag, GST/HST Paid, Capital Expense, Submitted At

Budget mode is stored in localStorage and toggled via `BudgetToggle` component. A `budgetModeChanged` custom event propagates changes across components.

### Data flow

```
Client (React) → API Routes (/api/[budget]/*) → Google Sheets API
                                                → Cloudflare R2 (uploads)
                                                → Frankfurter API (exchange rates)
```

### Client components

- `TransactionFormWrapper.tsx` and `TransactionsListWrapper.tsx` are **client components** that read budget mode from localStorage and fetch data from budget-parameterized API routes.
- `BudgetToggle.tsx` toggles between Personal/Business modes.
- `TransactionForm.tsx` renders budget-specific fields (Distribute for personal, GST/HST + Capital for business).

### Key directories

- `src/app/api/[budget]/` — Budget-parameterized API routes: `schema/`, `transactions/` (CRUD + vendors/accounts/tags autocomplete)
- `src/app/api/` — Shared routes: `auth/`, `exchange-rate/`, `upload/` (upload accepts `?budget=` query param)
- `src/components/` — `TransactionForm.tsx` (main form), `BudgetToggle.tsx`, `RecentTransactions.tsx`, `PasswordProtection.tsx`, `CascadingSelect.tsx`
- `src/lib/` — `google-sheets.ts` (budget-parameterized Sheets client), `budget-param.ts` (route helper), `auth.ts`, `exchange-rate.ts`, `types.ts`, `preferences.ts`

### Authentication

Simple password-based auth. `APP_PASSWORD` env var checked via `x-auth-password` header on write operations. Client stores password in sessionStorage.

### Multi-currency

Supports CAD, USD, CNY, JPY, GBP. Transactions store the original amount plus CAD and USD equivalents. Exchange rates fetched from Frankfurter API and cached in-memory keyed by `CURRENCY-YYYY-MM-DD`.

### Google Sheets structure

Each budget has two sheets: **Schema** (category -> subcategory -> line item hierarchy) and **Transactions** (budget-specific column layout). New rows are inserted at the top.

## Environment Variables

See `.env.example`. Required: `PERSONAL_GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `APP_PASSWORD`. Optional: `BUSINESS_GOOGLE_SHEETS_ID`. For uploads: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

## Style

- Mobile-first PWA design with Tailwind utility classes
- Path alias: `@/*` maps to `./src/*`
- No state management library — React hooks + localStorage (`preferences.ts`)
