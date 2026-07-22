import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Keep view updates server-side and return the stored value so the UI never shows
// a temporary count that disappears after refresh.
export async function POST(req: NextRequest) {
  const { id } = await req.json();
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: "id zorunludur." }, { status: 400 });

  const { data, error } = await supabase.rpc("increment_forum_view", { post_id: postId });
  if (!error) return NextResponse.json({ viewCount: data });

  // Compatibility fallback for installations where the RPC has not yet been added.
  const { data: post, error: readError } = await supabase
    .from("forum_posts")
    .select("view_count")
    .eq("id", postId)
    .maybeSingle();
  if (readError || !post) return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });

  const nextCount = Number(post.view_count || 0) + 1;
  const { data: updated, error: updateError } = await supabase
    .from("forum_posts")
    .update({ view_count: nextCount })
    .eq("id", postId)
    .select("view_count")
    .maybeSingle();
  if (updateError || !updated) {
    return NextResponse.json({ error: "Görüntülenme sayısı kaydedilemedi. Supabase için increment_forum_view RPC'sini ekleyin." }, { status: 500 });
  }

  return NextResponse.json({ viewCount: updated.view_count });
}
