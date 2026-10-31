"use client";

import React, { useState, useMemo } from "react";
import { Image as ImageIcon, FileText, Share2, Check } from "lucide-react";
import { Player, Category } from "@/types/tournament";
import { exportStandingsSheet } from "@/lib/exportUtils";

interface StandingsTabProps {
  players: Player[];
  roundsPlayed: number;
}

export default function StandingsTab({ players, roundsPlayed }: StandingsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<Category | "ALL">("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const sortedStandings = useMemo(() => {
    const filtered =
      categoryFilter === "ALL" ? players : players.filter((p) => p.category === categoryFilter);

    return [...filtered].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      return a.seed - b.seed;
    });
  }, [players, categoryFilter]);

  const handleExport = async (mode: "PNG" | "PDF") => {
    if (sortedStandings.length === 0) return;
    setIsExporting(true);
    try {
      const label = categoryFilter === "ALL" ? "Overall" : categoryFilter;
      await exportStandingsSheet(sortedStandings, label, roundsPlayed, mode);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=public`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(["ALL", "OPEN", "U8", "U12", "GIRLS"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition ${
              categoryFilter === cat
                ? "bg-[#c99846] text-[#0b0f19] border-[#c99846]"
                : "bg-[#131b2e] text-slate-400 border-slate-800"
            }`}
          >
            {cat === "ALL" ? "Overall Standings" : `${cat} Category`}
          </button>
        ))}
      </div>

      {/* Export & Share Action Bar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isExporting || sortedStandings.length === 0}
          onClick={() => handleExport("PNG")}
          className="py-2.5 px-3 rounded-xl bg-[#131b2e] border border-[#c99846]/50 text-[#c99846] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40"
        >
          <ImageIcon className="w-4 h-4" />
          {isExporting ? "Saving..." : "Download Standings PNG"}
        </button>

        <button
          disabled={isExporting || sortedStandings.length === 0}
          onClick={() => handleExport("PDF")}
          className="py-2.5 px-3 rounded-xl bg-[#131b2e] border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40"
        >
          <FileText className="w-4 h-4 text-[#c99846]" />
          {isExporting ? "Saving..." : "Download Standings PDF"}
        </button>
      </div>

      {/* Copy Spectator Link Button */}
      <button
        onClick={handleCopyPublicLink}
        className="w-full py-2.5 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition"
      >
        {copiedLink ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Spectator View Link Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 text-[#c99846]" />
            <span>Copy Read-Only Spectator Link (?view=public)</span>
          </>
        )}
      </button>

      {/* Leaderboard Table */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 px-3 py-2.5 bg-[#0b0f19] border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-[#c99846]">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Player</div>
          <div className="col-span-2 text-center">Pts</div>
          <div className="col-span-3 text-right">Buch / SB</div>
        </div>

        {sortedStandings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No players found in this category.
          </div>
        ) : (
          sortedStandings.map((p, idx) => (
            <div
              key={p.id}
              className="grid grid-cols-12 items-center px-3 py-3 border-b border-slate-800/60 last:border-none text-xs"
            >
              <div className="col-span-1 font-black text-slate-300">
                {idx === 0 ? <span className="text-[#c99846]">1</span> : idx + 1}
              </div>
              <div className="col-span-6 pr-2">
                <div className="font-bold text-white truncate flex items-center gap-1.5">
                  {p.name}
                  {p.byeCount > 0 && (
                    <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">
                      BYE{p.byeCount > 1 ? ` x${p.byeCount}` : ""}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {p.category} • {p.rating}
                </div>
              </div>
              <div className="col-span-2 text-center font-black text-sm text-[#c99846]">
                {p.score.toFixed(1)}
              </div>
              <div className="col-span-3 text-right text-[11px] text-slate-300 font-mono">
                {p.buchholz.toFixed(1)} / {p.sonnebornBerger.toFixed(1)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}