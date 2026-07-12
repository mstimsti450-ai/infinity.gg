import { NextRequest, NextResponse } from "next/server";

// app/api/riot-match-detail/route.ts
// val-match-v1 / matches/{matchId}: tek maçın tam detayı, sadece aranan oyuncuya (puuid) ait
// istatistikler ayıklanıp döner. Gerçek K/D, ACS, ajan, rütbe bilgisinin kaynağı.

const CONTINENT_TO_SHARD: Record<string, string> = { europe: "eu", americas: "na", asia: "ap" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";
  const matchId = searchParams.get("matchId");
  const puuid = searchParams.get("puuid");

  if (!matchId || !puuid) {
    return NextResponse.json({ error: "matchId ve puuid zorunludur." }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sunucuda RIOT_API_KEY tanımlı değil." }, { status: 500 });
  }

  const shard = CONTINENT_TO_SHARD[region] || "eu";

  try {
    const res = await fetch(`https://${shard}.api.riotgames.com/val/match/v1/matches/${matchId}`, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const playerData = (data.players || []).find((p: any) => p.puuid === puuid);
    if (!playerData) {
      return NextResponse.json({ error: "Oyuncu bu maçta bulunamadı." }, { status: 404 });
    }

    const stats = playerData.stats || {};
    const roundsPlayed = data.roundResults?.length || stats.roundsPlayed || 1;
    const kills = stats.kills || 0;
    const deaths = stats.deaths || 0;
    const assists = stats.assists || 0;
    const score = stats.score || 0;

    return NextResponse.json({
      matchId,
      mapId: data.matchInfo?.mapId || null,
      gameStartMillis: data.matchInfo?.gameStartMillis || null,
      queueId: data.matchInfo?.queueId || null,
      isRanked: data.matchInfo?.isRanked ?? false,
      agentId: playerData.characterId || null,
      competitiveTier: playerData.competitiveTier ?? null,
      teamId: playerData.teamId || null,
      kills,
      deaths,
      assists,
      kd: deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills,
      acs: roundsPlayed > 0 ? Math.round(score / roundsPlayed) : 0,
      won: (data.teams || []).find((t: any) => t.teamId === playerData.teamId)?.won ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}