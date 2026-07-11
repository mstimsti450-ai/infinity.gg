"use client";

import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ==========================================
// VERİTABANI VE ÖRNEK VERİLER (DEĞİŞMEDİ)
// ==========================================
// SES EFEKTLERİ — dış ses dosyasına ihtiyaç duymadan, doğrudan tarayıcıda (Web Audio API)
// kısa "bip" sesleri üretir. Bu yüzden hiçbir .mp3 dosyası eklemene gerek yok.
let sharedAudioCtx: AudioContext | null = null;
const playTone = (freq: number, duration: number, type: OscillatorType = "sine", volume = 0.12) => {
  try {
    if (typeof window === "undefined") return;
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};
const playCorrectSound = () => { playTone(660, 0.12, "sine"); setTimeout(() => playTone(880, 0.18, "sine"), 90); };
const playWrongSound = () => { playTone(180, 0.28, "sawtooth", 0.1); };
const playTickSound = () => { playTone(1000, 0.05, "square", 0.05); };
const playClickSound = () => { playTone(500, 0.06, "triangle", 0.07); };

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Hangi ajanın ulti yeteneği 'Yörünge Saldırısı' (Orbital Strike) olarak adlandırılır?",
    options: ["Breach", "Brimstone", "Sova", "Gekko"],
    answer: "Brimstone",
  },
  {
    id: 2,
    question: "Valorant'ta tamamen zırhlı (Ağır Kalkan) bir oyuncunun toplam canı (HP + Kalkan) kaçtır?",
    options: ["125", "140", "150", "175"],
    answer: "150",
  },
  {
    id: 3,
    question: "Aşağıdaki haritalardan hangisinde 3 adet Spike alanı (A, B, C) bulunur?",
    options: ["Bind", "Haven", "Ascent", "Split"],
    answer: "Haven",
  },
  {
    id: 4,
    question: "Vandal silahı ile kafadan (Headshot) vurulduğunda rakibe kaç hasar verilir?",
    options: ["150", "156", "160", "145"],
    answer: "160",
  },
  {
    id: 5,
    question: "Hangi kontrol uzmanı ajan haritaya duman (smoke) bırakmak için bir 'Yıldız' (Star) yerleştirir?",
    options: ["Omen", "Astra", "Viper", "Clove"],
    answer: "Astra",
  },
  {
    id: 6,
    question: "Valorant'ın ilk yayınlandığı dönemde kapalı betada olan ve daha sonra kaldırılıp güncellenen harita hangisidir?",
    options: ["Split", "Bind", "Ascent", "Breeze"],
    answer: "Split",
  },
  {
    id: 7,
    question: "Aşağıdaki ajanlardan hangisi bir 'Gözcü' (Sentinel) rolündedir?",
    options: ["Deadlock", "Fade", "Harbor", "Iso"],
    answer: "Deadlock",
  },
  {
    id: 8,
    question: "Spike yerleştirildikten (plant edildikten) tam kaç saniye sonra patlar?",
    options: ["35", "40", "45", "50"],
    answer: "45",
  },
  {
    id: 9,
    question: "Jett'in pasif yeteneği olan havada süzülme (Drift) hangi tuşa basılı tutularak yapılır?",
    options: ["Shift", "Ctrl", "Boşluk (Space)", "E Tuşu"],
    answer: "Boşluk (Space)",
  },
  {
    id: 10,
    question: "Operator (OP) keskin nişancı tüfeğinin gövdeden (Body) vuruş hasarı kaçtır?",
    options: ["120", "135", "150", "160"],
    answer: "150",
  }
];

const LEADERBOARD_DATA = [
  { rank: 1, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 2, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 3, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 4, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 5, name: "Henüz kimse yok", score: 0, agent: "—" },
];

// ÖNEMLİ DÜZELTME: bu örnek/statik nişangahların ID'leri (1,2,3...) Supabase'den gelen
// gerçek (kullanıcı eklediği) nişangahların ID'leriyle çakışıyordu — bu yüzden birini
// beğenince/kopyalayınca farklı bir kart da aynı anda etkileniyordu (aynı ID = aynı state).
// 900000+ aralığına taşıyarak çakışmayı kalıcı olarak engelliyoruz.
const CROSSHAIRS_DATA = [
  { id: 900001, title: "TenZ", subtitle: "Pro T1 TenZ#2001", likes: "0", rank: "immortal", color: "#00ffff", code: "0;P;c;4;h;0;0l;4;0o;2;0a;1;0f;0;1b;0" },
  { id: 900002, title: "yay", subtitle: "Pro yay#661", likes: "0", rank: "radiant", color: "#ffffff", code: "0;P;c;0;h;0;0l;3;0o;1;0a;1;1b;0" },
  { id: 900003, title: "my girlfriend", subtitle: "By Faint#ong", likes: "0", rank: "diamond", color: "#00ffcc", code: "0;P;c;4;h;0;0l;5;0o;3;0a;0.8;1b;0" },
  { id: 900004, title: "sacy", subtitle: "By nocz#galax", likes: "0", rank: "ascendant", color: "#ffffff", code: "0;P;c;0;h;0;0l;4;0o;2;0a;1;1b;0" },
  { id: 900005, title: "onetap$", subtitle: "By EG srn#mimi", likes: "0", rank: "radiant", color: "#000000", code: "0;P;c;3;h;0;0l;2;0o;1;0a;1;1b;0" },
  { id: 900006, title: "My father", subtitle: "By Goth Girl Hunter#F1rE", likes: "0", rank: "gold", color: "#ff00ff", code: "0;P;c;5;h;0;0l;6;0o;4;0a;1;1b;0" }
];

// Valorant nişangah kodu için basitleştirilmiş renk paleti (yaygın renk index'leri) - YENİ EKLENDİ
// NOT: Artık projenin public klasöründeki gerçek /riot.png dosyası kullanılıyor (beyaz Riot ikonu).
// Görünmüyorsa dosyanın gerçekten `public/riot.png` yolunda olduğunu ve build sırasında
// kopyalandığını kontrol et (Next.js public/ klasörünü otomatik statik servis eder).
const RiotMark = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} relative inline-block flex-shrink-0`}>
    <Image src="/riot.png" alt="Riot Games" fill className="object-contain" />
  </div>
);

// ARAŞTIRMA NOTU: Riot resmi bir renk-indeksi tablosu yayınlamıyor, ama onlarca gerçek
// pro/topluluk kodunu (TenZ, nAts, Zekken, ScreaM, Yay, Cryo, Alfajer + erişilebilirlik
// makaleleri) çapraz kontrol ederek şu eşleşmeler net şekilde doğrulandı:
// 0=beyaz (varsayılan, "c" hiç yoksa da budur) · 1=yeşil (nAts, Zekken, Boaster, Jinggg,
// qRaxs, CHICHOO, BerLIN hepsi c;1) · 2=sarı (erişilebilirlik makalesi: "Protanopia
// Optimized: Uses Yellow (c;2)") · 5=camgöbeği/cyan (TenZ, Cryo, ScreaM, Alfajer, Life,
// Boostio, D4V41 hepsi c;5) · 6=pembe/magenta (erişilebilirlik makalesi: "Deuteranopia
// Optimized: Uses Pink/Magenta (c;6)") · 7=kırmızı (benjyfishy, Chronicle, jawgemo) ·
// 8=özel/manuel (her zaman "u" anahtarındaki hex okunur, bu YÜZDE YÜZ doğru). 3 ve 4
// için hiçbir kaynakta net, tekrarlanan bir örnek bulunamadı — muhtemelen 2 (sarı) ile
// 5 (camgöbeği) arasındaki ara tonlar (sarı-yeşil / açık mavi); en iyi tahminle dolduruldu,
// bu iki index'in diğerleri kadar garantili olmadığını bilerek.
const CROSSHAIR_COLOR_MAP: Record<string, string> = {
  "0": "#ffffff", // beyaz — doğrulandı
  "1": "#00ff00", // yeşil — doğrulandı (nAts, Zekken, Boaster...)
  "2": "#ffff00", // sarı — doğrulandı (erişilebilirlik makalesi)
  "3": "#adff2f", // sarı-yeşil (yellow-green) — net kaynak yok, en iyi tahmin
  "4": "#00b5ff", // açık mavi — net kaynak yok, en iyi tahmin (topluluğun en popüler özel rengi)
  "5": "#00ffff", // camgöbeği/cyan — doğrulandı (TenZ, Cryo, ScreaM...)
  "6": "#ff2d95", // pembe/magenta — doğrulandı (erişilebilirlik makalesi)
  "7": "#ff4655", // kırmızı — doğrulandı (benjyfishy, Chronicle...)
};

// Valorant nişangah kodu ayrıştırıcı.
// ÖNEMLİ DÜZELTME #1: Valorant kodları HER ZAMAN "0;" ile başlamaz — kullanıcının
// hangi "profil slotunu" (0-9 arası) kaydettiğine göre "1;...", "3;..." gibi de
// başlayabilir. Önceki versiyon sadece "^0;" kabul ediyordu, bu yüzden 0 dışındaki
// bir slotla kopyalanan HER kod "geçersiz" sayılıp yerine alakasız bir varsayılan
// artı (+) çiziliyordu — "bambaşka bir cross çıkıyor" şikayetinin asıl sebebi buydu.
// ÖNEMLİ DÜZELTME #2: çizgilerin görünüp görünmeyeceğini uzunluk/kalınlık DEĞİL,
// ayrı "0b" (iç çizgiler açık/kapalı) ve "1b" (dış çizgiler açık/kapalı) bayrakları
// belirliyor. Bu yüzden "sadece nokta" kodlarında bile 0l/0t hâlâ sıfır olmayan bir
// değer taşıyabiliyordu ve önizleme yine de bir artı gösteriyordu.
interface ParsedCrosshair {
  color: string;
  // "length" ve "outerLength" YATAY (sol/sağ kol) uzunluğu temsil ediyor — bkz. aşağıdaki
  // vLength/outerVLength. Valorant'ın crosshair menüsünde uzunluk kutusunun yanında bir
  // "zincir" (chain) simgesi var: zincir KAPALIYKEN yatay ve dikey uzunluk AYRI AYRI
  // ayarlanabiliyor (kaynak: Dot Esports — "to input different lengths for inner or outer
  // lines, you need to disable the middle chain icon"). O zaman kod, yatay için "0l"/"1l",
  // dikey için AYRICA "0v"/"1v" taşıyor. ÖNCEDEN "0v"/"1v" HİÇ OKUNMUYORDU — bu yüzden yatayı
  // uzun/dikeyi kısa (ya da tam tersi) olan asimetrik crosshair'ler, sanki zincir hep kapalıymış
  // gibi (4 kolu da "0l" ile) çizilip düz bir artıya dönüşüyordu.
  length: number;
  offset: number;
  thickness: number;
  opacity: number;
  dot: boolean;
  innerLinesOn: boolean;
  outerLinesOn: boolean;
  // YENİ: dış çizgilerin (1-önekli anahtarlar) kendi boyutları — önceden hiç okunmuyordu,
  // outerLinesOn true olsa bile hiçbir şey çizilmiyordu ya da iç çizgininkiyle aynı
  // varsayılmıyordu. Gerçek Valorant kodlarında iç ve dış çizgiler FARKLI uzunluk/
  // kalınlık/boşluk/opasiteye sahip olabiliyor.
  outerLength: number;
  outerOffset: number;
  outerThickness: number;
  outerOpacity: number;
  // YENİ: dikey (üst/alt kol) uzunluğu — "0v"/"1v". Anahtar kodda yoksa (zincir açık/linked,
  // yani eski/basit kodların büyük çoğunluğu) yatayla AYNI kabul edilir (simetrik artı) —
  // bu, geriye dönük uyumluluğu bozmaz.
  vLength: number;
  outerVLength: number;
  // YENİ (ASIL "boş/bambaşka çıkıyor" BUG'U): nokta (dot) kendi opaklık ("a") ve boyut ("z")
  // değerlerine sahip — iç çizgi opaklığından ("0a") TAMAMEN bağımsız. Önceden nokta yanlışlıkla
  // "0a" ile aynı opaklığı kullanıyordu. Bu yüzden "0a" çok düşükken (ör. 0.05) kodun kendisi
  // noktayı tam opak istese (a;1) bile nokta da soluklaşıp önizleme "boş/alakasız" görünüyordu.
  dotOpacity: number;
  dotSize: number;
  // YENİ: Outline (siyah dış hat). Gerçek Valorant crosshair sisteminde outline; iç çizgi,
  // dış çizgi VE nokta için ORTAK tek bir ayardır (0/1 önekli değildir) — üst seviye "o"
  // (Outline Opacity) ve "t" (Outline Thickness) anahtarlarıyla kontrol edilir. Önceden bu
  // hiç okunmuyordu, bu yüzden outline kullanan (birçok popüler pro) kod SVG'de outline'sız,
  // yani oyundakinden bambaşka çıkıyordu.
  outlineOpacity: number;
  outlineThickness: number;
  // YENİ: Hareket ("0m"/"1m") ve ateş ("0f"/"1f") hatası bayrakları artık okunup dışarı
  // veriliyor. Bunlar SADECE oyuncu hareket ederken/ateş ederken devreye giren DİNAMİK bir
  // genişlemeyi kontrol eder — durağan (statik) bir SVG önizlemesinde oyun motoru olmadan bu
  // animasyonu "doğru" simüle etmenin güvenilir bir yolu yok, o yüzden görsele bilerek uydurma
  // bir çizgi eklemiyoruz. Değerler ileride "hareket halinde önizle" gibi bir özellik
  // eklenmek istenirse hazır olsun diye burada tutuluyor. Aynı sebepten "0s"/"1s" (hareket/ateş
  // hatası ÇARPANI) ve "0e"/"1e" (ateş hatası ÇARPANI) de bilerek statik görselde kullanılmıyor —
  // bunlar da yalnızca dinamik genişlemenin BÜYÜKLÜĞÜNÜ etkiler, durağan haldeki görünümü değil.
  innerMovementError: boolean;
  innerFiringError: boolean;
  outerMovementError: boolean;
  outerFiringError: boolean;
}

// GERÇEK NİŞANGAH ÇİZİMİ (BAŞTAN YAZILDI): önceki versiyon kartlarda sadece renkli bir
// nokta gösteriyordu, gerçek çizgileri/noktayı hiç çizmiyordu — "cross gözükmüyor" ve
// "attığım crosstan bambaşka bir şey çıkıyor" şikayetlerinin asıl sebebi buydu.
// parseCrosshairCode() zaten tüm gerçek verileri (uzunluk/kalınlık/boşluk/opaklık/nokta/
// iç-dış çizgi açık-kapalı) doğru ayrıştırıyordu, sadece bunu çizen bir bileşen yoktu.
// Bu bileşen SADECE parsed veriye bakar, her kod için farklı ve doğru sonucu üretir.
// DÜZELTME (ASIL BUG — "crossların köşeleri/yanları boş kalıyor"): 4 kol (üst/alt/sol/sağ)
// SVG <rect rx=...> ile yuvarlatıldığında, rx HER 4 köşeyi de yuvarlıyor — bu, her kolun
// MERKEZE BAKAN (iç) köşelerini de kırpıyor. Offset küçükken (özellikle 0'a yakınken) kollar
// tam merkezde üst üste binip dolu bir + oluşturması gerekirken, iç köşelerdeki bu kırpma
// TAM O BİNİŞME BÖLGESİNDEN bir parça koparıyor — sonuç: merkezde/köşelerde boşluk. Çözüm:
// her kolun DIŞ ucu (görünür yuvarlak uç) olduğu yerde SABİT kalırken, İÇ (merkeze bakan)
// kenarı "rx" kadar merkeze doğru uzatılıyor — böylece rx o iç köşeyi kırpsa bile, kırpılmayan
// kısım hâlâ komşu kolla tam örtüşüyor ve boşluk oluşmuyor.
function crosshairArmRects(cx: number, cy: number, hLen: number, vLen: number, thick: number, off: number, rx: number) {
  return [
    { key: "t", x: cx - thick / 2, y: cy - off - vLen, w: thick, h: vLen + rx },
    { key: "b", x: cx - thick / 2, y: cy + off - rx, w: thick, h: vLen + rx },
    { key: "l", x: cx - off - hLen, y: cy - thick / 2, w: hLen + rx, h: thick },
    { key: "r", x: cx + off - rx, y: cy - thick / 2, w: hLen + rx, h: thick },
  ];
}

// GERİ ALINDI: "köşe boşluğu" için eklenen dış-hat-köprüsü mantığı YANLIŞTI. Elle yaptığım
// koordinat hesabı matematiksel olarak tutarlıydı ama neyi "düzelttiğini" gerçek oyunla
// karşılaştırmadan varsaymıştım. Gerçekte offset>0 olan (boşluklu) bir nişangahta o boşluk
// TAMAMEN BOŞ/şeffaf olması GEREKEN bir alan — her kol kendi dikdörtgeninin etrafında ince bir
// çerçeve gibi durur, çapraz köşede komşu kolla "birleşmesi" gerekmez, çünkü gerçek oyunda da
// birleşmiyor. Bu yamayı ekleyince boşluk ortasında büyük, yanlış bir siyah kare bloğu oluştu
// (bkz. kullanıcı ekran görüntüsü) — hem hiç bozuk olmayan nişangahları bozdu hem de asıl amacı
// olan "köşe" görünümünü düzeltmedi, çünkü zaten düzeltilecek bir şey yoktu. Tamamen kaldırıldı.

function CrosshairPreviewSVG({ parsed, size = 56 }: { parsed: ParsedCrosshair; size?: number }) {
  const cx = 50, cy = 50;
  // DÜZELTME: küçük kart boyutunda (56-64px) ince çizgiler neredeyse görünmez kalıyordu,
  // "sadece nokta gösteriyor" hissi buradan geliyordu. Ölçek ve minimum kalınlık/yarıçap
  // yükseltildi — artık her nişangah, çizgi ne kadar ince ayarlı olursa olsun net görünüyor.
  // NOT: Bu bileşen BİLEREK gerçek boyutu birebir yansıtmıyor — amacı, küçük bir kartta
  // her nişangahı "okunabilir bir ikon" gibi göstermek. Kodun oyundaki GERÇEK ölçeğini görmek
  // için haritada önizleme penceresindeki CrosshairAccurateSVG kullanılıyor.
  const BASE_SCALE = 3.1;
  const MIN_THICK = 2.2; // px cinsinden minimum çizgi kalınlığı (görünürlük tabanı)
  const MIN_DOT_R = 2; // px cinsinden minimum nokta yarıçapı

  // DÜZELTME ("bazı crosslar çok devasa duruyor"): sabit BASE_SCALE, uzunluk/kalınlığı büyük
  // ham değerli kodlarda (ör. 0l;20, 0t;10 gibi "uzun çizgi" tarzı kodlar) kartın 56-64px'lik
  // kutusundan taşıp komşu elemanların üstüne biniyordu ("overflow: visible" bunu gizlemiyor,
  // tam tersine taşmaya izin veriyordu). Önce sabit ölçekte "ne kadar yer kaplayacağı"
  // (rawMaxReach) hesaplanıyor; kutuya sığmıyorsa TÜM boyutlar (kalınlık/uzunluk/boşluk/nokta)
  // AYNI ORANDA küçültülüyor — kod hâlâ kendine özgü şeklini/oranını koruyor, sadece kutuya
  // sığacak kadar küçülüyor. Küçük/normal kodlar hiç etkilenmiyor (fitFactor = 1 kalıyor).
  const rawMaxReach = Math.max(
    parsed.offset + parsed.length,
    parsed.offset + parsed.vLength,
    parsed.outerLinesOn ? parsed.outerOffset + parsed.outerLength : 0,
    parsed.outerLinesOn ? parsed.outerOffset + parsed.outerVLength : 0,
    parsed.thickness / 2,
    parsed.outerLinesOn ? parsed.outerThickness / 2 : 0,
    parsed.dot ? parsed.dotSize / 2 : 0
  );
  const MAX_REACH_PX = 44; // 100x100 viewBox'ta merkezden kenara güvenli mesafe (50'den az pay bırakır)
  const fitFactor = rawMaxReach * BASE_SCALE > MAX_REACH_PX ? MAX_REACH_PX / (rawMaxReach * BASE_SCALE) : 1;
  const SCALE = BASE_SCALE * fitFactor;

  // YENİ: outline (siyah dış hat) desteği. Ölçeklendirme mantığı çizgilerle aynı orantıda
  // (SCALE * 0.5) ama minimum bir taban ZORLAMIYORUZ — outline kapalıysa (opaklık 0) veya
  // kodda hiç tanımlı değilse tamamen çizilmiyor.
  const outlineThick = Math.max(parsed.outlineThickness, 0) * SCALE * 0.5;
  const outlineOn = parsed.outlineOpacity > 0 && outlineThick > 0;

  const segs: React.ReactNode[] = [];

  if (parsed.innerLinesOn) {
    // DÜZELTME: üst/alt (dikey) kollar artık "vLength", sol/sağ (yatay) kollar "length"
    // kullanıyor — önceden ikisi de aynı "length" değerini kullandığı için yatay/dikey
    // uzunluğu FARKLI olan (zincir kapalı) crosshair'ler simetrik bir artıya dönüşüyordu.
    const hLen = Math.max(parsed.length, 0) * SCALE;
    const vLen = Math.max(parsed.vLength, 0) * SCALE;
    // DÜZELTME (GERÇEK BUG — kanıtlandı): kalınlık burada SCALE*0.5 ile, boşluk/uzunluk ise
    // SCALE (tam) ile ölçekleniyordu — yani kalınlık, boşluğa göre YARI hızda büyüyordu. Ham
    // oyun birimlerinde kollar çakışıp (boşluk yok, dolu görünmesi gereken) bir kod, bu
    // asimetri yüzünden ölçeklendikten SONRA aniden bir boşluk kazanabiliyordu (örnek: kalınlık
    // 5, boşluk 2 → oyunda çakışık/dolu; SCALE=3.1 sonrası eski formülle kalınlık 7.75/boşluk
    // 6.2 → artık AYRILMIŞ, "artı" gibi görünüyor). Artık kalınlık da length/offset ile AYNI
    // orantıda (SCALE, ekstra *0.5 yok) ölçekleniyor — CrosshairAccurateSVG zaten böyle yapıyordu.
    const thick = Math.max(Math.max(parsed.thickness, 0) * SCALE, MIN_THICK);
    const off = Math.max(parsed.offset, 0) * SCALE;
    if (hLen > 0.3 || vLen > 0.3) {
      const rx = 0; // DÜZELTME: gerçek Valorant crosshair kolları keskin köşeli dikdörtgenlerdir, yuvarlatılmış "hap" görünümü hem gerçek oyundan farklı duruyordu hem de köşe boşluğu yanılsamasını büyütüyordu
      // DÜZELTME (GERÇEK BUG — kanıtlandı): outline, bu grubun KENDİ opaklığından (parsed.opacity)
      // bağımsız olarak çiziliyordu. Bir kodda "0a;0" (iç çizgi tamamen şeffaf) ama outline açık
      // olduğunda, RENKLİ dolgu hiç görünmediği halde SİYAH DIŞ HAT yine de tam opaklıkla
      // çiziliyordu — ortaya "boş içi olan, sadece siyah çerçeveden ibaret kollar" (bir çeşit
      // hayalet artı) çıkıyordu. Artık bu grubun outline'ı SADECE kendi opaklığı > 0 ise çiziliyor.
      const showInnerOutline = outlineOn && parsed.opacity > 0;
      const arms = crosshairArmRects(cx, cy, hLen, vLen, thick, off, rx).map((a) => ({ ...a, key: `in-${a.key}` }));
      arms.forEach((a) => {
        if (a.w <= 0 || a.h <= 0) return;
        if (showInnerOutline) segs.push(<rect key={`${a.key}-out`} x={a.x - outlineThick} y={a.y - outlineThick} width={a.w + outlineThick * 2} height={a.h + outlineThick * 2} fill="#000000" opacity={parsed.outlineOpacity} rx={rx} />);
        segs.push(<rect key={a.key} x={a.x} y={a.y} width={a.w} height={a.h} fill={parsed.color} opacity={parsed.opacity} rx={rx} />);
      });
    }
  }

  if (parsed.outerLinesOn) {
    const hLen = Math.max(parsed.outerLength, 0) * SCALE;
    const vLen = Math.max(parsed.outerVLength, 0) * SCALE;
    const thick = Math.max(Math.max(parsed.outerThickness, 0) * SCALE, MIN_THICK); // DÜZELTME: bkz. yukarıdaki iç kol notu, aynı asimetri burada da vardı
    const off = Math.max(parsed.outerOffset, 0) * SCALE;
    if (hLen > 0.3 || vLen > 0.3) {
      const rx = 0; // DÜZELTME: gerçek Valorant crosshair kolları keskin köşeli dikdörtgenlerdir, yuvarlatılmış "hap" görünümü hem gerçek oyundan farklı duruyordu hem de köşe boşluğu yanılsamasını büyütüyordu
      const showOuterOutline = outlineOn && parsed.outerOpacity > 0; // DÜZELTME: bkz. yukarıdaki iç kol notu
      const arms = crosshairArmRects(cx, cy, hLen, vLen, thick, off, rx).map((a) => ({ ...a, key: `out-${a.key}` }));
      arms.forEach((a) => {
        if (a.w <= 0 || a.h <= 0) return;
        if (showOuterOutline) segs.push(<rect key={`${a.key}-out`} x={a.x - outlineThick} y={a.y - outlineThick} width={a.w + outlineThick * 2} height={a.h + outlineThick * 2} fill="#000000" opacity={parsed.outlineOpacity} rx={rx} />);
        segs.push(<rect key={a.key} x={a.x} y={a.y} width={a.w} height={a.h} fill={parsed.color} opacity={parsed.outerOpacity} rx={rx} />);
      });
    }
  }

  const dotR = parsed.dot ? Math.max(Math.max(parsed.dotSize, 0) * SCALE * 0.4, MIN_DOT_R) : 0;
  const hasAnything = segs.length > 0 || dotR > 0;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "hidden" }}>
      {segs}
      {dotR > 0 && outlineOn && parsed.dotOpacity > 0 && <circle cx={cx} cy={cy} r={dotR + outlineThick} fill="#000000" opacity={parsed.outlineOpacity} />}
      {dotR > 0 && <circle cx={cx} cy={cy} r={dotR} fill={parsed.color} opacity={parsed.dotOpacity} />}
      {!hasAnything && <circle cx={cx} cy={cy} r={1.5} fill={parsed.color} opacity={0.35} />}
    </svg>
  );
}

// ==========================================
// GERÇEK ORANLI NİŞANGAH (HARİTADA ÖNİZLEME İÇİN)
// ==========================================
// YUKARIDAKİ CrosshairPreviewSVG bilerek "büyütülmüş/okunabilir ikon" mantığıyla çalışıyor —
// küçük kartlarda görünürlük için doğru bir tercih. AMA haritada önizleme penceresi için YANLIŞ:
// orada amaç "bu kod oyunda gerçekten hangi ORANLARDA görünür" sorusuna doğru cevap vermek.
// Bunun için dört şeyi birden değiştirmemiz gerekiyordu:
//
// 1) SABİT/DOĞRU ORAN: Valorant crosshair kodundaki sayılar (kalınlık/uzunluk/boşluk/nokta
//    boyutu) 1920x1080 (16:9) referans çözünürlüğünde YAKLAŞIK 1 birim = 1 piksel şeklinde
//    eşleşiyor. SVG'nin viewBox'ını 1920x1080 yaparak bunu temel alıyoruz: SVG, üzerine
//    bindirildiği harita görselinin boyutu ne olursa olsun (aspect-video = 16:9 olduğu sürece)
//    otomatik ve DOĞRU oranda küçülüyor/büyüyor. AYRICA sabit bir ZOOM çarpanı (bkz. aşağıda)
//    uygulanıyor — bu SADECE görünürlük için, ORANLARI bozmuyor (iki kat kalın olan bir çizgi
//    zoom sonrasında da hep iki kat kalın kalıyor). Deneme yapıp gördük ki gerçek 1:1 ölçekte
//    normal (kalınlık 1-2 birimlik) bir crosshair, ~600px'lik önizleme kutusunda piksel-altına
//    düşüp TAMAMEN GÖRÜNMEZ oluyordu — bu bir "gerçekçilik" değil, kullanılamazlıktı. Valorant'ın
//    kendi ayarlar menüsündeki canlı önizlemesi de aynı sebepten crosshair'i büyütülmüş gösterir.
// 2) MINIMUM KALINLIK/YARIÇAP ZORLAMASI YOK: eski CrosshairPreviewSVG'deki gibi HER ince
//    çizgiyi aynı sabit minimuma eşitleyip birbirinden AYIRT EDİLEMEZ hale getirmiyoruz — ZOOM
//    tüm değerlere EŞİT ORANDA uygulanıyor, yani ince bir çizgi kalın bir çizgiden hep daha ince
//    görünmeye devam ediyor, sadece ikisi de görünür hale geliyor.
// 3) OUTLINE (SİYAH DIŞ HAT): "o" (Outline Opacity) ve "t" (Outline Thickness) artık gerçekten
//    okunup her çizgi/nokta parçasının ARKASINA daha büyük siyah bir kopyası çiziliyor —
//    Valorant'ta outline her zaman siyahtır ve iç çizgi/dış çizgi/nokta için ORTAKTIR.
// 4) YATAY/DİKEY AYRI UZUNLUK ("0v"/"1v"): Valorant'ın crosshair menüsünde Uzunluk kutusunun
//    yanındaki "zincir" simgesi kapalıyken yatay (sol/sağ, "0l") ve dikey (üst/alt, "0v") kol
//    uzunluğu FARKLI olabiliyor. Artık ikisi de ayrı ayrı okunup uygulanıyor — önceden "0v" hiç
//    okunmadığı için yatay/dikey asimetrik crosshair'ler simetrik bir artıya dönüşüyordu.
//
// Hareket ("0m"/"1m"), ateş ("0f"/"1f") hatası bayrakları ve bunların çarpanları ("0s"/"1s",
// "0e"/"1e") artık parseCrosshairCode() içinde doğru okunuyor (bkz. ParsedCrosshair) ama
// BİLEREK burada çizilmiyor: bunlar sadece oyuncu hareket ederken/ateş ederken devreye giren
// dinamik bir genişlemeyi (ve genişliğini) kontrol eder; statik bir görselde bunu "doğru"
// simüle etmenin güvenilir bir yolu yok — yanlış bir genişleme uydurmaktansa hiç çizmemek
// tercih edildi.
function CrosshairAccurateSVG({ parsed }: { parsed: ParsedCrosshair }) {
  // 1920x1080 = 16:9 referans çözünürlüğü. Harita önizleme kutusu da (aspect-video) 16:9
  // olduğu için bu viewBox, kutunun gerçek piksel boyutu ne olursa olsun doğru oranda ölçekleniyor.
  const cx = 960, cy = 540;

  // DÜZELTME (bu turdaki asıl şikayet — "haritada önizlemede cross hiç görünmüyor"):
  // 1920x1080 referansında BİREBİR (1 birim = 1 piksel) ölçek matematiksel olarak doğruydu
  // AMA pratikte kullanılamazdı — önizleme kutusu ekranda genelde ~500-700px genişliğinde
  // (yani "gerçek" bir 1920px ekranın ~%30'u kadar), bu da kalınlığı 1-2 birim olan SIRADAN
  // bir pro crosshair'i piksel-altına (fiilen görünmez) düşürüyordu. Test kodunla (0t;2 vb.)
  // bunu doğruladım. Valorant'ın KENDİ ayarlar menüsündeki canlı crosshair önizlemesi de aynı
  // sebepten crosshair'i gerçek oyun-içi boyutundan belirgin şekilde BÜYÜTEREK gösterir — yoksa
  // kimse ince bir crosshair'i ayarlarken göremez. Aynı mantığı uyguluyoruz: ORANLAR birebir
  // korunuyor (kalınlığı 2 olan bir çizgi, kalınlığı 1 olandan HER ZAMAN 2 kat kalın görünür),
  // sadece her şey aynı anda sabit bir ZOOM kat büyütülüyor.
  // DÜZELTME: ZOOM=8 önceki turda "görünmüyor" sorununu çözmüştü ama bu sefer tam tersi
  // şikayet geldi ("haritadaki cross gösterimleri de biraz büyük gibi") — 6'ya düşürüldü,
  // hâlâ görünür ama daha az baskın.
  const ZOOM = 6;

  const outlineThick = Math.max(parsed.outlineThickness, 0) * ZOOM;
  const outlineOpacity = Math.max(Math.min(parsed.outlineOpacity, 1), 0);
  const hasOutline = outlineOpacity > 0 && outlineThick > 0;

  const shapes: React.ReactNode[] = [];

  // DÜZELTME (bu turdaki 2. bug — "0v"/"1v" hiç okunmuyordu): artık yatay (sol/sağ) kollar
  // için "hLen", dikey (üst/alt) kollar için AYRICA "vLen" alıyor — bkz. ParsedCrosshair.vLength.
  const pushArms = (keyPrefix: string, hLen: number, vLen: number, thick: number, off: number, opacity: number) => {
    if ((hLen <= 0 && vLen <= 0) || thick <= 0) return;
    // DÜZELTME ("crossların köşeleri boş kalıyor" — bkz. crosshairArmRects yorumu): kollar artık
    // merkeze doğru rx kadar uzatılarak oluşturuluyor, böylece rx yuvarlatması iç köşeleri
    // kırpsa bile komşu kolla tam örtüşme bozulmuyor.
    const rx = 0; // DÜZELTME: gerçek Valorant crosshair kolları keskin köşeli dikdörtgenlerdir, yuvarlatılmış "hap" görünümü hem gerçek oyundan farklı duruyordu hem de köşe boşluğu yanılsamasını büyütüyordu
    // DÜZELTME (GERÇEK BUG — gerçek oyun ekran görüntüleriyle kanıtlandı): outline, bu grubun
    // KENDİ opaklığından bağımsız çiziliyordu. "0a;0" (bu kol tamamen şeffaf) ama outline açık
    // olan kodlarda, renkli dolgu hiç görünmediği halde siyah dış hat yine de tam opaklıkla
    // çiziliyordu — "içi boş, sadece siyah çerçeveden ibaret hayalet kollar" ortaya çıkıyordu.
    const showOutlineHere = hasOutline && opacity > 0;
    const arms = crosshairArmRects(cx, cy, hLen, vLen, thick, off, rx).map((a) => ({ ...a, key: `${keyPrefix}-${a.key}` }));
    arms.forEach((a) => {
      if (a.w <= 0 || a.h <= 0) return; // örn. vLen=0 ise üst/alt kollar hiç çizilmez (sadece yatay çizgi kalır)
      if (showOutlineHere) {
        shapes.push(
          <rect key={`${a.key}-out`} x={a.x - outlineThick} y={a.y - outlineThick} width={a.w + outlineThick * 2} height={a.h + outlineThick * 2} fill="#000000" opacity={outlineOpacity} rx={rx} />
        );
      }
      shapes.push(<rect key={a.key} x={a.x} y={a.y} width={a.w} height={a.h} fill={parsed.color} opacity={opacity} rx={rx} />);
    });
  };

  if (parsed.innerLinesOn) {
    pushArms("in", Math.max(parsed.length, 0) * ZOOM, Math.max(parsed.vLength, 0) * ZOOM, Math.max(parsed.thickness, 0) * ZOOM, Math.max(parsed.offset, 0) * ZOOM, parsed.opacity);
  }
  if (parsed.outerLinesOn) {
    pushArms("out", Math.max(parsed.outerLength, 0) * ZOOM, Math.max(parsed.outerVLength, 0) * ZOOM, Math.max(parsed.outerThickness, 0) * ZOOM, Math.max(parsed.outerOffset, 0) * ZOOM, parsed.outerOpacity);
  }

  // Nokta boyutu ("z") ÇAP olarak yorumlanıyor, yarıçap için ikiye bölünüp aynı ZOOM ile büyütülüyor.
  const dotR = parsed.dot ? (Math.max(parsed.dotSize, 0) / 2) * ZOOM : 0;
  const hasAnything = shapes.length > 0 || dotR > 0;

  return (
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0 }}>
      {shapes}
      {dotR > 0 && hasOutline && parsed.dotOpacity > 0 && <circle cx={cx} cy={cy} r={dotR + outlineThick} fill="#000000" opacity={outlineOpacity} />}
      {dotR > 0 && <circle cx={cx} cy={cy} r={dotR} fill={parsed.color} opacity={parsed.dotOpacity} />}
      {!hasAnything && <circle cx={cx} cy={cy} r={2} fill={parsed.color} opacity={0.35} />}
    </svg>
  );
}

// "t" (üst seviye, "0t"/"1t" ile KARIŞTIRILMAMALI) — Outline Thickness (dış hat kalınlığı).
// "o" zaten vardı ama daha önce hiç kullanılmıyordu; gerçek anlamı Outline Opacity (dış hat
// opaklığı) — genel/nokta/çizgi opaklığıyla ilgisi yok, kendi başına bir ayardır.
const CROSSHAIR_KNOWN_KEYS = new Set([
  "c", "h", "f", "m", "s", "o", "u", "d", "z", "a", "t",
  "0b", "0t", "0l", "0o", "0a", "0f", "0m", "0v", "0s", "0g",
  "1b", "1t", "1l", "1o", "1a", "1m", "1f", "1v", "1s", "1g",
]);

const parseCrosshairCode = (code: string): ParsedCrosshair | null => {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim();

  // Artık herhangi bir profil slotuyla (0-9) başlayan kodlar kabul ediliyor, sadece "0;" değil.
  if (!/^\d;/.test(trimmed) || trimmed.length < 6 || !/^[0-9a-zA-Z;.\-]+$/.test(trimmed)) {
    return null;
  }

  const parts = trimmed.split(";").map((p) => p.trim());

  // Gerçek kodlarda "Primary" (asıl nişangah), "A" (ADS/nişan alırken) ve "S" (Sprey/spray)
  // diye AYRI bölümler var ve hepsi "c", "o", "d" gibi AYNI kısa anahtarları tekrar kullanıyor.
  // Sadece Primary bölümünü (P'den, bir sonraki A veya S bölüm başlığına kadar) taramazsak,
  // ADS/Sprey ayarları yanlışlıkla ana nişangaha karışır.
  const pIndex = parts.indexOf("P");
  const scanStart = pIndex >= 0 ? pIndex + 1 : 0;
  let scanEnd = parts.length;
  for (let i = scanStart; i < parts.length; i++) {
    if (parts[i] === "A" || parts[i] === "S") { scanEnd = i; break; }
  }

  const map: Record<string, string> = {};
  for (let i = scanStart; i < scanEnd - 1; i++) {
    if (CROSSHAIR_KNOWN_KEYS.has(parts[i]) && !(parts[i] in map)) {
      map[parts[i]] = parts[i + 1];
    }
  }

  const colorIndex = map["c"];
  let color = colorIndex !== undefined ? (CROSSHAIR_COLOR_MAP[colorIndex] || "#ffffff") : "#ffffff";
  // colorIndex "8" özel/manuel renk demektir, gerçek renk "u" anahtarında hex (RRGGBBAA) olarak gelir
  if (colorIndex === "8" && map["u"] && /^[0-9a-fA-F]{6,8}$/.test(map["u"])) {
    color = `#${map["u"].slice(0, 6)}`;
  }

  const num = (key: string, fallback: number) => (map[key] !== undefined ? parseFloat(map[key]) : fallback);
  // DÜZELTME (ASIL BUG, güncellendi): "o" anahtarı GENEL opaklık DEĞİL — resmi/topluluk
  // dokümantasyonuna göre "Outline Opacity" (dış hat/kontur opaklığı). Önceden bunu tüm
  // renk/nokta opaklığıyla çarpıyordum; birçok kodda "o" düşük bir değer taşıdığında (outline'ı
  // soluk yapmak için) bütün nişangah yanlışlıkla soluklaşıyor ya da kayboluyordu. Bu yüzden bir
  // süre "o" HİÇ kullanılmadı. Artık outline desteği eklendiği için "o" (ve kalınlığı için "t")
  // TEKRAR kullanılıyor — ama SADECE outline için, genel/nokta opaklığıyla hiçbir ilgisi yok
  // (bkz. aşağıdaki outlineOpacity/outlineThickness).

  return {
    color,
    length: num("0l", 4),
    offset: num("0o", 2),
    thickness: num("0t", 2),
    opacity: num("0a", 1),
    dot: map["d"] === "1",
    // DÜZELTME (ARAŞTIRMA SONUCU — ASIL "bambaşka bir cross çıkıyor" BUG'U): "0g"/"1g"
    // anahtarlarının çizgi göster/gizle anlamına geldiği yanlış bir varsayımdı — onlarca
    // gerçek pro/topluluk kodunu tek tek incelediğimde (TenZ, nAts, Zekken, Steve/Minecraft,
    // Small Dot, Alfajer, Boo, Derke...) çizgi görünürlüğünü HER ZAMAN "0b"/"1b" belirliyor;
    // "0g"/"1g" bunlardan bağımsız, görünürlükle alakasız başka bir ayar (muhtemelen atış
    // hatası göstergesiyle ilgili kozmetik bir bayrak) ve bazen "0b;1" (göster) ile AYNI ANDA
    // "0g;0" olarak birlikte geçiyor. Önceki kod "0g" varsa ona öncelik veriyordu — bu yüzden
    // 0b;1;1b;1 (göster!) olan tamamen geçerli bir kod, sadece yanında 0g;0;1g;0 de varsa
    // TAMAMEN GÖRÜNMEZ oluyordu. Artık SADECE "0b"/"1b" okunuyor, "0g"/"1g" görünürlük için
    // hiç kullanılmıyor.
    innerLinesOn: map["0b"] !== "0",
    outerLinesOn: map["1b"] === "1",
    outerLength: num("1l", num("0l", 4)),
    outerOffset: num("1o", num("0o", 2)),
    outerThickness: num("1t", num("0t", 2)),
    outerOpacity: num("1a", num("0a", 1)),
    // DÜZELTME (BU MESAJDAKİ ASIL BUG): "0v"/"1v" — dikey (üst/alt kol) uzunluğu. Valorant
    // menüsünde Uzunluk kutusunun yanındaki "zincir" simgesi AÇIKKEN yatay=dikey (simetrik,
    // 0v hiç yollanmaz ya da 0l ile aynıdır); KAPALIYKEN 0l SADECE yatay (sol/sağ) kolu, 0v
    // SADECE dikey (üst/alt) kolu belirler — ikisi FARKLI olabilir. Bunu hiç okumadan hep "0l"yi
    // 4 kola da uygulamak, yatayı/dikeyi asimetrik olan (özellikle "uzun yatay çizgi" tarzı)
    // crosshair'leri düz, simetrik bir artıya indirgeyip alakasız gösteriyordu. "0v" kodda yoksa
    // "0l" ile aynı kabul edilir (eski/basit, zincirli kodlarla tam geriye dönük uyumlu).
    vLength: num("0v", num("0l", 4)),
    outerVLength: num("1v", num("1l", num("0l", 4))),
    // Nokta kendi opaklığı ("a") ve boyutuyla ("z"), iç çizgi opaklığından ("0a") bağımsız çizilir.
    dotOpacity: num("a", 1),
    dotSize: num("z", 2),
    // "o" anahtarı yoksa outline KAPALI kabul ediyoruz (0) — basit/kısa kodların büyük
    // çoğunluğu outline kullanmıyor, bu doğru ve güvenli varsayılan. "t" yoksa ve outline
    // açıksa varsayılan kalınlık 1 (oyunun kendi varsayılanıyla aynı).
    outlineOpacity: num("o", 0),
    outlineThickness: num("t", 1),
    innerMovementError: map["0m"] === "1",
    innerFiringError: map["0f"] === "1",
    outerMovementError: map["1m"] === "1",
    outerFiringError: map["1f"] === "1",
  };
};

// Nişangah rütbe seviyeleri için premium görsel stiller (tüm rütbelerle genişletildi, sırayla)
const RANK_STYLES: Record<string, { label: string; gradient: string; glow: string; border: string; icon: string; order: number }> = {
  // YENİ: "Derecesiz" (Unranked) — henüz o sezon dereceye girmemiş / rütbesi gösterilmeyen
  // oyuncular için. Sıralamada en altta (order: 0), Demir'in bile altında yer alıyor.
  unranked: { label: "DERECESİZ", gradient: "from-neutral-500 via-neutral-400 to-neutral-300", glow: "shadow-[0_0_15px_rgba(163,163,163,0.2)]", border: "border-neutral-400/30", icon: "○", order: 0 },
  iron: { label: "DEMİR", gradient: "from-zinc-500 via-zinc-400 to-zinc-300", glow: "shadow-[0_0_20px_rgba(161,161,170,0.25)]", border: "border-zinc-400/40", icon: "◇", order: 1 },
  bronze: { label: "BRONZ", gradient: "from-amber-800 via-amber-600 to-amber-500", glow: "shadow-[0_0_20px_rgba(180,120,60,0.3)]", border: "border-amber-700/40", icon: "◆", order: 2 },
  silver: { label: "GÜMÜŞ", gradient: "from-slate-300 via-slate-200 to-slate-100", glow: "shadow-[0_0_20px_rgba(203,213,225,0.3)]", border: "border-slate-300/40", icon: "◆", order: 3 },
  gold: { label: "ALTIN", gradient: "from-amber-400 via-yellow-400 to-amber-300", glow: "shadow-[0_0_25px_rgba(251,191,36,0.3)]", border: "border-amber-400/40", icon: "●", order: 4 },
  plat: { label: "PLATİN", gradient: "from-teal-300 via-cyan-200 to-teal-200", glow: "shadow-[0_0_25px_rgba(94,234,212,0.3)]", border: "border-teal-300/40", icon: "◈", order: 5 },
  diamond: { label: "ELMAS", gradient: "from-cyan-300 via-blue-300 to-cyan-200", glow: "shadow-[0_0_25px_rgba(103,232,249,0.3)]", border: "border-cyan-300/40", icon: "◈", order: 6 },
  ascendant: { label: "YÜCELİK", gradient: "from-emerald-400 via-teal-300 to-emerald-300", glow: "shadow-[0_0_25px_rgba(52,211,153,0.3)]", border: "border-emerald-400/40", icon: "▲", order: 7 },
  immortal: { label: "ÖLÜMSÜZLÜK", gradient: "from-red-400 via-pink-400 to-red-300", glow: "shadow-[0_0_25px_rgba(248,113,113,0.3)]", border: "border-red-400/40", icon: "◆", order: 8 },
  radiant: { label: "RADYANT", gradient: "from-yellow-200 via-cyan-200 to-yellow-100", glow: "shadow-[0_0_30px_rgba(250,240,180,0.35)]", border: "border-yellow-200/40", icon: "✦", order: 9 },
};

const getRankStyle = (rank: string) =>
  RANK_STYLES[rank] || { label: rank.toUpperCase(), gradient: "from-white/60 to-white/30", glow: "shadow-none", border: "border-white/10", icon: "•", order: 0 };

// Rütbe logoları (public klasöründeki dosyalarla eşleştirme) - YENİ EKLENDİ
const RANK_LOGO_MAP: Record<string, string> = {
  // YENİ: kullanıcı /public klasörüne "derecesiz.png" dosyasını ekledi — Derecesiz (Unranked)
  // rütbesi için hem Türkçe hem İngilizce yazımları eşleştiriyoruz.
  derecesiz: "/derecesiz.png", unranked: "/derecesiz.png",
  demir: "/demir.png", iron: "/demir.png",
  bronz: "/bronz.png", bronze: "/bronz.png",
  silver: "/silver.png", gumus: "/silver.png",
  gold: "/gold.png", altin: "/gold.png",
  plat: "/plat.png", platin: "/plat.png", platinum: "/plat.png",
  dia: "/dia.png", diamond: "/dia.png", elmas: "/dia.png",
  ascendant: "/yüce.png", yuce: "/yüce.png",
  immortal: "/immo.png", immo: "/immo.png", olumsuzluk: "/immo.png",
  radiant: "/radiant.png", radyant: "/radiant.png",
};

// Herhangi bir rütbe metnini ("GOLD 2", "ALTIN", "Dia" vb.) logo dosyasına çeviren yardımcı fonksiyon - YENİ EKLENDİ
const getRankLogo = (rankLabel: string | undefined | null): string | null => {
  if (!rankLabel) return null;
  const key = rankLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  return RANK_LOGO_MAP[key] || null;
};

// "8.44K" gibi beğeni metinlerini sıralanabilir sayıya çeviren yardımcı fonksiyon (yeni eklendi)
const parseLikes = (likes: string): number => {
  const cleaned = likes.trim().toUpperCase();
  if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1000;
  if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1000000;
  return parseFloat(cleaned) || 0;
};

interface LobbyItem {
  id: number;
  nick: string;
  mic: boolean;
  minRank: string;
  maxRank: string;
  time: string;
  code: string;
  mode: string;
  region: string;
  slots?: string;
  message?: string;
  playerCount?: number;
  rankCutoff?: boolean;
  createdAt?: number;
  avatarId?: string | null;
}

// Zaman damgasını "X dakika önce" gibi canlı güncellenen bir metne çeviren yardımcı fonksiyon
// DÜZELTME: eksik modlar tamamlandı — artık Valorant'ın oyun içi "Bir Sıra Seç" ekranındaki
// TÜM sıralar burada var (kullanıcının paylaştığı referans ekran görüntüsündeki isimlerle
// birebir aynı Türkçe etiketler kullanıldı).
const GAME_MODE_LABELS: Record<string, string> = {
  "RANKED": "Rekabete Dayalı",
  "UNRATED": "Derecesiz",
  "SWIFTPLAY": "Akın",
  "COMBAT2V2": "Çarpışma: 2'ye 2",
  "SPIKE RUSH": "Tam Gaz",
  "DEATHMATCH": "Ölüm Kalım Savaşı",
  "TEAM DEATHMATCH": "Takımlı Ölüm Kalım Savaşı",
  "SPIKE ATTACK": "Spike'a Hücum",
  "ESCALATION": "Tırmanış",
  "PREMIER": "Premier",
  "CUSTOM": "Özel",
};

// Riot'un maç detayında döndürdüğü gerçek queueId değerlerini okunabilir isme çevirir
const QUEUE_ID_LABELS: Record<string, string> = {
  competitive: "Dereceli",
  unrated: "Derecesiz",
  spikerush: "Spike Rush",
  deathmatch: "Ölüm Maçı",
  swiftplay: "Hızlı Oyun",
  premier: "Premier",
  hurm: "Team Deathmatch",
  onefa: "Escalation",
  ggteam: "Escalation",
  "": "Özel Oyun",
};
const getQueueLabel = (queueId: string | null | undefined): string =>
  QUEUE_ID_LABELS[(queueId || "").toLowerCase()] || (queueId ? queueId : "Özel Oyun");

// Maç zamanını "X saat önce" gibi okunabilir bir metne çevirir
const getMatchTimeAgo = (gameStartMillis: number | null | undefined): string => {
  if (!gameStartMillis) return "";
  const diffMs = Date.now() - gameStartMillis;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
};

const getRelativeTime = (createdAt: number | undefined): string => {
  if (!createdAt) return "az önce";
  const diffMs = Date.now() - createdAt;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
};

// AYNI ÇAKIŞMA SORUNU BURADA DA VARDI: örnek lobilerin ID'leri (1,2,3...) Supabase'den
// gelen gerçek lobilerle çakışıyordu ("bir kodu kopyalayınca başka bir kartta da
// kopyalandı yazması" bu yüzdendi). 800000+ aralığına taşıdık.
const TEAM_FINDER_DATA: LobbyItem[] = [
  { id: 800001, nick: "Mamba Mentality#SRaw", mic: true, minRank: "Plat", maxRank: "Dia", time: "0dk", code: "RCB605", mode: "RANKED", region: "TR", playerCount: 2, createdAt: Date.now() - 2 * 60000 },
  { id: 800002, nick: "S1lentMe#No1", mic: true, minRank: "Gold", maxRank: "Plat", time: "0dk", code: "CXE141", mode: "RANKED", region: "TR", playerCount: 1, createdAt: Date.now() - 4 * 60000 },
  { id: 800003, nick: "Yu9suf3504#20109", mic: false, minRank: "Silver", maxRank: "Gold", time: "0dk", code: "NPM005", mode: "RANKED", region: "TR", playerCount: 3, createdAt: Date.now() - 6 * 60000 },
  { id: 800004, nick: "NiloyanınFedaisi#3161", mic: false, minRank: "Silver", maxRank: "Gold", time: "0dk", code: "WKJ663", mode: "RANKED", region: "TR", playerCount: 1, createdAt: Date.now() - 9 * 60000 },
  { id: 800005, nick: "EVOO#4848", mic: true, minRank: "Plat", maxRank: "Dia", time: "1dk", code: "EDW248", mode: "RANKED", region: "TR", playerCount: 2, createdAt: Date.now() - 14 * 60000 },
  { id: 800006, nick: "Cavendish#mali", mic: true, minRank: "Gold", maxRank: "Plat", time: "1dk", code: "WZN541", mode: "RANKED", region: "TR", playerCount: 4, createdAt: Date.now() - 21 * 60000 },
  { id: 800007, nick: "DESTORAT1#0905", mic: false, minRank: "Bronze", maxRank: "Silver", time: "1dk", code: "VBS5KK", mode: "RANKED", region: "TR", playerCount: 1, createdAt: Date.now() - 33 * 60000 }
];
// PERFORMANS İÇİN İZOLE EDİLMİŞ CANLI BİLEŞENLER
// Bunlar kendi state'lerini kendi içlerinde tutar, böylece her saniye/periyotta
// SADECE bu küçük bileşen yeniden render olur — tüm sayfa (animasyonlarıyla birlikte) değil.
// Bu, önceki versiyondaki "kasma" sorununun asıl kaynağıydı.

function SeasonCountdown() {
  const [text, setText] = useState("—");
  useEffect(() => {
    const compute = () => {
      // DÜZELTME: eskiden "2026-08-25" gibi rastgele/yanlış bir tarih vardı.
      // Riot'un resmi takvimine göre VALORANT Season 2026 - Act 4, 19 Ağustos 2026'da
      // (00:00 UTC) bitiyor. Yeni Act başladığında bu tarihi elle güncellemen gerekir —
      // Riot bunun için herkese açık bir API sunmuyor, o yüzden otomatik çekilemiyor.
      const end = new Date("2026-08-19T00:00:00Z");
      const diffMs = Math.max(0, end.getTime() - Date.now());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      setText(`${days}g ${hours}s ${mins}dk`);
    };
    compute();
    const id = setInterval(compute, 30000); // saniyede bir yerine 30sn'de bir - gereksiz render'ları önler
    return () => clearInterval(id);
  }, []);
  return <>{text}</>;
}

// DÜZELTME: bu bileşen önceden tamamen rastgele bir sayı üretip her 6 saniyede
// anlamsızca oynatıyordu (gerçek hiçbir veriyle bağlantısı yoktu). Artık gerçek
// arama sayısını /api/site-stats'tan çekiyor. Bu route eklenmeden sessizce
// "—" gösterir, sahte veri üretmez.
function LivePlayerCount({ base }: { base: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site-stats");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.searchCount === "number") setCount(data.searchCount);
      } catch {
        // /api/site-stats henüz eklenmemiş olabilir, "—" göstermeye devam eder
      }
    })();
  }, [base]);
  return <>{count !== null ? count.toLocaleString("tr-TR") : "—"}</>;
}

function RelativeTimeText({ createdAt }: { createdAt: number | undefined }) {
  const [text, setText] = useState("—");
  useEffect(() => {
    const compute = () => setText(getRelativeTime(createdAt));
    compute();
    const id = setInterval(compute, 20000); // 20sn'de bir yeterli, dakika hassasiyeti gerekmiyor
    return () => clearInterval(id);
  }, [createdAt]);
  return <>{text}</>;
}

function PageContent() {
  // STATES
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  // DÜZELTME (KESİN TİTREMESİZ ÇÖZÜM): activeTab artık doğrudan URL'nin ?tab= parametresinden
  // okunuyor. useSearchParams() Next.js'te hem SUNUCUDA hem İSTEMCİDE aynı URL'yi okur, bu yüzden
  // sunucunun ürettiği HTML ile istemcinin ilk render'ı HER ZAMAN birebir uyuşur — ne hydration
  // hatası ne de "önce ana sayfa göster, sonra doğru sekmeye zıpla" titremesi olur. F5 attığında
  // adres çubuğunda zaten ?tab=crosshairs varsa (aşağıdaki useEffect bunu garanti ediyor), sayfa
  // DAHA İLK KARESİNDEN itibaren doğrudan o sekmede açılır — ara bir yükleme/spinner ekranına
  // artık hiç gerek yok, eski `tabReady` bekleme ekranı tamamen kaldırıldı.
  const [activeTab, setActiveTab] = useState(urlTab || "home");

  // Yalnızca URL'de HİÇ ?tab= yoksa (örn. biri siteyi ilk kez bookmark'tan/paylaşılan linkten
  // ?tab olmadan açtıysa) localStorage'a bakılıp son kaldığı sekme hatırlanıyor. F5 senaryosunda
  // (URL'de zaten ?tab= varken) bu blok hiç devreye girmiyor, bu yüzden asla titreme yaratmıyor.
  // DÜZELTME ("siteyi kapatıp tekrar açınca hâlâ eski sekmede açılıyor" — SACMA olduğu doğru,
  // bu bir bug'dı): burada localStorage kullanmak YANLIŞTI — localStorage TARAYICI KAPANSA BİLE
  // kalıcı kalır, yani biri siteyi tamamen kapatıp GÜNLER SONRA tekrar (?tab'siz bir bağlantıyla)
  // açsa bile son kaldığı sekmeyi "hatırlayıp" oraya atlıyordu. Oysa istenen davranış: F5 (aynı
  // sekme/oturum içinde sayfa yenileme) → konumu koru; siteyi TAMAMEN kapatıp yeniden aç → ana
  // sayfadan başla. Bu tam olarak sessionStorage'ın yaptığı şey: aynı tarayıcı sekmesi içinde
  // F5'te KORUNUR, ama o sekme/pencere kapatılıp yeni bir sekmede site tekrar açıldığında
  // SIFIRLANIR. (F5 senaryosunda zaten URL'de ?tab= olduğu için bu blok hiç devreye girmiyor —
  // bu sadece "?tab olmadan bir açılış" durumunu, yani gerçekten yeni bir ziyareti kapsıyor.)
  useEffect(() => {
    if (urlTab) return;
    try {
      const savedTab = window.sessionStorage.getItem("infinity_active_tab");
      if (savedTab && savedTab !== "home") setActiveTab(savedTab);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem("infinity_active_tab", activeTab);
      const url = new URL(window.location.href);
      if (activeTab === "home") url.searchParams.delete("tab");
      else url.searchParams.set("tab", activeTab);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, [activeTab]);
  const [showResult, setShowResult] = useState(false);
  const [copiedRiotId, setCopiedRiotId] = useState(false); // YENİ: profil kartındaki Riot ID kopyalama geri bildirimi
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const [viewMode, setViewMode] = useState("player"); 
  const [playerName, setPlayerName] = useState("");
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  // Puanlama sistemi: doğru cevap = 30 taban puan + kalan süreye göre hız bonusu (0-20,
  // yani en hızlı cevap toplamda 50 puan alır), yanlış/süre dolması = -10 puan.
  const [pointsEarned, setPointsEarned] = useState(0);
  const [lastQuestionPoints, setLastQuestionPoints] = useState<number | null>(null);
  const QUESTION_SECONDS = 15;
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Oturum bazlı giriş sistemi (gerçek kalıcı hesap için backend/veritabanı gerekir - bu client-side bir simülasyondur)
  // DÜZELTME: giriş artık localStorage'da saklanıyor, F5 / sayfa yenilemede kaybolmuyor.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginWarning, setLoginWarning] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false); // YENİ: sağ üstteki hesap butonu artık direkt çıkış yapmıyor, menü açıyor
  const [loginSuccessToast, setLoginSuccessToast] = useState(false); // YENİ: giriş yapılınca kullanıcı fark etsin diye bildirim
  const [loginModalError, setLoginModalError] = useState(""); // YENİ: giriş modalında gerçek doğrulama hatası
  const [loginModalLoading, setLoginModalLoading] = useState(false); // YENİ: giriş modalında Riot API doğrulaması sürerken
  // DÜZELTME (kilit ikonu "yanıp sönmesi"): localStorage sunucuda hiç okunamadığı için ilk
  // boyanan HTML'de isLoggedIn her zaman false'tur — bu da giriş yapmış kullanıcılara bile
  // kısacık bir "kilitli" ikonu gösterip hemen kaldırıyordu (rahatsız edici titreme). Artık
  // gerçek kontrol bitene (authChecked=true) kadar kilit ikonu HİÇ gösterilmiyor; kontrol
  // bitince (neredeyse anında, boyamadan önce) sadece gerçekten giriş yapılmamışsa çıkıyor.
  const [authChecked, setAuthChecked] = useState(false);

  // Sayfa ilk açıldığında (F5 dahil) daha önce kaydedilmiş girişi localStorage'dan geri yükle.
  // DÜZELTME: bu da artık useLayoutEffect — böylece giriş durumu, aktif sekmeyle AYNI anda,
  // ilk boyamadan önce geri yükleniyor. Böylece "find-team" gibi girişe bağlı bir sekme
  // geri yüklenirken bir an için "sanki giriş yapılmamış" gibi bir ara durum görünmüyor.
  useLayoutEffect(() => {
    try {
      const savedUser = window.localStorage.getItem("infinity_current_user");
      if (savedUser) {
        setCurrentUser(savedUser);
        setIsLoggedIn(true);
      }
    } catch {}
    setAuthChecked(true);
  }, []);

  // Yardımcı fonksiyonlar: giriş yap / çıkış yap — hem state'i hem localStorage'ı günceller.
  const loginUser = (name: string) => {
    setCurrentUser(name);
    setIsLoggedIn(true);
    try { window.localStorage.setItem("infinity_current_user", name); } catch {}
  };
  const logoutUser = () => {
    setCurrentUser("");
    setIsLoggedIn(false);
    try { window.localStorage.removeItem("infinity_current_user"); } catch {}
  };

  // ==========================================
  // AVATAR SİSTEMİ — GÜNCELLENDİ
  // ==========================================
  // DÜZELTME: emoji tabanlı sahte avatarlar kaldırıldı. Artık /public klasörüne eklediğin
  // GERÇEK görseller kullanılıyor. MEME kategorisi tamamen kaldırıldı, sadece ANİME (6) ve
  // VALORANT (5) kaldı. Dosya adları senin attığın ekran görüntüsündeki isimlerle BİREBİR
  // aynı olmalı — bu dosyaları projenin `public/` klasörünün KÖKÜNE (public/anime1.jfif,
  // public/valopp1.webp gibi) koyman yeterli, kod tarafında başka hiçbir şey değişmiyor.
  type AvatarItem = { id: string; img: string; ring: string };

  // YENİ: herkesin başlangıçta sahip olduğu standart/varsayılan avatar. Artık "avatar seçilmedi"
  // diye baş harfli bir daireye düşülmüyor — herkes bununla başlıyor, istersen değiştiriyorsun.
  // Kalıcılık zaten selectedAvatar'ın kendisi ile sağlanıyor: kullanıcı bir şey SEÇMEDİYSE
  // state hep bu sabit objede kalır (localStorage'da hiçbir şey yazılmaz), SEÇTİYSE seçtiği
  // kalıcı olarak localStorage'a yazılıp F5'te geri yükleniyor. Yani standart.jpg'nin
  // "F5'e kalıcı çözümü" aslında budur: o bir varsayılan sabit, kaybolacak bir state değil.
  const DEFAULT_AVATAR: AvatarItem = { id: "default", img: "/standart.jpg", ring: "from-white/20 to-white/5" };

  const AVATAR_CATEGORIES: { label: string; items: AvatarItem[] }[] = [
    {
      label: "ANİME",
      items: [
        { id: "anime1", img: "/anime1.jfif", ring: "from-slate-300 to-slate-500" },
        { id: "anime2", img: "/anime2.jfif", ring: "from-pink-300 to-pink-500" },
        { id: "anime3", img: "/anime3.jfif", ring: "from-red-400 to-red-600" },
        { id: "anime4", img: "/anime4.jfif", ring: "from-indigo-300 to-indigo-500" },
        { id: "anime5", img: "/anime5.jfif", ring: "from-orange-400 to-red-500" },
        { id: "anime6", img: "/anime6.jfif", ring: "from-cyan-300 to-blue-400" },
      ],
    },
    {
      label: "VALORANT",
      items: [
        { id: "val1", img: "/valopp1.webp", ring: "from-[#ff4655] to-red-700" },
        { id: "val2", img: "/valopp2.jpg", ring: "from-slate-400 to-slate-600" },
        { id: "val3", img: "/valopp3.jpg", ring: "from-yellow-300 to-amber-500" },
        { id: "val4", img: "/valopp4.jpg", ring: "from-cyan-300 to-teal-500" },
        { id: "val5", img: "/valopp5.jpg", ring: "from-purple-400 to-purple-700" },
      ],
    },
  ];
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarItem>(DEFAULT_AVATAR);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  // YENİ: footer'daki "Gizlilik Politikası / Kullanım Şartları / Destek" butonları artık
  // gerçekten çalışıyor — hangisine basıldıysa onu bir pencerede gösteriyor.
  const [legalModalTab, setLegalModalTab] = useState<"privacy" | "terms" | "support" | null>(null);

  // YENİ: verilen avatarId'ye karşılık gelen görsel+renk paletini bulur (liderlik tablosu,
  // lobi kartları gibi başka yerlerde avatar göstermek için). Artık ASLA null dönmüyor —
  // bulamazsa herkesin başlangıç avatarı olan DEFAULT_AVATAR'a düşüyor, baş harfli daireye değil.
  const findAvatarById = (id?: string | null): AvatarItem => {
    if (!id) return DEFAULT_AVATAR;
    for (const cat of AVATAR_CATEGORIES) {
      const found = cat.items.find((i) => i.id === id);
      if (found) return found;
    }
    return DEFAULT_AVATAR;
  };

  // DÜZELTME (avatar F5'te titriyor / önce standarta dönüp sonra eski avatara geçiyor):
  // bu normal useEffect boyamadan SONRA çalışıyordu — yani kullanıcı bir an için varsayılan
  // (standart.jpg) avatarı GERÇEKTEN görüyordu, sonra kayıtlı avatara geçiş oluyordu. Aktif
  // sekme/giriş durumu için yapılan düzeltmenin AYNISI burada da gerekiyor: useLayoutEffect
  // boyamadan ÖNCE, senkron çalışıyor — kullanıcı artık standart hali hiç görmüyor, direkt
  // kayıtlı avatarıyla açılıyor.
  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem("infinity_avatar");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Eski (emoji tabanlı) kayıtlarla uyumluluk: "img" alanı yoksa varsayılana dön.
        if (parsed && parsed.img) setSelectedAvatar(parsed);
      }
    } catch {}
  }, []);

  const chooseAvatar = (item: AvatarItem) => {
    setSelectedAvatar(item);
    try { window.localStorage.setItem("infinity_avatar", JSON.stringify(item)); } catch {}
    setIsAvatarModalOpen(false);
    // DÜZELTME: artık avatar değişir değişmez veritabanına da yazılıyor — önceden sadece
    // yarışma bitince gönderiliyordu, bu yüzden başkaları senin eski avatarını görmeye
    // devam ediyordu (kendi tarayıcında güncel görünse bile). "avatarOnly: true" ile
    // skору dokunmadan sadece avatar güncelleniyor.
    if (currentUser) {
      fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: currentUser, avatarId: item.id, avatarOnly: true }),
      }).catch(() => {});
    }
  };

  // Canlı liderlik tablosu (oturum boyunca gerçek oynayan kullanıcıları da içerir)
  const [liveLeaderboard, setLiveLeaderboard] = useState(LEADERBOARD_DATA);

  // Liderlik tablosunu sayfa açılır açılmaz Supabase'den çeker — artık F5'te kaybolmaz,
  // herkes aynı listeyi görür. /api/leaderboard route'u eklenmeden bu sessizce başarısız olur
  // (mevcut boş liste ile devam eder), site bu yüzden çökmez.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.players)) setLiveLeaderboard(data.players);
      } catch {
        // /api/leaderboard henüz eklenmemiş olabilir, sorun değil, boş liste ile devam eder
      }
    })();
  }, []);

  // Arama kutusu için canlı öneri listesi
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [crosshairSearch, setCrosshairSearch] = useState("");
  const [sortType, setSortType] = useState("upvotes");
  const [tierFilter, setTierFilter] = useState("all"); // yeni eklendi: rütbeye göre filtreleme
  // YENİ: nişangah listesi artık sayfa sayfa gösteriliyor (istek üzerine, her sayfada 20 tane) —
  // arama/filtre/sıralama değiştiğinde 1. sayfaya dönülüyor (aksi halde "sayfa 4"teyken filtre
  // değişip liste kısalırsa boş bir sayfada kalınabilirdi).
  const [crosshairPage, setCrosshairPage] = useState(1);
  const CROSSHAIRS_PER_PAGE = 20;
  // Arama/filtre/sıralama her değiştiğinde sayfa 1'e dönsün — yoksa "sayfa 4"teyken filtre
  // değişip liste kısalırsa boş bir sayfada kalınabilir.
  useEffect(() => {
    setCrosshairPage(1);
  }, [crosshairSearch, sortType, tierFilter]);
  const [customCrosshairs, setCustomCrosshairs] = useState<typeof CROSSHAIRS_DATA>([]); // yeni eklendi: kullanıcının eklediği nişangahlar
  // DÜZELTME (ASIL "F5'te navbar kayıyor" SEBEBİ — bu artık animasyonla alakalı değildi):
  // sekme açılır açılmaz önce SADECE 6 sabit örnek nişangah (CROSSHAIRS_DATA) render
  // ediliyordu, sonra Supabase'den gerçek eklenenler gelince liste birden ~20'ye fırlıyordu.
  // Bu ani içerik/yükseklik artışı sayfayı aşağı itip geri toparlıyordu — "titreme" aslında
  // buydu, sekme geçiş animasyonuyla alakası yoktu. Artık veri gelene kadar sabit boyutlu
  // bir iskelet (skeleton) gösteriliyor, gerçek liste TEK SEFERDE (zıplamadan) beliriyor.
  const [crosshairsLoading, setCrosshairsLoading] = useState(true);

  // Kullanıcıların eklediği nişangahları sayfa açılır açılmaz Supabase'den çeker.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/crosshairs");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.crosshairs)) {
          const mapped = data.crosshairs.map((c: any) => ({
            id: c.id, title: c.title, subtitle: c.subtitle, likes: String(c.likes ?? 0), rank: c.rank, color: c.color, code: c.code,
          }));
          setCustomCrosshairs(mapped);
          setLikeCounts((prev) => {
            const next = { ...prev };
            mapped.forEach((c: any) => { next[c.id] = Number(c.likes) || 0; });
            return next;
          });
        }
      } catch {
        // /api/crosshairs henüz eklenmemiş olabilir, sorun değil
      } finally {
        setCrosshairsLoading(false);
      }
    })();
  }, []);
  // Gerçek çalışan beğeni sistemi (oturum bazlı; kalıcı/herkes-ortak olması için backend gerekir)
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>(() => {
    const base: Record<number, number> = {};
    CROSSHAIRS_DATA.forEach((c) => { base[c.id] = parseLikes(c.likes); });
    return base;
  });
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  // DÜZELTME (Hydration Error): aynı sebepten (bkz. activeTab yorumu) burada da
  // localStorage artık lazy initializer içinde değil, mount sonrası bu effect'te okunuyor.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("infinity_liked_crosshairs");
      if (saved) setLikedIds(new Set(JSON.parse(saved)));
    } catch {}
  }, []);
  const toggleLike = (id: number) => {
    // ÖNEMLİ DÜZELTME: fetch/setLikeCounts gibi yan etkiler artık setLikedIds'in
    // updater fonksiyonu İÇİNDE değil, DIŞINDA çalışıyor. React 18 Strict Mode
    // (geliştirme modu) updater fonksiyonlarını bilerek 2 kez çağırır; içine
    // gömülü olan fetch/sayaç güncellemesi de bu yüzden 2 kez tetikleniyor ve
    // "bir beğeni 2 artıyor" hatasına sebep oluyordu. Artık sadece bir kez çalışır.
    const alreadyLiked = likedIds.has(id);
    const next = new Set(likedIds);
    if (alreadyLiked) next.delete(id); else next.add(id);
    setLikedIds(next);
    try { window.localStorage.setItem("infinity_liked_crosshairs", JSON.stringify([...next])); } catch {}
    setLikeCounts((counts) => ({ ...counts, [id]: Math.max(0, (counts[id] ?? 0) + (alreadyLiked ? -1 : 1)) }));
    // Kalıcı kayıt: Supabase'e beğeni değişikliğini gönder
    fetch("/api/crosshairs/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delta: alreadyLiked ? -1 : 1 }),
    }).catch(() => {});
  };
  const [isCrosshairModalOpen, setIsCrosshairModalOpen] = useState(false); // yeni eklendi: nişangah ekleme penceresi
  // YENİ: nişangah kartına tıklanınca açılan "haritada gör" penceresi — crosshair'i gerçek
  // 3 harita fotoğrafı (sunset/summit/bind) üzerinde, oyun içindeki gibi ortada gösterir.
  const [mapPreviewCrosshair, setMapPreviewCrosshair] = useState<{ code: string; title: string } | null>(null);
  const [mapPreviewIndex, setMapPreviewIndex] = useState(0);
  const [mapPreviewCopied, setMapPreviewCopied] = useState(false);
  const CROSSHAIR_PREVIEW_MAPS = [
    { name: "Sunset", img: "/sunset.avif" },
    { name: "Summit", img: "/summit.avif" },
    { name: "Bind", img: "/bind.webp" },
  ];
  const [crosshairCodeInput, setCrosshairCodeInput] = useState(""); // yeni eklendi: girilen ham nişangah kodu
  const [crosshairCodeStatus, setCrosshairCodeStatus] = useState<"idle" | "valid" | "invalid">("idle"); // yeni eklendi
  const [newCrosshairRank, setNewCrosshairRank] = useState("gold"); // yeni eklendi: logolu rütbe seçici için

  const [selectedGameMode, setSelectedGameMode] = useState("Tüm Modlar");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false); // YENİ: özel mod filtre dropdown'ı açık/kapalı
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [isLobbyModalOpen, setIsLobbyModalOpen] = useState(false);
  const [lobbies, setLobbies] = useState<LobbyItem[]>(TEAM_FINDER_DATA); // yeni eklendi: reaktif lobi listesi

  // DÜZELTME: lobi çekme mantığı artık ayrı, tekrar kullanılabilir bir fonksiyon
  // (fetchLobbies) — hem sayfa ilk açıldığında hem de "Yenile" butonuna basınca
  // AYNI fonksiyon çağrılıyor. Böylece "Yenile" artık window.location.reload() gibi
  // TÜM sayfayı yeniden yüklemiyor (bu da aktif sekmenin bir an için sıfırlanıp
  // "ana sayfaya atıyor" hissi vermesinin asıl sebebiydi) — sadece lobi listesini
  // sessizce tazeliyor, sekme ve giriş durumu hiç dokunulmadan kalıyor.
  const [isRefreshingLobbies, setIsRefreshingLobbies] = useState(false);
  const fetchLobbies = async () => {
    try {
      const res = await fetch("/api/lobbies");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.lobbies) && data.lobbies.length > 0) {
        const mapped: LobbyItem[] = data.lobbies.map((l: any) => ({
          id: l.id, nick: l.nick, minRank: l.min_rank, maxRank: l.max_rank, mode: l.mode,
          mic: l.mic, slots: l.slots, code: l.code, time: "", region: l.region,
          message: l.message || undefined, playerCount: l.player_count, rankCutoff: l.rank_cutoff,
          createdAt: new Date(l.created_at).getTime(),
          avatarId: l.avatar_id || null,
        }));
        setLobbies(mapped);
      }
    } catch {
      // /api/lobbies henüz eklenmemiş olabilir, mevcut örnek lobilerle devam eder
    }
  };

  // Lobileri sayfa açılır açılmaz Supabase'den çeker — F5'te kaybolmaz, herkes aynı listeyi görür.
  useEffect(() => {
    fetchLobbies();
  }, []);
  const [rankCutoff25, setRankCutoff25] = useState(false); // yeni eklendi: %25 rütbe sınırı toggle'ı
  const [newLobbyMode, setNewLobbyMode] = useState("RANKED"); // YENİ: lobi oluşturma modalındaki oyun modu artık controlled state
  const [newLobbyPlayerCount, setNewLobbyPlayerCount] = useState("1"); // YENİ: 2v2 modunda otomatik 1'e kilitlenebilsin diye controlled
  const [isLobbyModeDropdownOpen, setIsLobbyModeDropdownOpen] = useState(false); // YENİ: lobi oluşturma modalındaki özel mod dropdown'ı
  const [micRequired, setMicRequired] = useState(true); // yeni eklendi: lobi oluşturmada mikrofon gereksinimi
  const [lobbyCodeError, setLobbyCodeError] = useState("");

  // Riot ID doğrulama için yeni state'ler (gerçek Riot API'sine bağlanır)
  const [riotRegion, setRiotRegion] = useState("europe");
  const [riotResult, setRiotResult] = useState<{ gameName: string; tagLine: string; puuid: string } | null>(null);
  const [riotError, setRiotError] = useState("");
  // YENİ: "Son Aramalar" — daha önce baktığın Riot ID'leri hatırlar, arama kutusuna
  // tıklayınca hızlıca tekrar seçebilesin diye.
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("infinity_recent_searches");
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  }, []);
  const [riotLoading, setRiotLoading] = useState(false);

  // GERÇEK VERİ İÇİN YENİ STATE'LER (val-match-v1, val-content-v1, val-ranked-v1, val-status-v1)
  interface LastMatchStats {
    matchId: string; competitiveTier: number | null; agentId: string | null; mapId: string | null;
    kills: number; deaths: number; assists: number; kd: number; acs: number; won: boolean | null;
    queueId?: string | null; isRanked?: boolean; gameStartMillis?: number | null;
  }
  interface RiotContentData {
    activeActId: string | null; tiers: { tier: number; name: string; icon: string }[]; agents: { id: string; name: string }[]; maps: { id: string; name: string }[];
  }
  const [riotContent, setRiotContent] = useState<RiotContentData | null>(null);
  const [lastMatchStats, setLastMatchStats] = useState<LastMatchStats | null>(null);
  const [matchStatsLoading, setMatchStatsLoading] = useState(false);
  const [matchStatsError, setMatchStatsError] = useState("");
  const [realLeaderboard, setRealLeaderboard] = useState<{ rank: number; name: string; rr: number; wins: number }[] | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Sayfa açılınca içerik verisini (rütbe/ajan isimleri), sunucu durumunu ve gerçek liderlik tablosunu bir kez çek
  useEffect(() => {
    fetch(`/api/riot-content?region=${riotRegion}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setRiotContent(data);
          if (data.activeActId) {
            fetch(`/api/riot-leaderboard?region=${riotRegion}&actId=${data.activeActId}&size=5`)
              .then((r) => r.json())
              .then((lb) => { if (!lb.error) setRealLeaderboard(lb.players); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    fetch(`/api/riot-status?region=${riotRegion}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setServerOnline(data.online); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rütbe numarasını (competitiveTier) gerçek rütbe ismine çeviren yardımcı
  const getTierName = (tier: number | null): string => {
    if (tier === null || !riotContent) return "Bilinmiyor";
    return riotContent.tiers.find((t) => t.tier === tier)?.name || "Bilinmiyor";
  };
  // Ajan UUID'sini gerçek ajan ismine çeviren yardımcı
  const getAgentName = (agentId: string | null): string => {
    if (!agentId || !riotContent) return "Bilinmiyor";
    return riotContent.agents.find((a) => a.id.toLowerCase() === agentId.toLowerCase())?.name || "Bilinmiyor";
  };
  // Harita id'sini gerçek harita ismine çeviren yardımcı
  const getMapName = (mapId: string | null): string => {
    if (!mapId || !riotContent) return "Bilinmiyor";
    return riotContent.maps.find((m) => m.id.toLowerCase() === mapId.toLowerCase())?.name || "Bilinmiyor";
  };

  // HANDLERS
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed === "") return;

    if (!trimmed.includes("#")) {
      setRiotError("Lütfen 'İsim#TAG' formatında gir (Örn: Player#TR1)");
      setRiotResult(null);
      setShowResult(false);
      return;
    }

    const [gameName, tagLine] = trimmed.split("#");
    if (!gameName || !tagLine) {
      setRiotError("Lütfen 'İsim#TAG' formatında gir (Örn: Player#TR1)");
      return;
    }

    setRiotLoading(true);
    setRiotError("");
    setRiotResult(null);
    setShowResult(false);
    setLastMatchStats(null);
    setMatchStatsError("");

    try {
      const res = await fetch(
        `/api/riot-account?region=${riotRegion}&gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setRiotError(data.error || "Bu Riot ID bulunamadı. İsim ve TAG'i kontrol et.");
        setRiotLoading(false);
        return;
      }

      setRiotResult(data);
      setShowResult(true);
      setRiotLoading(false);

      // YENİ: bu aramayı "Son Aramalar" listesine ekle — bir dahaki sefere arama kutusuna
      // tıklayınca daha önce baktığın hesapları tekrar yazmadan görebilesin.
      try {
        const entry = `${gameName}#${tagLine}`;
        const raw = window.localStorage.getItem("infinity_recent_searches");
        const list: string[] = raw ? JSON.parse(raw) : [];
        const deduped = [entry, ...list.filter((x) => x.toLowerCase() !== entry.toLowerCase())].slice(0, 6);
        window.localStorage.setItem("infinity_recent_searches", JSON.stringify(deduped));
        setRecentSearches(deduped);
      } catch {}

      // Gerçek bir profil araması başarıyla yapıldı: site sayacını artır (yukarıdaki widget bunu okuyor)
      fetch("/api/site-stats", { method: "POST" }).catch(() => {});

      // Doğrulama başarılı: şimdi gerçek maç geçmişinden en son dereceli maçı bul ve istatistiklerini çek
      setMatchStatsLoading(true);
      try {
        const matchesRes = await fetch(`/api/riot-matches?region=${riotRegion}&puuid=${data.puuid}`);
        const matchesData = await matchesRes.json();

        if (!matchesRes.ok || !matchesData.history || matchesData.history.length === 0) {
          setMatchStatsError("Bu hesap için maç geçmişi bulunamadı (hiç maç oynanmamış olabilir).");
          setMatchStatsLoading(false);
          return;
        }

        // En son maçı al (Riot listeyi en yeniden en eskiye sıralı döner)
        const latestMatch = matchesData.history[0];
        const detailRes = await fetch(
          `/api/riot-match-detail?region=${riotRegion}&matchId=${latestMatch.matchId}&puuid=${data.puuid}`
        );
        const detailData = await detailRes.json();

        if (!detailRes.ok) {
          setMatchStatsError(detailData.error || "Maç detayı alınamadı.");
        } else {
          setLastMatchStats(detailData);
        }
      } catch (err) {
        setMatchStatsError("Maç verisine bağlanılamadı.");
      } finally {
        setMatchStatsLoading(false);
      }
    } catch (err) {
      setRiotError("Sunucuya bağlanılamadı. İnternetini veya API anahtarını kontrol et.");
      setRiotLoading(false);
    }
  }

  // GÜNLÜK OYNAMA SINIRI: puanlar artık toplamalı olduğu için (max değil) sınırsız
  // oynayıp puan biriktirmeyi engellemek gerekiyor. Günde 6 oyun hakkı — 3 çok az,
  // 15 çok fazla olurdu (özellikle soru havuzu sınırlıysa), 6 makul bir orta nokta.
  const DAILY_QUIZ_LIMIT = 6;
  // DÜZELTME: `toISOString()` tarihi HER ZAMAN UTC'ye çevirir. Türkiye (UTC+3) gibi bir
  // dilimde, örneğin gece 00:00-03:00 arası hâlâ "dünün" UTC tarihindesin — bu yüzden
  // gece yarısından sonra oynayınca limit yeni güne geçmiş gibi görünüp SIFIRLANMIYORDU.
  // Artık tarayıcının kendi yerel tarihi (yıl-ay-gün) kullanılıyor.
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const getPlaysToday = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem("infinity_quiz_plays");
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed.date === todayKey() ? parsed.count : 0;
    } catch { return 0; }
  };
  const [playsToday, setPlaysToday] = useState(0);
  useEffect(() => { setPlaysToday(getPlaysToday()); }, [isQuizStarted]);
  // YENİ: sekme gece yarısını geçerek açık kalırsa (F5 atılmadan) günlük hakkın yine de
  // doğru sıfırlanması için, sekmeye her geri dönüldüğünde günü tekrar kontrol ediyoruz.
  useEffect(() => {
    const recheck = () => setPlaysToday(getPlaysToday());
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, []);
  const registerDailyPlay = () => {
    try {
      const current = getPlaysToday();
      window.localStorage.setItem("infinity_quiz_plays", JSON.stringify({ date: todayKey(), count: current + 1 }));
      setPlaysToday(current + 1);
    } catch {}
  };

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (getPlaysToday() >= DAILY_QUIZ_LIMIT) return; // sınır doldu, buton zaten UI'da devre dışı bırakılıyor
    if (currentUser.trim() !== "") setIsQuizStarted(true);
  };

  // Her yeni soruda süreyi sıfırlar ve geri sayımı başlatır; cevaplanınca durur
  useEffect(() => {
    if (!isQuizStarted || quizFinished) return;
    setTimeLeft(QUESTION_SECONDS);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    quizTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (quizTimerRef.current) clearInterval(quizTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, isQuizStarted, quizFinished]);

  // Süre 0'a inip cevap verilmediyse otomatik olarak yanlış say (-10 puan)
  useEffect(() => {
    if (timeLeft === 0 && !isAnswered && isQuizStarted && !quizFinished) {
      setIsAnswered(true);
      setSelectedOption(null);
      setPointsEarned((p) => p - 10);
      setLastQuestionPoints(-10);
      playWrongSound();
    } else if (timeLeft > 0 && timeLeft <= 3 && !isAnswered && isQuizStarted && !quizFinished) {
      playTickSound(); // son 3 saniyede "tik tik tik" uyarı sesi
    }
  }, [timeLeft, isAnswered, isQuizStarted, quizFinished]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === QUIZ_QUESTIONS[currentQuestion].answer) {
      setScore((prev) => prev + 1);
      // DÜZELTME ("hızlı cevap verince bonus çalışmıyor, sabit 50 alınıyor"): yukarıdaki
      // puanlama açıklamasında ("100 puan + kalan süreye göre hız bonusu") olması gereken hız
      // bonusu bir önceki düzenlemede yanlışlıkla kaldırılıp sabit 50'ye sabitlenmişti — arayüzdeki
      // "Hızlı cevap ekstra puan kazandırır" ipucu da bu yüzden gerçeği yansıtmıyordu. Artık
      // gerçekten kalan süreye göre değişiyor: soru gelir gelmez basılan en hızlı doğru cevap
      // 50 puanın tamamını alır (eski sabit tavanla aynı, liderlik tablosu ölçeği bozulmuyor),
      // sürenin sonuna doğru verilen doğru cevap sadece taban puanı olan 30'u alır.
      const speedBonus = Math.round((timeLeft / QUESTION_SECONDS) * 20);
      const earned = 30 + speedBonus;
      setPointsEarned((p) => p + earned);
      setLastQuestionPoints(earned);
      playCorrectSound();
    } else {
      // DEĞİŞTİ: artık oyun içindeki anlık puan (pointsEarned) gerçekten eksiye düşebiliyor
      // (ör. -10, -20) — önceden her yanlışta 0'da tabana oturtuluyordu, bu da "eksi puan hiç
      // uygulanmıyor" hissi veriyordu. Oyuncunun TOPLAM (kalıcı/liderlik tablosu) skoru asla
      // 0'ın altına düşmez — bu sınır aşağıda, oyun bitip toplam skora eklenirken uygulanıyor.
      setPointsEarned((p) => p - 10);
      setLastQuestionPoints(-10);
      playWrongSound();
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setLastQuestionPoints(null);
    if (currentQuestion + 1 < QUIZ_QUESTIONS.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      // Kullanıcının gerçek adını ve puanını canlı liderlik tablosuna ekle/güncelle
      // DEĞİŞTİ: artık "en yüksek skor" değil, oyuncunun TÜM oyunlarındaki puanları
      // TOPLANIYOR (100 + 90 = 190 gibi). Bunun kötüye kullanılmasını (sınırsız
      // oynayıp puan biriktirme) engellemek için günlük oynama sınırı eklendi (aşağıda).
      const finalName = currentUser || playerName.trim() || "Anonim Oyuncu";
      const finalPoints = pointsEarned;
      const existing = liveLeaderboard.find((p) => p.name === finalName);
      // DÜZELTME: toplam (kalıcı) skor asla 0'ın altına düşmüyor — Math.max(0, ...) ile
      // taban 0'da sabitlendi. Bu oyunun kendisi net negatif bitse bile (örn. -30), oyuncunun
      // toplam puanı en kötü ihtimalle 0'da kalır, eksiye geçmez.
      const cumulativePoints = Math.max(0, existing ? existing.score + finalPoints : finalPoints);
      registerDailyPlay(); // günlük oynama hakkını burada, oyun bittiğinde düşür
      // Kalıcı kayıt: Supabase'e gönder (herkes görsün, F5'te kaybolmasın)
      // NOT: /api/leaderboard route'unun artık "cumulative" (toplama) mantığıyla
      // güncellenmesi gerekiyor — POST body'sine `cumulative: true` ekledik, route'u
      // buna göre güncellemen lazım (aşağıdaki mesajda güncel route'u veriyorum).
      fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: finalName, score: finalPoints, cumulative: true, avatarId: selectedAvatar?.id || null }),
      }).catch(() => {}); // route henüz eklenmemişse sessizce geç, sayfayı bozmasın
      setLiveLeaderboard((prev) => {
        const withoutPlaceholdersAndUser = prev.filter((p) => p.name !== "Henüz kimse yok" && p.name !== finalName);
        const updated = [...withoutPlaceholdersAndUser, { rank: 0, name: finalName, score: cumulativePoints, agent: "—", avatarId: selectedAvatar?.id || null }]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((p, i) => ({ ...p, rank: i + 1 }));
        return updated;
      });
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setPointsEarned(0);
    setLastQuestionPoints(null);
    setTimeLeft(QUESTION_SECONDS);
    setQuizFinished(false);
    setIsQuizStarted(false);
  };

const copyToClipboard = (id: number) => {
  const item = [...customCrosshairs, ...CROSSHAIRS_DATA].find(c => c.id === id);
  if (!item) return;
  navigator.clipboard.writeText(item.code || item.title);
  setCopiedCode(id); 
  setTimeout(() => setCopiedCode(null), 2000);
};
  return (
    // Akıcı scroll için webkit font düzeltmesi ve rendering optimizasyon sınıfı eklendi
    <main className="relative min-h-screen overflow-x-hidden bg-[#050508] text-white select-none antialiased subpixel-antialiased pattern-gpu">
      {/* GEÇİCİ TEŞHİS ETİKETİ — bu, hangi kod sürümünü çalıştırdığını kesin anlamak için.
          Bunu görüyorsan dosya doğru yüklenmiş demektir; görmüyorsan build/cache sorunu var. */}
      <div className="fixed bottom-2 left-2 z-[9999] text-[9px] font-mono text-white/20 bg-black/40 px-2 py-1 rounded pointer-events-none">
        build: fix-round-6-crosshair-color-research
      </div>
      {/* YENİ: Ölümsüzlük/Radyant profil kartı için "efsanevi" kayan ışıltı animasyonu */}
      <style jsx global>{`
        @keyframes legendaryShimmerMove {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .legendary-shimmer {
          animation: legendaryShimmerMove 3.5s ease-in-out infinite;
        }
        @keyframes legendaryBorderGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(255,255,255,0.10), 0 0 40px rgba(255,215,0,0.08); }
          50% { box-shadow: 0 0 28px rgba(255,255,255,0.18), 0 0 60px rgba(255,215,0,0.16); }
        }
        .legendary-card-border {
          animation: legendaryBorderGlow 2.8s ease-in-out infinite;
        }
      `}</style>

      {/* OPTİMİZE ARKA PLAN KATMANI (will-change ve transform-gpu ile sıfır kasma) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full w-full opacity-30 will-change-transform transform-gpu">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover scale-105 transform-gpu translate-z-0">
          <source src="/valorant-bg.mp4" type="video/mp4" />
        </video>
        {/* CSS grid yükü hafifletildi */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/20 via-[#050508]/40 to-[#050508]" />
      </div>

      {/* ARKA PLAN RADIAL IŞIĞI (GPU Katmanına taşındı) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,70,85,0.12),_transparent_50%)] z-0 transform-gpu translate-z-0" />

      {/* ÜST NAVBAR - DONANIM IVMELİ VE PARLAKLIK KAYBI OLMADAN OPTİMİZE EDİLDİ */}
      <header className="fixed top-0 left-0 w-full z-50 shadow-lg backdrop-blur-md bg-[#0f1015]/90 transform-gpu translate-z-0 will-change-transform">
        
        {/* Üst İnce Katman */}
        <div className="w-full h-12 border-b border-white/5 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-lg shadow-[0_0_15px_rgba(255,70,85,0.1)] group">
              <div className="w-5 h-5 relative overflow-hidden">
                <Image src="/logo.png" alt="Infinity Logo" fill className="object-contain" priority />
              </div>
              <span className="font-extrabold tracking-widest text-xs bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                INFINITY<span className="text-red-500">.GG</span>
              </span>
            </div>

            {/* DÜZELTME: rozet çok büyük duruyordu — yükseklik/padding/yazı boyutu küçültüldü. */}
            <div className="group flex items-center h-7 border border-white/10 hover:border-[#ff4655]/40 rounded-md px-2.5 bg-gradient-to-r from-[#1c1e24] via-[#1a1c22] to-[#16171c] gap-1.5 shadow-inner transition-all duration-200 cursor-default relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff4655]/0 via-[#ff4655]/5 to-[#ff4655]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-3 h-3 relative flex-shrink-0 z-10">
                <Image src="/valo.webp" alt="Valorant" fill className="object-contain drop-shadow-[0_0_4px_rgba(255,70,85,0.5)]" />
              </div>
              <span className="text-[10px] font-black tracking-wider bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent uppercase z-10">Valorant</span>
            </div>
          </div>
        </div>

        {/* Alt Katman: Oyun İçi Navigasyon */}
        <div className="w-full h-14 bg-[#14151a]/95 border-b border-white/10 flex items-center px-6 gap-6">
          <div className="flex items-center h-9 bg-[#1c1e24] rounded-lg overflow-hidden border border-white/5 max-w-[220px] w-full">
            <div className="w-9 h-full bg-[#ff4655] flex items-center justify-center flex-shrink-0 rounded-l-lg">
              {/* DÜZELTME: burada site logosu (/logo.png) kullanılıyordu ve kırmızı zemin üstünde
                  neredeyse görünmüyordu. Artık gerçek Riot işaretini (RiotMark → /riot.png) beyaza
                  çevirip gösteriyor, tıpkı referans sitedeki kırmızı kutu + beyaz ikon görünümü gibi. */}
              <RiotMark className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 flex items-center px-2.5 gap-1.5 h-full">
              <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  e.target.blur();
                  setActiveTab("home");
                  setTimeout(() => {
                    document.getElementById("heroSearchSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    document.getElementById("heroSearchInput")?.focus();
                  }, 150);
                }}
                placeholder="Arama..."
                className="w-full bg-transparent border-none outline-none text-[11px] font-semibold text-white placeholder-white/30 cursor-pointer"
              />
            </div>
          </div>

          <nav className="flex items-center h-full gap-6 text-[13px] font-black text-white/70">
            {["home", "crosshairs", "quiz", "find-team"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab !== "home" && !isLoggedIn) {
                    setLoginWarning(true);
                    setTimeout(() => setLoginWarning(false), 2800);
                    return;
                  }
                  setActiveTab(tab);
                }}
                className={`relative transition-colors duration-200 h-full px-1 flex items-center gap-1.5 justify-center capitalize group tracking-wide ${
                  activeTab === tab ? "text-white font-black" : "text-white/70 hover:text-white font-black"
                }`}
              >
                {tab === "home" ? "Ana Sayfa" : tab === "crosshairs" ? "Nişangahlar" : tab === "quiz" ? "Bilgi Yarışması" : "Takım Bul"}
                {tab !== "home" && authChecked && !isLoggedIn && (
                  <svg className="w-2.5 h-2.5 text-white/20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                {/* DÜZELTME: aktif sekmenin altındaki çizgi artık kırmızı; aktif olmayan bir
                    sekmenin üstüne gelince (hover) gri bir çizgi beliriyor, tıpkı istediğin gibi. */}
                {activeTab === tab ? (
                  <motion.div
                    layoutId="navActiveIndicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-full bg-[#ff4655]"
                  />
                ) : (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-full bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 relative">
            {/* DÜZELTME (F5 sonrası "Giriş Yap" butonu titremesi): sekmelerdeki kilit ikonu
                "authChecked" bitene kadar bekliyordu ama BU buton beklemiyordu — localStorage'dan
                giriş durumu henüz okunmadan (isLoggedIn hâlâ varsayılan false iken) direkt
                "Giriş Yap" gösterip, authChecked bitince (bir sonraki anda) giriş yapılmışsa
                hesap menüsüne dönüşüyordu; işte titreyen/geri-giden buton buydu. Artık
                authChecked bitene kadar aynı boyutta boş bir yer tutucu gösteriliyor —
                buton hiç "yanlış" durumda görünüp geri dönmüyor. */}
            {!authChecked ? (
              <div className="h-9 w-24 rounded-full bg-white/5 animate-pulse" />
            ) : isLoggedIn ? (
              <>
                <button
                  onClick={() => setIsAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-2 h-9 pl-1.5 pr-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition duration-150"
                >
                  <div className={`w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} flex-shrink-0`}>
                    <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-bold text-white/80">{currentUser}</span>
                  <svg className={`w-3 h-3 text-white/40 transition-transform duration-150 ${isAccountMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* HESAP AÇILIR MENÜSÜ - artık üstüne basınca direkt çıkış yapmıyor, önce menü açılıyor */}
                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <>
                      {/* Menü dışına tıklayınca kapatan görünmez katman */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsAccountMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-[#14151a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="px-4 py-4 border-b border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} flex-shrink-0 ring-2 ring-white/10`}>
                            <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Giriş Yapıldı
                            </p>
                            <p className="text-xs font-black text-white truncate mt-0.5">{currentUser}</p>
                          </div>
                        </div>
                        <div className="p-1.5">
                          <button
                            onClick={() => { setIsAvatarModalOpen(true); setIsAccountMenuOpen(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white transition-colors duration-150 flex items-center gap-2.5"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5l6-6 4 4 5-5m0 0v4m0-4h-4M4.5 4.5h15A1.5 1.5 0 0121 6v12a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V6a1.5 1.5 0 011.5-1.5z" />
                            </svg>
                            Avatar Değiştir
                          </button>
                          <button
                            onClick={() => {
                              logoutUser();
                              setActiveTab("home");
                              setIsAccountMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-colors duration-150 flex items-center gap-2.5 mt-0.5"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Çıkış Yap
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="h-9 px-4 bg-[#ff4655] hover:bg-red-600 rounded-full text-[11px] font-bold uppercase tracking-wider text-white transition duration-150 shadow-lg shadow-red-500/20"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </header>

      {/* GİRİŞ BAŞARILI BİLDİRİMİ - YENİ EKLENDİ: artık kullanıcı giriş yapıldığını fark edebiliyor */}
      <AnimatePresence>
        {loginSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-[60] bg-[#14151a] border border-emerald-500/30 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3"
          >
            <span className="text-lg">✅</span>
            <p className="text-xs font-bold text-white">Giriş başarıyla yapıldı, hoş geldin {currentUser}!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GİRİŞ UYARISI (TOAST) - YENİ EKLENDİ */}
      <AnimatePresence>
        {loginWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-[60] bg-[#1a1b21] border border-red-500/30 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3"
          >
            <span className="text-lg">🔒</span>
            <div>
              <p className="text-xs font-bold text-white">Bu bölümü kullanmak için önce giriş yapmalısın</p>
              <button onClick={() => { setLoginWarning(false); setIsLoginModalOpen(true); }} className="text-[10px] font-bold text-red-400 hover:text-red-300 underline">
                Hemen giriş yap
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GİRİŞ MODALI - DÜZELTİLDİ: artık sadece format kontrolü değil, üstteki arama barıyla
          AYNI /api/riot-account uç noktasını çağırıp hesabın Riot sunucularında GERÇEKTEN
          var olup olmadığını doğruluyor. Önceden "asdasd#tr1" gibi uydurma bir ID formatı
          doğru olduğu (İsim#TAG içerdiği) sürece kabul ediliyordu — üstteki arama kutusu
          reddederken bu modal kabul ediyordu, tutarsızlığın sebebi buydu. */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => { setIsLoginModalOpen(false); setLoginModalError(""); }} className="absolute top-4 right-4 text-white/40 hover:text-white font-bold text-sm">✕</button>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/30 flex items-center justify-center mb-3 p-2.5">
                <RiotMark className="w-6 h-6 text-[#ff4655]" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Riot ID ile Giriş Yap</h2>
              <p className="text-[11px] text-white/40 mt-1">Nişangahlara, yarışmaya ve takım bulmaya erişmek için gerekli.</p>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                id="loginNameInput"
                placeholder="Riot ID (Örn: Player#TR1)"
                onKeyDown={(e) => { if (e.key === "Enter") (document.getElementById("loginSubmitBtn") as HTMLButtonElement)?.click(); }}
                className="bg-black/40 border border-white/5 focus:border-[#ff4655]/50 rounded-xl h-12 px-4 text-xs font-bold text-white outline-none w-full"
              />
              {loginModalError && (
                <p className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">⚠ {loginModalError}</p>
              )}
              <button
                id="loginSubmitBtn"
                disabled={loginModalLoading}
                onClick={async () => {
                  const input = document.getElementById("loginNameInput") as HTMLInputElement;
                  const value = (input?.value || "").trim();
                  if (!value) return setLoginModalError("Lütfen bir Riot ID gir!");
                  if (!value.includes("#")) return setLoginModalError("Lütfen 'İsim#TAG' formatında gir (Örn: Player#TR1)");
                  const [namePart, tagPart] = value.split("#");
                  if (!namePart.trim() || !tagPart.trim()) return setLoginModalError("Lütfen 'İsim#TAG' formatında gir (Örn: Player#TR1)");

                  setLoginModalError("");
                  setLoginModalLoading(true);
                  try {
                    // Üstteki arama barıyla BİREBİR AYNI doğrulama: Riot'un gerçek sunucusunda
                    // bu hesap var mı diye bakılıyor. Yoksa giriş reddediliyor.
                    const res = await fetch(
                      `/api/riot-account?region=${riotRegion}&gameName=${encodeURIComponent(namePart.trim())}&tagLine=${encodeURIComponent(tagPart.trim())}`
                    );
                    const data = await res.json();
                    if (!res.ok) {
                      setLoginModalLoading(false);
                      return setLoginModalError(data.error || "Bu Riot ID bulunamadı. İsim ve TAG'i kontrol et.");
                    }
                    loginUser(value);
                    setIsLoginModalOpen(false);
                    setLoginModalLoading(false);
                    setLoginSuccessToast(true);
                    setTimeout(() => setLoginSuccessToast(false), 3200);
                  } catch {
                    setLoginModalLoading(false);
                    setLoginModalError("Sunucuya bağlanılamadı. İnternetini kontrol et.");
                  }
                }}
                className="w-full h-12 bg-[#ff4655] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition duration-150"
              >
                {loginModalLoading ? "Doğrulanıyor..." : "Giriş Yap"}
              </button>
              <p className="text-[9px] text-white/25 text-center leading-relaxed">
                Riot ID'nin gerçekten var olduğu doğrulanır. Şifre istenmez; girişin sayfa yenilense de korunur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AVATAR SEÇİM PENCERESİ - YENİ EKLENDİ */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg relative bg-gradient-to-b from-[#181a21] to-[#101116] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/60 max-h-[85vh] overflow-y-auto">
            {/* YENİ: premium his için dekoratif arka plan — hafif ışıltı daireleri + üstte ince
                kırmızı çizgi, sitenin başka premium panellerinde (liderlik tablosu vb.) kullanılan
                aynı dil. Artık düz siyah bir kutu değil. */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#ff4655]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />
            </div>

            <button onClick={() => setIsAvatarModalOpen(false)} className="absolute top-4 right-4 z-10 text-white/40 hover:text-white font-bold text-sm">✕</button>
            <div className="relative z-10 flex items-center gap-3 mb-6">
              {/* DÜZELTME: "dandik" duran kamera emojisi kaldırıldı, yerine gradyanlı, gerçek
                  bir ikon rozeti kondu — sitenin geri kalanındaki premium rozet diliyle uyumlu. */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff4655]/25 to-[#ff4655]/5 border border-[#ff4655]/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#ff4655]/10">
                <svg className="w-6 h-6 text-[#ff4655]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-white">Profil Fotoğrafı</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Avatarını seç</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-6">
              {AVATAR_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">{cat.label}</p>
                  <div className="flex flex-wrap gap-3">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => chooseAvatar(item)}
                        className={`w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br ${item.ring} transition-all duration-150 hover:scale-105 active:scale-95 border-2 ${
                          selectedAvatar.id === item.id ? "border-white shadow-lg shadow-white/20" : "border-transparent"
                        }`}
                      >
                        <img src={item.img} alt={item.id} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* DÜZELTME: "Avatarı Kaldır" seçeneği tamamen kaldırıldı — artık avatarsız bir
                durum yok, herkes standart.jpg ile başlıyor, sadece başka bir tanesini seçebiliyor. */}
          </div>
        </div>
      )}

      {/* GİZLİLİK / KULLANIM ŞARTLARI / DESTEK PENCERESİ - YENİ EKLENDİ: footer'daki üç buton
          artık gerçekten bir şey açıyor. Aynı "premium" arka plan diliyle (ışıltı daireleri +
          üstte ince çizgi) tasarlandı, avatar penceresiyle tutarlı. İçerik senin için makul
          bir taslak — gerçek marka/iletişim bilgilerinle güncelleyebilirsin. */}
      {legalModalTab && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl relative bg-gradient-to-b from-[#181a21] to-[#101116] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/60 max-h-[85vh] overflow-y-auto">
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#ff4655]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />
            </div>

            <button onClick={() => setLegalModalTab(null)} className="absolute top-4 right-4 z-10 text-white/40 hover:text-white font-bold text-sm">✕</button>

            <div className="relative z-10 flex items-center gap-3 mb-5">
              <div className="w-11 h-11 relative rounded-xl bg-gradient-to-br from-[#ff4655]/25 to-[#ff4655]/5 border border-[#ff4655]/30 flex-shrink-0 overflow-hidden">
                <Image src="/logo.png" alt="Infinity Network" fill className="object-contain p-2" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  {legalModalTab === "privacy" ? "Gizlilik Politikası" : legalModalTab === "terms" ? "Kullanım Şartları" : "Destek"}
                </h2>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Infinity Network</p>
              </div>
            </div>

            {/* Sekmeler — pencereyi kapatmadan diğerine geçebilesin diye */}
            <div className="relative z-10 flex items-center gap-1.5 mb-5 bg-black/30 border border-white/5 rounded-xl p-1">
              {([
                { key: "privacy", label: "Gizlilik" },
                { key: "terms", label: "Şartlar" },
                { key: "support", label: "Destek" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setLegalModalTab(t.key)}
                  className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors duration-150 ${
                    legalModalTab === t.key ? "bg-[#ff4655] text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative z-10 flex flex-col gap-4 text-[12px] leading-relaxed text-white/60">
              {legalModalTab === "privacy" && (
                <>
                  <p><span className="text-white font-bold">Infinity Network</span> olarak (<a href="https://infinity.gg" target="_blank" rel="noopener noreferrer" className="text-[#ff4655] hover:underline">infinity.gg</a>) gizliliğine önem veriyoruz. Bu sayfa, hangi verileri neden topladığımızı özetler.</p>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Topladığımız veriler</p>
                    <p>Giriş yaparken verdiğin Riot ID (İsim#TAG), seçtiğin avatar, oluşturduğun nişangah kodları, yarışma puanların ve kurduğun lobi bilgileri (mod, rütbe aralığı, parti kodu).</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Riot ID doğrulaması</p>
                    <p>Giriş sırasında Riot ID'nin gerçekten var olduğunu doğrulamak için Riot Games'in herkese açık hesap API'sine istek atılır. Şifren hiçbir zaman istenmez, alınmaz veya saklanmaz.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Tarayıcıda saklananlar</p>
                    <p>Oturumun, aktif sekmen ve avatar tercihin, sayfayı yenilediğinde kaybolmasın diye tarayıcının yerel deposunda (localStorage) tutulur — bu veriler bizim sunucularımıza değil, sadece kendi cihazına kaydedilir.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Paylaşım</p>
                    <p>Verilerini reklam amacıyla üçüncü taraflarla satmıyor veya paylaşmıyoruz. Liderlik tablosu, nişangahlar ve lobiler gibi herkese açık alanlardaki bilgiler doğası gereği diğer kullanıcılar tarafından görülebilir.</p>
                  </div>
                </>
              )}

              {legalModalTab === "terms" && (
                <>
                  <p><span className="text-white font-bold">Infinity Network</span>'ü (<a href="https://infinity.gg" target="_blank" rel="noopener noreferrer" className="text-[#ff4655] hover:underline">infinity.gg</a>) kullanarak aşağıdaki şartları kabul etmiş olursun.</p>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Bağımsız bir topluluk platformu</p>
                    <p>Infinity Network, Riot Games tarafından onaylanmamış bağımsız bir hayran platformudur ve Riot Games'in resmi görüşlerini yansıtmaz. VALORANT, Riot Games, Inc.'in bir ticari markasıdır.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Kullanıcı içerikleri</p>
                    <p>Paylaştığın nişangah adları, lobi mesajları ve profil bilgilerinden sen sorumlusun. Taciz edici, saldırgan veya yanıltıcı içerikler önceden bildirilmeden kaldırılabilir, ilgili hesap askıya alınabilir.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Hizmetin durumu</p>
                    <p>Platform "olduğu gibi" sunulur, kesintisiz veya hatasız çalışacağı garanti edilmez. Özellikler zaman zaman değiştirilebilir, eklenebilir veya kaldırılabilir.</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1.5">Değişiklikler</p>
                    <p>Bu şartlar güncellenebilir. Önemli değişikliklerde bu sayfa üzerinden bilgilendirme yapılır.</p>
                  </div>
                </>
              )}

              {legalModalTab === "support" && (
                <>
                  <p>Bir sorunla mı karşılaştın, önerin mi var? Sana en hızlı buradan yardımcı olabiliriz:</p>
                  <a
                    href="https://discord.gg/4aZPrH67HH"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-black/30 border border-white/10 hover:border-[#5865F2]/50 rounded-xl p-3.5 transition-colors duration-150"
                  >
                    <div className="w-9 h-9 relative rounded-lg overflow-hidden border border-white/10 bg-[#5865F2]/10 flex-shrink-0">
                      <Image src="/dc.png" alt="Discord" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs">Discord Sunucusu</p>
                      <p className="text-[10px] text-white/40">En hızlı destek — sorularını #destek kanalında sor.</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl p-3.5">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs">destek@infinity.gg</p>
                      <p className="text-[10px] text-white/40">Hesap, veri veya işbirliği talepleri için.</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">Hesap/giriş sorunlarında Riot ID'nin doğru formatta (İsim#TAG) girildiğinden emin ol; nişangah kodu sorunlarında oyun içinden kopyaladığın kodu birebir yapıştır.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* HARİTADA ÖNİZLEME PENCERESİ — YENİ EKLENDİ: nişangah kartındaki ▶ butonuna basınca
          açılır, gerçek 3 harita fotoğrafı (public/sunset.avif, public/summit.avif,
          public/bind.webp) üzerinde crosshair'i tam ortada, oyun içindeki gibi gösterir. */}
      {mapPreviewCrosshair && (() => {
        const parsed = parseCrosshairCode(mapPreviewCrosshair.code);
        const activeMap = CROSSHAIR_PREVIEW_MAPS[mapPreviewIndex];
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-2xl relative bg-gradient-to-b from-[#181a21] to-[#101116] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/60">
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#ff4655]/10 rounded-full blur-3xl" />
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />
              </div>

              <div className="relative z-10 flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-white">{mapPreviewCrosshair.title}</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Haritada Önizleme</p>
                </div>
                <button onClick={() => setMapPreviewCrosshair(null)} className="text-white/40 hover:text-white font-bold text-sm">✕</button>
              </div>

              <div className="relative z-10 flex gap-4">
                {/* Ana harita görüntüsü + ortadaki crosshair */}
                <div className="flex-1 relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                  <Image src={activeMap.img} alt={activeMap.name} fill className="object-cover" />
                  {/* DÜZELTME ("maptan büyük cross" / "ortada değil" / "oyundakinden bambaşka"):
                      eskiden burada CrosshairPreviewSVG (kartlardaki BÜYÜTÜLMÜŞ ikon versiyonu,
                      sabit bir SCALE ve minimum kalınlık/yarıçap zorlamasıyla) sabit bir w-28 h-28
                      kutuya sığdırılıyordu — bu yüzden gösterilen boyutun kodun gerçek değerleriyle
                      hiçbir orantısal ilişkisi yoktu ve outline hiç çizilmiyordu.
                      Artık CrosshairAccurateSVG kullanılıyor: viewBox 1920x1080 (16:9 referans
                      çözünürlük) olduğu için, üstteki `aspect-video` kutusunun gerçek piksel
                      boyutu ne olursa olsun kod içindeki kalınlık/uzunluk/boşluk/nokta değerleri
                      OTOMATİK VE DOĞRU ORANDA ölçekleniyor — elle SCALE/minimum uydurmaya gerek
                      kalmadan. `inset-0` ile harita görseliyle birebir aynı kutuyu kapladığı için
                      merkez de artık piksel piksel tam ortada. */}
                  <div className="absolute inset-0">
                    {parsed ? (
                      <CrosshairAccurateSVG parsed={parsed} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-white/70">
                    {activeMap.name}
                  </div>
                </div>

                {/* 3 harita seçici küçük resim */}
                <div className="flex flex-col gap-2 w-20 flex-shrink-0">
                  {CROSSHAIR_PREVIEW_MAPS.map((m, i) => (
                    <button
                      key={m.name}
                      onClick={() => setMapPreviewIndex(i)}
                      className={`relative flex-1 rounded-lg overflow-hidden border-2 transition-colors duration-150 ${
                        i === mapPreviewIndex ? "border-[#ff4655]" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <Image src={m.img} alt={m.name} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* DÜZELTME (kopyala butonu tepki vermiyordu): artık gerçek bir tıklanabilir
                  durumu var — kopyalanınca buton metni/rengi 2 saniyeliğine değişiyor, ayrıca
                  clipboard API başarısız olursa (bazı tarayıcı/izin durumlarında olabiliyor)
                  sessizce hiçbir şey olmuyormuş gibi görünmek yerine hata da yakalanıyor. */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mapPreviewCrosshair.code)
                    .then(() => {
                      setMapPreviewCopied(true);
                      setTimeout(() => setMapPreviewCopied(false), 2000);
                    })
                    .catch(() => {
                      // Bazı ortamlarda clipboard API izinsiz/kullanılamaz olabilir
                      alert("Kod kopyalanamadı, tarayıcı izin vermiyor olabilir. Kod: " + mapPreviewCrosshair.code);
                    });
                }}
                className={`relative z-10 mt-4 w-full h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
                  mapPreviewCopied
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white hover:text-black hover:border-white"
                }`}
              >
                {mapPreviewCopied ? "KODU KOPYALANDI" : "KODU KOPYALA"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* DİNAMİK İÇERİK ALANI */}
      {/* DÜZELTME (F5 titremesi/navbar kayması - GERÇEK SEBEP): aktif sekme F5'te
          localStorage'dan geri yükleniyor (useLayoutEffect, boyamadan önce). Ama
          AnimatePresence bunu "home'dan X sekmesine geçiş" olarak algılayıp normal
          geçiş animasyonunu (exit + enter) OYNATIYORDU — kullanıcı "home"u hiç
          görmese bile, "wait" modunda önce eski içerik çıkış animasyonuyla kayboluyor,
          SONRA yeni sekme giriş animasyonuyla beliriyordu; bu kısa an içindeki yükseklik
          değişimi sayfayı yukarı/aşağı kaydırıp navbar'ın "titremesine" sebep oluyordu.
          `initial={false}` ilk render'da HİÇBİR giriş/çıkış animasyonu oynatılmamasını
          sağlıyor — sayfa ilk açıldığında (F5 dahil) doğru sekme DİREKT, animasyonsuz
          beliriyor; animasyonlar sadece kullanıcı sonradan sekme DEĞİŞTİRİNCE oynuyor. */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "home" && (
          <motion.section
            key="home-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen pt-44 flex flex-col items-center text-center px-6 justify-center transform-gpu"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 relative drop-shadow-[0_0_20px_rgba(255,70,85,0.25)]">
                <Image src="/valo.webp" alt="Valorant Logo" fill className="object-contain" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mt-2 text-white">
                VALORANT İSTATİSTİKLERİNİZ
              </h1>
            </div>

            <p className="mt-2 text-white/40 text-xs tracking-wide max-w-xl font-medium">
              Riot ID'ni gir, oyun keyfini ve istatistiklerini eğlenceli analizlerle keşfet.
            </p>

            <div id="heroSearchSection" className="relative w-full max-w-lg mt-8">
              <form
                onSubmit={(e) => { handleSearch(e); setShowSuggestions(false); }}
                className={`flex w-full h-12 bg-[#21242c] rounded-xl overflow-hidden shadow-2xl border transition-all duration-200 ${
                  isFocused ? "border-red-500/40" : "border-white/5"
                }`}
              >
                <div className="w-14 bg-[#ff4655] flex items-center justify-center flex-shrink-0">
                  <RiotMark className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 flex items-center px-4 gap-2.5">
                  <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="heroSearchInput"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(e.target.value.trim().length > 0); setShowRecent(e.target.value.trim().length === 0); }}
                    onFocus={() => { setIsFocused(true); if (searchQuery.trim().length > 0) setShowSuggestions(true); else setShowRecent(true); }}
                    onBlur={() => { setIsFocused(false); setTimeout(() => { setShowSuggestions(false); setShowRecent(false); }, 150); }}
                    placeholder="Riot ID gir (Örn: Player#TR1)"
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-white/30"
                  />
                </div>
                <button type="submit" disabled={riotLoading} className="px-5 bg-white/5 hover:bg-red-500 transition-colors duration-200 text-[11px] font-bold tracking-wider uppercase disabled:opacity-40">
                  {riotLoading ? "..." : "Ara"}
                </button>
              </form>

              {serverOnline !== null && (
                <div className="flex items-center gap-1.5 mt-2 justify-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                  {/* DÜZELTME: "· Riot Status API" ibaresi kaldırıldı, sadece sade durum yazısı kaldı. */}
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    {serverOnline ? "Sunucular Çevrimiçi" : "Sunucular Çevrimdışı"}
                  </span>
                </div>
              )}

              {/* YENİ: SON ARAMALAR — arama kutusu boşken odaklanınca daha önce baktığın
                  Riot ID'leri gösterir, tekrar yazmak zorunda kalmazsın. */}
              <AnimatePresence>
                {showRecent && recentSearches.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#14151a]/98 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 text-left backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Son Aramalar</span>
                      <button
                        type="button"
                        onMouseDown={() => {
                          try { window.localStorage.removeItem("infinity_recent_searches"); } catch {}
                          setRecentSearches([]);
                        }}
                        className="text-[9px] font-bold text-white/20 hover:text-red-400 transition-colors duration-150"
                      >
                        Temizle
                      </button>
                    </div>
                    {recentSearches.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => { setSearchQuery(name); setShowRecent(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition duration-100 text-left"
                      >
                        <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] flex-shrink-0">🕒</span>
                        <span className="text-xs font-semibold text-white/80">{name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CANLI ARAMA ÖNERİLERİ (YENİ EKLENDİ) */}
              <AnimatePresence>
                {showSuggestions && (() => {
                  const pool = [
                    ...TEAM_FINDER_DATA.map((l) => l.nick),
                    ...CROSSHAIRS_DATA.map((c) => c.subtitle.replace(/^(Pro |By )/, "")),
                  ];
                  const matches = Array.from(new Set(pool)).filter((n) =>
                    n.toLowerCase().includes(searchQuery.toLowerCase())
                  ).slice(0, 5);
                  if (matches.length === 0) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#14151a]/98 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 text-left backdrop-blur-sm"
                    >
                      <div className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">Oyuncular</div>
                      {matches.map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => { setSearchQuery(name); setShowSuggestions(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition duration-100 text-left"
                        >
                          <div className="w-6 h-6 relative flex-shrink-0 rounded overflow-hidden opacity-60">
                            <Image src="/logo.png" alt="" fill className="object-contain" />
                          </div>
                          <span className="text-xs font-semibold text-white/80">{name}</span>
                        </button>
                      ))}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4 mt-5 w-full max-w-lg">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">veya</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="mt-5 w-full max-w-lg h-12 bg-[#ff4655] hover:bg-red-600 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition duration-150 active:scale-[0.98]"
            >
              <RiotMark className="w-3.5 h-3.5 text-white flex-shrink-0" />
              Riot ID ile Giriş Yap
            </button>

            {riotError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                ⚠ {riotError}
              </motion.p>
            )}

            <AnimatePresence>
              {showResult && riotResult && (() => {
                const tierName = lastMatchStats?.competitiveTier != null ? getTierName(lastMatchStats.competitiveTier) : null;
                const rankKey = tierName ? tierName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "").replace(/[0-9]/g, "") : null;
                const rankMatch = rankKey ? Object.entries(RANK_STYLES).find(([k]) => rankKey.includes(k)) : null;
                const style = rankMatch ? rankMatch[1] : null;
                // YENİ: "Efsanevi" his için Ölümsüzlük/Radyant rütbelerinde ekstra parlayan/hareketli bir kenarlık
                const isLegendaryRank = rankKey === "immortal" || rankKey === "radiant";
                // ACS'yi 0-450 aralığında bir yüzdeye çeviren basit görsel gösterge (Valorant'ta 250+ genelde çok iyi bir performans sayılır)
                const acsPercent = lastMatchStats ? Math.max(4, Math.min(100, Math.round((lastMatchStats.acs / 400) * 100))) : 0;
                return (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className={`relative mt-10 w-full max-w-xl bg-[#101116] border rounded-2xl overflow-hidden shadow-2xl transform-gpu text-left ${style ? style.border : "border-white/10"} ${style ? style.glow : ""} ${isLegendaryRank ? "legendary-card-border" : ""}`}
                >
                  {/* YENİ: Ölümsüzlük/Radyant için hafif kayan ışıltı çizgisi (aşırıya kaçmadan "efsanevi" his katar) */}
                  {isLegendaryRank && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="legendary-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  )}

                  {/* ÜST BANNER — rütbeye göre renklenen premium başlık */}
                  <div className="relative px-6 py-6 border-b border-white/5 overflow-hidden">
                    <div className="absolute inset-0 bg-[#101116]" />
                    <div className={`absolute inset-0 opacity-[0.10] bg-gradient-to-br ${style ? style.gradient : "from-[#ff4655] to-transparent"}`} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.08),transparent_55%)]" />

                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style ? style.gradient : "from-[#ff4655] to-red-800"} flex items-center justify-center text-2xl font-black text-black flex-shrink-0 shadow-xl ring-2 ring-white/10`}>
                          {riotResult.gameName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xl font-black flex items-center gap-1.5 text-white leading-tight">
                            {riotResult.gameName}
                            <span className="text-white/30 font-medium">#{riotResult.tagLine}</span>
                            {/* YENİ: Riot ID'yi tek tıkla kopyalama */}
                            <button
                              type="button"
                              title="Riot ID'yi kopyala"
                              onClick={() => {
                                navigator.clipboard?.writeText(`${riotResult.gameName}#${riotResult.tagLine}`);
                                setCopiedRiotId(true);
                                setTimeout(() => setCopiedRiotId(false), 1500);
                              }}
                              className="ml-1 text-white/25 hover:text-white/70 transition-colors duration-150"
                            >
                              {copiedRiotId ? "✅" : "📋"}
                            </button>
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <span>✓</span> Riot API ile Doğrulandı
                            </span>
                            <span className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                              {riotRegion.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {tierName && (
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style ? style.gradient : "from-red-500 to-red-700"} flex items-center justify-center p-2.5 shadow-xl ring-2 ring-white/10 ${isLegendaryRank ? "animate-pulse" : ""}`}>
                            {getRankLogo(tierName) ? (
                              <div className="w-full h-full relative"><Image src={getRankLogo(tierName)!} alt="rank" fill className="object-contain" /></div>
                            ) : (
                              <span className="text-black text-xl font-black">{style?.icon || "●"}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/50 whitespace-nowrap">{tierName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    {matchStatsLoading && (
                      <div className="flex items-center justify-center gap-2.5 py-10 text-white/40 text-xs font-semibold">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Gerçek maç verisi Riot sunucularından çekiliyor...
                      </div>
                    )}

                    {!matchStatsLoading && matchStatsError && (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <span className="text-2xl opacity-30">📭</span>
                        <p className="text-xs font-bold text-white/40 max-w-xs">{matchStatsError}</p>
                      </div>
                    )}

                    {!matchStatsLoading && !matchStatsError && lastMatchStats && (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Son Maç</span>
                            <span className="text-[9px] font-bold text-white/25">·</span>
                            <span className="text-[10px] font-bold text-white/40">{getQueueLabel(lastMatchStats.queueId)}</span>
                            {lastMatchStats.gameStartMillis && (
                              <>
                                <span className="text-[9px] font-bold text-white/25">·</span>
                                <span className="text-[10px] font-bold text-white/30">{getMatchTimeAgo(lastMatchStats.gameStartMillis)}</span>
                              </>
                            )}
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-wide ${
                            lastMatchStats.won ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" : "text-red-400 bg-red-500/10 border-red-500/25"
                          }`}>
                            {lastMatchStats.won === null ? "SONUÇ BİLİNMİYOR" : lastMatchStats.won ? "GALİBİYET" : "MAĞLUBİYET"}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 hover:border-white/10 transition-colors">
                            <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">K/D Oranı</p>
                            <p className="text-lg font-black mt-1 text-white">{lastMatchStats.kd}</p>
                          </div>
                          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 hover:border-white/10 transition-colors">
                            <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">K / D / A</p>
                            <p className="text-lg font-black mt-1 text-white">{lastMatchStats.kills}/{lastMatchStats.deaths}/{lastMatchStats.assists}</p>
                          </div>
                          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 hover:border-white/10 transition-colors">
                            <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">ACS</p>
                            <p className="text-lg font-black mt-1 text-white">{lastMatchStats.acs}</p>
                          </div>
                        </div>

                        {/* YENİ: ACS'yi görsel bir çubukla da göster — sayı tek başına ne kadar iyi olduğunu anlatmıyordu */}
                        <div className="mt-2.5 bg-black/40 rounded-xl p-3.5 border border-white/5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-white/35 uppercase tracking-wider">Performans (ACS)</span>
                            <span className="text-[9px] font-bold text-white/30">{lastMatchStats.acs >= 250 ? "Çok İyi" : lastMatchStats.acs >= 180 ? "İyi" : "Ortalama"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${style ? style.gradient : "from-[#ff4655] to-red-400"}`}
                              style={{ width: `${acsPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider">Ajan</span>
                            <span className="text-xs font-black text-white">{getAgentName(lastMatchStats.agentId)}</span>
                          </div>
                          <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider">Harita</span>
                            <span className="text-xs font-black text-white">{getMapName(lastMatchStats.mapId)}</span>
                          </div>
                        </div>

                        <p className="mt-5 text-[9px] text-white/25 leading-relaxed border-t border-white/5 pt-3.5">
                          Bu istatistikler Riot'un resmi VALORANT Match API'sinden, hesabın <span className="text-white/40 font-bold">en son oynadığı maçtan</span> gerçek zamanlı çekildi (Maç ID: {lastMatchStats.matchId.slice(0, 8)}...). Riot herkese açık bir "kariyer ortalaması" API'si sunmadığından, sadece bu tek maça ait veriler gösterilebiliyor.
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
                );
              })()}
            </AnimatePresence>



            {/* ALT İSTATİSTİK ŞERİDİ (CANLI SAYAÇLARLA GÜNCELLENDİ - simüle edilmiş, gerçek/doğrulanmış veri değildir) */}
            <div className="mt-12 flex items-center gap-0 bg-[#14151a]/80 border border-white/5 rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center gap-2.5 px-5 py-3">
                <span className="text-base">📅</span>
                <div className="text-left">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Sezon Bitişine</p>
                  <p className="text-xs font-black text-white tabular-nums">
                    <SeasonCountdown />
                  </p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2.5 px-5 py-3">
                <span className="text-base">🔍</span>
                <div className="text-left">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Aranan Profil Sayısı</p>
                  <p className="text-xs font-black text-white tabular-nums"><LivePlayerCount base={0} /></p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[9px] text-white/15 max-w-lg text-center leading-relaxed">
              * Sezon bitiş tarihi Riot'un resmi takvimine göredir; profil sayacı sitede yapılan gerçek aramaları sayar.
            </p>

            {/* GERÇEK SUNUCU LİDERLİK TABLOSU (val-ranked-v1) - YENİ EKLENDİ */}
            {realLeaderboard && realLeaderboard.length > 0 && (
              <div className="mt-10 w-full max-w-md bg-[#14151a]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">🏆 Gerçek Sunucu Liderlik Tablosu</span>
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">CANLI · RIOT API</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {realLeaderboard.map((p) => (
                    <div key={p.rank} className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded ${p.rank === 1 ? "bg-amber-500 text-black" : p.rank === 2 ? "bg-slate-300 text-black" : p.rank === 3 ? "bg-amber-700 text-white" : "bg-white/5 text-white/50"}`}>{p.rank}</span>
                        <span className="text-[11px] font-bold text-white/80">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-red-400">{p.rr} RR</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YENİ: Ana sayfa eskiden hero'dan sonra bomboştu — artık siteki diğer 3
                bölüme (Nişangahlar, Bilgi Yarışması, Takım Bul) göz atan, tıklanabilir,
                renkli öne çıkan kartlar var. Sayfa artık çok daha "dolu" görünüyor. */}
            <div className="mt-14 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  tab: "crosshairs",
                  emoji: "🎯",
                  title: "Nişangahlar",
                  desc: "Pro oyuncuların nişangah kodlarını keşfet, kendi kodunu paylaş.",
                  accent: "from-[#ff4655]/15 to-transparent",
                  ring: "group-hover:border-[#ff4655]/40",
                },
                {
                  tab: "quiz",
                  emoji: "🧠",
                  title: "Bilgi Yarışması",
                  desc: "Valorant bilgini test et, canlı liderlik tablosunda zirveye oyna.",
                  accent: "from-amber-500/15 to-transparent",
                  ring: "group-hover:border-amber-400/40",
                },
                {
                  tab: "find-team",
                  emoji: "🤝",
                  title: "Takım Bul",
                  desc: "Lobi oluştur ya da aktif bir ekibe katıl, birlikte oyna.",
                  accent: "from-emerald-500/15 to-transparent",
                  ring: "group-hover:border-emerald-400/40",
                },
              ].map((card) => (
                <button
                  key={card.tab}
                  onClick={() => {
                    if (!isLoggedIn) {
                      setLoginWarning(true);
                      setTimeout(() => setLoginWarning(false), 2800);
                      return;
                    }
                    setActiveTab(card.tab);
                  }}
                  className={`group relative overflow-hidden text-left bg-gradient-to-br ${card.accent} bg-[#14151a]/80 border border-white/10 ${card.ring} rounded-2xl p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5`}
                >
                  <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.03] blur-2xl" />
                  <span className="text-2xl">{card.emoji}</span>
                  <p className="mt-3 text-sm font-black uppercase tracking-tight text-white">{card.title}</p>
                  <p className="mt-1.5 text-[11px] text-white/40 leading-relaxed">{card.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-white/50 group-hover:text-white transition-colors duration-200">
                    Keşfet <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {activeTab === "crosshairs" && (
          <motion.section
            key="crosshairs-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen pt-36 max-w-[1400px] mx-auto px-6 pb-20 text-left transform-gpu"
          >
            {/* BAŞLIK ALANI */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    VALORANT NİŞANGAHLARI
                  </h2>
                </div>
                <p className="text-xs text-white/40 max-w-xl leading-relaxed">
                  Profesyonel oyuncuların ve topluluğun en beğenilen nişangahlarını keşfet, kopyala ve rakiplerinden bir adım önde ol.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#14151a] border border-white/5 rounded-xl px-4 py-2.5 shadow-lg self-start">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Toplam</span>
                <span className="text-sm font-black text-white">{CROSSHAIRS_DATA.length + customCrosshairs.length}</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Nişangah</span>
              </div>
            </div>

            {/* FİLTRE / ARAMA / SIRALAMA PANELİ */}
            <div className="bg-[#14151a]/95 border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xl mb-6 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center h-10 bg-black/40 border border-white/5 focus-within:border-[#ff4655]/40 rounded-xl px-3.5 gap-2 min-w-[220px] transition-colors duration-200">
                  <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={crosshairSearch}
                    onChange={(e) => setCrosshairSearch(e.target.value)}
                    placeholder="Nişangah veya oyuncu ara..."
                    className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-white/20 w-full"
                  />
                </div>

                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                  <span className="text-[10px] text-black bg-gradient-to-r from-white to-white/80 uppercase font-black px-2.5 py-1.5 rounded-lg hidden md:inline shadow-[0_0_10px_rgba(255,255,255,0.15)]">Sırala</span>
                  {["Beğeni", "Rütbe", "Yeni"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSortType(type.toLowerCase())}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-150 ${
                        sortType === type.toLowerCase() ? "bg-[#ff4655] text-white shadow-[0_0_15px_rgba(255,70,85,0.35)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setIsCrosshairModalOpen(true); setCrosshairCodeInput(""); setCrosshairCodeStatus("idle"); }}
                className="h-10 px-5 bg-gradient-to-r from-[#ff4655] to-red-600 hover:brightness-110 text-white rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(255,70,85,0.3)] transition duration-200 active:scale-[0.97]"
              >
                <span className="text-sm font-black">+</span> Nişangah Ekle
              </button>
            </div>

            {/* RÜTBE FİLTRE ÇUBUĞU (LOGOLARLA DÜZELTİLDİ) */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button
                onClick={() => setTierFilter("all")}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-150 ${
                  tierFilter === "all" ? "bg-white text-black border-white" : "bg-white/[0.03] text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
                }`}
              >
                Tümü
              </button>
              {Object.entries(RANK_STYLES).sort((a, b) => b[1].order - a[1].order).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setTierFilter(key)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all duration-150 ${
                    tierFilter === key
                      ? `bg-gradient-to-r ${style.gradient} text-black border-transparent ${style.glow}`
                      : "bg-white/[0.03] text-white/40 border-white/10 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  {getRankLogo(key) ? (
                    <div className="w-3.5 h-3.5 relative flex-shrink-0">
                      <Image src={getRankLogo(key)!} alt={key} fill className="object-contain" />
                    </div>
                  ) : (
                    <span>{style.icon}</span>
                  )}
                  {style.label}
                </button>
              ))}
            </div>

            {/* KART GRID ALANI */}
            {crosshairsLoading ? (
              // İSKELET (SKELETON) — gerçek liste hazır olana kadar sabit sayıda, sabit boyutlu
              // yer tutucu kart gösterir. Böylece "6 kart → birden 20 kart" zıplaması hiç olmaz.
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-gradient-to-b from-[#16171d] to-[#0f1014] border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-28 bg-white/[0.03]" />
                    <div className="p-4 flex flex-col gap-2">
                      <div className="h-3 w-2/3 bg-white/5 rounded" />
                      <div className="h-2.5 w-1/2 bg-white/5 rounded" />
                      <div className="h-8 w-full bg-white/5 rounded-lg mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (() => {
              const allCrosshairs = [...customCrosshairs, ...CROSSHAIRS_DATA]; // yeni eklenenler en üstte

              const filtered = allCrosshairs
                .filter(item => item.title.toLowerCase().includes(crosshairSearch.toLowerCase()) || item.subtitle.toLowerCase().includes(crosshairSearch.toLowerCase()))
                .filter(item => tierFilter === "all" || item.rank === tierFilter);

              const sorted = [...filtered].sort((a, b) => {
                if (sortType === "tier") return getRankStyle(b.rank).order - getRankStyle(a.rank).order;
                if (sortType === "new") {
                  // DÜZELTME: sabit örnek nişangahların (TenZ, yay vb.) ID'leri 900000+ gibi
                  // yapay-büyük sayılar olduğu için, gerçekte az önce eklenmiş bir nişangahtan
                  // (küçük gerçek DB id'si) HER ZAMAN daha "yeni" görünüyorlardı — "Yeni" sıralaması
                  // hiçbir zaman gerçek yeni eklemeleri üste çıkaramıyordu. Artık örnekler kategori
                  // olarak her zaman "eski" sayılıyor, gerçek eklemeler arasında ise en yüksek id
                  // (en son eklenen) üstte.
                  const aIsSample = a.id >= 900000;
                  const bIsSample = b.id >= 900000;
                  if (aIsSample !== bIsSample) return aIsSample ? 1 : -1;
                  return b.id - a.id;
                }
                // "upvotes" gerçek (canlı) beğeni sayısına göre sıralanır
                return (likeCounts[b.id] ?? parseLikes(b.likes)) - (likeCounts[a.id] ?? parseLikes(a.likes));
              });

              const topId = sorted.length > 0
                ? [...allCrosshairs].sort((a, b) => (likeCounts[b.id] ?? parseLikes(b.likes)) - (likeCounts[a.id] ?? parseLikes(a.likes)))[0].id
                : null;

              if (sorted.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-3xl opacity-30">🎯</span>
                    <p className="text-sm font-bold text-white/40">Aramanla eşleşen bir nişangah bulunamadı.</p>
                    <p className="text-xs text-white/25">Farklı bir kelime veya rütbe filtresi deneyebilirsin.</p>
                  </div>
                );
              }

              // YENİ: sayfalama — listeyi CROSSHAIRS_PER_PAGE'lik dilimlere bölüyoruz.
              const totalPages = Math.max(1, Math.ceil(sorted.length / CROSSHAIRS_PER_PAGE));
              // Filtre değişip liste kısaldığında crosshairPage geçici olarak sınırın dışında
              // kalabilir (henüz effect çalışmadan önceki render'da) — burada da güvenceye alıyoruz.
              const safePage = Math.min(crosshairPage, totalPages);
              const pageStart = (safePage - 1) * CROSSHAIRS_PER_PAGE;
              const pageItems = sorted.slice(pageStart, pageStart + CROSSHAIRS_PER_PAGE);

              return (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 transform-gpu">
                  {pageItems.map((cross, idx) => {
                    const style = getRankStyle(cross.rank);
                    const isVerified = cross.subtitle.toLowerCase().includes("pro");
                    const isTop = cross.id === topId;
                    const isCopied = copiedCode === cross.id;

                    return (
                      <motion.div
                        key={cross.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -4 }}
                        className={`group relative bg-gradient-to-b from-[#16171d] to-[#0f1014] border ${style.border} rounded-2xl overflow-hidden shadow-xl hover:${style.glow} transition-shadow duration-300 flex flex-col justify-between transform-gpu`}
                      >
                        {isTop && (
                          <div className="absolute top-0 left-0 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-br-xl shadow-lg">
                            👑 En Beğenilen
                          </div>
                        )}

                        {/* ÖNİZLEME ALANI (sadeleştirildi - ızgara deseni ve aşırı parlama kaldırıldı) */}
                        <div className="h-28 relative flex items-center justify-center border-b border-white/5 overflow-hidden bg-[#1b2733]">
                          <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-black tracking-wider uppercase bg-gradient-to-r ${style.gradient} text-black shadow-md`}>
                            {getRankLogo(cross.rank) ? (
                              <div className="w-3 h-3 relative flex-shrink-0">
                                <Image src={getRankLogo(cross.rank)!} alt={cross.rank} fill className="object-contain" />
                              </div>
                            ) : (
                              <span>{style.icon}</span>
                            )}
                          </div>

                          {/* GERÇEK ÇİZİM: kart, kodun ayrıştırılmış halini birebir çiziyor.
                              Kod geçersizse (nadiren) sade bir renk noktasına düşülüyor, ama
                              geçerli her kod artık KENDİNE ÖZGÜ, doğru şekli gösteriyor. */}
                          {(() => {
                            const parsed = parseCrosshairCode(cross.code);
                            if (!parsed) {
                              return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cross.color, boxShadow: `0 0 10px ${cross.color}` }} />;
                            }
                            return <CrosshairPreviewSVG parsed={parsed} size={64} />;
                          })()}

                          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(cross.id)}
                              className="w-7 h-7 bg-black/50 hover:bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-150"
                              title="Nişangah kodunu kopyala"
                            >
                              {isCopied ? "✓" : "📄"}
                            </button>
                            {/* YENİ: haritada önizleme butonu — nişangahın gerçek harita üzerinde nasıl durduğunu gösterir */}
                            <button
                              onClick={() => { setMapPreviewIndex(0); setMapPreviewCopied(false); setMapPreviewCrosshair({ code: cross.code, title: cross.title }); }}
                              className="w-7 h-7 bg-black/50 hover:bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-150"
                              title="Haritada önizle"
                            >
                              ▶
                            </button>
                          </div>
                          <button
                            onClick={() => toggleLike(cross.id)}
                            title={likedIds.has(cross.id) ? "Beğeniyi geri al" : "Beğen"}
                            className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors duration-150 active:scale-95 ${
                              likedIds.has(cross.id)
                                ? "bg-red-500/20 border-red-500/40 text-red-400"
                                : "bg-black/30 border-white/5 text-white/70 hover:bg-black/50 hover:border-white/20"
                            }`}
                          >
                            <span>{likedIds.has(cross.id) ? "❤️" : "🤍"}</span>
                            <span>{(likeCounts[cross.id] ?? parseLikes(cross.likes)).toLocaleString("tr-TR")}</span>
                          </button>
                        </div>

                        {/* BİLGİ ALANI */}
                        <div className="p-4 bg-gradient-to-b from-transparent to-black/30 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-white truncate tracking-wide">{cross.title}</h4>
                            {isVerified && (
                              <span className="text-[10px] text-cyan-400 flex-shrink-0" title="Doğrulanmış Profesyonel Oyuncu">✓</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/40 truncate">{cross.subtitle}</p>

                          <button
                            onClick={() => copyToClipboard(cross.id)}
                            className={`mt-1 w-full h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
                              isCopied
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white hover:text-black hover:border-white"
                            }`}
                          >
                            {isCopied ? "KODU KOPYALANDI" : "KODU KOPYALA"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* YENİ: SAYFALAMA — 20'den fazla nişangah varsa altta sayfa numaraları gösteriliyor. */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-8">
                    <button
                      onClick={() => setCrosshairPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-colors duration-150"
                      aria-label="Önceki sayfa"
                    >
                      ←
                    </button>

                    <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-full px-1.5 py-1.5">
                      {(() => {
                        // Çok sayfa varsa hepsini göstermek yerine aktif sayfanın etrafında
                        // dar bir pencere gösteriyoruz (ör. 11 12 [13] 14 15), tıpkı istediğin gibi.
                        const WINDOW = 2;
                        let start = Math.max(1, safePage - WINDOW);
                        let end = Math.min(totalPages, safePage + WINDOW);
                        if (end - start < WINDOW * 2) {
                          if (start === 1) end = Math.min(totalPages, start + WINDOW * 2);
                          else if (end === totalPages) start = Math.max(1, end - WINDOW * 2);
                        }
                        const pages = [];
                        for (let p = start; p <= end; p++) pages.push(p);
                        return pages.map((p) => (
                          <button
                            key={p}
                            onClick={() => setCrosshairPage(p)}
                            className={`min-w-[2rem] h-8 px-2.5 rounded-full text-xs font-black transition-colors duration-150 ${
                              p === safePage ? "bg-[#ff4655] text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        ));
                      })()}
                    </div>

                    <button
                      onClick={() => setCrosshairPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-colors duration-150"
                      aria-label="Sonraki sayfa"
                    >
                      →
                    </button>
                  </div>
                )}
                </>
              );
            })()}

            {/* NİŞANGAH EKLEME PENCERESİ (DÜZELTİLDİ: sağlam önizleme + oto Riot ID + logolu rütbe seçici) */}
            {isCrosshairModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="w-full max-w-md bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                  <button
                    onClick={() => { setIsCrosshairModalOpen(false); setCrosshairCodeInput(""); setCrosshairCodeStatus("idle"); }}
                    className="absolute top-4 right-4 text-white/40 hover:text-white font-bold text-sm"
                  >
                    ✕
                  </button>

                  <h2 className="text-xl font-black uppercase tracking-tight text-white mb-5">YENİ NİŞANGAH EKLE</h2>

                  {/* DÜZELTME: karmaşık canlı önizleme paneli tamamen kaldırıldı — farklı önek
                      uzunluklarında/formatlarda tutarsız sonuçlar verip güven sarsıyordu. Artık
                      TEK ve GÜVENİLİR önizleme, kodu kaydettikten SONRA kartlarda görünen gerçek
                      SVG çizimi. Kodunu oyunda test edip doğrulaman en garantili yöntem. */}
                  <div className="mb-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">💡</span>
                    <p className="text-[11px] text-white/50 leading-relaxed">Kodu aşağıya yapıştır ve kaydet — nişangahın, listedeki kartında gerçek şekliyle görünecek.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Crosshair Kodu</label>
                      <input
                        type="text"
                        value={crosshairCodeInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCrosshairCodeInput(val);
                          if (val.trim() === "") { setCrosshairCodeStatus("idle"); return; }
                          setCrosshairCodeStatus(parseCrosshairCode(val) ? "valid" : "invalid");
                        }}
                        placeholder="Örn: 0;P;c;4;h;0;0l;4;0o;2;0a;1;1b;0"
                        className={`bg-black/40 border rounded-xl h-11 px-4 text-xs font-bold text-white outline-none w-full transition-colors duration-150 ${
                          crosshairCodeStatus === "valid" ? "border-emerald-500/50" : crosshairCodeStatus === "invalid" ? "border-red-500/50" : "border-white/5 focus:border-[#ff4655]/50"
                        }`}
                      />
                      {crosshairCodeStatus === "valid" && (
                        <span className="text-[10px] font-bold text-emerald-400">✓ Kod geçerli, yukarıda canlı önizlemede görüyorsun</span>
                      )}
                      {crosshairCodeStatus === "invalid" && (
                        <span className="text-[10px] font-bold text-red-400">✕ Geçersiz kod. Oyun içinden kopyaladığın kodu kontrol et.</span>
                      )}
                      {crosshairCodeStatus === "idle" && (
                        <span className="text-[10px] text-white/25">Valorant içinden kopyaladığın crosshair kodunu yapıştır.</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Nişangah Adı</label>
                      <input
                        type="text"
                        id="newCrosshairTitle"
                        placeholder="Örn: Klasik Cross"
                        className="bg-black/40 border border-white/5 focus:border-[#ff4655]/50 rounded-xl h-11 px-4 text-xs font-bold text-white outline-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Riot Kimliğin</label>
                      <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl h-11 px-4">
                        <div className={`w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} flex-shrink-0`}>
                          <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-white/70">{currentUser || "Giriş yapılmadı"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Rütbe</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(RANK_STYLES).sort((a, b) => a[1].order - b[1].order).map(([key, style]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNewCrosshairRank(key)}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-all duration-150 ${
                              newCrosshairRank === key
                                ? `bg-gradient-to-r ${style.gradient} text-black border-transparent ${style.glow}`
                                : "bg-black/30 text-white/50 border-white/10 hover:border-white/25"
                            }`}
                          >
                            {getRankLogo(key) ? (
                              <div className="w-4 h-4 relative flex-shrink-0"><Image src={getRankLogo(key)!} alt={key} fill className="object-contain" /></div>
                            ) : (
                              <span>{style.icon}</span>
                            )}
                            <span className="truncate">{style.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const titleInput = document.getElementById("newCrosshairTitle") as HTMLInputElement;

                        if (!titleInput || !titleInput.value.trim()) {
                          return alert("Lütfen nişangaha bir isim ver!");
                        }

                        if (crosshairCodeInput.trim() !== "" && crosshairCodeStatus !== "valid") {
                          return alert("Girdiğin crosshair kodu geçersiz. Lütfen kontrol et veya kodu boş bırak.");
                        }

                        const parsed = crosshairCodeInput.trim() ? parseCrosshairCode(crosshairCodeInput) : null;

                        const payload = {
                          title: titleInput.value.trim(),
                          subtitle: currentUser ? `By ${currentUser}` : "By Sen",
                          rank: newCrosshairRank,
                          color: parsed ? parsed.color : "#ff4655",
                          code: crosshairCodeInput.trim() || "0;P;c;0;h;0;0l;4;0o;2;0a;1;1b;0",
                        };

                        // Önce ekranda anında göster (optimistic), sonra Supabase'e kalıcı olarak kaydet.
                        // Kayıt başarılı olunca geçici ID'yi sunucudaki gerçek ID ile değiştiriyoruz
                        // ki beğeni butonu doğru satırı güncellesin.
                        const tempId = Date.now();
                        setCustomCrosshairs((prev) => [{ id: tempId, likes: "0", ...payload }, ...prev]);
                        setLikeCounts((prev) => ({ ...prev, [tempId]: 0 }));

                        fetch("/api/crosshairs", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        })
                          .then((res) => (res.ok ? res.json() : null))
                          .then((data) => {
                            if (!data?.crosshair) return;
                            const realId = data.crosshair.id;
                            setCustomCrosshairs((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: realId } : c)));
                            setLikeCounts((prev) => {
                              const { [tempId]: moved, ...rest } = prev;
                              return { ...rest, [realId]: moved ?? 0 };
                            });
                          })
                          .catch(() => {}); // /api/crosshairs henüz eklenmemişse sessizce geç (yerelde görünmeye devam eder)

                        setIsCrosshairModalOpen(false);
                        setCrosshairCodeInput("");
                        setCrosshairCodeStatus("idle");
                      }}
                      className="w-full h-11 bg-gradient-to-r from-[#ff4655] to-red-600 hover:brightness-110 rounded-xl font-black text-xs uppercase tracking-widest text-white mt-2 shadow-lg shadow-red-500/20 transition duration-150"
                    >
                      NİŞANGAHI YAYINLA
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        )}

       {activeTab === "quiz" && (
  <motion.section
    key="quiz-tab"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="relative z-10 min-h-screen pt-32 pb-20 flex flex-col items-center justify-center px-4 md:px-6 transform-gpu"
  >
    {/* GİRİŞ EKRANI */}
    {!isQuizStarted && !quizFinished && (
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch transform-gpu">
        {/* Sol Panel: Canlı Skor Tablosu */}
        <div className="relative lg:col-span-5 overflow-hidden bg-gradient-to-br from-[#1a1420] via-[#14151a] to-[#0d0e12] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          {/* YENİ: eskiden düz siyah bir kutuydu, artık gerçek bir "arka plan" var —
              köşelerde renkli ışıltılar + ince bir izgara dokusu + üstte parlayan bir kenar çizgisi */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#ff4655]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="text-xs font-black tracking-widest text-white uppercase">CANLI LİDERLİK TABLOSU</h3>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">CANLI</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[...liveLeaderboard].sort((a, b) => a.rank - b.rank).slice(0, 5).map((player) => {
                // DÜZELTME: kendi satırınsa ÖNCE canlı (güncel) selectedAvatar'a bak,
                // eski/kayıtlı avatarId'ye değil (aksi halde avatar değiştirince eski görünürdü).
                const rowAvatar = (player.name === currentUser ? selectedAvatar : null) || findAvatarById((player as any).avatarId);
                const rankGlow = player.rank === 1 ? "from-amber-500/15 to-transparent" : player.rank === 2 ? "from-slate-400/10 to-transparent" : player.rank === 3 ? "from-orange-700/10 to-transparent" : "from-transparent to-transparent";
                return (
                <div key={player.name + player.rank} className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border transition duration-150 bg-gradient-to-r ${rankGlow} ${
                  player.name === currentUser ? "bg-[#ff4655]/10 border-[#ff4655]/30" : player.name === "Henüz kimse yok" ? "bg-black/10 border-white/5 opacity-40" : "bg-black/20 border-white/5 hover:border-white/10"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-black w-5 h-5 flex items-center justify-center rounded ${player.rank === 1 ? "bg-amber-500 text-black" : player.rank === 2 ? "bg-slate-300 text-black" : player.rank === 3 ? "bg-orange-700 text-white" : "bg-white/5 text-white/50"}`}>{player.rank}</span>
                    {player.name !== "Henüz kimse yok" && (
                      <div className={`w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br ${rowAvatar.ring} flex-shrink-0`}>
                        <img src={rowAvatar.img} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-white/80">{player.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-red-400">{player.score} PTS</span>
                </div>
              );})}
            </div>
          </div>
        </div>

        {/* Sağ Panel: Giriş Yap ve Başla */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left lg:pl-6">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">
            OYNA. YARIŞ.<br /><span className="text-[#ff4655]">RADYANT'A ULAŞ.</span>
          </h1>
          <p className="text-white/40 text-xs font-medium mt-3 max-w-md leading-relaxed">
            Valorant evrenine ne kadar hakimsin? Soruları en hızlı şekilde doğru cevapla, topluluk liderlik tablosunda zirveye oyna!
          </p>
          <form onSubmit={handleJoinQuiz} className="mt-8 w-full max-w-md bg-[#14151a]/90 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Riot Kimliğin</label>
              <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl h-12 px-4">
                <div className={`w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} flex-shrink-0`}>
                  <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-white/70">{currentUser || "Giriş yapılmadı"}</span>
              </div>
            </div>

            {/* YENİ: oynamadan önce de kullanıcı toplam puanını ve sıralamasını görebilsin diye eklendi */}
            {currentUser && (() => {
              const myEntry = liveLeaderboard.find((p) => p.name === currentUser);
              if (!myEntry) return null;
              return (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="px-3 py-2.5 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">Toplam Puanın</span>
                    <span className="text-base font-black text-white mt-0.5">{myEntry.score.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="px-3 py-2.5 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">Sıralaman</span>
                    <span className="text-base font-black text-[#ff4655] mt-0.5">#{myEntry.rank}</span>
                  </div>
                </div>
              );
            })()}
            <button
              type="submit"
              disabled={playsToday >= DAILY_QUIZ_LIMIT}
              className="w-full h-12 bg-[#ff4655] hover:bg-red-600 active:scale-[0.98] rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#ff4655]"
            >
              {playsToday >= DAILY_QUIZ_LIMIT ? "GÜNLÜK HAKKIN DOLDU" : "YARIŞMAYA KATIL"}
            </button>
            <p className="text-[10px] text-center font-bold text-white/30">
              Bugün {Math.min(playsToday, DAILY_QUIZ_LIMIT)}/{DAILY_QUIZ_LIMIT} oyun hakkını kullandın
              {playsToday >= DAILY_QUIZ_LIMIT ? " · Yarın tekrar oynayabilirsin" : ""}
            </p>
          </form>
        </div>
      </div>
    )}

    {/* OYUN/YARIŞMA EKRANI (FOTOĞRAFTAKİ YENİ SİSTEM) */}
    {isQuizStarted && !quizFinished && (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 transform-gpu">
        
        {/* Üst Bar: Soru Sayısı, Canlı Puan ve İlerleme Çubuğu */}
        <div className="bg-[#14151a]/90 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg tracking-wide text-white/80">
              SORU {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
            </span>
            {/* YENİ: oyun skoru — kaç soruyu doğru bildiğini canlı gösteren ayrı bir rozet.
                Önceden sadece "PUAN" vardı, doğru/yanlış sayısı hiçbir yerde görünmüyordu. */}
            <span className="text-xs font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg tracking-wide text-white/80 flex items-center gap-1.5">
              <span className="opacity-60 font-bold">SKOR</span>
              <span className="tabular-nums text-emerald-400">{score}</span>
              <span className="opacity-30">/</span>
              <span className="tabular-nums text-white/50">{currentQuestion + (isAnswered ? 1 : 0)}</span>
            </span>
            {/* YENİ: canlı puan sayacı — artık sadece oyun sonunda değil, oyun boyunca görünüyor.
                Negatife düşebiliyor (kırmızıya döner), premium bir cam/gradyan çerçevesi var.
                DÜZELTME: artık puan değiştiğinde hafif bir "pop" animasyonuyla büyüyüp normale
                dönüyor, üstünde de kısa süreliğine +50 / -10 gibi uçan bir etiket beliriyor —
                önceden puan sessizce/aniden değişiyordu, "çok sade kaldı" şikayeti buradandı. */}
            <span className={`relative overflow-visible text-xs font-black px-3 py-1.5 rounded-lg tracking-wide border flex items-center gap-1.5 transition-colors duration-300 ${
              pointsEarned < 0
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-400"
            }`}>
              <span className="opacity-60 font-bold">PUAN</span>
              <motion.span
                key={pointsEarned}
                initial={{ scale: 1.5, y: -3 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="tabular-nums inline-block"
              >
                {pointsEarned}
              </motion.span>
              <AnimatePresence>
                {isAnswered && lastQuestionPoints !== null && (
                  <motion.span
                    key={`delta-${currentQuestion}`}
                    initial={{ opacity: 0, y: 4, scale: 0.7 }}
                    animate={{ opacity: 1, y: -20, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className={`absolute -top-1 right-2 text-[11px] font-black pointer-events-none ${lastQuestionPoints > 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {lastQuestionPoints > 0 ? `+${lastQuestionPoints}` : lastQuestionPoints}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
          {/* İlerleme Çubuğu (Progress Bar) */}
          <div className="flex-1 w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 mx-2">
            <div 
              className="h-full bg-gradient-to-r from-[#ff4655] to-red-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
            />
          </div>
          <div className="text-xs font-bold text-white/40">
            Cevaplanan: {isAnswered ? currentQuestion + 1 : currentQuestion} / {QUIZ_QUESTIONS.length}
          </div>
        </div>

        {/* Orta Alan: Soru ve Görsel/Sayaç Paneli */}
        <div className="bg-[#14151a]/95 border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
          {/* Arka Plan Işık Efekti */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,70,85,0.05),_transparent_60%)] pointer-events-none" />
          
          <h2 className="text-lg md:text-2xl font-black text-white max-w-3xl leading-snug z-10">
            {QUIZ_QUESTIONS[currentQuestion].question}
          </h2>

          {/* Dairesel Geri Sayım Sayacı (YENİ) */}
          <div className="mt-6 relative w-16 h-16 z-10">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={isAnswered ? (lastQuestionPoints !== null && lastQuestionPoints > 0 ? "#34d399" : "#ef4444") : (timeLeft <= 5 ? "#ef4444" : "#ff4655")}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28}
                strokeDashoffset={2 * Math.PI * 28 * (1 - (isAnswered ? 1 : timeLeft / QUESTION_SECONDS))}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-black tabular-nums ${
                isAnswered
                  ? (lastQuestionPoints !== null && lastQuestionPoints > 0 ? "text-emerald-400" : "text-red-400")
                  : (timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white")
              }`}>
                {isAnswered ? (lastQuestionPoints !== null && lastQuestionPoints > 0 ? "✓" : "✕") : timeLeft}
              </span>
            </div>
          </div>

          {/* Durum Göstergesi / İpucu Kutusu */}
          <div className="mt-3 px-4 py-2 bg-black/30 border border-white/5 rounded-full z-10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAnswered ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              {isAnswered
                ? (lastQuestionPoints !== null
                    ? `${lastQuestionPoints > 0 ? `+${lastQuestionPoints}` : lastQuestionPoints} puan · Sonraki soruya geçebilirsin.`
                    : "Cevap Kilitlendi! Sonraki soruya geçebilirsin.")
                : "Doğru şıkkı seç ve kilitle! Hızlı cevap ekstra puan kazandırır."}
            </span>
          </div>
        </div>

        {/* Alt Alan: Şıklar (Fotoğraftaki gibi 2x2 Büyük Renkli Buton Düzeni) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUIZ_QUESTIONS[currentQuestion].options.map((option, idx) => {
  // BURASI EKSİK KALMIŞTI - RENK VE DURUM HESAPLAMALARI:
  const isCorrectAnswer = option === QUIZ_QUESTIONS[currentQuestion].answer;
  const isSelected = selectedOption === option;
  
  const baseColors = [
    "bg-red-600/90 hover:bg-red-600 border-red-500 text-white shadow-[0_4px_15px_rgba(239,68,68,0.15)]",     
    "bg-blue-600/90 hover:bg-blue-600 border-blue-500 text-white shadow-[0_4px_15px_rgba(59,130,246,0.15)]",  
    "bg-amber-500/90 hover:bg-amber-500 border-amber-400 text-black shadow-[0_4px_15px_rgba(245,158,11,0.15)]", 
    "bg-purple-600/90 hover:bg-purple-600 border-purple-500 text-white shadow-[0_4px_15px_rgba(147,51,234,0.15)]" 
  ];

  let btnStyle = baseColors[idx];
  
  if (isAnswered) {
    if (isCorrectAnswer) {
      btnStyle = "bg-emerald-500 border-emerald-400 text-white font-black scale-[1.02] shadow-[0_0_25px_rgba(16,185,129,0.4)] z-20";
    } else if (isSelected) {
      btnStyle = "bg-red-800 border-red-600 text-white/70 line-through opacity-80 scale-[0.98]";
    } else {
      btnStyle = "bg-black/60 border-white/5 text-white/10 opacity-20 pointer-events-none scale-[0.95]";
    }
  }

  const symbols = ["▲", "◼", "⬢", "✦"];

  // SENİN EKRAN GÖRÜNTÜSÜNDE BAŞLAYAN BUTON KISMI BURADAN İTİBAREN DEVAM EDİYOR:
  return (
    <button
      key={idx}
      disabled={isAnswered}
      onClick={() => handleOptionClick(option)}
      className={`w-full text-left px-6 h-16 rounded-2xl border-2 flex items-center justify-between text-sm sm:text-base font-bold transition-all duration-200 transform-gpu active:scale-[0.99] ${btnStyle}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-sm font-black opacity-60 font-mono">{symbols[idx]}</span>
        <span>{option}</span>
      </div>
      {isAnswered && isCorrectAnswer && (
        <span className="text-white font-black text-lg bg-emerald-600 w-6 h-6 flex items-center justify-center rounded-full shadow-lg">✓</span>
      )}
      {isAnswered && isSelected && !isCorrectAnswer && (
        <span className="text-white font-black text-lg bg-red-600 w-6 h-6 flex items-center justify-center rounded-full shadow-lg">✗</span>
      )}
    </button>
  );
})}
        </div>

        {/* Sonraki Soru Butonu (Sadece cevaplanınca ortaya çıkar ve parlar) */}
        {isAnswered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mt-2">
            <button
              onClick={handleNextQuestion}
              className="px-8 h-12 bg-white text-black hover:bg-white/90 active:scale-95 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition duration-150 flex items-center gap-2"
            >
              {currentQuestion + 1 === QUIZ_QUESTIONS.length ? "SONUÇLARI GÖR" : "SONRAKİ SORU"} ➔
            </button>
          </motion.div>
        )}
      </div>
    )}

    {/* BİTMİŞ/SONUÇ EKRANI (PREMIUM TASARIM — performansa göre renklenen arka plan) */}
    {quizFinished && (() => {
      const ratio = score / QUIZ_QUESTIONS.length;
      // Performansa göre tema: harika (yeşil/altın), orta (kırmızı marka rengi), zayıf (mor/mavi soğuk ton)
      const theme = ratio >= 0.7
        ? { glow: "rgba(52,211,153,0.16)", accent: "text-emerald-400", border: "border-emerald-500/20", ring: "from-emerald-400 to-teal-500" }
        : ratio >= 0.4
        ? { glow: "rgba(255,70,85,0.16)", accent: "text-[#ff4655]", border: "border-[#ff4655]/20", ring: "from-[#ff4655] to-red-600" }
        : { glow: "rgba(129,140,248,0.14)", accent: "text-indigo-300", border: "border-indigo-400/20", ring: "from-indigo-400 to-purple-500" };
      return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className={`w-full max-w-md bg-[#101116] border ${theme.border} rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden transform-gpu`}
      >
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${theme.glow}, transparent 65%)` }} />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: theme.glow }} />

        <div className="relative">
          <span className={`inline-block text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${theme.border} ${theme.accent} bg-black/30`}>
            Yarışma Tamamlandı
          </span>
          <p className="text-lg font-bold text-white/80 mt-3">{playerName || currentUser || "Oyuncu"}</p>

          {/* Skor ve Canlı Sıralama Alanı */}
          <div className="my-8 flex flex-col items-center justify-center gap-2">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${theme.ring} flex items-center justify-center shadow-xl ring-4 ring-white/5 mb-2`}>
              <div className="w-[72px] h-[72px] rounded-full bg-[#101116] flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{score}</span>
                <span className="text-[9px] text-white/30 font-bold leading-none mt-0.5">/ {QUIZ_QUESTIONS.length}</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">DOĞRU CEVAP SAYISI</p>

            {(() => {
              const finalName = currentUser || playerName.trim() || "Anonim Oyuncu";
              const myEntry = liveLeaderboard.find((p) => p.name === finalName);
              const myRank = myEntry ? myEntry.rank : liveLeaderboard.length + 1;
              const myPoints = myEntry ? myEntry.score : pointsEarned;
              return (
                <div className="mt-5 grid grid-cols-3 gap-2.5 w-full">
                  <div className={`px-3 py-3 rounded-xl border bg-black/40 flex flex-col items-center justify-center ${pointsEarned < 0 ? "border-red-500/20" : theme.border}`}>
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">Oyun Skoru</span>
                    <span className={`text-lg font-black mt-1 ${pointsEarned < 0 ? "text-red-400" : theme.accent}`}>
                      {pointsEarned > 0 ? "+" : ""}{pointsEarned.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="px-3 py-3 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">Toplam Puan</span>
                    <span className="text-lg font-black text-white mt-1">{myPoints.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="px-3 py-3 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">Sıralama</span>
                    <span className="text-lg font-black text-[#ff4655] mt-1">#{myRank}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Yeniden Başlat Butonu */}
          <button
            onClick={restartQuiz}
            className={`w-full h-11 bg-gradient-to-r ${theme.ring} hover:brightness-110 rounded-xl text-xs font-black uppercase tracking-widest text-black transition duration-150 shadow-lg`}
          >
            YENİDEN DENE
          </button>
        </div>
      </motion.div>
      );
    })()}
  </motion.section>
)}
        {activeTab === "find-team" && (
  <motion.section
    key="find-team-tab"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="relative z-10 min-h-screen pt-32 pb-20 px-4 md:px-6 max-w-6xl mx-auto transform-gpu"
  >
    {/* Üst Başlık ve Lobi Oluştur Butonu */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-6 w-1 bg-gradient-to-b from-emerald-400 to-emerald-700 rounded-full" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">TAKIMINI BUL</h1>
        </div>
        <p className="text-white/40 text-xs font-medium">Kendi lobini kur veya aktif bir ekibe dahil ol.</p>
      </div>
      <button
        onClick={() => setIsLobbyModalOpen(true)}
        className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/20 transition duration-150 self-start sm:self-center flex items-center gap-2"
      >
        <span className="text-sm">+</span> LOBİ OLUŞTUR
      </button>
    </div>

    {/* ARAMA VE MOD FİLTRESİ — DÜZELTME (GERÇEK SEBEP BULUNDU): dış kutuda "overflow-hidden"
        vardı (arka plandaki bulanık ışıltı daireleri taşmasın diye) ama bu, mod filtre
        menüsünü de görünmez şekilde KIRPIYORDU — menü state olarak açılıyordu ama hiç
        görünmüyordu. Artık dekoratif arka plan ayrı, kendi overflow-hidden'ı olan bir
        katmana alındı; dış kutu artık overflow-visible, menü rahatça taşabiliyor. */}
    <div className="relative bg-gradient-to-r from-[#1a1c24] via-[#14151a] to-[#1a1420] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-xl mb-6">
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#ff4655]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center h-11 bg-black/50 border border-white/10 focus-within:border-emerald-400/60 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] rounded-xl pl-2 pr-3.5 gap-2 min-w-[220px] flex-1 transition-all duration-200">
        <div className="w-6 h-6 rounded-lg bg-[#ff4655] flex items-center justify-center flex-shrink-0">
          <RiotMark className="w-3.5 h-3.5 text-white" />
        </div>
        <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={teamSearchQuery}
          onChange={(e) => setTeamSearchQuery(e.target.value)}
          placeholder="Riot ID ile lobi ara..."
          className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-white/30 w-full"
        />
      </div>
      {/* DÜZELTME: native <select> açıkken tarayıcının kendi (mavi/beyaz, tema dışı) liste
          görünümünü kullanıyordu ve hiçbir CSS ile güzelleştirilemiyordu. Artık tamamen
          özel, temayla uyumlu bir açılır menü. Eksik olan Premier ve Hızlı Oyun modları eklendi. */}
      <div className="relative z-20">
        <button
          type="button"
          onClick={() => setIsModeDropdownOpen((v) => !v)}
          className="h-11 flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-black/50 border border-emerald-400/30 hover:border-emerald-400/60 rounded-xl px-3.5 text-xs font-bold text-white/90 outline-none transition-colors duration-150"
        >
          {GAME_MODE_LABELS[selectedGameMode] || selectedGameMode}
          <svg className={`w-3 h-3 text-emerald-400 transition-transform duration-150 ${isModeDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence>
          {isModeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsModeDropdownOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-2 w-52 max-h-72 overflow-y-auto bg-[#14151a] border border-emerald-400/20 rounded-xl shadow-2xl shadow-black/50 z-20 py-1"
              >
                {[
                  { value: "Tüm Modlar", label: "Tüm Modlar" },
                  { value: "RANKED", label: "Rekabete Dayalı" },
                  { value: "UNRATED", label: "Derecesiz" },
                  { value: "SWIFTPLAY", label: "Akın" },
                  { value: "PREMIER", label: "Premier" },
                  { value: "SPIKE RUSH", label: "Tam Gaz" },
                  { value: "DEATHMATCH", label: "Ölüm Kalım Savaşı" },
                  { value: "TEAM DEATHMATCH", label: "Takımlı Ölüm Kalım Savaşı" },
                  { value: "SPIKE ATTACK", label: "Spike'a Hücum" },
                  { value: "ESCALATION", label: "Tırmanış" },
                  { value: "COMBAT2V2", label: "Çarpışma: 2'ye 2" },
                  { value: "CUSTOM", label: "Özel" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => { setSelectedGameMode(mode.value); setIsModeDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors duration-100 ${
                      selectedGameMode === mode.value ? "bg-emerald-500/15 text-emerald-300" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="relative z-10 text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider whitespace-nowrap bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
        {lobbies.filter((l) => (l.nick.toLowerCase().includes(teamSearchQuery.toLowerCase()) || l.code.toLowerCase().includes(teamSearchQuery.toLowerCase())) && (selectedGameMode === "Tüm Modlar" || l.mode === selectedGameMode)).length} lobi bulundu
      </div>

      {/* YENİ: Yenile butonu artık SADECE burada, Takım Bul'daki arama barının yanında.
          Kesikli çerçeve yok, dolu/solid güzel bir buton — sayfayı yeniler ama giriş ve
          aktif sekme localStorage'da tutulduğu için hiçbir şey kaybolmaz. */}
      {/* DÜZELTME ("basılı tutma" hissi): sorun aslında bir "hold" mantığı DEĞİLDİ — ikonun
          döndürme animasyonu `group-active:rotate` ile SADECE fare fiziksel olarak basılıyken
          tetikleniyordu. Normal, hızlı bir tık (bas-bırak) yapınca animasyon yarıda kesiliyor/
          geri sarıyordu, bu da "tam dönmesi için basılı tutman gerekiyormuş" hissi veriyordu.
          Artık dönme SADECE gerçek yükleme durumuna (isRefreshingLobbies) bağlı ve en az 500ms
          gösteriliyor — tek bir temiz tık, tam bir dönüş, her zaman aynı şekilde biter. */}
      <button
        onClick={async () => {
          setIsRefreshingLobbies(true);
          const started = Date.now();
          await fetchLobbies();
          const elapsed = Date.now() - started;
          if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
          setIsRefreshingLobbies(false);
        }}
        disabled={isRefreshingLobbies}
        title="Lobileri yenile"
        className="relative z-10 flex items-center gap-2 h-11 px-4 bg-[#ff4655] hover:bg-red-600 hover:shadow-red-500/40 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all duration-150 flex-shrink-0"
      >
        <svg className={`w-3.5 h-3.5 ${isRefreshingLobbies ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Yenile
      </button>
    </div>

    {/* LOBİ KARTLARI (YENİ TASARIM) */}
    {(() => {
      const filteredLobbies = lobbies
        // DÜZELTME: artık sadece oyuncu ismine değil, parti koduna (örn. RCB605) göre de arıyor
        .filter((lobby) => lobby.nick.toLowerCase().includes(teamSearchQuery.toLowerCase()) || lobby.code.toLowerCase().includes(teamSearchQuery.toLowerCase()))
        .filter((lobby) => selectedGameMode === "Tüm Modlar" || lobby.mode === selectedGameMode);

      if (filteredLobbies.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center gap-3 py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <span className="text-3xl opacity-30">👥</span>
            <p className="text-sm font-bold text-white/40">Aramanla eşleşen bir lobi bulunamadı.</p>
            <p className="text-xs text-white/25">Farklı bir isim veya mod filtresi deneyebilirsin.</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLobbies.map((lobby) => {
            // DÜZELTME: kartlar artık düz siyah değil — moda göre çok hafif bir renkli
            // arka plan dokusu var (renk çarpışması olmasın diye opaklık çok düşük tutuldu,
            // rütbe rozetleri ve mikrofon etiketiyle aynı tonları kullanıyor).
            const modeAccent: Record<string, string> = {
              RANKED: "from-[#ff4655]/10 via-transparent to-transparent",
              UNRATED: "from-sky-500/10 via-transparent to-transparent",
              DEATHMATCH: "from-orange-500/10 via-transparent to-transparent",
              "TEAM DEATHMATCH": "from-orange-400/10 via-transparent to-transparent",
              "SPIKE RUSH": "from-purple-500/10 via-transparent to-transparent",
              "SPIKE ATTACK": "from-fuchsia-500/10 via-transparent to-transparent",
              PREMIER: "from-amber-400/10 via-transparent to-transparent",
              SWIFTPLAY: "from-teal-400/10 via-transparent to-transparent",
              ESCALATION: "from-indigo-400/10 via-transparent to-transparent",
              COMBAT2V2: "from-lime-400/10 via-transparent to-transparent",
              CUSTOM: "from-white/10 via-transparent to-transparent",
            };
            const accent = modeAccent[lobby.mode] || "from-emerald-500/10 via-transparent to-transparent";
            return (
            <motion.div
              key={lobby.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden bg-gradient-to-br ${accent} bg-[#14151a]/95 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 shadow-xl transition-colors duration-200`}
            >
              <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/[0.02] blur-2xl" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    // DÜZELTME: önceden önce lobiye kaydedilmiş (eski) avatarId'ye bakılıyordu,
                    // bu yüzden avatarını değiştirsen bile eski lobilerinde eski avatar kalıyordu.
                    // Artık kendi lobinse ÖNCE canlı (güncel) selectedAvatar'a bakılıyor.
                    const lobbyAvatar = (lobby.nick === currentUser ? selectedAvatar : null) || findAvatarById((lobby as any).avatarId);
                    return (
                      <div className={`w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br ${lobbyAvatar.ring} flex-shrink-0`}>
                        <img src={lobbyAvatar.img} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs font-bold text-white">{lobby.nick}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider"><RelativeTimeText createdAt={lobby.createdAt} /></p>
                  </div>
                </div>
                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${lobby.mic ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/5 text-white/40 border border-white/10"}`}>
                  {lobby.mic ? "🎙 Mikrofon Zorunlu" : "🔇 Mikrofon Farketmez"}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5">
                  {getRankLogo(lobby.minRank) && (
                    <div className="w-4 h-4 relative flex-shrink-0"><Image src={getRankLogo(lobby.minRank)!} alt={lobby.minRank} fill className="object-contain" /></div>
                  )}
                  <span className="text-[10px] font-bold text-white/70">{lobby.minRank}</span>
                </div>
                <span className="text-white/20 text-xs">→</span>
                <div className="flex items-center gap-1.5 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5">
                  {getRankLogo(lobby.maxRank) && (
                    <div className="w-4 h-4 relative flex-shrink-0"><Image src={getRankLogo(lobby.maxRank)!} alt={lobby.maxRank} fill className="object-contain" /></div>
                  )}
                  <span className="text-[10px] font-bold text-white/70">{lobby.maxRank}</span>
                </div>
                <span className="ml-auto text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">{GAME_MODE_LABELS[lobby.mode] || lobby.mode}</span>
              </div>

              {lobby.message && (
                <p className="text-[11px] text-white/50 italic mb-3 line-clamp-2 border-l-2 border-white/10 pl-2.5">"{lobby.message}"</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                  +{lobby.playerCount || 1} Oyuncu Arıyor
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 rounded-lg">
                    {lobby.code || "INF-CODE"}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lobby.code || "INF-CODE");
                      setCopiedCode(lobby.id);
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider border transition duration-150 flex-shrink-0 ${
                      copiedCode === lobby.id
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-white/5 hover:bg-white text-white hover:text-black border-white/10"
                    }`}
                  >
                    {copiedCode === lobby.id ? "✓" : "KOPYALA"}
                  </button>
                </div>
              </div>
            </motion.div>
          );})}
        </div>
      );
    })()}

    {/* LOBİ OLUŞTURMA PENCERESİ (İLERİ DÜZEY MODAL) */}
    {isLobbyModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm flex-shrink-0">+</div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white leading-none">Lobi Oluştur</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Valorant</p>
            </div>
            <button onClick={() => setIsLobbyModalOpen(false)} className="ml-auto text-white/40 hover:text-white font-bold text-sm">✕</button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Parti Kodu <span className="text-white/20 normal-case font-medium">(Valorant içindeki 6 haneli kod)</span></label>
              <input
                type="text"
                id="lobbyPartyCode"
                maxLength={6}
                placeholder="Örn: RCB605"
                onChange={(e) => { e.target.value = e.target.value.toUpperCase(); if (lobbyCodeError) setLobbyCodeError(""); }}
                className={`bg-black/40 border rounded-xl h-11 px-4 text-xs font-bold text-white outline-none w-full uppercase tracking-widest ${lobbyCodeError ? "border-red-500/60" : "border-white/5 focus:border-emerald-500/50"}`}
              />
              {lobbyCodeError && <p className="text-[10px] font-bold text-red-400">{lobbyCodeError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Oyun Modu</label>
                {/* DÜZELTME: burası native <select> idi, tarayıcının kendi (temayla uyumsuz, mavi
                    vurgulu) açılır listesini kullanıyordu ve mod listesi eksikti. Artık filtre
                    barındaki ile aynı özel dropdown + TÜM gerçek Valorant modları var. */}
                <button
                  type="button"
                  onClick={() => setIsLobbyModeDropdownOpen((v) => !v)}
                  className="bg-black border border-white/5 hover:border-emerald-500/40 focus:border-emerald-500/50 rounded-xl h-11 px-3 text-xs font-bold text-white outline-none w-full flex items-center justify-between transition-colors duration-150"
                >
                  {GAME_MODE_LABELS[newLobbyMode] || newLobbyMode}
                  <svg className={`w-3 h-3 text-emerald-400 transition-transform duration-150 flex-shrink-0 ${isLobbyModeDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {isLobbyModeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsLobbyModeDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-[#0c0d10] border border-emerald-400/20 rounded-xl shadow-2xl shadow-black/60 z-40 py-1"
                      >
                        {[
                          { value: "RANKED", label: "Rekabete Dayalı" },
                          { value: "UNRATED", label: "Derecesiz" },
                          { value: "SWIFTPLAY", label: "Akın" },
                          { value: "PREMIER", label: "Premier" },
                          { value: "SPIKE RUSH", label: "Tam Gaz" },
                          { value: "DEATHMATCH", label: "Ölüm Kalım Savaşı" },
                          { value: "TEAM DEATHMATCH", label: "Takımlı Ölüm Kalım Savaşı" },
                          { value: "SPIKE ATTACK", label: "Spike'a Hücum" },
                          { value: "ESCALATION", label: "Tırmanış" },
                          { value: "COMBAT2V2", label: "Çarpışma: 2'ye 2" },
                          { value: "CUSTOM", label: "Özel" },
                        ].map((mode) => (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => {
                              setNewLobbyMode(mode.value);
                              // %25 rütbe sınırı sadece Rekabete Dayalı modda anlamlı
                              if (mode.value !== "RANKED") setRankCutoff25(false);
                              setIsLobbyModeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors duration-100 ${
                              newLobbyMode === mode.value ? "bg-emerald-500/15 text-emerald-300" : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Oyuncu Sayısı</label>
                {/* DÜZELTME: 2'ye 2 (COMBAT2V2) modu seçilince en fazla 1 kişi eksik olabilir,
                    bu yüzden artık otomatik 1'e sabitleniyor ve değiştirilemiyor. */}
                <select
                  id="lobbyPlayerCount"
                  value={newLobbyMode === "COMBAT2V2" ? "1" : newLobbyPlayerCount}
                  onChange={(e) => setNewLobbyPlayerCount(e.target.value)}
                  disabled={newLobbyMode === "COMBAT2V2"}
                  className="bg-black border border-white/5 focus:border-emerald-500/50 rounded-xl h-11 px-3 text-xs font-bold text-white outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Min Rütbe</label>
                <select id="lobbyMinRank" defaultValue="Bronze" className="bg-black border border-white/5 focus:border-emerald-500/50 rounded-xl h-11 px-3 text-xs font-bold text-white outline-none w-full">
                  <option value="Unranked">Derecesiz</option>
                  <option value="Iron">Demir</option>
                  <option value="Bronze">Bronz</option>
                  <option value="Silver">Gümüş</option>
                  <option value="Gold">Altın</option>
                  <option value="Plat">Platin</option>
                  <option value="Dia">Elmas</option>
                  <option value="Ascendant">Yücelik</option>
                  <option value="Immortal">Ölümsüzlük</option>
                  <option value="Radiant">Radyant</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Maks Rütbe</label>
                <select id="lobbyMaxRank" defaultValue="Gold" className="bg-black border border-white/5 focus:border-emerald-500/50 rounded-xl h-11 px-3 text-xs font-bold text-white outline-none w-full">
                  <option value="Unranked">Derecesiz</option>
                  <option value="Iron">Demir</option>
                  <option value="Bronze">Bronz</option>
                  <option value="Silver">Gümüş</option>
                  <option value="Gold">Altın</option>
                  <option value="Plat">Platin</option>
                  <option value="Dia">Elmas</option>
                  <option value="Ascendant">Yücelik</option>
                  <option value="Immortal">Ölümsüzlük</option>
                  <option value="Radiant">Radyant</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Mesaj (Opsiyonel)</label>
              <input
                type="text"
                id="lobbyMessage"
                placeholder="Sakin oyuncular arıyorum..."
                className="bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-xl h-11 px-4 text-xs font-bold text-white outline-none w-full"
              />
            </div>

            <div className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-4 h-11">
              <span className="text-[11px] font-bold text-white/70">🎙 Mikrofon Zorunlu</span>
              <button
                type="button"
                onClick={() => setMicRequired((v) => !v)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${micRequired ? "bg-emerald-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${micRequired ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            {/* DÜZELTME: %25 rütbe sınırı artık sadece "Dereceli" modda etkinleştirilebiliyor —
                diğer modlarda (Derecesiz, Ölüm Maçı, Spike Rush vb.) rütbe kavramı olmadığı
                için bu seçenek anlamsızdı. Dereceli değilken buton devre dışı ve soluk gösterilir. */}
            <div className={`flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-4 h-11 transition-opacity duration-150 ${newLobbyMode !== "RANKED" ? "opacity-40" : ""}`}>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white/70">%25 Rütbe Sınırı</span>
                {newLobbyMode !== "RANKED" && (
                  <span className="text-[9px] text-white/30">Sadece Rekabete Dayalı modda kullanılabilir</span>
                )}
              </div>
              <button
                type="button"
                disabled={newLobbyMode !== "RANKED"}
                onClick={() => setRankCutoff25((v) => !v)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 disabled:cursor-not-allowed ${rankCutoff25 ? "bg-emerald-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${rankCutoff25 ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setIsLobbyModalOpen(false)}
                className="w-full h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white transition duration-150"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  const partyCode = ((document.getElementById("lobbyPartyCode") as HTMLInputElement)?.value || "").trim().toUpperCase();
                  if (partyCode && !/^[A-Z0-9]{6}$/.test(partyCode)) {
                    setLobbyCodeError("Girmeye çalıştığınız kod 6 karakter olmalıdır (Valorant parti kodu formatı).");
                    return;
                  }
                  setLobbyCodeError("");
                  // DÜZELTME: mod artık controlled state'ten (newLobbyMode) okunuyor, DOM'dan değil —
                  // select artık React tarafından yönetiliyor (Premier/Hızlı Oyun eklenmesiyle birlikte).
                  const mode = newLobbyMode;
                  const playerCount = mode === "COMBAT2V2" ? "1" : newLobbyPlayerCount;
                  const minRank = (document.getElementById("lobbyMinRank") as HTMLSelectElement)?.value || "Bronze";
                  const maxRank = (document.getElementById("lobbyMaxRank") as HTMLSelectElement)?.value || "Gold";
                  const message = (document.getElementById("lobbyMessage") as HTMLInputElement)?.value || "";

                  const finalCode = partyCode || Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

                  const newLobby: LobbyItem = {
                    id: Date.now(),
                    nick: currentUser || "Anonim Oyuncu",
                    minRank,
                    maxRank,
                    mode,
                    mic: micRequired,
                    slots: `${playerCount}/5`,
                    code: finalCode,
                    time: "0dk",
                    region: "TR",
                    message: message.trim() || undefined,
                    playerCount: parseInt(playerCount),
                    rankCutoff: rankCutoff25,
                    createdAt: Date.now(),
                    avatarId: selectedAvatar?.id || null,
                  };

                  // Önce ekranda anında göster, sonra Supabase'e kalıcı olarak kaydet
                  setLobbies((prev) => [newLobby, ...prev]);

                  fetch("/api/lobbies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      nick: newLobby.nick, minRank, maxRank, mode, mic: micRequired,
                      slots: newLobby.slots, code: finalCode, message: newLobby.message,
                      playerCount: newLobby.playerCount, rankCutoff: rankCutoff25,
                      avatarId: selectedAvatar?.id || null, // YENİ: kartlarda avatar gösterebilmek için
                    }),
                  })
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => {
                      if (!data?.lobby) return;
                      setLobbies((prev) => prev.map((l) => (l.id === newLobby.id ? { ...l, id: data.lobby.id } : l)));
                    })
                    .catch(() => {}); // /api/lobbies henüz eklenmemişse sessizce geç (yerelde görünmeye devam eder)

                  setIsLobbyModalOpen(false);
                  setRankCutoff25(false);
                  setMicRequired(true);
                }}
                className="w-full h-11 bg-[#ff4655] hover:bg-red-600 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition duration-150"
              >
                + Lobiyi Yayınla
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </motion.section>
)}

</AnimatePresence>

      {/* FOOTER BÖLÜMÜ (DEĞİŞMEDİ) */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#0a0a0f]/95 pt-16 pb-12 transform-gpu">
        <div className="w-full max-w-[1400px] mx-auto px-6 flex flex-col gap-12">
          <div className="text-left">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest opacity-80">İNFİNİTY.GG HAKKINDA</h2>
            <p className="mt-3 text-white/50 leading-relaxed text-xs max-w-4xl">
             "Infınity Network, Valorant oyuncularının kendi performanslarını detaylıca analiz edebileceği, profesyonel oyuncuların nişangahları keşfedebileceği,oyun içi eğlenceli bilgi yarışmalarını ve sorularını çözebileceği,stratejiler geliştirebileceği aynı zamanda oyuncuların birbirine oyun arkadaşı bulmasını sağlayan tamamen Türk oyuncu topluluğuna yönelik kapsamlı bir takip platformudur. Kullanıcılar kendi Riot ID'leri ile giriş yaparak maç geçmişlerini, K/D oranlarını ve rütbe ilerlemelerini detaylı bir şekilde görüntüleyebilirler."
            </p>
          </div>

          {/* DÜZELTME: "Mobil uygulama" banner'ı kaldırıldı (henüz bir mobil uygulama yok) —
              yerine gerçekte var olan Discord sunucusuna yönlendiren bir banner kondu. */}
          <div className="w-full bg-[#14151a] border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-5 z-10">
              <div className="w-14 h-14 relative flex-shrink-0 rounded-xl overflow-hidden border border-white/5 bg-[#5865F2]/10 flex items-center justify-center">
                <Image src="/dc.png" alt="Discord" fill className="object-cover" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold tracking-wide uppercase text-white">TOPLULUĞUMUZA KATIL</h3>
                <p className="text-xs text-white/40 mt-1">Diğer oyuncularla tanış, güncellemelerden ilk sen haberdar ol.</p>
              </div>
            </div>
            <a href="https://discord.gg/4aZPrH67HH" target="_blank" rel="noopener noreferrer" className="z-10 px-6 py-2.5 bg-[#ff4655] hover:bg-red-600 transition-colors duration-200 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg">discord'a katıl</a>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-[11px] text-white/40 font-medium">
            <div className="flex flex-col gap-3 text-left max-w-4xl">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/60">
                <button
                  onClick={() => { setActiveTab("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-white font-semibold hover:text-[#ff4655] transition-colors duration-150"
                >
                  2026 © Infinity Network
                </button>
                <button onClick={() => setLegalModalTab("privacy")} className="hover:text-white transition">Gizlilik Politikası</button>
                <button onClick={() => setLegalModalTab("terms")} className="hover:text-white transition">Kullanım Şartları</button>
                <button onClick={() => setLegalModalTab("support")} className="hover:text-white transition">Destek</button>
              </div>
              <p className="leading-relaxed text-[10px]">
                Infinity Tracker, Riot Games tarafından onaylanmamıştır ve Riot Games'in resmi görüşlerini yansıtmaz.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* DÜZELTME: X (Twitter) logosu, sitenin kendi logosuyla değiştirildi */}
              <div className="w-10 h-10 relative rounded-lg overflow-hidden border border-white/10 bg-black/40 p-2"><Image src="/logo.png" alt="Infinity.gg" fill className="object-contain" /></div>
              <a href="https://discord.gg/4aZPrH67HH" target="_blank" rel="noopener noreferrer" className="w-10 h-10 relative rounded-lg overflow-hidden border border-white/10 block hover:border-[#ff4655]/50 transition-colors duration-150">
                <Image src="/dc.png" alt="Discord" fill className="object-cover" />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}

// DÜZELTME: Next.js, useSearchParams() kullanan bileşenlerin bir <Suspense> sınırı içinde
// olmasını istiyor (aksi halde `next build` hata verir). PageContent zaten tüm gerçek
// sayfayı içeriyor, burada sadece Suspense ile sarmalıyoruz — davranış hiç değişmedi,
// yalnızca build uyumluluğu için gerekliydi.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
