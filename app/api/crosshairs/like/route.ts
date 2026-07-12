import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/crosshairs/like/route.ts (crosshairs'ın ALTINDA "like" alt klasörü)

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  const delta = body.delta === -1 ? -1 : 1;

  if (!id) {
    return NextResponse.json({ error: "id zorunludur." }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("crosshairs")
    .select("likes")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Nişangah bulunamadı." }, { status: 404 });
  }

  const newLikes = Math.max(0, existing.likes + delta);
  const { error } = await supabase.from("crosshairs").update({ likes: newLikes }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ likes: newLikes });
}