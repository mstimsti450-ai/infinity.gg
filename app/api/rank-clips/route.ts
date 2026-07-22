import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("rank_clips")
    .select("id, url, rank, added_by, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    clips: (data || []).map((clip) => ({
      id: String(clip.id),
      url: clip.url,
      rank: clip.rank,
      addedBy: clip.added_by,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = String(body.url || "").trim();
  const rank = String(body.rank || "").trim();
  const addedBy = String(body.addedBy || "").trim();

  if (!url || !rank || !addedBy) {
    return NextResponse.json({ error: "Klip bağlantısı, rütbe ve oyuncu adı zorunludur." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rank_clips")
    .insert({ url: url.slice(0, 500), rank: rank.slice(0, 30), added_by: addedBy.slice(0, 60) })
    .select("id, url, rank, added_by")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ clip: { id: String(data.id), url: data.url, rank: data.rank, addedBy: data.added_by } });
}
