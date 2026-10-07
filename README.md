🇺🇸 [한국어](./README.ko.md)

# Return Window Board — Track online shopping return deadlines

A mini app that helps users manage their online shopping returns by automatically calculating legal return deadlines (7 days for change of mind, 3 months for defects) and custom store policies. Users can add items, check their remaining return window, and track the status of each return through a simple, card-based interface running inside the Toss app.

## Features

- 📦 **Add and track return items** — Record product name, store, received date, and reason for return
- 📅 **Automatic deadline calculation** — Computes legal (change of mind 7 days / defect 3 months) and custom store-specific return windows
- 📍 **D-day countdown** — Shows days remaining before return deadline expires
- 🔄 **Status management** — Track items as active, returned, or kept in a simple two-tab board (active/archive)
- 📝 **Checklist per item** — Maintain a return preparation checklist for each item
- 🌙 **Dark mode support** — Full TDS theme integration for Toss dark mode
- 📱 **Responsive mobile-first design** — Optimized for touch and small screens
- 💾 **Local persistence** — All data stored on device (no cloud required)

## Tech Stack

- **Framework** — Vite + React 18 + React Router 7
- **UI Components** — TDS (Toss Design System)
- **Styling** — Emotion (CSS-in-JS)
- **Icons** — lucide-react
- **Platform** — Apps-in-Toss WebView SDK
- **Testing** — Vitest + Playwright

## Getting Started

### Install dependencies
```bash
npm install
```

### Production build
```bash
npx vite build
```

### Apps-in-Toss deployment
```bash
npx ait build
```
Submit the built bundle to the Toss developer console for review and deployment.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_TOSS_AD_SLOT_ID` | Full-screen ad slot ID from Toss console | No |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID (Home/Result bottom banner) | No |
| `VITE_TOSS_IAP_SKU` | In-app purchase SKU from Toss console | No |
| `VITE_TOSS_PROMOTION_CODE` | Promotion reward code from Toss console | No |
| `VITE_SHARE_OG_URL` | OG image URL for share preview (Kakao, SMS) | No |

Copy `.env.example` to `.env` and fill in values from the Toss developer console. Features degrade gracefully if values are empty (no white screen, just omitted sections).

## Project Structure

```
src/
├── pages/              # Page components (Home, Result)
├── components/         # TDS-based reusable UI (Card, SummaryHero, etc.)
├── lib/               # Utilities (deadline calc, item store, analytics)
├── hooks/             # Custom React hooks
├── types/             # Shared TypeScript types (env.d.ts)
├── __tests__/         # Vitest test suite
├── styles/            # Global CSS
├── App.tsx            # Main routing
└── main.tsx           # Entry point
```

## Deployment

**Apps-in-Toss (Toss CDN)**

1. Ensure `apps-in-toss.config.ts` has the correct `appName` (case-sensitive, from Toss console)
2. Build: `npx vite build`
3. Deploy: `npx ait build` then submit to Toss developer console
4. The Toss review team will test on device and approve/reject
5. Once approved, the app appears on Toss mini-app store and runs inside the Toss WebView

No external hosting required — Toss CDN hosts the built bundle.

## License

MIT
