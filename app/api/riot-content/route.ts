import { NextResponse } from "next/server";
import { riotFetch, toPlatformShard } from "@/lib/riot";

export const dynamic = "force-dynamic";

// GET /api/riot-content?region=europe
// -> { activeActId, tiers: [{tier,name,icon}], agents: [{id,name}], maps: [{id,name}] }
// Bu, ajan/harita/rütbe UUID'lerini okunabilir isimlere çevirmek için gereken "sözlük" verisi.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "europe";

  try {
    const shard = toPlatformShard(region);
    const res = await riotFetch(`https://${shard}.api.riotgames.com/val/content/v1/contents?locale=tr-TR`);

    if (!res.ok) {
      return NextResponse.json({ error: `Riot API hatası (${res.status})` }, { status: res.status });
    }

    const data = await res.json();

    const activeAct = (data.acts || []).find((a: any) => a.isActive && a.type === "act") || (data.acts || []).find((a: any) => a.isActive);
    const agents = (data.characters || []).map((c: any) => ({ id: c.id, name: c.name, icon: c.displayIcon || null }));
    const maps = (data.maps || []).map((m: any) => ({ id: m.id, name: m.name }));

    // competitiveTiers dizisi genelde tek elemanlı (o anki rütbe setini temsil eder);
    // en son (en güncel) rütbe setini almak için son elemanı kullanıyoruz.
    const tierSet = (data.competitiveTiers || [])[(data.competitiveTiers || []).length - 1];
    const tiers = (tierSet?.tiers || [])
      .filter((t: any) => t.tierName && t.tierName.trim() !== "")
      .map((t: any) => ({ tier: t.tier, name: t.tierName, icon: t.largeIcon || t.smallIcon || "" }));

    return NextResponse.json({
      activeActId: activeAct?.id || null,
      tiers,
      agents,
      maps,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Sunucu hatası" }, { status: 500 });
  }
}