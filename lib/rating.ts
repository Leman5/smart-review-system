import type { Review, WindowRating } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function cutoffDate(days: number, now: Date): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function reviewsWithinDays(reviews: Review[], days: number, now: Date): Review[] {
  const cutoff = cutoffDate(days, now).getTime();
  return reviews.filter((r) => new Date(r.date).getTime() >= cutoff);
}

export function windowRating(reviews: Review[], days: number, now: Date): WindowRating {
  const inWindow = reviewsWithinDays(reviews, days, now);
  if (inWindow.length === 0) return { average: null, count: 0 };
  const sum = inWindow.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / inWindow.length) * 10) / 10, count: inWindow.length };
}
