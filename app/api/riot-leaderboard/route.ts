import { NextRequest, NextResponse } from "next/server";

// val-ranked-v1 / leaderboards/by-act/{actId}: gerçek üst sıra oyuncu listesi.
// actId'yi elle bilmemize gerek yok; /api/riot-content zaten aktif act id'yi döner,
// istemci tarafında oradan alınıp buraya parametre olarak geçilir.

const CONTINENT_TO_SHARD: Record<string, string> = {
  europe: "eu",
  americas: "na",
  asia: "ap",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";
  const actId = searchParams.get("actId");
  const size = searchParams.get("size") || "10";

  if (!actId) {
    return NextResponse.json({ error: "actId zorunludur." }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sunucuda RIOT_API_KEY tanımlı değil." }, { status: 500 });
  }

  const shard = CONTINENT_TO_SHARD[region] || "eu";

  try {
    const res = await fetch(
      `https://${shard}.api.riotgames.com/val/ranked/v1/leaderboards/by-act/${actId}?size=${size}`,
      { headers: { "X-Riot-Token": apiKey }, cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const players = (data.players || []).slice(0, Number(size)).map((p: any) => ({
      rank: p.leaderboardRank,
      name: p.gameName ? `${p.gameName}#${p.tagLine}` : "Gizli Oyuncu",
      rr: p.rankedRating,
      wins: p.numberOfWins,
    }));

    return NextResponse.json({ players });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}
