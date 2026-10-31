import { Player, Match, MatchResult } from "@/types/tournament";

/**
 * FIDE Seeding Rules:
 * - Unrated Mode: Everyone is assigned 1000 rating and sorted strictly alphabetically (A-Z).
 * - Rated Mode: Sorted by Rating (Highest first), then alphabetically (A-Z).
 */
export function getSeededPlayers(playerList: Player[], unratedMode: boolean): Player[] {
  const updated = playerList.map((p) => ({
    ...p,
    rating: unratedMode ? 1000 : p.rating,
    active: p.active ?? true,
    requestedBye: p.requestedBye ?? null,
    hadAutoBye: p.hadAutoBye ?? false,
    byeCount: p.byeCount ?? 0,
  }));

  updated.sort((a, b) => {
    if (!unratedMode && b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return updated.map((p, idx) => ({ ...p, seed: idx + 1 }));
}

/**
 * Recalculates scores, color histories, opponents, Buchholz, and Sonneborn-Berger from scratch.
 */
export function recalculateStats(currentPlayers: Player[], allRounds: Match[][]): Player[] {
  const map = new Map<string, Player>();

  currentPlayers.forEach((p) => {
    map.set(p.id, {
      ...p,
      score: 0,
      buchholz: 0,
      sonnebornBerger: 0,
      opponents: [],
      colorHistory: [],
      hadAutoBye: false,
      byeCount: 0,
    });
  });

  // Pass 1: Scores, Opponents, Colors, Byes
  allRounds.forEach((roundMatches) => {
    roundMatches.forEach((m) => {
      if (!m.result) return;
      const w = map.get(m.whiteId);
      if (!w) return;

      if (m.blackId === "BYE") {
        w.byeCount += 1;
        w.colorHistory.push("BYE");
        if (m.result === "BYE_1") {
          w.score += 1;
          w.hadAutoBye = true;
        } else if (m.result === "BYE_0.5") {
          w.score += 0.5;
        }
      } else {
        const b = map.get(m.blackId);
        if (!b) return;

        w.opponents.push(b.id);
        b.opponents.push(w.id);
        w.colorHistory.push("W");
        b.colorHistory.push("B");

        if (m.result === "1-0") {
          w.score += 1;
        } else if (m.result === "0-1") {
          b.score += 1;
        } else if (m.result === "0.5-0.5") {
          w.score += 0.5;
          b.score += 0.5;
        }
      }
    });
  });

  // Pass 2: Buchholz & Sonneborn-Berger Tiebreaks
  allRounds.forEach((roundMatches) => {
    roundMatches.forEach((m) => {
      if (!m.result || m.blackId === "BYE") return;
      const w = map.get(m.whiteId);
      const b = map.get(m.blackId);
      if (!w || !b) return;

      w.buchholz += b.score;
      b.buchholz += w.score;

      if (m.result === "1-0") {
        w.sonnebornBerger += b.score;
      } else if (m.result === "0-1") {
        b.sonnebornBerger += w.score;
      } else if (m.result === "0.5-0.5") {
        w.sonnebornBerger += b.score * 0.5;
        b.sonnebornBerger += w.score * 0.5;
      }
    });
  });

  return Array.from(map.values());
}

/**
 * Determines a player's FIDE color preference based on past games.
 */
function getPreferredColor(p: Player): "W" | "B" | "NONE" {
  const games = p.colorHistory.filter((c) => c !== "BYE") as ("W" | "B")[];
  if (games.length === 0) return "NONE";

  const wCount = games.filter((c) => c === "W").length;
  const bCount = games.filter((c) => c === "B").length;

  if (games.length >= 2) {
    const last = games[games.length - 1];
    const secondLast = games[games.length - 2];
    if (last === secondLast) return last === "W" ? "B" : "W";
  }

  if (wCount > bCount) return "B";
  if (bCount > wCount) return "W";

  return games[games.length - 1] === "W" ? "B" : "W";
}

/**
 * Allocates White and Black between two paired players.
 */
function assignColors(p1: Player, p2: Player, roundNum: number): { white: Player; black: Player } {
  if (roundNum === 1) {
    return p1.seed % 2 === 1 ? { white: p1, black: p2 } : { white: p2, black: p1 };
  }

  const pref1 = getPreferredColor(p1);
  const pref2 = getPreferredColor(p2);

  if (pref1 === "W" && pref2 !== "W") return { white: p1, black: p2 };
  if (pref1 === "B" && pref2 !== "B") return { white: p2, black: p1 };
  if (pref2 === "W" && pref1 !== "W") return { white: p2, black: p1 };
  if (pref2 === "B" && pref1 !== "B") return { white: p1, black: p2 };

  const wDiff1 =
    p1.colorHistory.filter((c) => c === "W").length -
    p1.colorHistory.filter((c) => c === "B").length;
  const wDiff2 =
    p2.colorHistory.filter((c) => c === "W").length -
    p2.colorHistory.filter((c) => c === "B").length;

  if (wDiff1 < wDiff2) return { white: p1, black: p2 };
  if (wDiff2 < wDiff1) return { white: p2, black: p1 };

  return p1.seed < p2.seed ? { white: p1, black: p2 } : { white: p2, black: p1 };
}

/**
 * Generates a single Swiss round following FIDE Dutch system principles.
 * Supports:
 * 1. Active players only (paused/withdrawn players are skipped).
 * 2. Manual/Requested Byes (Full 1.0, Half 0.5, or Zero 0.0).
 * 3. Automatic FIDE Bye (1.0 pt) if remaining active pool is odd.
 */
export function generateSwissRound(currentPlayers: Player[], roundNumber: number): Match[] {
  // Filter only active players
  const activePlayers = currentPlayers.filter((p) => p.active);

  // Separate players who requested a manual bye for this round
  const manualByePlayers = activePlayers.filter((p) => p.requestedBye !== null);
  const pool = activePlayers
    .filter((p) => p.requestedBye === null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.seed - b.seed;
    });

  const matches: Match[] = [];
  let autoByePlayer: Player | null = null;

  // FIDE Automatic Odd-Player Bye Rule: Lowest ranked player without a prior auto-bye gets 1.0 pt
  if (pool.length % 2 !== 0) {
    for (let i = pool.length - 1; i >= 0; i--) {
      if (!pool[i].hadAutoBye && pool[i].byeCount === 0) {
        autoByePlayer = pool.splice(i, 1)[0];
        break;
      }
    }
    if (!autoByePlayer) {
      for (let i = pool.length - 1; i >= 0; i--) {
        if (!pool[i].hadAutoBye) {
          autoByePlayer = pool.splice(i, 1)[0];
          break;
        }
      }
    }
    if (!autoByePlayer) {
      autoByePlayer = pool.pop()!;
    }
  }

  // Backtracking pairing engine (S1 top half vs S2 bottom half of score bracket)
  const pairPool = (unpaired: Player[]): { p1: Player; p2: Player }[] | null => {
    if (unpaired.length === 0) return [];

    const topScore = unpaired[0].score;
    const scoreGroup = unpaired.filter((p) => p.score === topScore);
    const half = Math.floor(scoreGroup.length / 2);

    const p1 = unpaired[0];
    const candidates = unpaired.slice(1);

    let orderedCandidates: Player[] = [];
    if (half > 0 && scoreGroup.length >= 2) {
      const s2StartIdx = half - 1;
      const s2Part = candidates.slice(s2StartIdx, scoreGroup.length - 1);
      const s1Part = candidates.slice(0, s2StartIdx);
      const floaters = candidates.slice(scoreGroup.length - 1);
      orderedCandidates = [...s2Part, ...s1Part, ...floaters];
    } else {
      orderedCandidates = candidates;
    }

    for (const p2 of orderedCandidates) {
      const alreadyPlayed = p1.opponents.includes(p2.id);
      if (!alreadyPlayed) {
        const remaining = unpaired.filter((p) => p.id !== p1.id && p.id !== p2.id);
        const subResult = pairPool(remaining);
        if (subResult !== null) {
          return [{ p1, p2 }, ...subResult];
        }
      }
    }

    return null;
  };

  let pairedCouples = pairPool(pool);

  // Fallback relaxation if small player pool forces repeat pairing
  if (!pairedCouples) {
    pairedCouples = [];
    const temp = [...pool];
    while (temp.length >= 2) {
      pairedCouples.push({ p1: temp.shift()!, p2: temp.shift()! });
    }
  }

  let boardCounter = 1;
  pairedCouples.forEach(({ p1, p2 }) => {
    const { white, black } = assignColors(p1, p2, roundNumber);
    matches.push({
      id: crypto.randomUUID(),
      round: roundNumber,
      board: boardCounter++,
      whiteId: white.id,
      blackId: black.id,
      result: null,
    });
  });

  // Append Automatic Odd-Player Bye
  if (autoByePlayer) {
    matches.push({
      id: crypto.randomUUID(),
      round: roundNumber,
      board: boardCounter++,
      whiteId: autoByePlayer.id,
      blackId: "BYE",
      result: "BYE_1",
    });
  }

  // Append Manual/Requested Byes
  manualByePlayers.forEach((bp) => {
    const byeRes: MatchResult =
      bp.requestedBye === "FULL"
        ? "BYE_1"
        : bp.requestedBye === "HALF"
        ? "BYE_0.5"
        : "BYE_0";

    matches.push({
      id: crypto.randomUUID(),
      round: roundNumber,
      board: boardCounter++,
      whiteId: bp.id,
      blackId: "BYE",
      result: byeRes,
    });
  });

  return matches;
}

/**
 * Generates all Round Robin rounds using FIDE Berger circle rotation.
 */
export function generateAllRoundRobinRounds(currentPlayers: Player[]): Match[][] {
  const list = currentPlayers.filter((p) => p.active).sort((a, b) => a.seed - b.seed);
  const hasDummy = list.length % 2 !== 0;
  const ids = list.map((p) => p.id);
  if (hasDummy) ids.push("BYE");

  const n = ids.length;
  const totalRRRounds = n - 1;
  const allRounds: Match[][] = [];

  let rotation = [...ids];

  for (let r = 1; r <= totalRRRounds; r++) {
    const roundMatches: Match[] = [];
    let boardNum = 1;
    let byeMatch: Match | null = null;

    for (let i = 0; i < n / 2; i++) {
      const pA = rotation[i];
      const pB = rotation[n - 1 - i];

      if (pA === "BYE" || pB === "BYE") {
        const realId = pA === "BYE" ? pB : pA;
        byeMatch = {
          id: crypto.randomUUID(),
          round: r,
          board: 999,
          whiteId: realId,
          blackId: "BYE",
          result: "BYE_1",
        };
      } else {
        const flip = (r + i) % 2 === 0;
        roundMatches.push({
          id: crypto.randomUUID(),
          round: r,
          board: boardNum++,
          whiteId: flip ? pB : pA,
          blackId: flip ? pA : pB,
          result: null,
        });
      }
    }

    if (byeMatch) {
      byeMatch.board = boardNum;
      roundMatches.push(byeMatch);
    }

    allRounds.push(roundMatches);

    const fixed = rotation[0];
    const moving = rotation.slice(1);
    moving.unshift(moving.pop()!);
    rotation = [fixed, ...moving];
  }

  return allRounds;
}