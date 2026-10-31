export type TournamentFormat = "SWISS" | "ROUND_ROBIN";
export type Category = "OPEN" | "U8" | "U12" | "GIRLS";
export type MatchResult = "1-0" | "0-1" | "0.5-0.5" | "BYE_1" | "BYE_0.5" | "BYE_0" | null;
export type RequestedByeType = "FULL" | "HALF" | "ZERO" | null;

export interface Player {
  id: string;
  name: string;
  rating: number;
  category: Category;
  score: number;
  buchholz: number;
  sonnebornBerger: number;
  opponents: string[];
  colorHistory: ("W" | "B" | "BYE")[];
  hadAutoBye: boolean;
  byeCount: number;
  active: boolean; // If false, skipped in next pairing
  requestedBye: RequestedByeType; // Pre-assigned bye for the upcoming round
  seed: number;
}

export interface Match {
  id: string;
  round: number;
  board: number;
  whiteId: string;
  blackId: string | "BYE";
  result: MatchResult;
}