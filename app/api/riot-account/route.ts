import { NextRequest, NextResponse } from "next/server";

// Bu route Riot'un genel/herkese açık Account-V1 API'sini kullanır.
// Sadece "bu Riot ID (isim#tag) gerçekten var mı" sorusunu doğrular; PUUID döner.
// Gerçek VALORANT rütbe/maç istatistikleri Riot'un özel (partner-only) API'sine
// ihtiyaç duyar ve normal geliştirici hesaplarına açık değildir.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe"; // europe | americas | asia
  const gameName = searchParams.get("gameName");
  const tagLine = searchParams.get("tagLine");

  if (!gameName || !tagLine) {
    return NextResponse.json({ error: "gameName ve tagLine zorunludur." }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Sunucuda RIOT_API_KEY tanımlı değil. .env.local dosyana RIOT_API_KEY ekle." },
      { status: 500 }
    );
  }

  const allowedRegions = ["europe", "americas", "asia"];
  const safeRegion = allowedRegions.includes(region) ? region : "europe";

  try {
    const riotRes = await fetch(
      `https://${safeRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
        gameName
      )}/${encodeURIComponent(tagLine)}`,
      {
        headers: { "X-Riot-Token": apiKey },
        cache: "no-store",
      }
    );

    if (riotRes.status === 404) {
      return NextResponse.json({ error: "Bu Riot ID bulunamadı." }, { status: 404 });
    }

    if (riotRes.status === 403) {
      return NextResponse.json(
        { error: "API anahtarı geçersiz veya süresi dolmuş. developer.riotgames.com üzerinden yeni bir key al." },
        { status: 403 }
      );
    }

    if (!riotRes.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${riotRes.status}` }, { status: riotRes.status });
    }

    const data = await riotRes.json();
    return NextResponse.json({
      gameName: data.gameName,
      tagLine: data.tagLine,
      puuid: data.puuid,
    });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}