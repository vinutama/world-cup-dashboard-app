export interface Score {
  ft: [number, number];
  ht: [number, number];
}

export interface Goal {
  name: string;
  minute: number;
  offset?: number | null;
  owngoal?: boolean | null;
  penalty?: boolean | null;
}

export interface Match {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score: Score;
  goals1: Goal[];
  goals2: Goal[];
  group?: string;
  ground?: string;
}

export interface Tournament {
  name: string;
  year: number;
  matches: Match[];
}

export interface PaginatedMatches {
  matches: MatchWithIndex[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface MatchWithIndex {
  match: Match;
  original_index: number;
}

export type { TimelineEvent, GoalAvalancheResponse } from './goalAvalanche';
