import { NextRequest, NextResponse } from "next/server";

// app/api/riot-matches/route.ts
// val-match-v1 / matchlists/by-puuid: maç geçmişi listesi. Platform shard'ı kullanır (eu/na/ap).

const CONTINENT_TO_SHARD: Record<string, string> = { europe: "eu", americas: "na", asia: "ap" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";
  const puuid = searchParams.get("puuid");

  if (!puuid) {
    return NextResponse.json({ error: "puuid zorunludur." }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sunucuda RIOT_API_KEY tanımlı değil." }, { status: 500 });
  }

  const shard = CONTINENT_TO_SHARD[region] || "eu";

  try {
    const res = await fetch(`https://${shard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "Bu oyuncu için maç geçmişi bulunamadı." }, { status: 404 });
    }
    if (res.status === 403) {
      return NextResponse.json({ error: "API anahtarı bu uç nokta için yetkili değil." }, { status: 403 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}