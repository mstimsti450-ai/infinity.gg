import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/forum/comments/route.ts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId zorunludur." }, { status: 400 });

  const { data, error } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", Number(postId))
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { postId, author, avatarId, content } = body;

  if (!postId || !author || !content) {
    return NextResponse.json({ error: "postId, author ve content zorunludur." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("forum_comments")
    .insert({
      post_id: Number(postId),
      author: String(author).slice(0, 40),
      avatar_id: avatarId || null,
      content: String(content).slice(0, 800),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Gönderinin yorum sayacını da artır
  const { data: post } = await supabase.from("forum_posts").select("comment_count").eq("id", Number(postId)).maybeSingle();
  if (post) {
    await supabase.from("forum_posts").update({ comment_count: post.comment_count + 1 }).eq("id", Number(postId));
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const author = searchParams.get("author");
  if (!id || !author) return NextResponse.json({ error: "id ve author zorunludur." }, { status: 400 });

  const { data: comment } = await supabase.from("forum_comments").select("author,post_id").eq("id", id).maybeSingle();
  if (!comment || comment.author !== author) return NextResponse.json({ error: "Bu yorumu silemezsin." }, { status: 403 });
  const { error } = await supabase.from("forum_comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: post } = await supabase.from("forum_posts").select("comment_count").eq("id", comment.post_id).maybeSingle();
  if (post) await supabase.from("forum_posts").update({ comment_count: Math.max(0, post.comment_count - 1) }).eq("id", comment.post_id);
  return NextResponse.json({ ok: true });
}
