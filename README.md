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
- Responses are cached for 6 hours to save the free quota. Each page of reviews costs one SerpApi search.

## Commands

`npm test` runs unit tests. `npm run typecheck` checks types.
