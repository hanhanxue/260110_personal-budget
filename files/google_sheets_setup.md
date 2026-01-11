# Google Sheets Setup

## Tab 1: `Schema`

Copy everything below the line into your Schema tab (paste into cell A1):

---

Table,Subcategory,Line Item,Active
Housing,Ownership,Mortgage,TRUE
Housing,Ownership,Condo Fee,TRUE
Housing,Ownership,Home Insurance,TRUE
Housing,Taxes,Property Tax,TRUE
Housing,Taxes,School Tax,TRUE
Housing,Utilities,Hydro,TRUE
Housing,Capital Improvements,Special Assessment,TRUE
Essentials,Sustenance,Lufa,TRUE
Essentials,Sustenance,Groceries Other,TRUE
Essentials,Household,Home Necessities,TRUE
Essentials,Healthcare,Prescriptions,TRUE
Essentials,Healthcare,Dental,TRUE
Essentials,Healthcare,Other Medical,TRUE
Essentials,Pet Care,Kibbles,TRUE
Essentials,Pet Care,Vet,TRUE
Essentials,Pet Care,Other,TRUE
Essentials,Transportation,Rideshare,TRUE
Essentials,Transportation,Parking,TRUE
Essentials,Transportation,Other,TRUE
Essentials,Professional Services,Accountant,TRUE
Discretionary,Dining,Restaurants,TRUE
Discretionary,Dining,Other (Snacks),TRUE
Discretionary,Entertainment,Movies / Events,TRUE
Discretionary,Entertainment,Books / Games,TRUE
Discretionary,Shopping,Clothing,TRUE
Discretionary,Shopping,Electronics,TRUE
Discretionary,Shopping,Other,TRUE
Discretionary,Home Improvement,Furniture,TRUE
Discretionary,Gifts & Donations,Gifts,TRUE
Subscriptions,Communications,Internet,TRUE
Subscriptions,Communications,Mobile CA,TRUE
Subscriptions,Communications,Mobile US,TRUE
Subscriptions,Media & Services,Spotify,TRUE
Subscriptions,Media & Services,Google One,TRUE
Subscriptions,Media & Services,Amazon Prime,TRUE
Subscriptions,Media & Services,NY Times,TRUE
Subscriptions,Media & Services,Claude,TRUE
Subscriptions,Media & Services,Other,TRUE
Large Purchases,Item,Item,TRUE
Travel,Trip,Transportation,TRUE
Travel,Trip,Shelter,TRUE
Travel,Trip,Food,TRUE
Travel,Trip,Shopping,TRUE
Travel,Trip,Flights,TRUE
Travel,Trip,Other,TRUE
Savings,Savings,TFSA,TRUE
Savings,Savings,RRSP,TRUE

---

## Tab 2: `Transactions`

Copy this header row into your Transactions tab (paste into cell A1):

---

Date,Table,Subcategory,Line Item,Amount,Currency,Vendor,Note,Receipt URL,Account,Period,Distribute

---

## Column Definitions for `Transactions`

| Column | Type | Required | Description | Example Values |
|--------|------|----------|-------------|----------------|
| Date | Date | Yes | When the transaction occurred | 2026-01-15 |
| Table | Text | Yes | Top-level category | Housing, Essentials, Discretionary, Subscriptions, Large Purchases, Travel, Savings |
| Subcategory | Text | Yes | Second-level grouping | Ownership, Sustenance, Dining, etc. |
| Line Item | Text | Yes | Specific item | Mortgage, Groceries Other, Restaurants, etc. |
| Amount | Number | Yes | Transaction amount (always positive) | 45.67 |
| Currency | Text | Yes | Currency code | CAD, USD |
| Vendor | Text | No | Where you spent | Metro, Amazon, Uber Eats |
| Note | Text | No | Additional context | "Weekly groceries", "Birthday gift for Mom" |
| Receipt URL | URL | No | Link to uploaded receipt image | https://... |
| Account | Text | Yes | Which account used | RBC Visa, RBC Chequing, Chase Chequing |
| Period | Text | Yes | Transaction frequency | one-time, monthly, quarterly, yearly |
| Distribute | Boolean | Yes | Spread across period? | TRUE, FALSE |

---

## Valid Values Reference

### Period
- `one-time` — Regular single transaction (most common)
- `monthly` — Repeats monthly (subscriptions)
- `quarterly` — Every 3 months
- `yearly` — Annual expense (property tax, insurance)

### Distribute
- `FALSE` — Show full amount in the entry month (default for most transactions)
- `TRUE` — Divide evenly across the period (e.g., $1200 yearly → $100/month in reports)

### Currency
- `CAD` — Canadian Dollar
- `USD` — US Dollar
- Add more as needed

### Account (customize to your accounts)
- RBC Visa
- RBC Chequing
- Chase Chequing
- Add your other accounts

---

## Example Transactions

| Date | Table | Subcategory | Line Item | Amount | Currency | Vendor | Note | Receipt URL | Account | Period | Distribute |
|------|-------|-------------|-----------|--------|----------|--------|------|-------------|---------|--------|------------|
| 2026-01-15 | Housing | Taxes | Property Tax | 1200 | CAD | City of Montreal | 2026 Annual | | RBC Chequing | yearly | TRUE |
| 2026-01-10 | Essentials | Sustenance | Groceries Other | 87.43 | CAD | Metro | Weekly run | | RBC Visa | one-time | FALSE |
| 2026-01-10 | Discretionary | Dining | Restaurants | 32.00 | CAD | St-Viateur Bagel | Lunch with Alex | | RBC Visa | one-time | FALSE |
| 2026-01-01 | Subscriptions | Media & Services | Spotify | 11.99 | CAD | Spotify | | | RBC Visa | monthly | FALSE |
| 2026-01-05 | Subscriptions | Communications | Mobile CA | 45.00 | CAD | Fizz | | | RBC Visa | monthly | FALSE |

---

## Notes

1. **Adding new categories**: Just add a new row to the `Schema` tab with `Active = TRUE`. The app will pick it up automatically.

2. **Retiring categories**: Set `Active = FALSE` instead of deleting. Historical transactions remain valid.

3. **Travel trips**: For the Trip subcategory, you can type the actual trip name (e.g., "China Feb 17 - Mar 5") in the Vendor or Note field, or we can add a "Trip Name" column later if you want.

4. **Large Purchases**: Similar idea — use Note field for item description, or we can add an "Item Description" column.
