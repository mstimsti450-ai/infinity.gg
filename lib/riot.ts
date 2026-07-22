// Riot'un iki FARKLI routing sistemi var, ikisini birbirine karıştırmak en sık yapılan hata:
//  1) Account-V1 (Riot ID -> PUUID) KITA/kıta yönlendirmesi kullanır: "americas" | "asia" | "europe" | "esports"
//  2) VALORANT'a özel her şey (val/content, val/match, val/ranked, val/status) PLATFORM shard'ı
//     kullanır: "na" | "eu" | "ap" | "kr" | "latam" | "br"
// page.tsx her zaman "europe" gönderiyor (tek kullanılan değer bu), ama ileride başka değerler
// eklenirse diye ikisi de mantıklı şekilde eşleşsin diye eşleme tablosu yapıyoruz.

const CONTINENT_MAP: Record<string, string> = {
  europe: "europe", eu: "europe",
  na: "americas", americas: "americas", latam: "americas", br: "americas",
  ap: "asia", asia: "asia", kr: "asia",
};

const PLATFORM_SHARD_MAP: Record<string, string> = {
  europe: "eu", eu: "eu",
  na: "na", americas: "na",
  latam: "latam",
  br: "br",
  ap: "ap", asia: "ap",
  kr: "kr",
};

export function toContinent(region: string): string {
  return CONTINENT_MAP[(region || "europe").toLowerCase()] || "europe";
}

export function toPlatformShard(region: string): string {
  return PLATFORM_SHARD_MAP[(region || "europe").toLowerCase()] || "eu";
}

const RIOT_API_KEY = process.env.RIOT_API_KEY || "";

export async function riotFetch(url: string) {
  if (!RIOT_API_KEY) {
    throw new Error("RIOT_API_KEY tanımlı değil. .env.local dosyana RIOT_API_KEY=RGAPI-xxxx ekle (developer.riotgames.com'dan alınır).");
  }
  const res = await fetch(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
    // Riot API yanıtları sık değişebilir (maç geçmişi, sunucu durumu vb.) — cache'lemiyoruz.
    cache: "no-store",
  });
  return res;
}