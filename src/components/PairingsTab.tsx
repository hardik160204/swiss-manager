"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Swords,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { Match, MatchResult, Player, TournamentFormat } from "@/types/tournament";
import { exportPairingsSheet, formatResultText } from "@/lib/exportUtils";

interface PairingsTabProps {
  tournamentStarted: boolean;
  rounds: Match[][];
  currentRoundIndex: number;
  setCurrentRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  format: TournamentFormat;
  totalRounds: number;
  players: Player[];
  isReadOnly?: boolean;
  onSetResult: (roundIdx: number, matchId: string, res: MatchResult) => void;
  onGenerateNextRound: () => void;
}

export default function PairingsTab({
  tournamentStarted,
  rounds,
  currentRoundIndex,
  setCurrentRoundIndex,
  format,
  totalRounds,
  players,
  isReadOnly = false,
  onSetResult,
  onGenerateNextRound,
}: PairingsTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const getPlayerById = (id: string) => players.find((p) => p.id === id);

  const handleExport = async (mode: "PNG" | "PDF") => {
    const activeMatches = rounds[currentRoundIndex];
    if (!activeMatches) return;
    setIsExporting(true);
    try {
      await exportPairingsSheet(currentRoundIndex + 1, activeMatches, players, mode);
    } finally {
      setIsExporting(false);
    }
  };

  if (!tournamentStarted || rounds.length === 0) {
    return (
      <div className="p-4 text-center py-12 space-y-3">
        <Swords className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-sm text-slate-400">
          Tournament hasn&apos;t started yet. Add players and tap &quot;Generate Round 1 Pairings&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Round Navigator */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
        <button
          disabled={currentRoundIndex === 0}
          onClick={() => setCurrentRoundIndex((i) => Math.max(0, i - 1))}
          className="p-2 rounded-lg bg-[#0b0f19] text-slate-300 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#c99846]">
            Round {currentRoundIndex + 1} of {format === "SWISS" ? totalRounds : rounds.length}
          </div>
          <div className="text-[11px] text-slate-400">
            {isReadOnly ? "Live Tournament Boards" : "Tap buttons below to record board results"}
          </div>
        </div>

        <button
          disabled={currentRoundIndex >= rounds.length - 1}
          onClick={() => setCurrentRoundIndex((i) => Math.min(rounds.length - 1, i + 1))}
          className="p-2 rounded-lg bg-[#0b0f19] text-slate-300 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Instant Image & PDF Export Bar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isExporting}
          onClick={() => handleExport("PNG")}
          className="py-2.5 px-3 rounded-xl bg-[#131b2e] border border-[#c99846]/50 text-[#c99846] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4" />
          {isExporting ? "Saving..." : "Download Boards PNG"}
        </button>
        <button
          disabled={isExporting}
          onClick={() => handleExport("PDF")}
          className="py-2.5 px-3 rounded-xl bg-[#131b2e] border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-[#c99846]" />
          {isExporting ? "Saving..." : "Download Boards PDF"}
        </button>
      </div>

      {/* Boards List */}
      <div className="space-y-3">
        {rounds[currentRoundIndex]?.map((match) => {
          const white = getPlayerById(match.whiteId);
          const black = match.blackId === "BYE" ? null : getPlayerById(match.blackId);

          return (
            <div
              key={match.id}
              className="bg-[#131b2e] border border-slate-800 rounded-xl p-3.5 space-y-3"
            >
              {/* Prominent Gold BOARD X Badge */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="px-2.5 py-1 rounded-md bg-[#c99846] text-[#0b0f19] text-xs font-black uppercase tracking-wider shadow">
                  BOARD {match.board}
                </span>
                {match.result ? (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {formatResultText(match.result)}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-medium">In Progress</span>
                )}
              </div>

              <div className="space-y-2">
                {/* White */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-sm bg-white border border-slate-400 inline-block shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">
                        {white?.name || "Unknown"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Seed #{white?.seed} • Rating {white?.rating} • Score:{" "}
                        <strong className="text-[#c99846]">{white?.score.toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Black or Bye */}
                <div className="flex items-center justify-between">
                  {match.blackId === "BYE" ? (
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block shrink-0" />
                      <div className="text-xs font-bold text-emerald-400">
                        {match.result === "BYE_0.5"
                          ? "REQUESTED HALF-POINT BYE (+0.5 Pt)"
                          : match.result === "BYE_0"
                          ? "ZERO-POINT ABSENCE BYE (0.0 Pt)"
                          : "AUTOMATIC FIDE BYE (+1.0 Pt Awarded)"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-sm bg-slate-950 border border-slate-500 inline-block shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-white leading-tight">
                          {black?.name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Seed #{black?.seed} • Rating {black?.rating} • Score:{" "}
                          <strong className="text-[#c99846]">{black?.score.toFixed(1)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Result Selector for Normal Matches */}
              {!isReadOnly && match.blackId !== "BYE" && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { label: "1 - 0 (White)", val: "1-0" },
                      { label: "½ - ½ (Draw)", val: "0.5-0.5" },
                      { label: "0 - 1 (Black)", val: "0-1" },
                    ] as { label: string; val: MatchResult }[]
                  ).map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() =>
                        onSetResult(
                          currentRoundIndex,
                          match.id,
                          match.result === btn.val ? null : btn.val
                        )
                      }
                      className={`py-2 rounded-lg text-xs font-bold border transition active:scale-95 ${
                        match.result === btn.val
                          ? "bg-[#c99846] text-[#0b0f19] border-[#c99846]"
                          : "bg-[#0b0f19] text-slate-300 border-slate-800"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Adjustable Bye Points Selector (In case arbiter wants to adjust a bye between 1, 0.5, or 0) */}
              {!isReadOnly && match.blackId === "BYE" && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { label: "1.0 Pt (Full Bye)", val: "BYE_1" },
                      { label: "0.5 Pt (Half Bye)", val: "BYE_0.5" },
                      { label: "0.0 Pt (Absent)", val: "BYE_0" },
                    ] as { label: string; val: MatchResult }[]
                  ).map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => onSetResult(currentRoundIndex, match.id, btn.val)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                        match.result === btn.val
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "bg-[#0b0f19] text-slate-400 border-slate-800"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Round Button */}
      {!isReadOnly && format === "SWISS" && currentRoundIndex === rounds.length - 1 && (
        <button
          onClick={onGenerateNextRound}
          className="w-full py-3.5 bg-[#c99846] text-[#0b0f19] font-black text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition"
        >
          {rounds.length < totalRounds
            ? `Generate Round ${rounds.length + 1} Boards`
            : "Finish & View Final Standings"}
        </button>
      )}
    </div>
  );
}