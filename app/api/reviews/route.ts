import { NextResponse } from "next/server";
import { reviewsWithinDays } from "../../../lib/rating";
import { getCachedReviews } from "../../../lib/reviewsCache";
import { fetchRecentReviews, fetchReviewPages } from "../../../lib/serpapi";
import { getStore } from "../../../lib/store";

// Cap keeps one request inside the free SerpApi quota.
const MAX_DAYS = 365;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const days = Number(searchParams.get("days") ?? 30);
  const keyword = searchParams.get("q")?.trim().slice(0, 60) || null;
  const force = searchParams.get("refresh") === "1";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return NextResponse.json({ error: `days must be 1-${MAX_DAYS}` }, { status: 400 });
  }

  try {
    const store = getStore();
    if (!store) return NextResponse.json({ reviews: await fetchRecentReviews(id, days, keyword), saved: false });

    const now = new Date();
    const place = await getCachedReviews({ placeId: id, days, now, force, store, fetchPages: (stop) => fetchReviewPages(id, stop) });
    const needle = keyword?.toLowerCase();
    const reviews = reviewsWithinDays(place.reviews, days, now).filter((r) => !needle || r.text?.toLowerCase().includes(needle));
    return NextResponse.json({ reviews, saved: true, fetchedAt: place.fetchedAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load reviews" }, { status: 502 });
  }
}
