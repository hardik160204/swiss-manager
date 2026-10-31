"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Play,
  ShieldAlert,
  Settings,
  Coffee,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Player,
  Category,
  TournamentFormat,
  RequestedByeType,
} from "@/types/tournament";

interface PlayersTabProps {
  players: Player[];
  format: TournamentFormat;
  setFormat: (f: TournamentFormat) => void;
  isUnrated: boolean;
  onToggleUnrated: (val: boolean) => void;
  totalRounds: number;
  setTotalRounds: (r: number) => void;
  tournamentStarted: boolean;
  onAddPlayer: (name: string, rating: number, category: Category) => void;
  onDeletePlayer: (id: string) => void;
  onSetRequestedBye: (id: string, bye: RequestedByeType) => void;
  onTogglePlayerActive: (id: string) => void;
  onStartTournament: () => void;
}

export default function PlayersTab({
  players,
  format,
  setFormat,
  isUnrated,
  onToggleUnrated,
  totalRounds,
  setTotalRounds,
  tournamentStarted,
  onAddPlayer,
  onDeletePlayer,
  onSetRequestedBye,
  onTogglePlayerActive,
  onStartTournament,
}: PlayersTabProps) {
  const [newName, setNewName] = useState("");
  const [newRating, setNewRating] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("OPEN");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const ratingVal = isUnrated ? 1000 : parseInt(newRating, 10) || 1000;
    onAddPlayer(newName.trim(), ratingVal, newCategory);
    setNewName("");
    setNewRating("");
  };

  const activePlayersWithoutManualBye = players.filter(
    (p) => p.active && p.requestedBye === null
  );

  return (
    <div className="p-4 space-y-4">
      {/* Tournament Settings Card */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#c99846] flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Tournament Format
          </span>
          {tournamentStarted && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
              In Progress (Late Entries Allowed)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={tournamentStarted}
            onClick={() => setFormat("SWISS")}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
              format === "SWISS"
                ? "bg-[#c99846] text-[#0b0f19] border-[#c99846]"
                : "bg-[#0b0f19] text-slate-400 border-slate-800"
            }`}
          >
            Swiss System ({totalRounds}R)
          </button>
          <button
            disabled={tournamentStarted}
            onClick={() => setFormat("ROUND_ROBIN")}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
              format === "ROUND_ROBIN"
                ? "bg-[#c99846] text-[#0b0f19] border-[#c99846]"
                : "bg-[#0b0f19] text-slate-400 border-slate-800"
            }`}
          >
            Round Robin (All-Play-All)
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div>
            <div className="text-xs font-semibold text-white">Unrated Tournament Mode</div>
            <div className="text-[11px] text-slate-400">
              Sets all ratings to 1000 & pairs alphabetically
            </div>
          </div>
          <input
            type="checkbox"
            disabled={tournamentStarted}
            checked={isUnrated}
            onChange={(e) => onToggleUnrated(e.target.checked)}
            className="w-5 h-5 accent-[#c99846] rounded cursor-pointer"
          />
        </div>

        {format === "SWISS" && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-white">Number of Swiss Rounds</span>
            <div className="flex items-center gap-1.5">
              {[3, 4, 5, 6, 7].map((r) => (
                <button
                  key={r}
                  onClick={() => setTotalRounds(r)}
                  className={`w-7 h-7 rounded text-xs font-bold ${
                    totalRounds === r
                      ? "bg-[#c99846] text-[#0b0f19]"
                      : "bg-[#0b0f19] text-slate-400 border border-slate-800"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Player Form (Works before & during Swiss tournament for late walk-ins) */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#131b2e] border border-slate-800 rounded-xl p-3.5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#c99846]">
            {tournamentStarted ? "Add Late Walk-In Player" : `Quick Add Player (${players.length} Total)`}
          </span>
          <span className="text-[11px] text-slate-400">
            Active: {players.filter((p) => p.active).length}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Player Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c99846]"
          />
          {!isUnrated && (
            <input
              type="number"
              placeholder="Rating"
              value={newRating}
              onChange={(e) => setNewRating(e.target.value)}
              className="w-24 bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c99846]"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-1">
            {(["OPEN", "U8", "U12", "GIRLS"] as Category[]).map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setNewCategory(cat)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition ${
                  newCategory === cat
                    ? "bg-[#c99846]/20 border-[#c99846] text-[#c99846]"
                    : "bg-[#0b0f19] border-slate-800 text-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="bg-[#c99846] text-[#0b0f19] font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>

      {/* Odd Active Players Bye Notice */}
      {activePlayersWithoutManualBye.length > 0 &&
        activePlayersWithoutManualBye.length % 2 !== 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2.5 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Odd active player count ({activePlayersWithoutManualBye.length} to pair). The lowest
              seed without a prior bye will automatically receive a{" "}
              <strong>1.0 Point FIDE Bye</strong> on the bottom board.
            </span>
          </div>
        )}

      {/* Start Tournament CTA (Placed near top & bottom for convenience) */}
      {!tournamentStarted && players.length >= 2 && (
        <button
          onClick={onStartTournament}
          className="w-full py-3.5 bg-[#c99846] text-[#0b0f19] font-black text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition"
        >
          <Play className="w-4 h-4 fill-current" /> Generate Round 1 Pairings ({players.length} Players)
        </button>
      )}

      {/* Seeded Roster & Bye Controls */}
      <div className="space-y-2.5">
        {players.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No players added yet. Add players above to build your starting list.
          </div>
        ) : (
          players.map((p) => (
            <div
              key={p.id}
              className={`border rounded-xl px-3.5 py-2.5 space-y-2 transition ${
                p.active
                  ? "bg-[#131b2e] border-slate-800/90"
                  : "bg-[#0e1422] border-red-900/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0b0f19] border border-[#c99846]/40 text-[#c99846] text-xs font-bold flex items-center justify-center">
                    {p.seed}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {p.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {p.category}
                      </span>
                      {p.byeCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                          Had {p.byeCount} Bye
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Rating: <span className="text-[#c99846] font-semibold">{p.rating}</span> •
                      Score: <span className="text-white font-semibold">{p.score.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onTogglePlayerActive(p.id)}
                    title={p.active ? "Active (Tap to pause/withdraw)" : "Paused (Tap to activate)"}
                    className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${
                      p.active
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/15 border-red-500/30 text-red-400"
                    }`}
                  >
                    {p.active ? (
                      <>
                        <UserCheck className="w-3 h-3" /> Active
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3" /> Paused
                      </>
                    )}
                  </button>

                  {!tournamentStarted && (
                    <button
                      type="button"
                      onClick={() => onDeletePlayer(p.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 active:scale-90 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Next-Round Requested Bye Bar */}
              {p.active && format === "SWISS" && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <Coffee className="w-3 h-3 text-[#c99846]" /> Next Round Bye:
                  </span>
                  <div className="flex gap-1">
                    {(
                      [
                        { label: "Play Normal", val: null },
                        { label: "½ Pt Bye", val: "HALF" },
                        { label: "1 Pt Bye", val: "FULL" },
                        { label: "0 Pt Bye", val: "ZERO" },
                      ] as { label: string; val: RequestedByeType }[]
                    ).map((opt) => (
                      <button
                        type="button"
                        key={opt.label}
                        onClick={() => onSetRequestedBye(p.id, opt.val)}
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border transition ${
                          p.requestedBye === opt.val
                            ? "bg-[#c99846] text-[#0b0f19] border-[#c99846]"
                            : "bg-[#0b0f19] text-slate-400 border-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}