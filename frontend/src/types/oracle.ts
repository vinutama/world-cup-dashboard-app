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

export interface NextMatchOracle {
  fixtureName: string;
  percentHome: number;
  percentDraw: number;
  percentAway: number;
  source: string;
}
