import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/crosshairs/route.ts

export async function GET() {
  const { data, error } = await supabase
    .from("crosshairs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crosshairs: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, subtitle, rank, color, code } = body;

  if (!title || !code) {
    return NextResponse.json({ error: "title ve code zorunludur." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crosshairs")
    .insert({
      title: String(title).slice(0, 60),
      subtitle: String(subtitle || "").slice(0, 80),
      rank: rank || "gold",
      color: color || "#ffffff",
      code: String(code).slice(0, 300),
      likes: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crosshair: data });
}