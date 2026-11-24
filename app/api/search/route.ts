import { NextResponse } from "next/server";
import { searchPlaces } from "../../../lib/serpapi";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const coords = searchParams.has("lat") && searchParams.has("lng") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  try {
    return NextResponse.json({ places: await searchPlaces(q, coords) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 502 });
  }
}
