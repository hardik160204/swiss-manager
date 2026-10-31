"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, Swords, Trophy, Download, Upload, Eye } from "lucide-react";
import {
  TournamentFormat,
  Category,
  MatchResult,
  RequestedByeType,
  Player,
  Match,
} from "@/types/tournament";
import {
  getSeededPlayers,
  recalculateStats,
  generateSwissRound,
  generateAllRoundRobinRounds,
} from "@/lib/pairingEngine";
import Header from "@/components/Header";
import PlayersTab from "@/components/PlayersTab";
import PairingsTab from "@/components/PairingsTab";
import StandingsTab from "@/components/StandingsTab";

const STORAGE_KEY = "e4_swiss_manager_v2";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // Keeps data alive for 7 full days

export default function E4SwissManagerApp() {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isPublicView, setIsPublicView] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>("Saved");

  const [format, setFormat] = useState<TournamentFormat>("SWISS");
  const [isUnrated, setIsUnrated] = useState<boolean>(false);
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<"PLAYERS" | "PAIRINGS" | "STANDINGS">("PLAYERS");

  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Match[][]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [tournamentStarted, setTournamentStarted] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Load saved tournament on mount (checks localStorage, falls back to sessionStorage or v1 key)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "public") {
        setIsPublicView(true);
        setActiveTab("STANDINGS");
      }

      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        sessionStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("e4_swiss_manager_v1");

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const now = Date.now();
          // Ensure data stays valid for at least 7 days (168 hours)
          if (!parsed.savedAt || now - parsed.savedAt < SEVEN_DAYS_MS) {
            setFormat(parsed.format || "SWISS");
            setIsUnrated(parsed.isUnrated ?? false);
            setTotalRounds(parsed.totalRounds || 5);
            setPlayers(
              getSeededPlayers(parsed.players || [], parsed.isUnrated ?? false)
            );
            setRounds(parsed.rounds || []);
            setCurrentRoundIndex(parsed.currentRoundIndex || 0);
            setTournamentStarted(parsed.tournamentStarted || false);
          }
        } catch (e) {
          console.error("Failed to parse saved tournament state", e);
        }
      }
      setIsHydrated(true);
    }
  }, []);

  // 2. Save every change to both localStorage and sessionStorage with a fresh timestamp
  useEffect(() => {
    if (!isHydrated) return;

    const payload = JSON.stringify({
      savedAt: Date.now(),
      expiresInDays: 7,
      format,
      isUnrated,
      totalRounds,
      players,
      rounds,
      currentRoundIndex,
      tournamentStarted,
    });

    try {
      localStorage.setItem(STORAGE_KEY, payload);
      sessionStorage.setItem(STORAGE_KEY, payload);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSavedText(`Saved ${timeStr}`);
    } catch (e) {
      console.error("Storage write error", e);
    }
  }, [
    isHydrated,
    format,
    isUnrated,
    totalRounds,
    players,
    rounds,
    currentRoundIndex,
    tournamentStarted,
  ]);

  const handleAddPlayer = (name: string, rating: number, category: Category) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      rating,
      category,
      score: 0,
      buchholz: 0,
      sonnebornBerger: 0,
      opponents: [],
      colorHistory: [],
      hadAutoBye: false,
      byeCount: 0,
      active: true,
      requestedBye: null,
      seed: 0,
    };
    const nextList = getSeededPlayers([...players, newPlayer], isUnrated);
    setPlayers(recalculateStats(nextList, rounds));
  };

  const handleDeletePlayer = (id: string) => {
    if (tournamentStarted) return;
    setPlayers(getSeededPlayers(players.filter((p) => p.id !== id), isUnrated));
  };

  const handleSetRequestedBye = (id: string, bye: RequestedByeType) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, requestedBye: bye } : p))
    );
  };

  const handleTogglePlayerActive = (id: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleToggleUnrated = (val: boolean) => {
    if (tournamentStarted) return;
    setIsUnrated(val);
    setPlayers(getSeededPlayers(players, val));
  };

  const handleStartTournament = () => {
    const activeCount = players.filter((p) => p.active).length;
    if (activeCount < 2) {
      alert("Add at least 2 active players to start.");
      return;
    }

    const seeded = getSeededPlayers(players, isUnrated);

    if (format === "SWISS") {
      const round1 = generateSwissRound(seeded, 1);
      // Clear one-time requested byes after pairing the round
      const clearedByes = seeded.map((p) => ({ ...p, requestedBye: null }));
      setPlayers(recalculateStats(clearedByes, [round1]));
      setRounds([round1]);
      setCurrentRoundIndex(0);
    } else {
      const allRR = generateAllRoundRobinRounds(seeded);
      setTotalRounds(allRR.length);
      setPlayers(recalculateStats(seeded, allRR));
      setRounds(allRR);
      setCurrentRoundIndex(0);
    }

    setTournamentStarted(true);
    setActiveTab("PAIRINGS");
  };

  const handleSetResult = (roundIdx: number, matchId: string, res: MatchResult) => {
    if (isPublicView) return;
    const updatedRounds = rounds.map((r, idx) =>
      idx === roundIdx ? r.map((m) => (m.id === matchId ? { ...m, result: res } : m)) : r
    );
    setRounds(updatedRounds);
    setPlayers(recalculateStats(players, updatedRounds));
  };

  const handleGenerateNextRound = () => {
    const currentRound = rounds[rounds.length - 1];
    if (currentRound.some((m) => m.result === null)) {
      alert("Please record results for all boards in the current round first.");
      return;
    }

    if (rounds.length >= totalRounds) {
      setActiveTab("STANDINGS");
      return;
    }

    const latestPlayers = recalculateStats(players, rounds);
    const nextMatches = generateSwissRound(latestPlayers, rounds.length + 1);
    const nextAllRounds = [...rounds, nextMatches];

    // Clear one-time requested byes now that the next round is generated
    const clearedByes = latestPlayers.map((p) => ({ ...p, requestedBye: null }));

    setRounds(nextAllRounds);
    setPlayers(recalculateStats(clearedByes, nextAllRounds));
    setCurrentRoundIndex(nextAllRounds.length - 1);
  };

  const handleReset = () => {
    if (!confirm("Reset tournament pairings and scores? (Your player list will be kept)")) return;
    const resetList = getSeededPlayers(
      players.map((p) => ({
        ...p,
        score: 0,
        buchholz: 0,
        sonnebornBerger: 0,
        opponents: [],
        colorHistory: [],
        hadAutoBye: false,
        byeCount: 0,
        active: true,
        requestedBye: null,
      })),
      isUnrated
    );
    setPlayers(resetList);
    setRounds([]);
    setCurrentRoundIndex(0);
    setTournamentStarted(false);
    setActiveTab("PLAYERS");
  };

  const handleDownloadBackup = () => {
    const dataStr = localStorage.getItem(STORAGE_KEY) || "{}";
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `e4_tournament_backup_R${rounds.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setFormat(parsed.format || "SWISS");
        setIsUnrated(parsed.isUnrated ?? false);
        setTotalRounds(parsed.totalRounds || 5);
        setPlayers(getSeededPlayers(parsed.players || [], parsed.isUnrated ?? false));
        setRounds(parsed.rounds || []);
        setCurrentRoundIndex(parsed.currentRoundIndex || 0);
        setTournamentStarted(parsed.tournamentStarted || false);
      } catch {
        alert("Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-[#c99846] flex items-center justify-center text-sm font-bold">
        Loading e4 Swiss Manager...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex justify-center pb-24">
      <div className="w-full max-w-md flex flex-col">
        <Header
          format={format}
          totalRounds={totalRounds}
          isUnrated={isUnrated}
          tournamentStarted={!isPublicView && tournamentStarted}
          lastSavedText={lastSavedText}
          onReset={handleReset}
        />

        {isPublicView && (
          <div className="bg-[#c99846]/15 border-b border-[#c99846]/30 px-4 py-2 flex items-center justify-between text-xs text-[#c99846]">
            <span className="flex items-center gap-1.5 font-bold">
              <Eye className="w-3.5 h-3.5" /> Read-Only Spectator Mode
            </span>
            <button
              onClick={() => setIsPublicView(false)}
              className="underline text-[11px] text-slate-300"
            >
              Arbiter Unlock
            </button>
          </div>
        )}

        {activeTab === "PLAYERS" && !isPublicView && (
          <>
            <PlayersTab
              players={players}
              format={format}
              setFormat={setFormat}
              isUnrated={isUnrated}
              onToggleUnrated={handleToggleUnrated}
              totalRounds={totalRounds}
              setTotalRounds={setTotalRounds}
              tournamentStarted={tournamentStarted}
              onAddPlayer={handleAddPlayer}
              onDeletePlayer={handleDeletePlayer}
              onSetRequestedBye={handleSetRequestedBye}
              onTogglePlayerActive={handleTogglePlayerActive}
              onStartTournament={handleStartTournament}
            />

            {/* JSON File Backup Controls */}
            <div className="px-4 pb-6 flex gap-2">
              <button
                onClick={handleDownloadBackup}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#131b2e] border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-[#c99846]" /> Save Backup File
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#131b2e] border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Upload className="w-3.5 h-3.5 text-[#c99846]" /> Load Backup File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </div>
          </>
        )}

        {activeTab === "PAIRINGS" && (
          <PairingsTab
            tournamentStarted={tournamentStarted}
            rounds={rounds}
            currentRoundIndex={currentRoundIndex}
            setCurrentRoundIndex={setCurrentRoundIndex}
            format={format}
            totalRounds={totalRounds}
            players={players}
            isReadOnly={isPublicView}
            onSetResult={handleSetResult}
            onGenerateNextRound={handleGenerateNextRound}
          />
        )}

        {activeTab === "STANDINGS" && (
          <StandingsTab players={players} roundsPlayed={rounds.length} />
        )}

        {/* Bottom Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#111726] border-t border-slate-800 flex justify-center z-30">
          <div className={`w-full max-w-md grid ${isPublicView ? "grid-cols-2" : "grid-cols-3"}`}>
            {!isPublicView && (
              <button
                onClick={() => setActiveTab("PLAYERS")}
                className={`py-3 flex flex-col items-center gap-1 text-xs font-bold ${
                  activeTab === "PLAYERS" ? "text-[#c99846]" : "text-slate-400"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Players ({players.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("PAIRINGS")}
              className={`py-3 flex flex-col items-center gap-1 text-xs font-bold ${
                activeTab === "PAIRINGS" ? "text-[#c99846]" : "text-slate-400"
              }`}
            >
              <Swords className="w-5 h-5" />
              <span>Boards</span>
            </button>

            <button
              onClick={() => setActiveTab("STANDINGS")}
              className={`py-3 flex flex-col items-center gap-1 text-xs font-bold ${
                activeTab === "STANDINGS" ? "text-[#c99846]" : "text-slate-400"
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span>Standings</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}