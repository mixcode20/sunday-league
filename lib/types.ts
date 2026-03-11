export type GameweekStatus = "open" | "locked";
export type Team = "darks" | "whites" | "subs";
export type ResultMode = "score" | "result";
export type Winner = "darks" | "whites" | "draw";
export type LeagueSortDirection = "asc" | "desc";

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  archived: boolean;
  games_played?: number;
  last_game_date?: string | null;
};

export type Gameweek = {
  id: string;
  game_date: string;
  game_time: string;
  location: string;
  status: GameweekStatus;
  darks_score: number | null;
  whites_score: number | null;
  result_mode: ResultMode | null;
  winner: Winner | null;
  locked_at: string | null;
};

export type GameweekPlayer = {
  id: string;
  gameweek_id: string;
  player_id: string;
  team: Team;
  position: number;
  team_position?: number | null;
  remove_requested: boolean;
  players: Player;
};

export type LeagueStatRow = {
  id: string;
  name: string;
  archived: boolean;
  gp: number;
  w: number;
  d: number;
  l: number;
  winPct: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};
