import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Bu dosyayı `app/api/leaderboard/route.ts` olarak kaydet (üzerine yaz).

// GET: en yüksek 5 skoru döner (herkes görür, F5'te kaybolmaz)
export async function GET() {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("player_name, score, avatar_id")
    .order("score", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const players = (data || []).map((p, i) => ({
    rank: i + 1,
    name: p.player_name,
    score: p.score,
    agent: "—",
    avatarId: p.avatar_id || null,
  }));

  return NextResponse.json({ players });
}

// POST: üç mod var:
// 1) avatarOnly:true -> SADECE avatarı günceller, skora dokunmaz.
// 2) cumulative:true (normal quiz bitişi) -> gelen skor MEVCUT skora EKLENİR (100+90=190).
//    DÜZELTME: toplam skor artık asla 0'ın altına düşmüyor (Math.max(0, ...)) — bir oyun net
//    negatif bitse bile (örn. -30 puan), toplamın en kötü ihtimalle 0'da kalması garanti edildi.
// 3) cumulative gönderilmezse -> eski davranış: en yüksek skor korunur.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const playerName = (body.playerName || "").toString().trim();
  const avatarId = body.avatarId ? String(body.avatarId).slice(0, 30) : null;

  if (!playerName) {
    return NextResponse.json({ error: "playerName zorunludur." }, { status: 400 });
  }

  // --- Sadece avatar güncelleme modu ---
  if (body.avatarOnly) {
    const { data: existing } = await supabase
      .from("leaderboard")
      .select("player_name")
      .eq("player_name", playerName)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const { error } = await supabase.from("leaderboard").update({ avatar_id: avatarId }).eq("player_name", playerName);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // --- Skor güncelleme modu (yarışma bitince) ---
  const score = Number(body.score);
  if (Number.isNaN(score)) {
    return NextResponse.json({ error: "score zorunludur." }, { status: 400 });
  }
  const cumulative = body.cumulative === true;

  const { data: existing } = await supabase
    .from("leaderboard")
    .select("score")
    .eq("player_name", playerName)
    .maybeSingle();

  let finalScore: number;
  if (existing) {
    finalScore = cumulative ? Math.max(0, existing.score + score) : Math.max(existing.score, score);
  } else {
    finalScore = Math.max(0, score);
  }

  const { error } = await supabase
    .from("leaderboard")
    .upsert(
      { player_name: playerName, score: finalScore, avatar_id: avatarId, updated_at: new Date().toISOString() },
      { onConflict: "player_name" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, score: finalScore });
}
