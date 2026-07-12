import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Bu dosyayı `app/api/site-stats/route.ts` olarak kaydet.
// "Aranan Profil Sayısı" göstergesinin gerçek (uydurma olmayan) veri kaynağı burasıdır.
// SQL şemasındaki `site_stats` tablosunun tek satırını (id=1) okur/artırır.

// GET: şu ana kadar yapılan toplam başarılı Riot ID aramasını döner.
export async function GET() {
  const { data, error } = await supabase
    .from("site_stats")
    .select("tracked_players")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Kayıt bulunamadı." }, { status: 500 });
  }

  return NextResponse.json({ searchCount: data.tracked_players });
}

// POST: bir Riot ID araması başarılı olduğunda sayacı +1 artırır.
export async function POST() {
  const { data: existing, error: fetchErr } = await supabase
    .from("site_stats")
    .select("tracked_players")
    .eq("id", 1)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 500 });
  }

  const newCount = existing.tracked_players + 1;

  const { error } = await supabase
    .from("site_stats")
    .update({ tracked_players: newCount, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ searchCount: newCount });
}
