import { cutoffDate } from "./rating";
import type { Place, Review } from "./types";

const BASE = "https://serpapi.com/search.json";
const SIX_HOURS = 6 * 60 * 60;
// Each page costs one free SerpApi search; this bounds the cost of one place.
export const MAX_REVIEW_PAGES = 8;

type SerpLocalResult = {
  data_id?: string;
  title?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  type?: string;
  thumbnail?: string;
};

type SerpReview = {
  review_id?: string;
  rating?: number;
  iso_date?: string;
  snippet?: string;
  user?: { name?: string };
};

type SerpReviewsResponse = {
  reviews?: SerpReview[];
  serpapi_pagination?: { next_page_token?: string };
  error?: string;
};

function apiKey(): string {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error("SERPAPI_KEY is not set");
  return key;
}

async function serpGet<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries({ ...params, api_key: apiKey() })) url.searchParams.set(k, v);
  const res = await fetch(url, params.engine === "google_maps_reviews" ? { cache: "no-store" } : { next: { revalidate: SIX_HOURS } });
  if (!res.ok) throw new Error(`SerpApi request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function parsePlaces(results: SerpLocalResult[]): Place[] {
  return results
    .filter((r) => r.data_id && r.title)
    .map((r) => ({
      id: r.data_id as string,
      name: r.title as string,
      address: r.address ?? "",
      rating: r.rating ?? null,
      reviewCount: r.reviews ?? null,
      type: r.type ?? null,
      thumbnail: r.thumbnail ?? null,
    }));
}

export async function searchPlaces(query: string, coords: { lat: number; lng: number } | null): Promise<Place[]> {
  const params: Record<string, string> = { engine: "google_maps", type: "search", q: query };
  if (coords) params.ll = `@${coords.lat},${coords.lng},14z`;
  const data = await serpGet<{ local_results?: SerpLocalResult[]; place_results?: SerpLocalResult }>(params);
  if (data.local_results) return parsePlaces(data.local_results);
  return data.place_results ? parsePlaces([data.place_results]) : [];
}

export function parseReviews(raw: SerpReview[]): Review[] {
  return raw
    .filter((r) => typeof r.rating === "number" && r.iso_date)
    .map((r) => ({
      id: r.review_id ?? `${r.iso_date}|${r.user?.name ?? ""}|${(r.snippet ?? "").slice(0, 40)}`,
      rating: r.rating as number,
      date: r.iso_date as string,
      text: r.snippet ?? null,
      author: r.user?.name ?? null,
    }));
}

export type FetchedReviews = { reviews: Review[]; complete: boolean };

/** Reads newest-first pages until `stop` says the latest page was enough. `complete` means Google had no more pages. */
export async function fetchReviewPages(
  placeId: string,
  stop: (batch: Review[]) => boolean,
  keyword: string | null = null,
): Promise<FetchedReviews> {
  const collected: Review[] = [];
  let token: string | undefined;

  for (let page = 0; page < MAX_REVIEW_PAGES; page++) {
    const params: Record<string, string> = { engine: "google_maps_reviews", data_id: placeId, sort_by: "newestFirst" };
    if (keyword) params.query = keyword;
    if (token) {
      params.next_page_token = token;
      params.num = "20";
    }
    const data = await serpGet<SerpReviewsResponse>(params);
    if (data.error) throw new Error(data.error);

    const batch = parseReviews(data.reviews ?? []);
    collected.push(...batch);
    if (stop(batch)) return { reviews: collected, complete: false };

    token = data.serpapi_pagination?.next_page_token;
    if (!token) return { reviews: collected, complete: true };
  }
  return { reviews: collected, complete: false };
}

export async function fetchRecentReviews(placeId: string, days: number, keyword: string | null = null, now: Date = new Date()): Promise<Review[]> {
  const cutoff = cutoffDate(days, now).getTime();
  const { reviews } = await fetchReviewPages(placeId, (batch) => batch.some((r) => new Date(r.date).getTime() < cutoff), keyword);
  return reviews;
}
