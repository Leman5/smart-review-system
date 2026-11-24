"use client";

import { useCallback, useMemo, useState } from "react";
import { windowRating } from "../lib/rating";
import type { Place, Review } from "../lib/types";

const WINDOWS = [7, 30, 90] as const;
const MAX_DAYS = 365;

type Coords = { lat: number; lng: number } | null;

function currentPosition(): Promise<Coords> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

function Stars({ value }: { value: number | null }) {
  return <>{value === null ? "–" : `${value.toFixed(1)} ★`}</>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [days, setDays] = useState<number>(30);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetchedDays, setFetchedDays] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [daysInput, setDaysInput] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const coords = await currentPosition();
      const params = new URLSearchParams({ q: query });
      if (coords) {
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
      }
      const res = await fetch(`/api/search?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setPlaces(body.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadReviews = useCallback(async (place: Place, window: number, kw: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(place.id)}&days=${window}${kw ? `&q=${encodeURIComponent(kw)}` : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setReviews(body.reviews);
      setFetchedDays(window);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPlace = (place: Place) => {
    setSelected(place);
    setReviews([]);
    setFetchedDays(0);
    setKeyword("");
    setKeywordInput("");
    void loadReviews(place, days, "");
  };

  const pickWindow = (window: number) => {
    setDays(window);
    setDaysInput(String(window));
    if (selected && window > fetchedDays) void loadReviews(selected, window, keyword);
  };

  const applyCustomDays = () => {
    const n = Number(daysInput);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_DAYS) pickWindow(n);
    else setError(`Enter a whole number of days from 1 to ${MAX_DAYS}`);
  };

  const applyKeyword = () => {
    if (!selected) return;
    const kw = keywordInput.trim();
    setKeyword(kw);
    setFetchedDays(0);
    void loadReviews(selected, days, kw);
  };

  const now = useMemo(() => new Date(), [reviews]);
  const recent = windowRating(reviews, days, now);
  const recentReviews = reviews.filter((r) => windowRating([r], days, now).count === 1);
  const dropped = selected?.rating != null && recent.average !== null && recent.average <= selected.rating - 0.5;

  if (selected) {
    return (
      <main>
        <button className="back" onClick={() => setSelected(null)}>← Back</button>
        <h2>{selected.name}</h2>
        <div className="muted">{selected.address}</div>
        <div className="chips">
          {WINDOWS.map((w) => (
            <button key={w} className="chip" aria-pressed={days === w} onClick={() => pickWindow(w)}>
              {w} days
            </button>
          ))}
        </div>
        <form className="inline" onSubmit={(e) => { e.preventDefault(); applyCustomDays(); }}>
          <input type="number" inputMode="numeric" min={1} max={MAX_DAYS} value={daysInput} onChange={(e) => setDaysInput(e.target.value)} aria-label="Number of days" />
          <button className="chip" type="submit">Days</button>
        </form>
        <form className="inline" onSubmit={(e) => { e.preventDefault(); applyKeyword(); }}>
          <input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} placeholder="Dish or keyword, e.g. biryani" aria-label="Keyword" />
          <button className="chip" type="submit">Find</button>
        </form>
        <div className="compare">
          <div>
            <div className="muted">Overall</div>
            <div className="big"><Stars value={selected.rating} /></div>
            <div className="muted">{selected.reviewCount ?? "?"} reviews</div>
          </div>
          <div>
            <div className="muted">Last {days} days{keyword ? ` · “${keyword}”` : ""}</div>
            <div className={`big ${dropped ? "bad" : ""}`}>{loading ? "…" : <Stars value={recent.average} />}</div>
            <div className="muted">{loading ? "" : `${recent.count} reviews`}</div>
          </div>
        </div>
        {error && <p className="bad">{error}</p>}
        {!loading && !error && fetchedDays > 0 && recent.count === 0 && (
          <p className="muted">No reviews{keyword ? ` mentioning “${keyword}”` : ""} in the last {days} days.</p>
        )}
        {!loading && recent.count > 0 && recent.count < 5 && (
          <p className="muted">Only {recent.count} recent reviews, so this number can swing a lot.</p>
        )}
        {recentReviews.map((r, i) => (
          <div className="review" key={i}>
            <strong>{"★".repeat(r.rating)}</strong> <span className="muted">{r.date.slice(0, 10)} · {r.author ?? "Anonymous"}</span>
            {r.text && <div>{r.text}</div>}
          </div>
        ))}
      </main>
    );
  }

  return (
    <main>
      <form onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search restaurants, cafes, places…" enterKeyHint="search" />
      </form>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="bad">{error}</p>}
      {places.map((p) => (
        <button key={p.id} className="row" onClick={() => openPlace(p)}>
          {p.thumbnail && <img src={p.thumbnail} alt="" />}
          <div>
            <strong>{p.name}</strong>
            <div className="muted"><Stars value={p.rating} /> ({p.reviewCount ?? "?"}) · {p.type ?? "Place"}</div>
            <div className="muted">{p.address}</div>
          </div>
        </button>
      ))}
    </main>
  );
}
