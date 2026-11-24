# Smart Review System

Search places like Google Maps, then see their rating based only on recent reviews (last 7, 30 or 90 days).

## Setup

1. Get a free API key at [serpapi.com](https://serpapi.com) (free plan, no card).
2. `cp .env.example .env.local` and set `SERPAPI_KEY`.
3. `npm install && npm run dev`, then open it on your phone or browser.

## Deploy (free)

Import the repo in [Vercel](https://vercel.com) (Hobby plan) and add `SERPAPI_KEY` as an environment variable.

## How it works

- Search uses SerpApi's Google Maps engine, so results match Google Maps.
- Reviews are read newest-first until one is older than the chosen window, then the stars are averaged.
- Search results are cached for 6 hours. Each page of reviews costs one SerpApi search.
- With a Redis database connected, every place's reviews are saved and reused. Later visits only fetch reviews newer than the saved ones (checked at most every 12 hours, or on Refresh). Keyword search runs on the saved reviews.
- Without a database the app still works, but every lookup uses SerpApi searches.

## Saving reviews (optional, free)

In Vercel, open **Storage**, add **Upstash Redis**, and connect it to the project. Vercel sets the connection variables (`KV_REST_API_URL` and `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). Redeploy afterwards.

## Commands

`npm test` runs unit tests. `npm run typecheck` checks types.
