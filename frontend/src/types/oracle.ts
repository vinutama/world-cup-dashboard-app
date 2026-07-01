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

export interface GameItem {
  slug: string;
  team1: string;
  team2: string;
  date: string;
  percentHome: number;
  percentDraw: number;
  percentAway: number;
  volume: number;
  source: string;
}

export interface GoldenBootPlayer {
  player: string;
  probability: number;
}
