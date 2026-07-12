import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/lobbies/route.ts

export async function GET() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("lobbies")
    .select("*")
    .gte("created_at", threeHoursAgo)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lobbies: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nick, minRank, maxRank, mode, mic, slots, code, message, playerCount, rankCutoff } = body;

  if (!nick || !code) {
    return NextResponse.json({ error: "nick ve code zorunludur." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lobbies")
    .insert({
      nick: String(nick).slice(0, 40),
      min_rank: minRank || "Bronze",
      max_rank: maxRank || "Gold",
      mode: mode || "RANKED",
      mic: !!mic,
      slots: slots || "1/5",
      code: String(code).toUpperCase().slice(0, 6),
      region: "TR",
      message: message ? String(message).slice(0, 120) : null,
      player_count: Number(playerCount) || 1,
      rank_cutoff: !!rankCutoff,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lobby: data });
}