import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// app/api/forum/view/route.ts — bir gönderi açıldığında görüntülenme sayacını +1 artırır.
//
// DÜZELTME (istek): "F5 atınca görüntülenme sayısı sıfırlanıyor" — bu aslında sayının hiç
// sıfırlanmaması, HİÇ KAYDEDİLMEMESİ demek. Eski koddaki .update(...) çağrısının dönen
// `error` değeri hiç kontrol edilmiyordu. Supabase'de RLS (Row Level Security) açıkken ve
// forum_posts tablosunda genel bir UPDATE policy'si yoksa, bu update isteği SESSİZCE 0 satır
// günceller (hata fırlatmaz) — arayüzde sayı bir anlığına artmış GÖRÜNÜR (client-side optimistic
// update) ama veritabanına hiç yazılmaz; F5'te gerçek (eski) değer geri gelir. Artık:
//  1) update'in hata/etki durumu kontrol ediliyor ve loglanıyor,
//  2) select+increment yerine tek atomik bir Postgres fonksiyonu (RPC) çağrılıyor — böyle iki
//     kullanıcı aynı anda görüntülerse de sayaç kaybolmuyor (race condition yok).
//
// GEREKLİ KURULUM (Supabase SQL Editor'de bir kez çalıştır):
//
//   create or replace function increment_forum_view(post_id bigint)
//   returns int
//   language sql
//   security definer
//   set search_path = public
//   as $$
//     update forum_posts
//     set view_count = coalesce(view_count, 0) + 1
//     where id = post_id
//     returning view_count;
//   $$;
//
// `security definer` sayesinde bu fonksiyon, çağıran kullanıcının RLS UPDATE izni olmasa bile
// SADECE view_count'u güvenle artırabilir — tablonun geri kalanına genel bir UPDATE policy'si
// açmana gerek kalmaz. Fonksiyonu oluşturduktan sonra aşağıdaki kod otomatik çalışır.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "id zorunludur." }, { status: 400 });

  const { data, error } = await supabase.rpc("increment_forum_view", { post_id: id });

  if (error) {
    console.error("increment_forum_view RPC hatası:", error.message);
    // RPC henüz kurulmadıysa (fonksiyon yoksa) eski select+update yöntemine düş, ama artık
    // hatayı GÖRMEZDEN GELMİYORUZ.
    const { data: existing, error: selectError } = await supabase
      .from("forum_posts")
      .select("view_count")
      .eq("id", id)
      .maybeSingle();
    if (selectError || !existing) {
      return NextResponse.json({ error: selectError?.message || "Gönderi bulunamadı." }, { status: 404 });
    }
    const newCount = (existing.view_count || 0) + 1;
    const { error: updateError, count } = await supabase
      .from("forum_posts")
      .update({ view_count: newCount }, { count: "exact" })
      .eq("id", id);
    if (updateError) {
      console.error("forum_posts update hatası:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!count) {
      // Hiçbir satır güncellenmedi — neredeyse kesin RLS UPDATE policy eksikliği.
      console.error(`forum_posts id=${id} için view_count güncellenemedi (0 satır etkilendi — RLS policy'sini kontrol et).`);
      return NextResponse.json({ error: "Güncelleme yetkisi yok (RLS). Supabase'de forum_posts için UPDATE policy'si veya increment_forum_view fonksiyonunu kur." }, { status: 403 });
    }
    return NextResponse.json({ viewCount: newCount });
  }

  return NextResponse.json({ viewCount: data });
}
