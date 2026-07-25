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
  // DÜZELTME (bug — "ana hesabımda breach avatarı açıp lobi oluşturuyorum, yan hesaba geçince
  // lobiler kısmında varsayılan avatar gözüküyor"): `avatarId` frontend'den zaten gönderiliyordu
  // ama burada body'den hiç okunmuyordu, bu yüzden aşağıdaki `.insert()` çağrısına hiç dahil
  // edilmiyordu — veritabanına her lobi avatarsız (avatar_id = null) yazılıyordu. Lobiyi
  // oluşturan kendi ekranında "kendi lobinse canlı/güncel avatarını göster" kuralı bu boşluğu
  // gizliyordu (o yüzden kendi tarayıcında sorun hiç görünmüyordu); ama gerçekte veritabanına
  // hiçbir zaman yazılmadığı için başka bir hesap o lobiye baktığında (`avatarId` null geldiği
  // için) hep varsayılan avatara düşüyordu. Artık `avatarId` okunuyor ve `avatar_id` sütununa
  // gerçekten kaydediliyor.
  const { nick, minRank, maxRank, mode, mic, slots, code, message, playerCount, rankCutoff, avatarId } = body;

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
      avatar_id: avatarId ? String(avatarId) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lobby: data });
}
