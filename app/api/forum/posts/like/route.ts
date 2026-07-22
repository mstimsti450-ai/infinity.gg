import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/forum/posts/like/route.ts  ("posts" klasörünün İÇİNE "like" alt klasörü aç)

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  const type = body.type === "dislike" ? "dislikes" : "likes"; // "like" ya da "dislike"
  const delta = body.delta === -1 ? -1 : 1;

  if (!id) return NextResponse.json({ error: "id zorunludur." }, { status: 400 });

  const { data: existing, error: fetchErr } = await supabase
    .from("forum_posts")
    .select(type)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });

  const newValue = Math.max(0, (existing as any)[type] + delta);
  const { error } = await supabase.from("forum_posts").update({ [type]: newValue }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ [type]: newValue });
}