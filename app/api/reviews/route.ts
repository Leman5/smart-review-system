import { NextResponse } from "next/server";
import { fetchRecentReviews } from "../../../lib/serpapi";

// Cap keeps one request inside the free SerpApi quota.
const MAX_DAYS = 365;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const days = Number(searchParams.get("days") ?? 30);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return NextResponse.json({ error: `days must be 1-${MAX_DAYS}` }, { status: 400 });
  }

  try {
    return NextResponse.json({ reviews: await fetchRecentReviews(id, days) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load reviews" }, { status: 502 });
  }
}
