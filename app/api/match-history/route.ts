import { NextResponse } from "next/server";
import { riotFetch, toPlatformShard } from "@/lib/riot";

export const dynamic = "force-dynamic";

// GET /api/riot-match-history?region=europe&puuid=xxxx&count=10
//
// Tek bir maçın detayını değil, SON N MAÇI çekip GERÇEK bir istatistik özeti üretir —
// tracker.gg / premate.gg gibi sitelerin yaptığı şey tam olarak bu: Riot'un resmi API'si
// "son 10 maçtaki ortalama K/D'in" gibi hazır bir alan sunmuyor, bunu biz maç maç toplayıp
// kendimiz hesaplamak zorundayız.
//
// -> {
//      matches: [{ matchId, agentId, mapId, competitiveTier, kills, deaths, assists, kd, acs, won, gameStartMillis }],
//      summary: { matchCount, wins, winRate, kills, deaths, assists, kd, acs, adr, hsPercent, competitiveTier }
//    }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";
  const puuid = searchParams.get("puuid") || "";
  // DÜZELTME (teşhis): 10 maç = 11 paralel Riot isteği (1 liste + 10 detay) demekti. Riot API
  // yavaş yanıt verirse ve hosting'in fonksiyon süre sınırı kısaysa (ör. Vercel Hobby = 10sn),
  // istek zaman aşımına uğrayıp sunucu JSON yerine ham hata sayfası dönebiliyordu — bu da
  // istemcide "Maç verisine bağlanılamadı." (JSON parse hatası) olarak görünüyordu. Varsayılan
  // 10'dan 6'ya düşürüldü, zaman aşımı riskini azaltmak için.
  const count = Math.min(20, Math.max(1, Number(searchParams.get("count")) || 6));

  if (!puuid) return NextResponse.json({ error: "puuid gerekli" }, { status: 400 });

  try {
    const shard = toPlatformShard(region);

    const listRes = await riotFetch(`https://${shard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`);
    if (!listRes.ok) {
      // DÜZELTME (teşhis): önceden bu hata sadece istemciye JSON olarak dönüyordu, sunucu
      // loglarında hiçbir iz bırakmıyordu. Artık gerçek Riot durum kodu ve gövdesi loglanıyor —
      // "val/match/v1" için 401/403 dönerse bu, API key'in bu uç noktaya erişimi olmadığı
      // (partner-only kısıtlama) anlamına gelir; kod hatası değildir.
      let bodyText = "";
      try { bodyText = await listRes.text(); } catch {}
      console.error(`[riot-match-history] matchlist isteği başarısız — status=${listRes.status} shard=${shard} body=${bodyText.slice(0, 300)}`);
      return NextResponse.json({ error: `Riot API hatası (${listRes.status})` }, { status: listRes.status });
    }
    const listData = await listRes.json();
    const matchIds: string[] = (listData.history || []).slice(0, count).map((h: any) => h.matchId);

    if (matchIds.length === 0) {
      return NextResponse.json({ matches: [], summary: null });
    }

    // DÜZELTME (performans/rate-limit notu): 10 maç = 10 ayrı Riot API çağrısı demek — resmi
    // API'de "toplu maç detayı" endpoint'i yok, tracker siteleri de aynı şekilde tek tek çekip
    // kendi veritabanlarında biriktiriyor. Burada Promise.all ile paralel çekiyoruz (kişisel
    // geliştirici anahtarı limiti: saniyede 20, 2 dakikada 100 istek — tek bir profil aramasında
    // bu limitin çok altında kalıyoruz).
    const matchResults = await Promise.all(
      matchIds.map(async (matchId) => {
        try {
          const res = await riotFetch(`https://${shard}.api.riotgames.com/val/match/v1/matches/${matchId}`);
          if (!res.ok) {
            console.error(`[riot-match-history] maç detayı başarısız — matchId=${matchId} status=${res.status}`);
            return null;
          }
          return await res.json();
        } catch (err) {
          console.error(`[riot-match-history] maç detayı fetch hatası — matchId=${matchId}`, err);
          return null;
        }
      })
    );

    type MatchSummary = {
      matchId: string;
      agentId: string | null;
      mapId: string | null;
      competitiveTier: number | null;
      kills: number;
      deaths: number;
      assists: number;
      kd: number;
      acs: number;
      adr: number;
      won: boolean | null;
      gameStartMillis: number | null;
    };

    const matches: MatchSummary[] = [];
    let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalRounds = 0, totalScore = 0;
    let totalDamage = 0, totalHeadshots = 0, totalBodyshots = 0, totalLegshots = 0;
    let wins = 0;
    let lastTier: number | null = null;

    for (const data of matchResults) {
      if (!data) continue;
      const matchInfo = data.matchInfo || {};
      const player = (data.players || []).find((p: any) => p.puuid === puuid);
      if (!player) continue;

      const stats = player.stats || {};
      const kills = stats.kills ?? 0;
      const deaths = stats.deaths ?? 0;
      const assists = stats.assists ?? 0;
      const roundsPlayed = stats.roundsPlayed || 1;
      const acs = Math.round((stats.score ?? 0) / roundsPlayed);
      const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;

      const team = (data.teams || []).find((t: any) => t.teamId === player.teamId);
      const won = team ? !!team.won : null;

      // Maçın hasar/headshot verisi round-round bazlı (roundResults[].playerStats[]) —
      // resmi API'de "toplam hasar" diye hazır bir alan yok, her round'u tek tek topluyoruz.
      let matchDamage = 0, matchHeadshots = 0, matchBodyshots = 0, matchLegshots = 0;
      for (const round of data.roundResults || []) {
        const roundPlayerStats = (round.playerStats || []).find((ps: any) => ps.puuid === puuid);
        if (!roundPlayerStats) continue;
        for (const dmg of roundPlayerStats.damage || []) {
          matchDamage += dmg.damage || 0;
          matchHeadshots += dmg.headshots || 0;
          matchBodyshots += dmg.bodyshots || 0;
          matchLegshots += dmg.legshots || 0;
        }
      }
      const adr = Math.round(matchDamage / roundsPlayed);

      matches.push({
        matchId: matchInfo.matchId || "",
        agentId: player.characterId ?? null,
        mapId: matchInfo.mapId ?? null,
        competitiveTier: player.competitiveTier ?? null,
        kills, deaths, assists, kd, acs, adr,
        won,
        gameStartMillis: matchInfo.gameStartMillis ?? null,
      });

      totalKills += kills;
      totalDeaths += deaths;
      totalAssists += assists;
      totalRounds += roundsPlayed;
      totalScore += stats.score ?? 0;
      totalDamage += matchDamage;
      totalHeadshots += matchHeadshots;
      totalBodyshots += matchBodyshots;
      totalLegshots += matchLegshots;
      if (won) wins++;
      if (player.competitiveTier != null) lastTier = player.competitiveTier;
    }

    if (matches.length === 0) {
      return NextResponse.json({ matches: [], summary: null });
    }

    const totalShots = totalHeadshots + totalBodyshots + totalLegshots;
    const summary = {
      matchCount: matches.length,
      wins,
      winRate: Math.round((wins / matches.length) * 1000) / 10,
      kills: totalKills,
      deaths: totalDeaths,
      assists: totalAssists,
      kd: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
      acs: totalRounds > 0 ? Math.round(totalScore / totalRounds) : 0,
      adr: totalRounds > 0 ? Math.round(totalDamage / totalRounds) : 0,
      hsPercent: totalShots > 0 ? Math.round((totalHeadshots / totalShots) * 1000) / 10 : 0,
      competitiveTier: lastTier,
    };

    return NextResponse.json({ matches, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Sunucu hatası" }, { status: 500 });
  }
}
