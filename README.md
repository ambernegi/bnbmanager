## BnB Manager

Simple “one stop shop” tracker for monthly **income**, **expenses**, and **profit/loss**.

- **Local-first**: data is stored in **browser `localStorage`** (no backend required).
- **Vercel-friendly**: deploy as a static-ish Next.js app.

## Features

- **Monthly entries** (YYYY-MM)
- **Multiple properties** (per month)
- **Property tenure**: mark each property as **Owned** or **Rented**
- **Breakeven model**:
  - **Total cost** = base rent cost (rented only) + operating cost
  - **Revenue** = bookings (nights × price/night)
  - **Profit** starts only after revenue exceeds total cost
- **Base rent cost per property** (rented only) + **Operating cost per property** (expenses tagged to that property)
- **Bookings** (per property, per month)
- **Listing links** per property: Airbnb / Booking.com / Other (icon is colored when listing is active)
- **Expenses** (line items with optional day-of-month, tagged to a property)
- **Profit/Loss** (auto-calculated: income − expenses)
- **Upcoming months**: month picker defaults to **next month** for faster planning
- **Animated Money Drum** per property (green = rent, red = operating cost portion)

## Getting Started

Run the development server:

```bash
npm run dev
```

Then open `http://127.0.0.1:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Using the App

- **Add month**: use the month picker (defaults to next month) and click “Add month”.
- **Currency / Location**: set currency (defaults to **INR**) and locale (defaults to **en-IN**) in the header.
- **Region**: choose one of **India / US / Europe / UK** (currency auto-matches region).
- **Properties**: add properties inside a month, then set monthly rent per property.
- **Owned vs rented**: set “Tenure” per property (owned properties render a different drum style).
- **Operating cost**: add expenses and assign each expense to a property.
- **Bookings**: add bookings (nights + price/night) per property; revenue is calculated automatically.
- **Export (Excel)**: click “Export (Excel)” to download an Excel-friendly `.csv` for the selected month.
- **Reminders**: set “rent due day” and “agreement valid until” per property to get renewal/due reminders.

## Analysis

Use the **Analysis** tab to view rollups:

- **Scope**: all properties or a single property
- **Period**: monthly, quarterly, semi-annual, annual
- **Export (Excel)**: click “Export (Excel)” to download an Excel-friendly `.csv` for the selected month.

## Data Storage (Local-Only)

- **Where it’s saved**: browser `localStorage`
- **Storage key**: `bnbmanager:data:v1`
- **Privacy**: data stays on this device/browser profile (no sync).

### Reset / Clear all data

- Delete the `localStorage` key `bnbmanager:data:v1` in your browser devtools, then refresh.

## Deploy on Vercel

- Import the repo in Vercel.
- Set **Root Directory** to `bnbmanager/` (since the app lives in that folder).
- Build command: `npm run build`
- Output: Next.js default

## Troubleshooting

- **Dev server fails with EPERM on 0.0.0.0:3000**: run the dev server bound to localhost:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Roadmap (optional next steps)

- CSV export/import
- More currencies + locales
- Property management (rename/delete) + per-property reporting
- Cloud sync (auth + database) for multi-device access

## Tech Notes

- Built with Next.js App Router + Tailwind.
- Uses `next/font` to load Geist fonts.
