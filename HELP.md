# HostOps — Help Guide

**Run every property with clarity, control, and confidence.**

HostOps — Smarter operations for every property you manage.  
HostOps — The command center for modern property operations.  
HostOps — Simplify operations. Maximize performance.  
HostOps — From finances to insights, all in one place.

HostOps is a **local-first** operations + finance tracker for short-term rentals.

## What HostOps Tracks

- **Properties**: multiple properties, each marked **Owned** or **Rented**
- **Costs**:
  - **Base rent cost** (rented properties only; set per month)
  - **Operating costs** (expenses) tagged to a property
- **Revenue**: bookings (nights × price/night) per property, per month
- **Profit/Loss**: $revenue - (baseRent + operatingCosts)$

## Quick Start

- **Pick/Add a month**: use the month picker and click **Add month** (future months are blocked).
- **Add a property**: type a name in **Properties** → **Add**.
- **Set tenure**: expand a property → set **Tenure** (Owned/Rented).
- **Set base rent** (rented only): expand a rented property → set **Base rent cost (monthly)**.
- **Add bookings (revenue)**: expand a property → **Bookings** → add **Day, Nights, Price/night**.
- **Add expenses (costs)**: in **Expenses**, add a line item and assign it to a property.
  - For recurring costs like cleaning, use **Per-day amount** (rate/day × days).

## Expenses (Monthly Cost)

Every saved expense appears in the list with its **Monthly cost**:

- **Flat**: monthly cost = amount
- **Per-day**: monthly cost = rate/day × days

## Listings (Airbnb / Booking.com / Other)

For each property you can add a listing URL and mark it active:

- If the link is **active** and the URL is valid (`http`/`https`), the provider icon is shown as enabled.
- Clicking an enabled icon opens the listing in a new tab.

## Reminders

Expand a property and set:

- **Rent due on (day)** (rented properties)
- **Agreement valid until**

HostOps shows reminders for:

- Rent due soon
- Agreement renewal when close to expiration

## Analysis

The **Analysis** tab supports:

- **Period**: monthly / quarterly / semiannual / annual
- **Scope**: all properties or a single property

Charts and totals update based on your selections, including:

- Revenue vs cost over time
- Cost breakdown (base rent vs operating)
- Nights booked
- **Property performance scatter plot** (All properties): X = revenue, Y = cost

## Export (Excel-friendly CSV)

Use **Export (Excel)** to download a CSV for the selected month. It’s formatted to work well in Excel.

## Data Storage & Privacy

- Data is stored in your browser’s `localStorage` under `bnbmanager:data:v1`.
- No backend: data stays on this device/browser profile unless you export it.

