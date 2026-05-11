# A2B Fuel

Estimate the fuel or electricity cost of a drive — anywhere in the world.
Pick a vehicle, enter origin/destination (plus any intermediate stops), and the app calculates kilometers, time, units of fuel/energy used, and the cost in local currency.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind**. Hosted on Vercel.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in MAPBOX_TOKEN
npm run dev
```

### Environment variables

| name | required | what it does |
| --- | --- | --- |
| `MAPBOX_TOKEN` | yes | Server-side Mapbox token used for geocoding (address autocomplete) and directions. Get one free at [mapbox.com/account/access-tokens](https://account.mapbox.com/access-tokens/). |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | optional | Public Mapbox token used for the static map preview (rendered client-side). Can be the same token as above. Without it, the preview shows a placeholder. |

In Vercel, set both under **Project Settings → Environment Variables**.

## How it works

- **Routing**: Mapbox Directions API, called from a server route handler so the token stays server-side.
- **Vehicle consumption**: a curated seed list of common cars (petrol, diesel, hybrid, electric). Override the consumption value manually any time.
- **Fuel & electricity prices**: country-average baseline snapshot, looked up by the geocoded country code of the origin. Override the unit price manually any time.
- **Currency**: shown in the local currency of the origin country.

## What's not in v1

- **Tolls** — no reliable free public API for global toll cost.
- **Real-world consumption databases** (e.g. Spritmonitor) — no clean public API; the seed list uses manufacturer figures with manual override as the escape hatch.
- **Live fuel-price feeds** — country averages are a static snapshot. Manual override is the workaround.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── geocode/route.ts      Mapbox geocoding proxy
│   │   ├── prices/route.ts       Country price lookup
│   │   └── route/route.ts        Mapbox directions proxy
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  Main UI
├── components/
│   ├── AddressInput.tsx          Geocoded autocomplete
│   ├── ResultCard.tsx
│   ├── RouteMap.tsx              Mapbox static image preview
│   └── VehiclePicker.tsx
└── lib/
    ├── calc.ts                   Cost math + formatters
    ├── prices.ts                 Country price table
    ├── types.ts
    └── vehicles.ts               Seed vehicle DB
```
