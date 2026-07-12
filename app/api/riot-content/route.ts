import { NextRequest, NextResponse } from "next/server";

// app/api/riot-content/route.ts
// val-content-v1 / contents: rütbe/ajan/harita referans verisi. Sezon boyunca sabittir.

const CONTINENT_TO_SHARD: Record<string, string> = { europe: "eu", americas: "na", asia: "ap" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Sunucuda RIOT_API_KEY tanımlı değil." }, { status: 500 });
  }

  const shard = CONTINENT_TO_SHARD[region] || "eu";

  try {
    const res = await fetch(`https://${shard}.api.riotgames.com/val/content/v1/contents`, {
      headers: { "X-Riot-Token": apiKey },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const activeAct = (data.acts || []).find((a: any) => a.isActive);
    const tierList = (data.competitiveTiers || []).at(-1);
    const tiers = (tierList?.tiers || []).map((t: any) => ({ tier: t.tier, name: t.tierName, icon: t.largeIcon }));
    const agents = (data.characters || []).map((c: any) => ({ id: c.id, name: c.name }));
    const maps = (data.maps || []).map((m: any) => ({ id: m.mapUrl || m.id, name: m.name }));

    return NextResponse.json({
      activeActId: activeAct?.id || null,
      activeActName: activeAct?.name || null,
      // YENİ: sezon/act bitiş tarihi de dönüyor — sitedeki "sezon bitişine kalan süre"
      // sayacının artık gerçek Riot verisiyle çalışmasını istersen bunu kullan.
      activeActEndTime: activeAct?.scheduledEndTime || null,
      tiers,
      agents,
      maps,
    });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}