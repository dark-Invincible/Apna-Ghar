# Apna Ghar

Apna Ghar is a land-to-home intelligence platform for India. It helps people discover a plot, understand its terrain, organise land-record checks, imagine a home, and make clearer value decisions.

## Current milestone — Stage 2

The repository contains the clickable product foundation plus an interactive land-discovery workspace. Users can select a suggested location or type their own, move a plot pin, switch the map treatment, set plot dimensions, and see the preliminary terrain profile update.

The interface uses illustrative data only. It does **not** make title, ownership, dispute-free, or formal valuation claims.

## Run locally

```bash
npm run start
```

Open `http://localhost:4173` in a browser.

## Production land-data setup

This repository is prepared for a Vercel deployment with server-side location-search and elevation endpoints. They use a single `GOOGLE_MAPS_SERVER_KEY` environment variable, which must be set in the Vercel dashboard — never committed to the repository or included in browser code.

Enable billing and the **Geocoding API** plus **Elevation API** in a Google Cloud project. Create a dedicated server key restricted to these APIs and to the production server's IP/network where possible. Google documents that Elevation API requests require an API key and supports coordinate samples; it should be treated as a planning signal, not a replacement for a site survey. [Elevation API documentation](https://developers.google.com/maps/documentation/elevation/requests-elevation) · [Google Maps API-key security guidance](https://developers.google.com/maps/api-security-best-practices)

The frontend still falls back to prototype terrain values locally until these endpoints are deployed and configured.

## Delivery stages

1. **Product foundation** — complete.
2. **Land discovery** — interactive prototype and secure server-side location/elevation API layer complete; configure Google Maps credentials, add a live map renderer, then source parcel/flood data for the launch district.
3. **Land verification** — state-by-state record integrations, document workflow, reviewer handoff.
4. **AI home design** — prompt/image/blueprint inputs and interactive 3D concepts.
5. **Valuation engine** — land and construction-cost estimates with source/confidence data.
6. **Trust & professionals** — report sharing, document vault, consent, architect/lawyer/valuer workflow.
7. **Production launch** — authentication, payments, security review, analytics, pilot rollout.

## Product guardrails

- A Bhulekh-style record match is not proof of title or absence of disputes.
- Generated designs are concepts, not construction-ready drawings.
- Value outputs must be presented as dated estimate ranges with sources and confidence.
