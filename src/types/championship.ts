export interface Team {
  id: string;
  name: string;
  logo?: string;
  createdAt: string;
}

export type KnockoutPhase = 'round-of-16' | 'quarter-finals' | 'semi-finals' | 'final';

export interface Championship {
  id: string;
  name: string;
  startDate?: string;
  description?: string;
  teamIds: string[];
  gameDays: string[];
  knockoutPhases: KnockoutPhase[];
  createdAt: string;
}

export interface GameDay {
  id: string;
  championshipId: string;
  name: string;
  teamIds: string[];
  createdAt: string;
}

export interface Match {
  id: string;
  championshipId: string;
  gameDayId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeWO: boolean;
  awayWO: boolean;
  round: number;
  played: boolean;
  createdAt: string;
}

export interface Round {
  id: string;
  championshipId: string;
  gameDayId?: string;
  number: number;
  name?: string;
  createdAt: string;
}

export interface KnockoutMatch {
  id: string;
  championshipId: string;
  phase: KnockoutPhase;
  position: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeWO: boolean;
  awayWO: boolean;
  winnerId: string | null;
  createdAt: string;
}

export interface TeamStats {
  teamId: string;
  team: Team;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  gaveWO: boolean;
  woCount: number;
}