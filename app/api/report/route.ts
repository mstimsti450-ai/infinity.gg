import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/report/route.ts
// Forum gönderisi / lobi (sahte kod vb.) / rank tahmin klibi şikayet butonlarının gittiği yer.
// Frontend zaten bu uç noktayı bekleyecek şekilde hazır:
//   POST /api/report { kind, targetId, reporter } -> { ok: true }
// kind: "forum_post" | "lobby" | "rank_clip"

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kind, targetId, reporter } = body;

  if (!kind || targetId === undefined || targetId === null) {
    return NextResponse.json({ error: "kind ve targetId zorunludur." }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    kind: String(kind).slice(0, 40),
    target_id: String(targetId).slice(0, 100),
    reporter: reporter ? String(reporter).slice(0, 60) : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// NOT: bu rota kasıtlı olarak bir GET içermiyor — şikayetleri sen (site sahibi) Supabase
// Table Editor üzerinden "reports" tablosundan doğrudan okuyup inceleyebilirsin. İstersen
// buraya basit bir yönetici paneli/GET de ekleyebilirim.