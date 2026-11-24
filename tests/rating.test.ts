import { describe, expect, it } from "vitest";
import { windowRating } from "../lib/rating";
import { parseReviews } from "../lib/serpapi";
import type { Review } from "../lib/types";

const now = new Date("2026-11-24T00:00:00Z");
const review = (rating: number, date: string): Review => ({ rating, date, text: null, author: null });

describe("windowRating", () => {
  const reviews = [review(1, "2026-11-20T00:00:00Z"), review(2, "2026-11-01T00:00:00Z"), review(5, "2026-06-01T00:00:00Z")];

  it("averages only reviews inside the window", () => {
    expect(windowRating(reviews, 30, now)).toEqual({ average: 1.5, count: 2 });
    expect(windowRating(reviews, 7, now)).toEqual({ average: 1, count: 1 });
  });

  it("returns null average when the window is empty", () => {
    expect(windowRating([review(5, "2025-01-01T00:00:00Z")], 30, now)).toEqual({ average: null, count: 0 });
  });
});

describe("parseReviews", () => {
  it("drops reviews without rating or date", () => {
    const out = parseReviews([{ rating: 4, iso_date: "2026-11-01T00:00:00Z" }, { rating: 3 }, { iso_date: "2026-11-01T00:00:00Z" }]);
    expect(out).toHaveLength(1);
  });
});
