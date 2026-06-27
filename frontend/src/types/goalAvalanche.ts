/**
 * Goal Avalanche — Timeline event types matching the backend API.
 *
 * The backend returns events grouped by match day:
 *   GET /api/v1/goal-avalanche?year=2018
 *   → { "timeline": { "1": [...], "2": [...], ... } }
 */

export interface TimelineEvent {
  matchId: string;
  teamA: string;
  teamB: string;
  scorer: string;
  teamScored: string;
  minute: number;
  minuteLabel: string;
  matchDay: number;
  currentScore: string;
  isClustered: boolean;
  round: string;
  fullTime: string;
  kickoff: string;
}

export interface GoalAvalancheResponse {
  timeline: Record<string, TimelineEvent[]>;
}
