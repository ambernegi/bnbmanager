## BnB Manager

Simple “one stop shop” tracker for monthly **income**, **expenses**, and **profit/loss**.

- **Local-first**: data is stored in **browser `localStorage`** (no backend required).
- **Vercel-friendly**: deploy as a static-ish Next.js app.

## Features

- **Monthly entries** (YYYY-MM)
- **Multiple properties** (per month)
- **Property tenure**: mark each property as **Owned** or **Rented**
- **Rent per property** + **Operating cost per property** (from expenses tagged to that property)
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
- **Properties**: add properties inside a month, then set monthly rent per property.
- **Owned vs rented**: set “Tenure” per property (owned properties render a different drum style).
- **Operating cost**: add expenses and assign each expense to a property.
- **Export (Excel)**: click “Export (Excel)” to download an Excel-friendly `.csv` for the selected month.
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
