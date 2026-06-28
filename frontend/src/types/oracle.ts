export interface GlobalFavorite {
  team: string;
  probability: number;
}

export interface UpcomingMatch {
  match: string;
  endDate: string;
  venue: string;
  percentHome: number;
  percentDraw: number;
  percentAway: number;
  source: string;
}
