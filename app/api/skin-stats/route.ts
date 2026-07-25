import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/skin-stats/route.ts
// Skin Savaşı liderlik tablosunun SİTE GENELİ (kişiye özel değil, tüm oyuncuların oylarını
// birleştiren) hali için. Frontend zaten bu iki uç noktayı bekleyecek şekilde hazır:
//   GET  /api/skin-stats            -> { stats: { [skinId]: { wins, matches } } }
//   POST /api/skin-stats { deltas } -> bir turnuva bitince o turnuvadaki galibiyet/maç
//                                       artışlarını (delta) kalıcı tabloya ekler

export async function GET() {
  const { data, error } = await supabase.from("skin_stats").select("skin_id, wins, matches");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats: Record<string, { wins: number; matches: number }> = {};
  for (const row of data || []) {
    stats[row.skin_id] = { wins: row.wins || 0, matches: row.matches || 0 };
  }
  return NextResponse.json({ stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const deltas = body?.deltas as Record<string, { wins: number; matches: number }> | undefined;

  if (!deltas || typeof deltas !== "object" || Object.keys(deltas).length === 0) {
    return NextResponse.json({ error: "deltas zorunludur." }, { status: 400 });
  }

  // Makul bir üst sınır (tek turnuvada gerçekçi olarak birkaç düzine skin olur, 200 bolca yeterli)
  const skinIds = Object.keys(deltas).slice(0, 200);

  // NOT (dürüstlük): Supabase JS istemcisiyle atomik "increment" için SQL fonksiyonu (RPC)
  // gerekir; onu sizin adınıza veritabanınızda oluşturamadığım için burada "önce oku, sonra
  // topla, sonra yaz" yöntemi kullanılıyor. Aynı skin için tam olarak aynı milisaniyede iki
  // istek gelirse (çok düşük ihtimal, iki oyuncu aynı anda turnuvayı bitirirse) biri diğerini
  // ezebilir. Bu ölçekte (eğlence amaçlı bir liderlik tablosu) kabul edilebilir bir sınır;
  // gerçek atomik sayaç isterseniz Supabase SQL Editor'de bir RPC fonksiyonu eklemem gerekir.
  const { data: existingRows, error: fetchError } = await supabase
    .from("skin_stats")
    .select("skin_id, wins, matches")
    .in("skin_id", skinIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existing: Record<string, { wins: number; matches: number }> = {};
  for (const row of existingRows || []) {
    existing[row.skin_id] = { wins: row.wins || 0, matches: row.matches || 0 };
  }

  const upsertRows = skinIds.map((id) => ({
    skin_id: id,
    wins: (existing[id]?.wins || 0) + (deltas[id]?.wins || 0),
    matches: (existing[id]?.matches || 0) + (deltas[id]?.matches || 0),
  }));

  const { error: upsertError } = await supabase
    .from("skin_stats")
    .upsert(upsertRows, { onConflict: "skin_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}