export interface GlobalFavorite {
  team: string;
  probability: number;
}

export interface MatchOracle {
  fixtureId: number;
  advice: string;
  percentHome: number;
  percentDraw: number;
  percentAway: number;
}

export interface UpcomingMatch {
  id: string;
  match: string;
  endDate: string;
  outcomes: string[];
  odds: string[];
}
