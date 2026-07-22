import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/forum/posts/route.ts

export async function GET() {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { author, avatarId, title, content, pollOptions } = body;

  if (!author || String(title || "").trim().length < 2 || String(content || "").trim().length < 2) {
    return NextResponse.json({ error: "Yazar, başlık ve içerik en az 2 karakter olmalıdır." }, { status: 400 });
  }

  const cleanPollOptions = Array.isArray(pollOptions)
    ? pollOptions.map((o: string) => String(o).trim().slice(0, 60)).filter(Boolean).slice(0, 6)
    : [];
  if (Array.isArray(pollOptions) && cleanPollOptions.length < 2) {
    return NextResponse.json({ error: "Anket için en az iki seçenek gereklidir." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      author: String(author).slice(0, 40),
      avatar_id: avatarId || null,
      title: String(title).slice(0, 120),
      content: String(content).slice(0, 2000),
      poll_options: cleanPollOptions.length ? cleanPollOptions : null,
      poll_votes: cleanPollOptions.map(() => 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

// Aynı kullanıcının eski gönderileri de profilindeki güncel avatarı kullanır.
export async function PATCH(req: NextRequest) {
  const { author, avatarId } = await req.json();
  if (!author || !avatarId) return NextResponse.json({ error: "author ve avatarId zorunludur." }, { status: 400 });
  const { error } = await supabase
    .from("forum_posts")
    .update({ avatar_id: String(avatarId).slice(0, 40) })
    .eq("author", String(author).slice(0, 40));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const author = searchParams.get("author");
  if (!id || !author) return NextResponse.json({ error: "id ve author zorunludur." }, { status: 400 });

  const { data: post } = await supabase.from("forum_posts").select("author").eq("id", id).maybeSingle();
  if (!post || post.author !== author) return NextResponse.json({ error: "Bu gönderiyi silemezsin." }, { status: 403 });

  await supabase.from("forum_comments").delete().eq("post_id", id);
  const { error } = await supabase.from("forum_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
