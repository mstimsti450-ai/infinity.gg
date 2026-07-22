import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/forum/poll-vote/route.ts

export async function POST(req: NextRequest) {
  const body = await req.json();
  const postId = Number(body.postId);
  const optionIndex = Number(body.optionIndex);

  if (!postId || Number.isNaN(optionIndex)) {
    return NextResponse.json({ error: "postId ve optionIndex zorunludur." }, { status: 400 });
  }

  const { data: post, error: fetchErr } = await supabase
    .from("forum_posts")
    .select("poll_votes, poll_options")
    .eq("id", postId)
    .maybeSingle();

  if (fetchErr || !post || !post.poll_options) {
    return NextResponse.json({ error: "Anket bulunamadı." }, { status: 404 });
  }

  const votes: number[] = Array.isArray(post.poll_votes) ? [...post.poll_votes] : post.poll_options.map(() => 0);
  if (optionIndex < 0 || optionIndex >= votes.length) {
    return NextResponse.json({ error: "Geçersiz seçenek." }, { status: 400 });
  }
  votes[optionIndex] = (votes[optionIndex] || 0) + 1;

  const { error } = await supabase.from("forum_posts").update({ poll_votes: votes }).eq("id", postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pollVotes: votes });
}