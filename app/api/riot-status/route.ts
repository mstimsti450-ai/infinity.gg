import { NextRequest, NextResponse } from "next/server";

// app/api/riot-status/route.ts
// val-status-v1 / platform-data: bölgedeki gerçek bakım/kesinti durumu.

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
    const res = await fetch(`https://${shard}.api.riotgames.com/val/status/v1/platform-data`, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const maintenances = data.maintenances || [];
    const incidents = data.incidents || [];

    // DÜZELTME: önceden HERHANGİ bir "incident" (bunlar genelde küçük/kozmetik uyarılar
    // olabiliyor, tam kesinti anlamına gelmiyor) bile "Sunucular Çevrimdışı" gösteriyordu —
    // "sunucular aktif ama çevrimdışı görünüyor" şikayetinin sebebi muhtemelen buydu.
    // Artık sadece GERÇEK "maintenance" (planlı/plansız tam bakım) durumu "çevrimdışı" sayılıyor.
    // "incident_severity" alanı "critical" olan kayıtlar da yine de çevrimdışı sayılır.
    const hasCriticalIncident = incidents.some((i: any) => i.incident_severity === "critical");
    const hasMaintenance = maintenances.length > 0;

    return NextResponse.json({
      online: !hasMaintenance && !hasCriticalIncident,
      maintenanceCount: maintenances.length,
      incidentCount: incidents.length, // bilgi amaçlı, artık "offline" kararını tek başına etkilemiyor
    });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}
