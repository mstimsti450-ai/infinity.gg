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
    const hasIncidents = (data.incidents || []).length > 0;
    const hasMaintenance = (data.maintenances || []).length > 0;

    return NextResponse.json({
      online: !hasIncidents && !hasMaintenance,
      incidentCount: (data.incidents || []).length,
      maintenanceCount: (data.maintenances || []).length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Riot sunucularına bağlanılamadı." }, { status: 500 });
  }
}