export type Place = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  type: string | null;
  thumbnail: string | null;
};

export type Review = {
  rating: number;
  date: string;
  text: string | null;
  author: string | null;
};

export type WindowRating = {
  average: number | null;
  count: number;
};
