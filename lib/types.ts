export type GameweekStatus = "open" | "locked";
export type Team = "darks" | "whites" | "subs";

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
};

export type Gameweek = {
  id: string;
  game_date: string;
  game_time: string | null;
  location: string | null;
  status: GameweekStatus;
  darks_score: number | null;
  whites_score: number | null;
  locked_at: string | null;
};

export type GameweekPlayer = {
  id: string;
  gameweek_id: string;
  player_id: string;
  team: Team;
  position: number;
  remove_requested: boolean;
  players: Player;
};
