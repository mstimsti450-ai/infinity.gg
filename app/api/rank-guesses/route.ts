import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ranks = ["Demir", "Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Yüce", "Ölümsüz", "Radyant"];
const key = (value: string) => value.toLocaleLowerCase("tr-TR");

export async function GET(req: NextRequest) {
  const clipId = req.nextUrl.searchParams.get("clipId");
  const playerName = req.nextUrl.searchParams.get("playerName") || "";
  if (!clipId) return NextResponse.json({ error: "clipId zorunludur." }, { status: 400 });

  const [{ data: clip, error: clipError }, { data: votes, error: votesError }] = await Promise.all([
    supabase.from("rank_clips").select("rank").eq("id", clipId).single(),
    supabase.from("rank_guess_votes").select("player_name, guessed_rank, is_correct").eq("clip_id", clipId),
  ]);
  if (clipError || votesError) return NextResponse.json({ error: clipError?.message || votesError?.message }, { status: 500 });

  const counts = Object.fromEntries(ranks.map((rank) => [rank, 0])) as Record<string, number>;
  (votes || []).forEach((vote) => {
    const rank = ranks.find((item) => key(item) === key(vote.guessed_rank));
    if (rank) counts[rank] += 1;
  });

  const { data: allVotes, error: allVotesError } = await supabase
    .from("rank_guess_votes")
    .select("player_name, is_correct");
  if (allVotesError) return NextResponse.json({ error: allVotesError.message }, { status: 500 });

  const totals: Record<string, number> = {};
  (allVotes || []).forEach((vote) => {
    if (vote.is_correct) totals[vote.player_name] = (totals[vote.player_name] || 0) + 1;
  });
  const currentCorrect = totals[playerName] || 0;
  const playerRank = currentCorrect > 0
    ? Object.values(totals).filter((score) => score > currentCorrect).length + 1
    : null;

  return NextResponse.json({ counts, total: (votes || []).length, currentCorrect, playerRank, actualRank: clip.rank });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clipId = String(body.clipId || "");
  const playerName = String(body.playerName || "").trim();
  const guessedRank = ranks.find((rank) => key(rank) === key(String(body.guessedRank || "")));
  if (!clipId || !playerName || !guessedRank) {
    return NextResponse.json({ error: "Geçerli klip, oyuncu ve rütbe zorunludur." }, { status: 400 });
  }

  const { data: clip, error: clipError } = await supabase.from("rank_clips").select("rank").eq("id", clipId).single();
  if (clipError || !clip) return NextResponse.json({ error: clipError?.message || "Klip bulunamadı." }, { status: 404 });

  const { error } = await supabase.from("rank_guess_votes").upsert({
    clip_id: clipId,
    player_name: playerName.slice(0, 60),
    guessed_rank: guessedRank,
    is_correct: key(guessedRank) === key(clip.rank),
  }, { onConflict: "clip_id,player_name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return GET(new NextRequest(`${req.nextUrl.origin}/api/rank-guesses?clipId=${encodeURIComponent(clipId)}&playerName=${encodeURIComponent(playerName)}`));
}
