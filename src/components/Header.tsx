"use client";

import React from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { TournamentFormat } from "@/types/tournament";

interface HeaderProps {
  format: TournamentFormat;
  totalRounds: number;
  isUnrated: boolean;
  tournamentStarted: boolean;
  lastSavedText: string;
  onReset: () => void;
}

export default function Header({
  format,
  totalRounds,
  isUnrated,
  tournamentStarted,
  lastSavedText,
  onReset,
}: HeaderProps) {
  return (
    <header className="px-4 py-3.5 bg-[#111726] border-b border-[#c99846]/30 sticky top-0 z-20 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#c99846] text-[#0b0f19] font-serif font-black text-xl flex items-center justify-center shadow">
          e4
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base leading-tight text-white">e4 Swiss Manager</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {lastSavedText}
            </span>
          </div>
          <p className="text-[11px] text-[#c99846] font-medium mt-0.5">
            {format === "SWISS" ? `FIDE Dutch Swiss (${totalRounds}R)` : "Berger Round Robin"} •{" "}
            {isUnrated ? "Unrated (1000 A-Z)" : "Rated"}
          </p>
        </div>
      </div>

      {tournamentStarted && (
        <button
          onClick={onReset}
          className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 active:scale-95 transition"
          title="Reset Tournament"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </header>
  );
}