import { cutoffDate } from "./rating";
import type { FetchedReviews } from "./serpapi";
import type { Review } from "./types";

export const STALE_MS = 12 * 60 * 60 * 1000;

export type StoredPlace = { reviews: Review[]; complete: boolean; fetchedAt: string };

export type ReviewStore = {
  get(placeId: string): Promise<StoredPlace | null>;
  set(placeId: string, value: StoredPlace): Promise<void>;
};

type Options = {
  placeId: string;
  days: number;
  now: Date;
  force: boolean;
  store: ReviewStore;
  fetchPages: (stop: (batch: Review[]) => boolean) => Promise<FetchedReviews>;
};

function time(r: Review): number {
  return new Date(r.date).getTime();
}

// Saved reviews are always a contiguous run from the newest, so the oldest one marks how far back they reach.
function reaches(stored: StoredPlace, cutoff: number): boolean {
  if (stored.complete) return true;
  return stored.reviews.length > 0 && Math.min(...stored.reviews.map(time)) <= cutoff;
}

export async function getCachedReviews({ placeId, days, now, force, store, fetchPages }: Options): Promise<StoredPlace> {
  const cutoff = cutoffDate(days, now).getTime();
  const stored = await store.get(placeId);
  const covers = stored !== null && reaches(stored, cutoff);
  const stale = stored === null || force || now.getTime() - new Date(stored.fetchedAt).getTime() > STALE_MS;
  if (stored && covers && !stale) return stored;

  const known = new Set(stored?.reviews.map((r) => r.id));
  const fetched = await fetchPages(
    (batch) => batch.some((r) => time(r) < cutoff) || (covers && batch.some((r) => known.has(r.id))),
  );

  const byId = new Map<string, Review>();
  for (const r of [...fetched.reviews, ...(stored?.reviews ?? [])]) byId.set(r.id, r);
  const next: StoredPlace = {
    reviews: [...byId.values()].sort((a, b) => time(b) - time(a)),
    complete: fetched.complete || (covers && stored?.complete === true),
    fetchedAt: now.toISOString(),
  };
  await store.set(placeId, next);
  return next;
}
