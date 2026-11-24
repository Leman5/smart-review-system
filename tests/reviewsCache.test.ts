import { describe, expect, it } from "vitest";
import { getCachedReviews, type ReviewStore, type StoredPlace } from "../lib/reviewsCache";
import type { Review } from "../lib/types";

const now = new Date("2026-11-24T12:00:00Z");
const r = (id: string, date: string): Review => ({ id, rating: 4, date, text: null, author: null });

function setup(initial: StoredPlace | null, pages: Review[][], complete = false) {
  let saved = initial;
  let calls = 0;
  const store: ReviewStore = { get: async () => saved, set: async (_, v) => void (saved = v) };
  const fetchPages = async (stop: (b: Review[]) => boolean) => {
    calls++;
    const out: Review[] = [];
    for (const page of pages) {
      out.push(...page);
      if (stop(page)) return { reviews: out, complete: false };
    }
    return { reviews: out, complete };
  };
  const run = (days: number, force = false) => getCachedReviews({ placeId: "p", days, now, force, store, fetchPages });
  return { run, calls: () => calls, saved: () => saved };
}

describe("getCachedReviews", () => {
  it("fetches once, then serves fresh saved reviews without fetching", async () => {
    const t = setup(null, [[r("a", "2026-11-20T00:00:00Z"), r("b", "2026-10-01T00:00:00Z")]]);
    await t.run(30);
    await t.run(30);
    expect(t.calls()).toBe(1);
  });

  it("when stale, stops at the first already-saved review and merges", async () => {
    const old: StoredPlace = { reviews: [r("a", "2026-11-10T00:00:00Z"), r("z", "2026-10-01T00:00:00Z")], complete: false, fetchedAt: "2026-11-20T00:00:00Z" };
    const t = setup(old, [[r("n", "2026-11-23T00:00:00Z"), r("a", "2026-11-10T00:00:00Z")], [r("never", "2026-09-01T00:00:00Z")]]);
    const out = await t.run(30);
    expect(out.reviews.map((x) => x.id)).toEqual(["n", "a", "z"]);
  });

  it("fetches again when the saved reviews do not reach back far enough", async () => {
    const fresh: StoredPlace = { reviews: [r("a", "2026-11-10T00:00:00Z")], complete: false, fetchedAt: now.toISOString() };
    const t = setup(fresh, [[r("a", "2026-11-10T00:00:00Z"), r("old", "2026-06-01T00:00:00Z")]]);
    await t.run(90);
    expect(t.calls()).toBe(1);
  });
});
