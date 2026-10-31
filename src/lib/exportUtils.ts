import { jsPDF } from "jspdf";
import { Match, MatchResult, Player } from "@/types/tournament";

/**
 * Uses a Blob object URL so mobile Chrome & iOS Safari never block large image downloads
 */
function triggerCanvasDownload(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, "image/png");
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(trimmed + "…").width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + "…";
}

export function formatResultText(res: MatchResult): string {
  if (!res) return "VS";
  if (res === "BYE_1") return "1 - 0 (BYE)";
  if (res === "BYE_0.5") return "½ - ½ (BYE)";
  if (res === "BYE_0") return "0 - 0 (BYE)";
  return res;
}

export async function exportPairingsSheet(
  roundNumber: number,
  matches: Match[],
  players: Player[],
  mode: "PNG" | "PDF"
) {
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const scale = 2;
  const width = 900;
  const headerHeight = 140;
  const tableHeaderHeight = 46;
  const rowHeight = 68;
  const footerHeight = 60;
  const height = headerHeight + tableHeaderHeight + matches.length * rowHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // 1. Deep Navy Background & Gold Border
  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#c99846";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // 2. Top Brand Header
  ctx.fillStyle = "#c99846";
  ctx.fillRect(36, 34, 54, 54);
  ctx.fillStyle = "#0b0f19";
  ctx.font = "900 30px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("e4", 63, 71);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 26px Arial, sans-serif";
  ctx.fillText("e4 CHESS CLUB", 106, 58);

  ctx.fillStyle = "#c99846";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("OFFICIAL TOURNAMENT PAIRINGS", 106, 80);

  ctx.textAlign = "right";
  ctx.fillStyle = "#c99846";
  ctx.font = "900 24px Arial, sans-serif";
  ctx.fillText(`ROUND ${roundNumber} BOARDS`, width - 36, 58);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(`Players: ${players.length} • Total Boards: ${matches.length}`, width - 36, 80);

  ctx.strokeStyle = "rgba(201, 152, 70, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, 112);
  ctx.lineTo(width - 36, 112);
  ctx.stroke();

  // 3. Table Column Headers
  const tableTop = headerHeight;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(36, tableTop, width - 72, tableHeaderHeight);

  ctx.fillStyle = "#c99846";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BOARD NO.", 52, tableTop + 28);
  ctx.fillText("WHITE PIECES", 195, tableTop + 28);
  ctx.textAlign = "center";
  ctx.fillText("RESULT", width / 2 + 25, tableTop + 28);
  ctx.textAlign = "right";
  ctx.fillText("BLACK PIECES / BYE", width - 52, tableTop + 28);

  // 4. Board Rows ("BOARD 1", "BOARD 2", etc.)
  matches.forEach((m, idx) => {
    const y = tableTop + tableHeaderHeight + idx * rowHeight;
    const w = getPlayer(m.whiteId);
    const b = m.blackId === "BYE" ? null : getPlayer(m.blackId);

    ctx.fillStyle = idx % 2 === 0 ? "#111726" : "#151d30";
    ctx.fillRect(36, y, width - 72, rowHeight);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, y + rowHeight);
    ctx.lineTo(width - 36, y + rowHeight);
    ctx.stroke();

    // Gold Pill for BOARD X
    ctx.fillStyle = "#c99846";
    ctx.fillRect(50, y + 18, 110, 30);
    ctx.fillStyle = "#0b0f19";
    ctx.font = "900 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`BOARD ${m.board}`, 105, y + 38);

    // White Player
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial, sans-serif";
    const whiteName = fitText(ctx, `⬜ ${w?.name || "Unknown"}`, 250);
    ctx.fillText(whiteName, 195, y + 30);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(
      `Seed #${w?.seed ?? "-"} • Rating ${w?.rating ?? 1000} • (${(w?.score ?? 0).toFixed(1)} pts)`,
      195,
      y + 50
    );

    // Result
    const resText = formatResultText(m.result);
    ctx.textAlign = "center";
    ctx.fillStyle = m.result ? "#34d399" : "#c99846";
    ctx.font = "900 15px Arial, sans-serif";
    ctx.fillText(resText, width / 2 + 25, y + 40);

    // Black Player or Bye
    ctx.textAlign = "right";
    if (m.blackId === "BYE") {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 15px Arial, sans-serif";
      const byeLabel =
        m.result === "BYE_0.5"
          ? "HALF-POINT BYE (+0.5)"
          : m.result === "BYE_0"
          ? "ZERO-POINT BYE (0.0)"
          : "FULL-POINT BYE (+1.0)";
      ctx.fillText(byeLabel, width - 52, y + 30);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText("No Opponent Assigned", width - 52, y + 50);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial, sans-serif";
      const blackName = fitText(ctx, `${b?.name || "Unknown"} ⬛`, 250);
      ctx.fillText(blackName, width - 52, y + 30);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(
        `Seed #${b?.seed ?? "-"} • Rating ${b?.rating ?? 1000} • (${(b?.score ?? 0).toFixed(1)} pts)`,
        width - 52,
        y + 50
      );
    }
  });

  // 5. Footer
  const footerY = height - 24;
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("Official FIDE Dutch System Pairings", 36, footerY);

  ctx.textAlign = "right";
  ctx.fillText("www.e4chessclub.in", width - 36, footerY);

  const fileBase = `e4_Round_${roundNumber}_Boards`;

  if (mode === "PNG") {
    triggerCanvasDownload(canvas, `${fileBase}.png`);
  } else {
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`${fileBase}.pdf`);
  }
}

export async function exportStandingsSheet(
  standings: Player[],
  categoryLabel: string,
  roundsPlayed: number,
  mode: "PNG" | "PDF"
) {
  const scale = 2;
  const width = 900;
  const headerHeight = 140;
  const tableHeaderHeight = 46;
  const rowHeight = 62;
  const footerHeight = 60;
  const height = headerHeight + tableHeaderHeight + standings.length * rowHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#c99846";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  ctx.fillStyle = "#c99846";
  ctx.fillRect(36, 34, 54, 54);
  ctx.fillStyle = "#0b0f19";
  ctx.font = "900 30px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("e4", 63, 71);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 26px Arial, sans-serif";
  ctx.fillText("e4 CHESS CLUB", 106, 58);

  ctx.fillStyle = "#c99846";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(`STANDINGS AFTER ROUND ${roundsPlayed}`, 106, 80);

  ctx.textAlign = "right";
  ctx.fillStyle = "#c99846";
  ctx.font = "900 24px Arial, sans-serif";
  ctx.fillText(`${categoryLabel.toUpperCase()} LEADERBOARD`, width - 36, 58);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(`Ranked Players: ${standings.length}`, width - 36, 80);

  ctx.strokeStyle = "rgba(201, 152, 70, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, 112);
  ctx.lineTo(width - 36, 112);
  ctx.stroke();

  const tableTop = headerHeight;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(36, tableTop, width - 72, tableHeaderHeight);

  ctx.fillStyle = "#c99846";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("RANK", 52, tableTop + 28);
  ctx.fillText("PLAYER NAME", 145, tableTop + 28);
  ctx.textAlign = "center";
  ctx.fillText("CATEGORY", 520, tableTop + 28);
  ctx.fillText("POINTS", 650, tableTop + 28);
  ctx.textAlign = "right";
  ctx.fillText("BUCHHOLZ / SB", width - 52, tableTop + 28);

  standings.forEach((p, idx) => {
    const y = tableTop + tableHeaderHeight + idx * rowHeight;

    ctx.fillStyle = idx % 2 === 0 ? "#111726" : "#151d30";
    ctx.fillRect(36, y, width - 72, rowHeight);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, y + rowHeight);
    ctx.lineTo(width - 36, y + rowHeight);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = idx < 3 ? "#c99846" : "#cbd5e1";
    ctx.font = "900 17px Arial, sans-serif";
    ctx.fillText(`#${idx + 1}`, 52, y + 37);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial, sans-serif";
    const byeTag = p.byeCount > 0 ? ` (BYE x${p.byeCount})` : "";
    const nameLabel = fitText(ctx, `${p.name}${byeTag}`, 330);
    ctx.fillText(nameLabel, 145, y + 27);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(`Seed #${p.seed} • Rating: ${p.rating}`, 145, y + 46);

    ctx.textAlign = "center";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillText(p.category, 520, y + 36);

    ctx.fillStyle = "#c99846";
    ctx.font = "900 18px Arial, sans-serif";
    ctx.fillText(p.score.toFixed(1), 650, y + 37);

    ctx.textAlign = "right";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${p.buchholz.toFixed(1)} / ${p.sonnebornBerger.toFixed(1)}`, width - 52, y + 37);
  });

  const footerY = height - 24;
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("Tiebreaks: 1. Buchholz  2. Sonneborn-Berger", 36, footerY);

  ctx.textAlign = "right";
  ctx.fillText("www.e4chessclub.in", width - 36, footerY);

  const fileBase = `e4_Standings_${categoryLabel.replace(/\s+/g, "_")}_R${roundsPlayed}`;

  if (mode === "PNG") {
    triggerCanvasDownload(canvas, `${fileBase}.png`);
  } else {
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`${fileBase}.pdf`);
  }
}