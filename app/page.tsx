"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
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

// YENİ (istek — "quiz soru bankasını çevirmek zorundayız, yoksa anlamı kalmaz"): quiz artık
// TEK bir (TR) soru bankası değil, dil başına AYRI bir soru bankası kullanıyor. Üç dildeki
// sorular aynı id'lerle 1:1 eşleşiyor (aynı konu, aynı doğru cevap, farklı dilde) — böylece
// biri "id 7'yi gördüm" dediğinde üç dilde de aynı soru anlamına geliyor.
const QUIZ_QUESTIONS_BY_LANG: Record<string, { id: number; question: string; options: string[]; answer: string }[]> = {
  TR: [
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
  },
  {
    id: 11,
    question: "Valorant'ta standart bir Dereceli/Derecesiz maçı kazanmak için önce kaç raunt kazanmak gerekir?",
    options: ["12", "13", "14", "16"],
    answer: "13",
  },
  {
    id: 12,
    question: "Chamber ajanının lore'una göre kökeni hangi ülkedir?",
    options: ["Fransa", "İngiltere", "İtalya", "Almanya"],
    answer: "Fransa",
  },
  {
    id: 13,
    question: "Sage'in ölmüş bir takım arkadaşını diriltmesini sağlayan ulti yeteneğinin adı nedir?",
    options: ["Yavaşlatma Kürecikleri", "İyileştirme Kürecikleri", "Diriliş (Resurrection)", "Bariyer Küresi"],
    answer: "Diriliş (Resurrection)",
  },
  {
    id: 14,
    question: "İtalya/Venedik esintili kanallarıyla bilinen Valorant haritası hangisidir?",
    options: ["Bind", "Split", "Ascent", "Fracture"],
    answer: "Ascent",
  },
  {
    id: 15,
    question: "Fade ajanının lore'una göre kökeni hangi ülkedir?",
    options: ["Türkiye", "Yunanistan", "Mısır", "İran"],
    answer: "Türkiye",
  },
  {
    id: 16,
    question: "Neon ajanının lore'una göre kökeni hangi ülkedir?",
    options: ["Endonezya", "Filipinler", "Vietnam", "Tayland"],
    answer: "Filipinler",
  },
  {
    id: 17,
    question: "Hangi rol, raunt başında ilk giriş/açılış vuruşlarını yapmakla öne çıkar?",
    options: ["Controller (Kontrolcü)", "Sentinel (Gözcü)", "Initiator (Girişçi)", "Duelist (Vurucu)"],
    answer: "Duelist (Vurucu)",
  },
  {
    id: 18,
    question: "Cypher ajanının lore'una göre kökeni hangi ülkedir?",
    options: ["Fas", "Mısır", "Suudi Arabistan", "BAE"],
    answer: "Fas",
  },
  {
    id: 19,
    question: "Sova ajanının lore'una göre kökeni hangi ülkedir?",
    options: ["Rusya", "Ukrayna", "Polonya", "Kazakistan"],
    answer: "Rusya",
  },
  {
    id: 20,
    question: "Viper'ın haritaya dev bir toksik gaz odası kuran ulti yeteneğinin adı nedir?",
    options: ["Toksik Çığlık", "Yıkım Odası (Viper's Pit)", "Yılan Tuzağı", "Zehir Bulutu"],
    answer: "Yıkım Odası (Viper's Pit)",
  },
  {
    id: 21,
    question: "Aşağıdakilerden hangisi bir 'Initiator' (Girişçi) ajan DEĞİLDİR?",
    options: ["Sova", "Breach", "Skye", "Omen"],
    answer: "Omen",
  },
  {
    id: 22,
    question: "Valorant, dünya genelinde (kapalı beta değil) resmi olarak hangi yıl piyasaya sürüldü?",
    options: ["2018", "2019", "2020", "2021"],
    answer: "2020",
  },
  {
    id: 23,
    question: "Riot Games'in genel merkezi hangi şehirdedir?",
    options: ["Los Angeles", "Seattle", "San Francisco", "New York"],
    answer: "Los Angeles",
  },
  {
    id: 24,
    question: "Killjoy'un düşmanları yavaşlatıp yere çivileyen kurulabilir yeteneğinin adı nedir?",
    options: ["Alarm Botu", "Kilit Turret", "Nanoswarm", "Kırılgan Alan (Lockdown)"],
    answer: "Kırılgan Alan (Lockdown)",
  },
  {
    id: 25,
    question: "Bir Spike (bomba) yerleştirildikten sonra patlamasına kaç saniye kalır?",
    options: ["35 saniye", "40 saniye", "45 saniye", "50 saniye"],
    answer: "45 saniye",
  },
  {
    id: 26,
    question: "Valorant hangi yıl resmi olarak (kapalı beta değil) piyasaya sürüldü?",
    options: ["2019", "2020", "2021", "2022"],
    answer: "2020",
  },
  {
    id: 27,
    question: "Valorant'ı geliştiren şirket hangisidir?",
    options: ["Valve", "Riot Games", "Epic Games", "Blizzard"],
    answer: "Riot Games",
  },
  {
    id: 28,
    question: "Valorant'ta oynanabilir karakterlere verilen genel isim nedir?",
    options: ["Şampiyon", "Ajan", "Kahraman", "Operatör"],
    answer: "Ajan",
  },
  {
    id: 29,
    question: "Standart bir Valorant maçında bir takım kaç oyuncudan oluşur?",
    options: ["4", "5", "6", "7"],
    answer: "5",
  },
  {
    id: 30,
    question: "Aşağıdakilerden hangisi bir Valorant haritası DEĞİLDİR?",
    options: ["Icebox", "Fracture", "Dust2", "Lotus"],
    answer: "Dust2",
  },
  {
    id: 31,
    question: "Valorant'ta yetenek/silah satın almak için kullanılan oyun içi para birimi nedir?",
    options: ["Kredi (Credits)", "Altın (Gold)", "Puan (Points)", "Enerji (Energy)"],
    answer: "Kredi (Credits)",
  },
  {
    id: 32,
    question: "Reyna'nın öldürdüğü düşmanların bıraktığı, içine girilince can ya da görünmezlik kazandıran obje nedir?",
    options: ["Ruh Küresi (Soul Orb)", "Enerji Topu", "Can Kalkanı", "Nur Küresi"],
    answer: "Ruh Küresi (Soul Orb)",
  },
  {
    id: 33,
    question: "Yoru'yu kısa süreliğine görünmez ve zarar alamaz hâle getiren ultisinin adı nedir?",
    options: ["Boyutsal Kaçış (Dimensional Drift)", "Gölge Sıçraması", "Fantom Adım", "Rüzgar Yürüyüşü"],
    answer: "Boyutsal Kaçış (Dimensional Drift)",
  },
  {
    id: 34,
    question: "Brimstone'un haritanın herhangi bir noktasına hava saldırısı çağırdığı ultisinin adı nedir?",
    options: ["Orbital Strike (Yörünge Saldırısı)", "Sky Smoke", "Stim Beacon", "Incendiary"],
    answer: "Orbital Strike (Yörünge Saldırısı)",
  },
  {
    id: 35,
    question: "Cypher'ın düşmanları yakalayıp konumlarını açığa çıkaran tuzak yeteneğinin adı nedir?",
    options: ["Casus Kamerası", "Tripwire (Tuzak Teli)", "Cyber Cage", "Neural Theft"],
    answer: "Tripwire (Tuzak Teli)",
  },
  {
    id: 36,
    question: "Raze'nin fırlattığı, düşmanı bulup peşinden koşan küçük patlayıcı robotunun adı nedir?",
    options: ["Boom Bot", "Blast Pack", "Showstopper", "Paint Shells"],
    answer: "Boom Bot",
  },
  {
    id: 37,
    question: "Skye'ın müttefiklerin canını iyileştirip hızını artıran yeteneğinin adı nedir?",
    options: ["Regrowth (Yeniden Filizlenme)", "Trailblazer", "Guiding Light", "Seekers"],
    answer: "Regrowth (Yeniden Filizlenme)",
  },
  {
    id: 38,
    question: "KAY/O'nun isabet ettiği düşmanın yeteneklerini geçici olarak devre dışı bırakan (suppress) fırlatma bıçağının adı nedir?",
    options: ["ZERO/POINT", "FLASH/DRIVE", "FRAG/MENT", "null/cmd"],
    answer: "ZERO/POINT",
  },
  {
    id: 39,
    question: "Viper'ın haritada uzun süre kalıcı, hasar veren toksik bir duvar oluşturan yeteneğinin adı nedir?",
    options: ["Toxic Screen (Zehir Perdesi)", "Poison Cloud", "Snake Bite", "Pit"],
    answer: "Toxic Screen (Zehir Perdesi)",
  },
  {
    id: 40,
    question: "Sage'in ölü bir müttefik oyuncuyu diriltebildiği ultisinin adı nedir?",
    options: ["Resurrection (Diriliş)", "Healing Orb", "Barrier Orb", "Slow Orb"],
    answer: "Resurrection (Diriliş)",
  },
  {
    id: 41,
    question: "Valorant'ın en üst düzey uluslararası şampiyonluk turnuvasının adı nedir?",
    options: ["Valorant Champions", "Valorant World Cup", "Valorant Masters Global", "Valorant Grand Slam"],
    answer: "Valorant Champions",
  },
  {
    id: 42,
    question: "Valorant'ın profesyonel yarış sistemine (Champions Tour) verilen kısaltma nedir?",
    options: ["VCT", "VWC", "VGL", "VCS"],
    answer: "VCT",
  },
  {
    id: 43,
    question: "Aşağıdaki silahlardan hangisi bir bıçak (melee) DEĞİLDİR?",
    options: ["Karambit", "Butterfly Knife", "Judge", "Talon Blade"],
    answer: "Judge",
  },
  {
    id: 44,
    question: "Maç istatistiklerinde geçen \"ACS\" kısaltması neyin karşılığıdır?",
    options: ["Average Combat Score", "Attack Combo System", "Agent Class Score", "Active Combat Stats"],
    answer: "Average Combat Score",
  },
  {
    id: 45,
    question: "Astra'nın haritanın herhangi bir noktasından tüm yeteneklerini yönetebildiği özel moduna ne ad verilir?",
    options: ["Astral Form (Yıldız Formu)", "Cosmic View", "Star Map", "Nova Pulse"],
    answer: "Astral Form (Yıldız Formu)",
  },
  ],
  US: [
  { id: 1, question: "Which agent's ultimate ability is called 'Orbital Strike'?", options: ["Breach", "Brimstone", "Sova", "Gekko"], answer: "Brimstone" },
  { id: 2, question: "In Valorant, what is a player's total health (HP + Shield) with full Heavy Shields?", options: ["125", "140", "150", "175"], answer: "150" },
  { id: 3, question: "Which of the following maps has 3 bomb sites (A, B, C)?", options: ["Bind", "Haven", "Ascent", "Split"], answer: "Haven" },
  { id: 4, question: "How much damage does a headshot deal with the Vandal?", options: ["150", "156", "160", "145"], answer: "160" },
  { id: 5, question: "Which Controller agent deploys a 'Star' to place smokes anywhere on the map?", options: ["Omen", "Astra", "Viper", "Clove"], answer: "Astra" },
  { id: 6, question: "Which map was in Valorant's closed beta and was later removed, then reworked before returning?", options: ["Split", "Bind", "Ascent", "Breeze"], answer: "Split" },
  { id: 7, question: "Which of the following agents is a Sentinel?", options: ["Deadlock", "Fade", "Harbor", "Iso"], answer: "Deadlock" },
  { id: 8, question: "Exactly how many seconds after being planted does the Spike detonate?", options: ["35", "40", "45", "50"], answer: "45" },
  { id: 9, question: "Which key do you hold to activate Jett's passive drift while airborne?", options: ["Shift", "Ctrl", "Space", "E Key"], answer: "Space" },
  { id: 10, question: "What is the Operator's body-shot damage?", options: ["120", "135", "150", "160"], answer: "150" },
  { id: 11, question: "In a standard Competitive/Unrated match, how many rounds must a team win first to win the match?", options: ["12", "13", "14", "16"], answer: "13" },
  { id: 12, question: "According to his lore, which country is Chamber from?", options: ["France", "England", "Italy", "Germany"], answer: "France" },
  { id: 13, question: "What is the name of Sage's ultimate ability that revives a dead teammate?", options: ["Slow Orb", "Healing Orb", "Resurrection", "Barrier Orb"], answer: "Resurrection" },
  { id: 14, question: "Which Valorant map is known for its Italy/Venice-inspired canals?", options: ["Bind", "Split", "Ascent", "Fracture"], answer: "Ascent" },
  { id: 15, question: "According to her lore, which country is Fade from?", options: ["Turkey", "Greece", "Egypt", "Iran"], answer: "Turkey" },
  { id: 16, question: "According to her lore, which country is Neon from?", options: ["Indonesia", "Philippines", "Vietnam", "Thailand"], answer: "Philippines" },
  { id: 17, question: "Which role stands out for making the team's opening entries at the start of a round?", options: ["Controller", "Sentinel", "Initiator", "Duelist"], answer: "Duelist" },
  { id: 18, question: "According to his lore, which country is Cypher from?", options: ["Morocco", "Egypt", "Saudi Arabia", "UAE"], answer: "Morocco" },
  { id: 19, question: "According to his lore, which country is Sova from?", options: ["Russia", "Ukraine", "Poland", "Kazakhstan"], answer: "Russia" },
  { id: 20, question: "What is the name of Viper's ultimate that creates a giant toxic gas room on the map?", options: ["Toxic Scream", "Viper's Pit", "Snake Trap", "Poison Cloud"], answer: "Viper's Pit" },
  { id: 21, question: "Which of the following is NOT an Initiator agent?", options: ["Sova", "Breach", "Skye", "Omen"], answer: "Omen" },
  { id: 22, question: "In which year was Valorant officially released worldwide (not the closed beta)?", options: ["2018", "2019", "2020", "2021"], answer: "2020" },
  { id: 23, question: "In which city is Riot Games' headquarters located?", options: ["Los Angeles", "Seattle", "San Francisco", "New York"], answer: "Los Angeles" },
  { id: 24, question: "What is the name of Killjoy's placeable device that slows and roots enemies?", options: ["Alarmbot", "Turret", "Nanoswarm", "Lockdown"], answer: "Lockdown" },
  { id: 25, question: "How many seconds after being planted does the Spike detonate?", options: ["35 seconds", "40 seconds", "45 seconds", "50 seconds"], answer: "45 seconds" },
  { id: 26, question: "In which year was Valorant officially released (not the closed beta)?", options: ["2019", "2020", "2021", "2022"], answer: "2020" },
  { id: 27, question: "Which company developed Valorant?", options: ["Valve", "Riot Games", "Epic Games", "Blizzard"], answer: "Riot Games" },
  { id: 28, question: "What is the general term for playable characters in Valorant?", options: ["Champion", "Agent", "Hero", "Operator"], answer: "Agent" },
  { id: 29, question: "How many players make up one team in a standard Valorant match?", options: ["4", "5", "6", "7"], answer: "5" },
  { id: 30, question: "Which of the following is NOT a Valorant map?", options: ["Icebox", "Fracture", "Dust2", "Lotus"], answer: "Dust2" },
  { id: 31, question: "What is the in-game currency used to buy weapons and abilities in Valorant?", options: ["Credits", "Gold", "Points", "Energy"], answer: "Credits" },
  { id: 32, question: "What is the object dropped by enemies Reyna kills, granting health or invisibility when consumed?", options: ["Soul Orb", "Energy Ball", "Health Shield", "Light Orb"], answer: "Soul Orb" },
  { id: 33, question: "What is the name of Yoru's ultimate that makes him briefly invisible and invulnerable?", options: ["Dimensional Drift", "Shadow Leap", "Phantom Step", "Wind Walk"], answer: "Dimensional Drift" },
  { id: 34, question: "What is the name of Brimstone's ultimate that calls in an airstrike anywhere on the map?", options: ["Orbital Strike", "Sky Smoke", "Stim Beacon", "Incendiary"], answer: "Orbital Strike" },
  { id: 35, question: "What is the name of Cypher's trap ability that catches enemies and reveals their location?", options: ["Spycam", "Tripwire", "Cyber Cage", "Neural Theft"], answer: "Tripwire" },
  { id: 36, question: "What is the name of Raze's small explosive robot that hunts down and chases an enemy?", options: ["Boom Bot", "Blast Pack", "Showstopper", "Paint Shells"], answer: "Boom Bot" },
  { id: 37, question: "What is the name of Skye's ability that heals allies and increases their speed?", options: ["Regrowth", "Trailblazer", "Guiding Light", "Seekers"], answer: "Regrowth" },
  { id: 38, question: "What is the name of KAY/O's throwing knife that temporarily suppresses an enemy's abilities on hit?", options: ["ZERO/POINT", "FLASH/DRIVE", "FRAG/MENT", "null/cmd"], answer: "ZERO/POINT" },
  { id: 39, question: "What is the name of Viper's ability that creates a long-lasting, damaging toxic wall?", options: ["Toxic Screen", "Poison Cloud", "Snake Bite", "Pit"], answer: "Toxic Screen" },
  { id: 40, question: "What is the name of Sage's ultimate that revives a dead teammate?", options: ["Resurrection", "Healing Orb", "Barrier Orb", "Slow Orb"], answer: "Resurrection" },
  { id: 41, question: "What is the name of Valorant's top-tier international championship tournament?", options: ["Valorant Champions", "Valorant World Cup", "Valorant Masters Global", "Valorant Grand Slam"], answer: "Valorant Champions" },
  { id: 42, question: "What is the abbreviation for Valorant's professional competitive circuit?", options: ["VCT", "VWC", "VGL", "VCS"], answer: "VCT" },
  { id: 43, question: "Which of the following weapons is NOT a melee weapon?", options: ["Karambit", "Butterfly Knife", "Judge", "Talon Blade"], answer: "Judge" },
  { id: 44, question: "What does the abbreviation \"ACS\" stand for in match stats?", options: ["Average Combat Score", "Attack Combo System", "Agent Class Score", "Active Combat Stats"], answer: "Average Combat Score" },
  { id: 45, question: "What is the name of Astra's special mode that lets her manage all her abilities from anywhere on the map?", options: ["Astral Form", "Cosmic View", "Star Map", "Nova Pulse"], answer: "Astral Form" },
  ],
  DE: [
  { id: 1, question: "Welcher Agent besitzt die ultimative Fähigkeit 'Orbital Strike'?", options: ["Breach", "Brimstone", "Sova", "Gekko"], answer: "Brimstone" },
  { id: 2, question: "Wie hoch ist die Gesamtgesundheit (HP + Schild) eines Spielers mit vollem schwerem Schild in Valorant?", options: ["125", "140", "150", "175"], answer: "150" },
  { id: 3, question: "Welche der folgenden Karten hat 3 Bombenplätze (A, B, C)?", options: ["Bind", "Haven", "Ascent", "Split"], answer: "Haven" },
  { id: 4, question: "Wie viel Schaden verursacht ein Kopfschuss mit der Vandal?", options: ["150", "156", "160", "145"], answer: "160" },
  { id: 5, question: "Welcher Controller-Agent platziert einen 'Stern', um überall auf der Karte Rauch einzusetzen?", options: ["Omen", "Astra", "Viper", "Clove"], answer: "Astra" },
  { id: 6, question: "Welche Karte war in der geschlossenen Beta von Valorant, wurde später entfernt und kehrte überarbeitet zurück?", options: ["Split", "Bind", "Ascent", "Breeze"], answer: "Split" },
  { id: 7, question: "Welcher der folgenden Agenten ist ein Sentinel?", options: ["Deadlock", "Fade", "Harbor", "Iso"], answer: "Deadlock" },
  { id: 8, question: "Nach genau wie vielen Sekunden explodiert der Spike, nachdem er platziert wurde?", options: ["35", "40", "45", "50"], answer: "45" },
  { id: 9, question: "Welche Taste hält man gedrückt, um Jetts passives Gleiten in der Luft zu nutzen?", options: ["Shift", "Strg", "Leertaste", "E-Taste"], answer: "Leertaste" },
  { id: 10, question: "Wie viel Körpertreffer-Schaden verursacht der Operator?", options: ["120", "135", "150", "160"], answer: "150" },
  { id: 11, question: "Wie viele Runden muss ein Team in einem Standard-Wertungsspiel/Unrated-Match zuerst gewinnen?", options: ["12", "13", "14", "16"], answer: "13" },
  { id: 12, question: "Aus welchem Land stammt Chamber laut seiner Lore?", options: ["Frankreich", "England", "Italien", "Deutschland"], answer: "Frankreich" },
  { id: 13, question: "Wie heißt Sages ultimative Fähigkeit, die einen toten Teamkollegen wiederbelebt?", options: ["Verlangsamungskugel", "Heilkugel", "Resurrection", "Barrierekugel"], answer: "Resurrection" },
  { id: 14, question: "Welche Valorant-Karte ist für ihre von Italien/Venedig inspirierten Kanäle bekannt?", options: ["Bind", "Split", "Ascent", "Fracture"], answer: "Ascent" },
  { id: 15, question: "Aus welchem Land stammt Fade laut ihrer Lore?", options: ["Türkei", "Griechenland", "Ägypten", "Iran"], answer: "Türkei" },
  { id: 16, question: "Aus welchem Land stammt Neon laut ihrer Lore?", options: ["Indonesien", "Philippinen", "Vietnam", "Thailand"], answer: "Philippinen" },
  { id: 17, question: "Welche Rolle zeichnet sich dadurch aus, zu Rundenbeginn die ersten Eröffnungsduelle des Teams zu führen?", options: ["Controller", "Sentinel", "Initiator", "Duellant"], answer: "Duellant" },
  { id: 18, question: "Aus welchem Land stammt Cypher laut seiner Lore?", options: ["Marokko", "Ägypten", "Saudi-Arabien", "VAE"], answer: "Marokko" },
  { id: 19, question: "Aus welchem Land stammt Sova laut seiner Lore?", options: ["Russland", "Ukraine", "Polen", "Kasachstan"], answer: "Russland" },
  { id: 20, question: "Wie heißt Vipers Ultimate, das einen riesigen, giftigen Gasraum auf der Karte erschafft?", options: ["Toxic Scream", "Viper's Pit", "Schlangenfalle", "Giftwolke"], answer: "Viper's Pit" },
  { id: 21, question: "Welcher der Folgenden ist KEIN Initiator-Agent?", options: ["Sova", "Breach", "Skye", "Omen"], answer: "Omen" },
  { id: 22, question: "In welchem Jahr wurde Valorant offiziell weltweit veröffentlicht (nicht die geschlossene Beta)?", options: ["2018", "2019", "2020", "2021"], answer: "2020" },
  { id: 23, question: "In welcher Stadt befindet sich der Hauptsitz von Riot Games?", options: ["Los Angeles", "Seattle", "San Francisco", "New York"], answer: "Los Angeles" },
  { id: 24, question: "Wie heißt Killjoys platzierbare Fähigkeit, die Gegner verlangsamt und am Boden festhält?", options: ["Alarmbot", "Turret", "Nanoswarm", "Lockdown"], answer: "Lockdown" },
  { id: 25, question: "Wie viele Sekunden nach dem Platzieren explodiert der Spike?", options: ["35 Sekunden", "40 Sekunden", "45 Sekunden", "50 Sekunden"], answer: "45 Sekunden" },
  { id: 26, question: "In welchem Jahr wurde Valorant offiziell veröffentlicht (nicht die geschlossene Beta)?", options: ["2019", "2020", "2021", "2022"], answer: "2020" },
  { id: 27, question: "Welches Unternehmen hat Valorant entwickelt?", options: ["Valve", "Riot Games", "Epic Games", "Blizzard"], answer: "Riot Games" },
  { id: 28, question: "Wie lautet der allgemeine Begriff für spielbare Charaktere in Valorant?", options: ["Champion", "Agent", "Held", "Operator"], answer: "Agent" },
  { id: 29, question: "Aus wie vielen Spielern besteht ein Team in einem Standard-Valorant-Match?", options: ["4", "5", "6", "7"], answer: "5" },
  { id: 30, question: "Welche der folgenden ist KEINE Valorant-Karte?", options: ["Icebox", "Fracture", "Dust2", "Lotus"], answer: "Dust2" },
  { id: 31, question: "Wie heißt die Ingame-Währung, mit der man in Valorant Waffen und Fähigkeiten kauft?", options: ["Credits", "Gold", "Punkte", "Energie"], answer: "Credits" },
  { id: 32, question: "Wie heißt das Objekt, das von Reynas getöteten Gegnern zurückbleibt und Leben oder Unsichtbarkeit gewährt?", options: ["Seelenkugel", "Energiekugel", "Lebensschild", "Lichtkugel"], answer: "Seelenkugel" },
  { id: 33, question: "Wie heißt Yorus Ultimate, das ihn kurzzeitig unsichtbar und unverwundbar macht?", options: ["Dimensional Drift", "Schattensprung", "Phantomschritt", "Windwandel"], answer: "Dimensional Drift" },
  { id: 34, question: "Wie heißt Brimstones Ultimate, mit dem er einen Luftschlag auf jeden Punkt der Karte ruft?", options: ["Orbital Strike", "Sky Smoke", "Stim Beacon", "Incendiary"], answer: "Orbital Strike" },
  { id: 35, question: "Wie heißt Cyphers Fallen-Fähigkeit, die Gegner fängt und ihre Position aufdeckt?", options: ["Spähkamera", "Tripwire", "Cyber Cage", "Neural Theft"], answer: "Tripwire" },
  { id: 36, question: "Wie heißt Razes kleiner explosiver Roboter, der einen Gegner aufspürt und verfolgt?", options: ["Boom Bot", "Blast Pack", "Showstopper", "Paint Shells"], answer: "Boom Bot" },
  { id: 37, question: "Wie heißt Skyes Fähigkeit, die Verbündete heilt und ihre Geschwindigkeit erhöht?", options: ["Regrowth", "Trailblazer", "Guiding Light", "Seekers"], answer: "Regrowth" },
  { id: 38, question: "Wie heißt KAY/Os Wurfmesser, das die Fähigkeiten eines getroffenen Gegners vorübergehend unterdrückt?", options: ["ZERO/POINT", "FLASH/DRIVE", "FRAG/MENT", "null/cmd"], answer: "ZERO/POINT" },
  { id: 39, question: "Wie heißt Vipers Fähigkeit, die eine lang anhaltende, schadensverursachende toxische Wand erschafft?", options: ["Toxic Screen", "Poison Cloud", "Snake Bite", "Pit"], answer: "Toxic Screen" },
  { id: 40, question: "Wie heißt Sages Ultimate, mit dem sie einen toten Teamkollegen wiederbeleben kann?", options: ["Resurrection", "Healing Orb", "Barrier Orb", "Slow Orb"], answer: "Resurrection" },
  { id: 41, question: "Wie heißt Valorants höchstes internationales Meisterschaftsturnier?", options: ["Valorant Champions", "Valorant World Cup", "Valorant Masters Global", "Valorant Grand Slam"], answer: "Valorant Champions" },
  { id: 42, question: "Wie lautet die Abkürzung für Valorants professionelle Wettkampfserie (Champions Tour)?", options: ["VCT", "VWC", "VGL", "VCS"], answer: "VCT" },
  { id: 43, question: "Welche der folgenden Waffen ist KEINE Nahkampfwaffe?", options: ["Karambit", "Butterfly Knife", "Judge", "Talon Blade"], answer: "Judge" },
  { id: 44, question: "Wofür steht die Abkürzung \"ACS\" in den Match-Statistiken?", options: ["Average Combat Score", "Attack Combo System", "Agent Class Score", "Active Combat Stats"], answer: "Average Combat Score" },
  { id: 45, question: "Wie heißt Astras Spezialmodus, mit dem sie all ihre Fähigkeiten von jedem Punkt der Karte aus steuern kann?", options: ["Astral Form", "Cosmic View", "Star Map", "Nova Pulse"], answer: "Astral Form" },
  ],
};

// ==========================================
// KELİME OYUNU — günlük harf rotasyonu
// ==========================================
// Her gün alfabenin bir sonraki harfiyle başlayan bir Valorant terimi soruluyor (A, B, C, Ç, D...
// sırayla), böylece kullanıcılar günler içinde tüm alfabeyi tamamlamış oluyor. "Ğ" bilerek
// listede yok — Türkçede hiçbir kelime "Ğ" ile başlamaz (yumuşak g), bu yüzden rotasyona
// dahil edilmedi. Q/W/X zaten Türk alfabesinde yok.
// Yalnızca Valorant'ta doğal karşılığı olan harfler. Türkçe özel harflerle zoraki
// kelimeler üretmek yerine gerçek oyun terimleri kullanılır.
const TR_ALPHABET_ROTATION = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "V", "Y"];

// DÜZELTME (istek): eskiden her harfin TEK bir kelimesi vardı ve günde sadece 1 harf
// (o günün sırasındaki harf) oynanabiliyordu — yani alfabenin tamamı bitene kadar 28 gün
// gerekiyordu. Artık HER HARFİN birden fazla varyantı var; her gün TÜM 28 harf birden
// oynanabiliyor (aşağıdaki getWordGameSetIndex() o günün "seti"ni seçiyor ve 28 kelime
// birlikte değişiyor). Yeni bir gün gelince tüm tahtayı yeni bir varyant setiyle değiştirmek
// için buraya üçüncü, dördüncü... bir varyant eklemen yeterli.
// YENİ (istek — "quiz soru bankasını ve kelime oyununu çevirmek zorundayız, yoksa anlamı
// kalmaz, bağla hepsini"): kelime oyunu artık TEK bir (TR) kelime bankası değil, dil başına
// AYRI bir kelime bankası kullanıyor (WORD_GAME_VARIANTS_BY_LANG). Harf rotasyonu (A,B,C...)
// üç dilde de aynı standart Latin harflerden oluştuğu için TR_ALPHABET_ROTATION üç dilde de
// ortak kullanılabiliyor — sadece o harfle başlayan KELİME ve İPUCU dile göre değişiyor.
// Her harf için en az 2 varyant var (getWordGameSetIndex() zaten sadece 0/1 arasında rotasyon
// yapıyor, bkz. aşağıdaki yorum), TR'deki gibi bazı harflerde daha fazlası mevcut.
const WORD_GAME_VARIANTS_BY_LANG: Record<string, Record<string, { word: string; clue: string }[]>> = {
  TR: {
  A: [
    { word: "ASTRA", clue: "Yıldızlarla haritanın her yerinden duman kontrolü sağlayan Kontrolcü ajan." },
    { word: "AKIN", clue: "Hızlı tempolu, kısa süren, rekabetsiz oyun moduna verilen isim (Swiftplay)." },
    { word: "ASCENT", clue: "İtalya esintili, ortada çan kulesi bulunan klasik Valorant haritası." },
    { word: "ARES", clue: "Takım başına sınırlı sayıda alınabilen, hızlı ateşli ağır makineli tüfek." },
    { word: "ACE", clue: "Bir oyuncunun tek raundda rakip takımın 5 üyesini de öldürmesine verilen isim." },
    { word: "AJAN", clue: "Valorant'ta oynanabilir her karaktere verilen genel isim." },
    { word: "ALAN", clue: "Sis, duman veya duvar gibi yeteneklerle düşmana kapatılan bölgeye verilen isim." },
  ],
  B: [
    { word: "BIND", clue: "Teleport kapılarıyla bilinen, Fas esintili Valorant haritası." },
    { word: "BREACH", clue: "Şok dalgalarıyla rakipleri sersemleten Avustralyalı Girişçi ajan." },
    { word: "BRIMSTONE", clue: "Uydu çağırıp hava desteği sağlayan Amerikalı Kontrolcü ajan." },
    { word: "BUCKY", clue: "Yakın mesafede güçlü, uzak mesafede zayıflayan pompalı tüfek." },
    { word: "BULLDOG", clue: "Vandal'a göre daha ucuz, yarı ve tam otomatik atış modu olan tüfek." },
    { word: "BOMBA", clue: "Spike'ın oyuncular arasında sıkça kullanılan diğer adı." },
    { word: "BÖLGE", clue: "Haritanın A/B gibi belirli bir kısmına verilen genel isim (site)." },
  ],
  C: [
    { word: "CYPHER", clue: "Kameralar ve tel tuzaklarıyla bilgi toplayan Gözcü ajan." },
    { word: "CHAMBER", clue: "Teleport eden tuzaklar kuran, Fransız kökenli Gözcü ajan." },
    { word: "CLASSIC", clue: "Her oyuncuya raunt başında ücretsiz verilen standart tabanca." },
    { word: "CLOVE", clue: "Öldüğünde geçici olarak dirilip yeteneklerini kullanabilen İskoç Kontrolcü ajan." },
    { word: "CAN", clue: "Bir oyuncunun hayatta kalma durumunu gösteren sayısal değer (HP)." },
    { word: "CEPHANE", clue: "Bir silahın içinde kalan mermi sayısına verilen isim." },
  ],
  D: [
    { word: "DEADLOCK", clue: "Buz temalı yetenekleriyle rakipleri hapseden Norveçli Gözcü ajan." },
    { word: "DÜELLOCU", clue: "Takımın açılış vuruşlarını yapan saldırgan role verilen isim." },
    { word: "DUMAN", clue: "Görüşü kapatan, alan kontrolü sağlayan temel yetenek türü (smoke)." },
    { word: "DEFANS", clue: "Spike'ı savunan tarafa verilen isim." },
    { word: "DÜŞMAN", clue: "Karşı takımdaki oyunculara verilen genel isim." },
    { word: "DİRİLTME", clue: "Sage'in ölü bir takım arkadaşını hayata döndürme yeteneği." },
  ],
  E: [
    { word: "EKO", clue: "Takımın silah almadan ya da ucuz ekipmanla oynadığı raunt türü." },
    { word: "EKONOMİ", clue: "Bir takımın silah/kalkan alımlarını yönettiği stratejik sisteme verilen isim." },
    { word: "ELMAS", clue: "Platin'in üstü, Yüce'nin altındaki rekabetçi rütbe (Diamond)." },
    { word: "EŞLEŞME", clue: "Oyuncuları rütbe/seviyeye göre birbirine denk takımlara ayıran sistem (matchmaking)." },
    { word: "EL", clue: "Bir raunt içinde oynanan saldırı/savunma döngüsüne oyuncuların verdiği gündelik isim." },
  ],
  F: [
    { word: "FRACTURE", clue: "H şeklinde, iki taraftan aynı anda saldırılabilen harita." },
    { word: "FRENZY", clue: "Otomatik ateş edebilen, ucuz rauntlarda tercih edilen tabanca." },
    { word: "FLAŞ", clue: "Rakibin ekranını beyaza boğup geçici olarak kör eden yetenek türü." },
    { word: "FARK", clue: "İki takım arasındaki skor veya güç dengesizliğine verilen genel isim." },
  ],
  G: [
    { word: "GEKKO", clue: "Yaratıklarını savaşa süren Girişçi ajan." },
    { word: "GUARDIAN", clue: "Yarı otomatik, tek atışta güçlü hasar veren tüfek." },
    { word: "GHOST", clue: "Sessiz atışlı, standart tabancaya göre daha güçlü tabanca." },
    { word: "GİRİŞÇİ", clue: "Takımın alana girişini kolaylaştıran yeteneklere sahip ajan rolü." },
    { word: "GÖZCÜ", clue: "Bilgi toplayan ve alan savunan ajan rolüne verilen isim (Sentinel)." },
  ],
  H: [
    { word: "HAVEN", clue: "Üç Spike alanına sahip tek Valorant haritası." },
    { word: "HARBOR", clue: "Su temelli yetenekleriyle alan kapatan Hintli Kontrolcü ajan." },
    { word: "HASAR", clue: "Bir saldırının rakibin canından düşürdüğü miktara verilen isim." },
    { word: "HIZ", clue: "Bir ajanın hareket kabiliyetine verilen genel terim." },
  ],
  I: [
    { word: "ISO", clue: "Bir el hasarını sıfırlayan kalkan yeteneğine sahip Düellocu ajan." },
    { word: "IRON", clue: "Rekabetçi modun en alt rütbesine verilen isim." },
    { word: "ISINMA", clue: "Maç başlamadan önce oyuncuların nişan alıştırması yaptığı süreye verilen isim (warm-up)." },
  ],
  J: [
    { word: "JETT", clue: "Rüzgarla sürüklenip havada süzülebilen, en popüler Düellocu ajanlardan biri." },
    { word: "JUDGE", clue: "Yakın mesafede geniş saçma deseniyle bilinen pompalı tüfek." },
  ],
  K: [
    { word: "KILLJOY", clue: "Robotları ve mayınlarıyla alan savunan Alman Gözcü ajan." },
    { word: "KARAMBİT", clue: "Eğri tasarımıyla tanınan popüler bir bıçak skin tipi." },
    { word: "KALKAN", clue: "Cana ek koruma sağlayan, raunt başında satın alınabilen ekipman." },
    { word: "KONTROLCÜ", clue: "Sis ve duman gibi yeteneklerle alanı bölen ajan rolü." },
    { word: "KAFA", clue: "Bir düşmanı tek vuruşta öldürebilen en hassas vuruş bölgesi (headshot)." },
  ],
  L: [
    { word: "LOTUS", clue: "Dönen kapılarıyla bilinen, Hint esintili Valorant haritası." },
    { word: "LİDER", clue: "Bir takımda kararları koordine eden oyuncuya verilen isim (IGL)." },
    { word: "LİG", clue: "Profesyonel takımların düzenli olarak karşılaştığı organizasyona verilen isim." },
  ],
  M: [
    { word: "MOLLY", clue: "Alan hasarı veren yanıcı/asit yeteneklere oyuncuların verdiği kısa isim." },
    { word: "MARSHAL", clue: "Tek kurşunluk, orta menzilli keskin nişancı tüfeği." },
    { word: "MAÇ", clue: "İki takımın karşılıklı oynadığı tam oyuna verilen isim." },
    { word: "MERMİ", clue: "Bir silahtan ateşlenen her bir atışa verilen isim." },
  ],
  N: [
    { word: "NEON", clue: "Elektrik hızıyla koşan Filipinli Düellocu ajan." },
    { word: "NİŞANGAH", clue: "Ekranın ortasında nişan almaya yarayan, özelleştirilebilir işaret." },
  ],
  O: [
    { word: "OMEN", clue: "Gölgelerin içinden teleport olabilen Kontrolcü ajan." },
    { word: "ODIN", clue: "Takım başına bir kez alınabilen, en yüksek hasarlı ağır makineli tüfek." },
    { word: "OPERATOR", clue: "Tek kurşunda neredeyse her yeri öldürebilen en pahalı keskin nişancı tüfeği." },
    { word: "ORTA", clue: "Haritanın A ve B bölgeleri arasındaki merkezi alanına verilen isim (mid)." },
  ],
  P: [
    { word: "PHOENIX", clue: "Ateşle kendini iyileştirebilen İngiliz Düellocu ajan." },
    { word: "PHANTOM", clue: "Sessiz atışlarıyla bilinen, Vandal'a rakip popüler tüfek." },
    { word: "PEARL", clue: "Su altı Portekiz şehri temalı Valorant haritası." },
    { word: "PLATİN", clue: "Altın'ın üstü, Elmas'ın altındaki rekabetçi rütbe (Platinum)." },
    { word: "PATLAMA", clue: "Spike'ın patlama anına verilen isim." },
  ],
  R: [
    { word: "RAZE", clue: "Patlayıcı yetenekleriyle bilinen Brezilyalı Düellocu ajan." },
    { word: "RAUNT", clue: "Bir maçın kazanılıp kaybedildiği en küçük birime verilen isim." },
    { word: "REYNA", clue: "Öldürdüğü rakiplerden can/görünmezlik emen Meksikalı Düellocu ajan." },
    { word: "RADYANT", clue: "Rekabetçi modun en üst, en zirve rütbesi." },
    { word: "ROTASYON", clue: "Bir takımın bir bölgeden diğerine hızlıca geçiş yapmasına verilen isim." },
  ],
  S: [
    { word: "SOVA", clue: "Ok atarak keşif yapan Rus Girişçi ajan." },
    { word: "SAGE", clue: "İyileştirme ve diriltme yetenekleriyle bilinen Çinli Gözcü ajan." },
    { word: "SHERIFF", clue: "Tek kurşunda kafadan öldürebilen güçlü, pahalı tabanca." },
    { word: "SPLIT", clue: "İki bölgeyi birbirine bağlayan halatlarıyla bilinen Japon esintili harita." },
    { word: "SPIKE", clue: "Saldıran takımın yerleştirip patlattığı bomba benzeri cihaza verilen isim." },
    { word: "SERİ", clue: "Art arda kazanılan raunt ya da maç sayısına verilen isim (streak)." },
  ],
  T: [
    { word: "TUZAK", clue: "Düşmanı yavaşlatan ya da açığa çıkaran yerleştirilebilir mekanizmalara verilen genel isim." },
    { word: "TIRMANIŞ", clue: "Sırayla farklı silahlarla ilerlenen eğlenceli oyun moduna verilen isim (Escalation)." },
    { word: "TEJO", clue: "Roketatarıyla alan hasarı veren Filipinli Girişçi ajan." },
    { word: "TAKAS", clue: "Bir takım arkadaşının öldüğü anda hemen o rakibi öldürmeye verilen isim (trade kill)." },
  ],
  V: [
    { word: "VANDAL", clue: "Tek kurşunda kafadan öldürebilen, en popüler tüfeklerden biri." },
    { word: "VALORANT", clue: "Bu oyunun kendi adı." },
    { word: "VIPER", clue: "Zehirli gaz ve duman perdeleriyle alan kontrolü sağlayan Amerikalı Kontrolcü ajan." },
    { word: "VURUŞ", clue: "Bir mermi ya da yeteneğin hedefe isabet etmesine verilen genel isim." },
  ],
  Y: [
    { word: "YORU", clue: "Gölge kopyası çıkarıp boyutlar arası kaçabilen Japon Düellocu ajan." },
    { word: "YAY", clue: "Sova'nın keşif için kullandığı temel silahına verilen isim." },
    { word: "YÜCE", clue: "Elmas'ın üstü, Ölümsüz'ün altındaki rekabetçi rütbe (Ascendant)." },
    { word: "YERLEŞTİRME", clue: "Spike'ı bir bölgeye bırakıp aktif hale getirme eylemine verilen isim (plant)." },
  ],
  },
  US: {
    A: [
      { word: "ASCENT", clue: "Italian-inspired map famous for its central bell tower." },
      { word: "AGENT", clue: "General term for any playable character in Valorant." },
    ],
    B: [
      { word: "BIND", clue: "Morocco-inspired map known for its one-way teleporters." },
      { word: "BUCKY", clue: "Shotgun that's strong up close but weak at range." },
    ],
    C: [
      { word: "CYPHER", clue: "Sentinel agent who gathers intel with cameras and tripwires." },
      { word: "CLASSIC", clue: "The standard sidearm every player starts each round with for free." },
    ],
    D: [
      { word: "DEADLOCK", clue: "Norwegian Sentinel agent with ice-themed abilities that trap enemies." },
      { word: "DUELIST", clue: "Aggressive role responsible for opening up sites for the team." },
    ],
    E: [
      { word: "ECO", clue: "A round where a team skips buying to save money for later." },
      { word: "ENEMY", clue: "General term for a player on the opposing team." },
    ],
    F: [
      { word: "FRACTURE", clue: "H-shaped map that can be attacked from both sides at once." },
      { word: "FLASH", clue: "Ability type that blinds enemies with a burst of light." },
    ],
    G: [
      { word: "GEKKO", clue: "Initiator agent who sends creatures into battle." },
      { word: "GHOST", clue: "Silenced sidearm, stronger than the free Classic." },
    ],
    H: [
      { word: "HAVEN", clue: "The only Valorant map with three bomb sites." },
      { word: "HEADSHOT", clue: "A shot to the most precise, instantly deadly hitbox." },
    ],
    I: [
      { word: "ISO", clue: "Duelist agent with a shield that resets after taking damage." },
      { word: "IRON", clue: "The very lowest rank in Competitive mode." },
    ],
    J: [
      { word: "JETT", clue: "One of the most popular Duelists, able to dash and glide on the wind." },
      { word: "JUDGE", clue: "Shotgun known for its wide spread at close range." },
    ],
    K: [
      { word: "KILLJOY", clue: "German Sentinel agent who defends sites with turrets and mines." },
      { word: "KNIFE", clue: "General term for a melee weapon, including collectible skins." },
    ],
    L: [
      { word: "LOTUS", clue: "India-inspired map known for its rotating doors." },
      { word: "LURKER", clue: "Slang for a player who hangs back to catch flanks or rotations." },
    ],
    M: [
      { word: "MOLLY", clue: "Slang for a molotov-style area-damage ability." },
      { word: "MARSHAL", clue: "Single-shot, mid-range sniper rifle." },
    ],
    N: [
      { word: "NEON", clue: "Filipino Duelist agent who runs with the speed of electricity." },
      { word: "NADE", clue: "Slang for a thrown grenade-type ability." },
    ],
    O: [
      { word: "OMEN", clue: "Controller agent who can teleport through the shadows." },
      { word: "OPERATOR", clue: "The most expensive sniper rifle, capable of one-shotting almost anywhere." },
    ],
    P: [
      { word: "PHOENIX", clue: "British Duelist agent who can heal himself with fire." },
      { word: "PHANTOM", clue: "Silenced rifle and Vandal's most popular rival." },
    ],
    R: [
      { word: "RAZE", clue: "Brazilian Duelist agent known for explosive abilities." },
      { word: "ROUND", clue: "The smallest unit of a match, either won or lost." },
    ],
    S: [
      { word: "SOVA", clue: "Russian Initiator agent who scouts using a recon bow." },
      { word: "SPIKE", clue: "The bomb-like device the attacking team plants and detonates." },
    ],
    T: [
      { word: "TEJO", clue: "Filipino Initiator agent who deals area damage with rockets." },
      { word: "TRAP", clue: "General term for placeable devices that slow or reveal enemies." },
    ],
    V: [
      { word: "VANDAL", clue: "One of the most popular rifles, a guaranteed one-shot headshot kill." },
      { word: "VIPER", clue: "American Controller agent who controls space with poison gas and smoke." },
    ],
    Y: [
      { word: "YORU", clue: "Japanese Duelist agent who can create a shadow clone and escape between dimensions." },
      { word: "YOLO", clue: "Slang for a risky, aggressive solo push with nothing to lose." },
    ],
  },
  DE: {
    A: [
      { word: "ASCENT", clue: "Italienisch inspirierte Karte, bekannt für ihren Glockenturm in der Mitte." },
      { word: "AGENT", clue: "Allgemeiner Begriff für jeden spielbaren Charakter in Valorant." },
    ],
    B: [
      { word: "BIND", clue: "Marokkanisch inspirierte Karte mit Einweg-Teleportern." },
      { word: "BUCKY", clue: "Schrotflinte, stark auf kurze Distanz, schwach auf Entfernung." },
    ],
    C: [
      { word: "CYPHER", clue: "Sentinel-Agent, der mit Kameras und Stolperdrähten Informationen sammelt." },
      { word: "CLASSIC", clue: "Die kostenlose Standardpistole, mit der jede Runde beginnt." },
    ],
    D: [
      { word: "DEADLOCK", clue: "Norwegische Sentinel-Agentin mit eisthemenbezogenen Fähigkeiten, die Gegner einsperren." },
      { word: "DUELLANT", clue: "Aggressive Rolle, die dem Team den Weg auf die Bombenplätze öffnet." },
    ],
    E: [
      { word: "ECO", clue: "Runde, in der ein Team auf Waffenkäufe verzichtet, um Geld zu sparen." },
      { word: "ECKE", clue: "Taktischer Begriff für einen Winkel, hinter dem sich Gegner verstecken können." },
    ],
    F: [
      { word: "FRACTURE", clue: "H-förmige Karte, die von beiden Seiten gleichzeitig angegriffen werden kann." },
      { word: "FLANKE", clue: "Taktischer Begriff für einen Angriff von der Seite oder von hinten." },
    ],
    G: [
      { word: "GEKKO", clue: "Initiator-Agent, der Kreaturen in den Kampf schickt." },
      { word: "GEGNER", clue: "Allgemeiner Begriff für einen Spieler des anderen Teams." },
    ],
    H: [
      { word: "HAVEN", clue: "Die einzige Valorant-Karte mit drei Bombenplätzen." },
      { word: "HEADSHOT", clue: "Ein Treffer in die präziseste, sofort tödliche Trefferzone." },
    ],
    I: [
      { word: "ISO", clue: "Duellant-Agent mit einem Schild, das sich nach Schaden zurücksetzt." },
      { word: "IRON", clue: "Der allerniedrigste Rang im Wettkampfmodus." },
    ],
    J: [
      { word: "JETT", clue: "Einer der beliebtesten Duellanten, kann mit dem Wind gleiten und sprinten." },
      { word: "JUDGE", clue: "Schrotflinte, bekannt für ihre breite Streuung auf kurze Distanz." },
    ],
    K: [
      { word: "KILLJOY", clue: "Deutsche Sentinel-Agentin, die Plätze mit Türmen und Minen verteidigt." },
      { word: "KARTE", clue: "Allgemeiner Begriff für den Austragungsort eines Valorant-Matches." },
    ],
    L: [
      { word: "LOTUS", clue: "Indisch inspirierte Karte, bekannt für ihre drehbaren Türen." },
      { word: "LEBEN", clue: "Zahlenwert, der zeigt, wie viel ein Spieler noch aushalten kann (HP)." },
    ],
    M: [
      { word: "MOLLY", clue: "Kurzform für eine Molotov-artige Fähigkeit mit Flächenschaden." },
      { word: "MARSHAL", clue: "Einschüssiges Scharfschützengewehr für den mittleren Bereich." },
    ],
    N: [
      { word: "NEON", clue: "Philippinische Duellantin, die mit der Geschwindigkeit von Elektrizität rennt." },
      { word: "NAHKAMPF", clue: "Allgemeiner Begriff für den Kampf mit dem Messer statt mit Schusswaffen." },
    ],
    O: [
      { word: "OMEN", clue: "Controller-Agent, der sich durch Schatten teleportieren kann." },
      { word: "OPERATOR", clue: "Das teuerste Scharfschützengewehr, tötet fast überall mit einem Schuss." },
    ],
    P: [
      { word: "PHOENIX", clue: "Britischer Duellant, der sich mit Feuer selbst heilen kann." },
      { word: "PHANTOM", clue: "Schallgedämpftes Gewehr, größter Rivale der Vandal." },
    ],
    R: [
      { word: "RAZE", clue: "Brasilianische Duellantin, bekannt für ihre explosiven Fähigkeiten." },
      { word: "RUNDE", clue: "Die kleinste Einheit eines Matches, entweder gewonnen oder verloren." },
    ],
    S: [
      { word: "SOVA", clue: "Russischer Initiator, der mit einem Aufklärungsbogen auskundschaftet." },
      { word: "SCHILD", clue: "Ausrüstung, die vor Rundenbeginn gekauft wird und zusätzlichen Schutz bietet." },
    ],
    T: [
      { word: "TEJO", clue: "Philippinischer Initiator, der mit Raketen Flächenschaden verursacht." },
      { word: "TAUSCH", clue: "Wenn ein Teamkollege stirbt und der Gegner sofort danach eliminiert wird (Trade Kill)." },
    ],
    V: [
      { word: "VANDAL", clue: "Eines der beliebtesten Gewehre, garantierter Ein-Schuss-Kill bei Kopftreffer." },
      { word: "VIPER", clue: "Amerikanische Controllerin, die Räume mit Giftgas und Rauch kontrolliert." },
    ],
    Y: [
      { word: "YORU", clue: "Japanischer Duellant, der einen Schattenklon erschaffen und zwischen Dimensionen entkommen kann." },
      { word: "YOLO", clue: "Slang für einen riskanten, aggressiven Alleingang ohne Rücksicht auf Verluste." },
    ],
  },
};

// Rotasyonun başlangıç günü — buradan itibaren her gün bir sonraki VARYANT SETİNE geçilir
// (yani artık "bir sonraki harf" değil, TÜM 28 kelime birden yeni bir varyanta geçiyor).
const WORD_GAME_EPOCH = new Date(2026, 0, 1).getTime();

function getWordGameSetIndex(): number {
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((todayLocal - WORD_GAME_EPOCH) / 86400000);
  return ((diffDays % 2) + 2) % 2; // şu an 2 varyant var — daha fazla varyant eklersen buradaki 2'yi de güncelle
}

const LEADERBOARD_DATA = [
  { rank: 1, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 2, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 3, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 4, name: "Henüz kimse yok", score: 0, agent: "—" },
  { rank: 5, name: "Henüz kimse yok", score: 0, agent: "—" },
];

// Nişangah listesi yalnızca Supabase'deki topluluk kayıtlarından oluşur. Sabit örnekler
// bilerek tutulmuyor; bu sayede ekranda görünen her kart gerçek bir kullanıcı kaydıdır.
type CrosshairEntry = { id: string | number; title: string; subtitle: string; likes: string | number; rank: string; color: string; code: string };
const CROSSHAIRS_DATA: CrosshairEntry[] = [];

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
  "2": "#adff2f", // sarı-yeşil
  "3": "#dfff00", // yeşil-sarı
  "4": "#ffff00", // sarı
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
  // Karttaki çizim, harita önizlemesindeki şekli okunabilir biçimde korumalı.
  // Eski ölçek kısa kolları nokta gibi gösteriyordu.
  // DÜZELTME (istek): "nişangahlar hiç olmamış, tracker gibi yapsana, scale'i bi tık
  // küçültebilirsin" — okunabilirlik için BİLEREK abartılan ölçek biraz geri çekildi, artık
  // gerçek bir crosshair tracker sitesindeki gibi daha orantılı/az abartılı duruyor ama yine de
  // ince çizgiler görünmez olacak kadar küçülmüyor.
  // Kart önizlemesi eskiden oyun değerlerini 3.6 ile çarpıyordu; bu, 3/2 gibi normal
  // uzunluk-boşluk ayarlarını bile dev ve ortası gereğinden açık gösteriyordu. 1.8 ölçeği,
  // 64px kartta Valorant ayar ekranındaki okunabilir ama gerçekçi oranı korur.
  const BASE_SCALE = 1.8;
  const MIN_THICK = 0;
  const MIN_DOT_R = 0;
  const MIN_ARM_LEN = 0;

  // DÜZELTME ("bazı crosslar çok devasa duruyor"): sabit BASE_SCALE, uzunluk/kalınlığı büyük
  // ham değerli kodlarda (ör. 0l;20, 0t;10 gibi "uzun çizgi" tarzı kodlar) kartın 56-64px'lik
  // kutusundan taşıp komşu elemanların üstüne biniyordu ("overflow: visible" bunu gizlemiyor,
  // tam tersine taşmaya izin veriyordu). Önce sabit ölçekte "ne kadar yer kaplayacağı"
  // (rawMaxReach) hesaplanıyor; kutuya sığmıyorsa TÜM boyutlar (kalınlık/uzunluk/boşluk/nokta)
  // AYNI ORANDA küçültülüyor — kod hâlâ kendine özgü şeklini/oranını koruyor, sadece kutuya
  // sığacak kadar küçülüyor. Küçük/normal kodlar hiç etkilenmiyor (fitFactor = 1 kalıyor).
  // DÜZELTME (ASIL "büyüklüğü aynı değil" BUG'U): rawMaxReach, kalınlığı MIN_THICK
  // zorlamasından ÖNCEKİ ham değeriyle hesaplanıyordu. Ama aşağıda kalınlık, fitFactor
  // uygulandıktan SONRA yine de en az MIN_THICK'e zorlanıyor. Sonuç: uzunluğu/boşluğu büyük
  // (fitFactor<1, küçültülmesi gereken) ama çizgisi ince bir kod, küçültüldükten sonra
  // kalınlığı MIN_THICK'e geri zorlanıyor — yani AYNI ORANDA küçülmüyor, kalınlığı orana göre
  // OLMASI GEREKENDEN kalın kalıyor. Bu da aynı "mantıksal" boyuttaki iki farklı kod (biri
  // küçültme gerektiren biri gerektirmeyen) ekranda FARKLI oranlarda görünmesine yol açıyordu.
  // Çözüm: MIN_THICK'i BASE_SCALE cinsine çevirip rawMaxReach hesabına da dahil ediyoruz —
  // böylece fitFactor, kalınlığın zorlanacağı minimumu da hesaba katarak küçültüyor.
  const MIN_THICK_RAW = MIN_THICK / BASE_SCALE;
  const MIN_ARM_LEN_RAW = MIN_ARM_LEN / BASE_SCALE;
  const rawMaxReach = Math.max(
    parsed.offset + (parsed.length > 0 ? Math.max(parsed.length, MIN_ARM_LEN_RAW) : 0),
    parsed.offset + (parsed.vLength > 0 ? Math.max(parsed.vLength, MIN_ARM_LEN_RAW) : 0),
    parsed.outerLinesOn ? parsed.outerOffset + (parsed.outerLength > 0 ? Math.max(parsed.outerLength, MIN_ARM_LEN_RAW) : 0) : 0,
    parsed.outerLinesOn ? parsed.outerOffset + (parsed.outerVLength > 0 ? Math.max(parsed.outerVLength, MIN_ARM_LEN_RAW) : 0) : 0,
    Math.max(parsed.thickness, MIN_THICK_RAW) / 2,
    parsed.outerLinesOn ? Math.max(parsed.outerThickness, MIN_THICK_RAW) / 2 : 0,
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
    const hLenRaw = Math.max(parsed.length, 0) * SCALE;
    const vLenRaw = Math.max(parsed.vLength, 0) * SCALE;
    // DÜZELTME: kol çizilecekse (>0.3px, aşağıdaki eşik) ama MIN_ARM_LEN'den kısaysa, bir
    // "çizgi" gibi okunabilmesi için en az MIN_ARM_LEN'e yükseltiliyor (yukarıdaki
    // rawMaxReach zaten bunu hesaba kattı, kutu taşmıyor).
    const hLen = hLenRaw > 0.3 ? Math.max(hLenRaw, MIN_ARM_LEN) : hLenRaw;
    const vLen = vLenRaw > 0.3 ? Math.max(vLenRaw, MIN_ARM_LEN) : vLenRaw;
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
    const hLenRaw = Math.max(parsed.outerLength, 0) * SCALE;
    const vLenRaw = Math.max(parsed.outerVLength, 0) * SCALE;
    const hLen = hLenRaw > 0.3 ? Math.max(hLenRaw, MIN_ARM_LEN) : hLenRaw;
    const vLen = vLenRaw > 0.3 ? Math.max(vLenRaw, MIN_ARM_LEN) : vLenRaw;
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

  // DÜZELTME ("cross bulanık/pürüzlü görünüyor"): küçük kart ikonlarında (56-64px) tarayıcı
  // SVG dikdörtgenlerini anti-alias ile yumuşatıyor — ince kollarda bu, kenarları bulanık/
  // gri bir bulanıklık gibi gösteriyordu (gerçek oyundaki keskin/net kenarların aksine).
  // shapeRendering="crispEdges" kenarları piksele oturtup keskin/net çiziyor.
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} shapeRendering="crispEdges" style={{ overflow: "hidden" }}>
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
  // DÜZELTME (istek — "bu cross devasa oluyor, oyunda böyle durmuyor, oyunda bu cross baya
  // daha küçük, aynı boyutta durmuyorlar"): ZOOM=6, kalınlığı 1-2 birim gibi GERÇEKTEN ince
  // kodları görünür kılmak için eklenmişti, ama kalınlığı 3-4+ olan SIRADAN/kalın kodlarda
  // (bu şikayete konu olan kod gibi) sonucu oyundakinden KAT KAT büyük gösteriyordu — yani
  // "görünürlük" kazandırırken "doğruluğu" (gerçek oyun-içi orantıyı) feda ediyordu. Kullanıcı
  // açıkça GERÇEK orana öncelik verilmesini istedi. Artık ZOOM=1: 1920x1080 referansında
  // 1 birim = 1 piksel, yani harita önizleme kutusu ekranda kaç piksel genişliğinde olursa
  // olsun, crosshair GERÇEKTEN oyunda göründüğü ORANDA küçülüp büyüyor. Bunun bilinen
  // dezavantajı: kalınlığı 1 gibi gerçekten çok ince kodlar küçük bir önizleme kutusunda
  // güçlükle seçilebilir — ama bu bir hata değil, gerçek oyunda da öyle ince görünürler.
  // DÜZELTME (istek — "1 yapılmış ama bu sefer çok küçük oldu, görünmüyor bile, normal
  // önizlemedeki gibi görünmesi lazım"): ZOOM=1 matematiksel olarak "gerçek orana" en sadık
  // değerdi ama pratikte okunaksızdı; ZOOM=6 ise (bir önceki şikayette) kalın kodlarda devasa
  // duruyordu. İkisi arasında, KART önizlemesindeki (CrosshairPreviewSVG) okunabilirliğe yakın,
  // makul bir orta değer: ZOOM=3. Ayrıca gerçekten çok ince (kalınlık 1 gibi) kodların bu
  // ZOOM'da bile piksel-altına düşmemesi için küçük bir minimum kalınlık tabanı eklendi —
  // kart önizlemesindeki kadar agresif değil, sadece "tamamen görünmez olmasın" garantisi.
  const ZOOM = 3;
  const MIN_ACCURATE_THICK = 1.5; // px — bu ZOOM'da bile çizginin asla tamamen kaybolmaması için taban

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
    pushArms("in", Math.max(parsed.length, 0) * ZOOM, Math.max(parsed.vLength, 0) * ZOOM, Math.max(Math.max(parsed.thickness, 0) * ZOOM, MIN_ACCURATE_THICK), Math.max(parsed.offset, 0) * ZOOM, parsed.opacity);
  }
  if (parsed.outerLinesOn) {
    pushArms("out", Math.max(parsed.outerLength, 0) * ZOOM, Math.max(parsed.outerVLength, 0) * ZOOM, Math.max(Math.max(parsed.outerThickness, 0) * ZOOM, MIN_ACCURATE_THICK), Math.max(parsed.outerOffset, 0) * ZOOM, parsed.outerOpacity);
  }

  // Nokta boyutu ("z") ÇAP olarak yorumlanıyor, yarıçap için ikiye bölünüp aynı ZOOM ile büyütülüyor.
  const dotR = parsed.dot ? Math.max((Math.max(parsed.dotSize, 0) / 2) * ZOOM, parsed.dotSize > 0 ? MIN_ACCURATE_THICK * 0.6 : 0) : 0;
  const hasAnything = shapes.length > 0 || dotR > 0;

  return (
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges" style={{ position: "absolute", inset: 0 }}>
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
    // DÜZELTME (GERÇEK BUG — 3 örnek kodla kanıtlandı, node ile simüle ettim): "1b" anahtarı
    // HİÇ YOKSA (sadece "0" değil, tamamen eksikse) eskiden dış çizgiler her zaman KAPALI
    // sayılıyordu — ama kod açıkça dış kalınlık/uzunluk/boşluk (1t/1l/1o) değerleri taşıyorsa,
    // bu değerlerin "boşuna" orada durması anlamsız; kullanıcı onları göstermek istiyor demektir.
    // Gerçek, oyundan dışa aktarılmış kodlarda "1b" HER ZAMAN vardır (araştırmayla doğrulandı) —
    // bu yüzden bu yeni varsayılan SADECE "1b" gerçekten hiç belirtilmemiş, elle yazılmış/eksik
    // kodlarda devreye giriyor, gerçek kodların ezici çoğunluğunu ETKİLEMİYOR.
    outerLinesOn: map["1b"] === "1" || (map["1b"] === undefined && (map["1t"] !== undefined || map["1l"] !== undefined || map["1o"] !== undefined)),
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
// DÜZELTME (TS hatası): likes alanı "string | number" olabiliyor ama fonksiyon sadece "string"
// kabul ediyordu. Davranış aynı, sadece tip uyumlu hale getirildi.
const parseLikes = (likes: string | number): number => {
  const cleaned = String(likes).trim().toUpperCase();
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
  // YENİ (istek): "lobi oluşturma kısmına duruma göre yaş eklemesi eklenecek" — isteğe bağlı
  // (opsiyonel) bir yaş aralığı tercihi. Zorunlu değil, kurucu isterse ekliyor.
  ageRange?: string | null;
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

  // DÜZELTME (TDZ hatası — "quiz soru bankası ve kelime oyununu çevirmek için hepsini bağla"):
  // siteLanguage burada, EN ERKEN noktada tanımlanıyor çünkü dil bağımlı quiz soru bankası
  // (activeQuestions) ve kelime oyunu bankaları (unlimitedWordBank/todaysWordBank) çok daha
  // aşağıda ama bu değişkene İHTİYAÇ duyuyor — aynı önceki exitConfirm hatasındaki gibi bir
  // `const` değişkenini tanımlanmadan önce okumak "used before its declaration" (TDZ) hatası
  // verir, bu yüzden component'in en başına alındı.
  // DÜZELTME (BU TURDAKİ ASIL BUG — "Unhandled Runtime Error: Text content does not match
  // server-rendered HTML" / "Server: Ana Sayfa Client: Startseite"): bir önceki turda "titreme"
  // şikayetini gidermek için localStorage'ı state'in KENDİSİ oluşturulurken (lazy initializer)
  // SENKRON okumuştum. Ama bu SUNUCU TARAFINDA (Next.js SSR) mümkün değil — sunucunun
  // localStorage'a erişimi yok, o yüzden sunucu HER ZAMAN "TR" ile render ediyordu. Tarayıcıda
  // dili değiştirmiş bir kullanıcı için CLIENT tarafı ise ilk render'da direkt (ör.) "DE" ile
  // başlıyordu — React hydration, sunucunun ürettiği HTML ile istemcinin ÜRETMESİ BEKLENEN ilk
  // render'ın birebir aynı metni içermesini zorunlu kılar; aynı olmayınca bu net "Unhandled
  // Runtime Error" ile SAYFA ÇÖKÜYORDU (önceki "titreme"den çok daha kötü bir sonuç).
  // Kalıcı, sıfır-titreme bir çözüm sunucunun DA doğru dili bilmesini gerektirir (örn. bir
  // cookie'den okuyup layout.tsx'te kullanmak) — bu, bu tek dosyanın dışında (layout.tsx/
  // middleware) bir değişiklik ister. Onu yapmak istersen haber ver. Şimdilik GÜVENLİ (asla
  // çökmeyen) çözüm: state HER ZAMAN sunucuyla aynı şekilde "TR" ile başlıyor, kayıtlı dil
  // ise hydration TAMAMLANDIKTAN SONRA (useEffect, mount sonrası) okunup uygulanıyor — bu,
  // yabancı dildeki kullanıcılar için bir kare süren ufak bir geçiş anlamına gelir ama site
  // ASLA çökmez.
  const [siteLanguage, setSiteLanguage] = useState("TR");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("infinity_site_language");
      if (saved && saved !== "TR") setSiteLanguage(saved);
    } catch {}
  }, []);
  // Aktif dile göre soru bankası — QUIZ_QUESTIONS_BY_LANG'da o dil yoksa TR'ye düşer.
  const QUIZ_QUESTIONS = QUIZ_QUESTIONS_BY_LANG[siteLanguage] || QUIZ_QUESTIONS_BY_LANG.TR;

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
  // Puanlama sistemi: doğru cevap = 15 taban puan + kalan süreye göre hız bonusu (0-15,
  // yani en hızlı cevap toplamda 30 puan alır, en yavaş doğru cevap 15 puan alır),
  // yanlış/süre dolması = -5 puan. Günlük hak: 8.
  const [pointsEarned, setPointsEarned] = useState(0);
  const [lastQuestionPoints, setLastQuestionPoints] = useState<number | null>(null);
  const QUESTION_SECONDS = 15;
  // DÜZELTME (BÜYÜK BUG): "8 soru olsun" deniyordu ama QUIZ_QUESTIONS.length (=10) her yerde
  // doğrudan kullanıldığı için oyun HER ZAMAN elimizdeki TÜM soruları (10 tanesini) soruyordu.
  // Artık her oyun başlangıcında QUIZ_QUESTIONS'tan RASTGELE 8 tanesi seçilip activeQuestions'a
  // konuyor; oyun boyunca (soru sayacı, ilerleme çubuğu, sonuç ekranı) SADECE activeQuestions
  // kullanılıyor — QUIZ_QUESTIONS.length artık oyun mantığında hiç kullanılmıyor.
  const QUESTIONS_PER_GAME = 8;
  const [activeQuestions, setActiveQuestions] = useState<typeof QUIZ_QUESTIONS>(() => QUIZ_QUESTIONS.slice(0, QUESTIONS_PER_GAME));
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mini oyunlar şimdilik istemci tarafında çalışır. Supabase rotası geldiğinde bu
  // skorlar/günlük eşleşmeler aynı state noktalarından kalıcı veriye bağlanacak.
  const rankChallenges = [
    { player: "Mira#TR1", agent: "Jett", map: "Ascent", kd: "24 / 16", hs: "%18", acs: 162, answer: "Silver" },
    { player: "Kaan#ACE", agent: "Omen", map: "Bind", kd: "21 / 14", hs: "%27", acs: 235, answer: "Gold" },
    { player: "Lynx#001", agent: "Sova", map: "Haven", kd: "28 / 12", hs: "%34", acs: 302, answer: "Diamond" },
    { player: "Nova#GG", agent: "Raze", map: "Lotus", kd: "31 / 10", hs: "%41", acs: 348, answer: "Immortal" },
  ];
  const [rankChallengeIndex, setRankChallengeIndex] = useState(0);
  const [rankGuessResult, setRankGuessResult] = useState<"correct" | "wrong" | null>(null);
  const [rankPickedLabel, setRankPickedLabel] = useState<string | null>(null);
  const [rankGuessScore, setRankGuessScore] = useState(0);
  const [rankGuessesMade, setRankGuessesMade] = useState(0);
  const [rankClipUrl, setRankClipUrl] = useState("");
  const [isRankUploadOpen, setIsRankUploadOpen] = useState(false);
  const [rankUploadUrl, setRankUploadUrl] = useState("");
  const [rankUploadRank, setRankUploadRank] = useState("Altın");
  // YENİ (istek): Rank Tahmin artık istatistik kartı yerine GERÇEK KLİP izleyip rütbe tahmin
  // etme oyunu — referans tasarımdaki gibi video oynatıcı + "SELECT RANK" ızgarası + seri
  // (streak) takibi. Klipler topluluk tarafından paylaşılıyor (backend olmadığı için
  // localStorage'da "ortak" bir havuz gibi tutuluyor — nişangahlar/forum gönderileri gibi
  // bu site zaten client-taraflı bir simülasyon).
  // DÜZELTME (istek): "rank tahmin menüsünde ön sekme olmasın direk menü burdan açılsın" +
  // "soldaki sıralamaya dön şeyini kaldır" — ayrı bir "giriş/sıralama" ekranı kavramı tamamen
  // kaldırıldığı için bunu seçen state'e de artık gerek yok, sekme her zaman doğrudan oyun
  // ekranıyla açılıyor.
  const [rankClips, setRankClips] = useState<{ id: string; url: string; rank: string; addedBy: string }[]>([]);
  const [rankClipIndex, setRankClipIndex] = useState(0);
  const [rankStreak, setRankStreak] = useState(0);
  const [rankBestStreak, setRankBestStreak] = useState(0);
  // DÜZELTME (istek — "tüm klipleri izleyip cevaplayınca doğru yapsan bile f5 atınca hepsi
  // bittikten sonra 0 doğru ve dereceniz yok diyor"): üstteki "Toplam Doğru Tahmin" rozeti
  // eskiden EKRANDAKİ (aktif) klibin backend istatistiğine bağlıydı (rankGuessStats.currentCorrect)
  // — bütün klipler bitince "aktif klip" diye bir şey kalmadığından bu değer null'a düşüyor,
  // rozet de 0 gösteriyordu. Artık GERÇEK, kalıcı (F5'te kaybolmayan), hesaba özel bir toplam
  // sayaç var: her doğru tahminde +1 artıyor ve localStorage'da saklanıyor.
  const [rankTotalCorrect, setRankTotalCorrect] = useState(0);
  const [rankGuessStats, setRankGuessStats] = useState<{ counts: Record<string, number>; total: number; currentCorrect: number; playerRank: number | null } | null>(null);
  const [rankViewedClipIds, setRankViewedClipIds] = useState<string[]>([]);
  const [rankToast, setRankToast] = useState("");
  useEffect(() => {
    fetch("/api/rank-clips")
      .then(async (res) => res.ok ? res.json() : Promise.reject(await res.json()))
      .then((data) => setRankClips(Array.isArray(data.clips) ? data.clips : []))
      .catch(() => setRankToast("Klipler yüklenemedi. Veritabanı kurulumu kontrol edilmeli."));
  }, []);
  const submitRankClip = () => {
    const url = rankUploadUrl.trim();
    const isYoutube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
    const isVideoFile = /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    if (!isYoutube && !isVideoFile) {
      setRankToast("Yalnızca YouTube veya .mp4/.webm/.ogg video bağlantısı paylaşılabilir.");
      setTimeout(() => setRankToast(""), 3500);
      return;
    }
    if (!requireLogin()) return;
    fetch("/api/rank-clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, rank: rankUploadRank, addedBy: currentUser }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Klip eklenemedi.");
      setRankClips((prev) => [...prev, data.clip]);
      setRankClipIndex(rankClips.length);
      setIsRankUploadOpen(false);
      setRankUploadUrl("");
      setRankToast("Klip başarıyla eklendi.");
      playClickSound();
    }).catch((error) => setRankToast(error.message || "Klip eklenemedi."));
    setTimeout(() => setRankToast(""), 3500);
  };
  // YouTube linklerini otomatik gömülebilir (embed) formata çeviriyor; diğer linkler
  // doğrudan <video> etiketiyle oynatılmaya çalışılıyor.
  const getRankClipEmbedUrl = (url: string): string | null => {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
  };
  // DÜZELTME (kritik hata — "Server: Vandal Client: CLASSIC" hydration hatası): önceki hali
  // useState'in LAZY INITIALIZER'I içinde doğrudan localStorage okuyordu. Next.js'te sunucu
  // tarafı render sırasında `window` yok, o yüzden sunucu HER ZAMAN "Vandal" ile render
  // ediyordu; tarayıcıda hydration olurken bu initializer TEKRAR çalışıp gerçek localStorage
  // değerini (örn. önceden seçilmiş "Classic") okuyunca ilk render anında sunucu/istemci metni
  // birbirini tutmuyordu — bu da tüm sayfayı hydration hatasıyla çökertiyordu. Artık ikisi de
  // HER ZAMAN "Vandal" ile başlıyor (sunucu ve istemcinin ilk render'ı birebir aynı), kayıtlı
  // tercih ise sadece mount SONRASI bir efektte (yani hydration bittikten sonra) okunup
  // uygulanıyor — bu normal bir state güncellemesi olduğu için hataya yol açmıyor.
  const [skinWeapon, setSkinWeapon] = useState("Vandal");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("infinity_skin_weapon");
      if (saved) setSkinWeapon(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("infinity_skin_weapon", skinWeapon); } catch {}
  }, [skinWeapon]);
  const [skinSearch, setSkinSearch] = useState("");
  // YENİ (istek): liderlik tablosu artık sadece ilk 20 skini göstermiyor — nişangahlar
  // sekmesindeki gibi altta sayfa numaralı (1, 2, 3…) bir sayfalama var, TÜM skinler
  // (bıçaksa tüm bıçaklar, Vandal'sa tüm Vandal'lar) gezilebiliyor.
  const [skinLeaderboardPage, setSkinLeaderboardPage] = useState(1);
  useEffect(() => { setSkinLeaderboardPage(1); }, [skinWeapon, skinSearch]);
  const SKIN_PER_PAGE = 20;
  const [skinBracketSize, setSkinBracketSize] = useState<number | "all">(64);
  const [isSkinBattleOpen, setIsSkinBattleOpen] = useState(false);
  const [skinBattleIndex, setSkinBattleIndex] = useState(0);
  // YENİ: gerçek eşleşme turu (bracket) — "Voting Setup" penceresinde seçilen silah + havuz
  // boyutuna göre skinCatalog'dan (valorant-api.com'dan çekilen GERÇEK skinler) rastgele
  // eşleşmeler üretiliyor. Eskiden bu ekran sabit/donuk 2 eşleşmeyi (fights dizisi) gösteriyordu
  // ve hiç skinCatalog kullanmıyordu — bu yüzden "skinler çekilmiyor" gibi görünüyordu.
  const [skinBracketPairs, setSkinBracketPairs] = useState<({ id: string; name: string; weapon: string; image: string | null } | null)[][]>([]);
  const [skinWinnerFlash, setSkinWinnerFlash] = useState<string | null>(null);
  const [skinBattleDone, setSkinBattleDone] = useState(false);
  const [skinVotes, setSkinVotes] = useState<Record<string, number>>({});
  // YENİ (istek): İlerleme artık tek bir roundun eşleşme sayısını (örn. "8") değil, TÜM
  // turnuva boyunca yapılacak toplam seçim sayısını gösteriyor (örn. Top 16 seçilince "16").
  // skinTotalPool = turnuva başında seçilen havuz boyutu, sabit kalır. skinCumulativePicks =
  // round geçişlerinde SIFIRLANMADAN, oyuncunun o ana kadar yaptığı toplam "bunu seç" sayısı.
  const [skinTotalPool, setSkinTotalPool] = useState(0);
  const [skinCumulativePicks, setSkinCumulativePicks] = useState(0);
  // YENİ (istek): Skin Savaşı'na girince artık direkt oylama ayarları değil, önce bir
  // SIRALAMA (leaderboard) ekranı geliyor — "leaderboard" varsayılan görünüm, "OYLAMAYA
  // BAŞLA" butonuna basınca "setup" (silah/havuz seçimi) ekranına geçiliyor.
  const [skinView, setSkinView] = useState<"leaderboard" | "setup">("leaderboard");
  // YENİ: gerçek bir turnuva/bracket mantığı — 1. round kazananları 2. roundda birbirine
  // girer, 2. round kazananları 3. roundda... en sonunda tek bir şampiyon skin kalana kadar
  // devam eder. skinRoundNumber sadece ekranda "Round X" göstermek için.
  const [skinRoundNumber, setSkinRoundNumber] = useState(1);
  // Her skinin toplam maç sayısı ve galibiyet sayısı — win rate ve toplam oy hesaplamak için.
  // localStorage'a yazılıyor ki F5'te sıralama sıfırlanmasın.
  const [skinStats, setSkinStats] = useState<Record<string, { wins: number; matches: number }>>({});
  // DÜZELTME (istek — "liderlik tablosu kişiye özel değil, sitedeki TÜM oyuncuların
  // seçimlerine göre sıralanmalı"): eskiden bu tablo SADECE bu tarayıcının localStorage'ına
  // yazılıyordu — yani her ziyaretçi sadece KENDİ seçimlerini görüyordu, bu yüzden "bende
  // Kuronami 1. ama diğer 2 oyuncuda Cesur Yürek Vandal 1." gibi tutarsız/kişisel bir tablo
  // ortaya çıkıyordu. Gerçek bir SİTE GENELİ tablo, tüm ziyaretçilerin oylarının TEK bir
  // yerde (backend/veritabanı) toplanmasını gerektiriyor — bu dosyada backend/API rotaları yok,
  // o yüzden burada GERÇEK global birleştirmeyi tamamlayamıyorum. Yine de altyapıyı hazırladım:
  // önce /api/skin-stats'tan GERÇEK site geneli toplamı çekmeyi DENİYOR; o rota eklenirse tablo
  // otomatik olarak gerçekten herkese ortak hale gelir. Rota henüz yoksa (veya başarısız
  // olursa) eskisi gibi bu tarayıcının kendi geçmişine sessizce düşüyor — yani şu an hâlâ
  // kişiye özel ama en azından ekrana "boş tablo" gelmiyor.
  useEffect(() => {
    fetch("/api/skin-stats")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data && typeof data === "object" && data.stats) setSkinStats(data.stats);
        else throw new Error("no-data");
      })
      .catch(() => {
        try {
          const saved = window.localStorage.getItem("infinity_skin_stats_v2");
          if (saved) setSkinStats(JSON.parse(saved));
        } catch {}
      });
  }, []);
  // DÜZELTME (istek — "tamamlanmadan menüye dönülen skin savaşı seçim istatistikleri
  // liderlik tablosuna yansımasın"): recordSkinMatch eskiden HER seçimde anında kalıcı
  // liderlik tablosuna (skinStats + localStorage) yazıyordu — turnuva yarıda bırakılsa bile
  // o ana kadar yapılan seçimler kalıcı olarak sayılıyordu. Artık seçimler önce SADECE bu
  // oturuma özel geçici bir tampona (pendingSkinStatsRef) yazılıyor; kalıcı tabloya
  // (commitPendingSkinStats ile) YALNIZCA turnuva gerçekten TAMAMLANIP bir şampiyon
  // belirlendiğinde işleniyor. Turnuva yarıda bırakılırsa (menüye dön / sekme değiştir)
  // tampon commitPendingSkinStats hiç çağrılmadan atılır (discardPendingSkinStats),
  // yani o oturumdaki hiçbir seçim liderlik tablosuna yansımaz.
  const pendingSkinStatsRef = useRef<Record<string, { wins: number; matches: number }>>({});
  const skinStatsCommittedRef = useRef(false);
  const recordSkinMatch = (winnerId: string, loserId: string | null) => {
    const pending = pendingSkinStatsRef.current;
    pending[winnerId] = { wins: (pending[winnerId]?.wins || 0) + 1, matches: (pending[winnerId]?.matches || 0) + 1 };
    if (loserId) pending[loserId] = { wins: pending[loserId]?.wins || 0, matches: (pending[loserId]?.matches || 0) + 1 };
  };
  const commitPendingSkinStats = () => {
    if (skinStatsCommittedRef.current) return; // aynı turnuva için birden fazla kez işlenmesin
    skinStatsCommittedRef.current = true;
    const pending = pendingSkinStatsRef.current;
    if (Object.keys(pending).length === 0) return;
    setSkinStats((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(pending)) {
        next[id] = {
          wins: (next[id]?.wins || 0) + pending[id].wins,
          matches: (next[id]?.matches || 0) + pending[id].matches,
        };
      }
      try { window.localStorage.setItem("infinity_skin_stats_v2", JSON.stringify(next)); } catch {}
      return next;
    });
    // Site geneli GERÇEK tabloya bu turnuvanın sonuçlarını gönderme denemesi — /api/skin-stats
    // rotası henüz yoksa sessizce yutuluyor, eklenince otomatik olarak gerçek veriye döner.
    fetch("/api/skin-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deltas: pending, playerName: currentUser || "guest" }),
    }).catch(() => {});
  };
  const discardPendingSkinStats = () => {
    pendingSkinStatsRef.current = {};
    skinStatsCommittedRef.current = false;
  };
  // Bay geçen (rakipsiz kalan) eşleşmeleri otomatik "kazanan" sayıp sessizce bir sonraki
  // eşleşmeye geçiyor. DÜZELTME: bu efekt önceden skin-war sekmesi render edilirken
  // koşullu bir IIFE'nin İÇİNDEYDİ — bu da activeTab değiştikçe hook'un hiç çağrılmadığı
  // render'lar oluşturup React'in "hooks sırası" kuralını bozuyordu. Artık bileşenin en üst
  // seviyesinde, her render'da aynı sırada çağrılıyor; içindeki koşullar sadece efektin NE
  // YAPACAĞINI belirliyor.
  useEffect(() => {
    if (!isSkinBattleOpen || skinBattleDone) return;
    const pair = skinBracketPairs[skinBattleIndex];
    if (pair && pair[1] === null && pair[0]) {
      recordSkinMatch(pair[0].id, null);
      if (skinBattleIndex + 1 >= skinBracketPairs.length) setSkinBattleDone(true);
      else setSkinBattleIndex((i) => i + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinBattleIndex, isSkinBattleOpen, skinBattleDone, skinBracketPairs]);

  // YENİ (istek): "round 1'den 2'ye geçişte araya bir ekran girmesin, aynı ekranda devam
  // etsin" — bir round bitip birden fazla kazanan kaldığında (henüz şampiyon yok), eskiden
  // "Round X Tamamlandı" diye ayrı bir ara ekran gösterilip kullanıcının butona basmasını
  // bekliyordu. Artık bu geçiş TAMAMEN OTOMATİK: kazananlar belli olur olmaz (bu efekt
  // tetiklenir), yeni round'un eşleşmeleri anında üretilip aynı karşılaşma ekranında
  // gösterilmeye devam edilir — hiçbir ara ekran/tıklama yok.
  useEffect(() => {
    if (!isSkinBattleOpen || !skinBattleDone) return;
    const winners = skinBracketPairs
      .map(([a, b]) => (!b ? a : (skinVotes[a!.id] || 0) >= (skinVotes[b.id] || 0) ? a : b))
      .filter((s): s is NonNullable<typeof s> => !!s);
    if (winners.length <= 1) {
      // Şampiyon belli oldu — turnuva GERÇEKTEN tamamlandı, bu oturumda biriken tüm seçimler
      // artık kalıcı liderlik tablosuna işlenebilir (bkz. recordSkinMatch/pendingSkinStatsRef).
      commitPendingSkinStats();
      return; // bu durumu render tarafı gösteriyor
    }
    const shuffled = [...winners];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pairs: (typeof shuffled[number] | null)[][] = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
    if (shuffled.length % 2 === 1) pairs.push([shuffled[shuffled.length - 1], null]);
    setSkinBracketPairs(pairs);
    setSkinBattleIndex(0);
    setSkinRoundNumber((r) => r + 1);
    setSkinBattleDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinBattleDone, isSkinBattleOpen]);

  // DÜZELTME (ASIL BUG — "Block-scoped variable 'currentUser' used before its declaration"):
  // currentUser aşağıda (KELİME OYUNU bölümünde, satır ~1041) kullanılıyordu ama tanımı çok
  // daha aşağıdaydı. State tanımı artık ilk kullanıldığı yerden ÖNCE.
  const [currentUser, setCurrentUser] = useState("");
  // DÜZELTME (istek — "titreme sorunlarına kökten bir çözüm bulmanı istiyorum... f5
  // titremeleri"): bu ve aşağıdaki benzer geri-yükleme effect'leri eskiden düz useEffect'ti.
  // useEffect, TARAYICI BOYAMASINDAN SONRA çalışır — yani F5'te önce state'in başlangıç
  // (varsayılan/boş) haliyle BİR KARE boyanır, hemen ardından localStorage'dan gelen gerçek
  // değerle TEKRAR boyanır. İki boyama arasındaki bu fark göze "titreme/flaş" olarak yansır.
  // useLayoutEffect ise DOM güncellemesinden sonra ama TARAYICI BOYAMADAN ÖNCE, senkron
  // çalışır — yani kullanıcı hiçbir zaman "yanlış/boş" ilk hâli görmez, doğrudan doğru
  // değerle boyanır. Görünür ilk ekranı etkileyen tüm localStorage geri-yüklemelerini bu
  // yüzden useLayoutEffect'e taşıdık (rank istatistikleri, kelime oyunu günlük ilerlemesi,
  // site dili, bildirimler, vb.).
  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(`infinity_rank_total_correct_${currentUser || "guest"}`);
      setRankTotalCorrect(saved ? parseInt(saved, 10) || 0 : 0);
    } catch { setRankTotalCorrect(0); }
  }, [currentUser]);
  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(`infinity_rank_viewed_${currentUser || "guest"}`);
      setRankViewedClipIds(saved ? JSON.parse(saved) : []);
    } catch { setRankViewedClipIds([]); }
  }, [currentUser]);
  // DÜZELTME (istek — "tüm klipleri izleyip bitiren oyuncular f5 attıklarında klipler geri
  // geliyor, sonsuza kadar rank kasabilirler"): rankClipIndex eskiden sadece useState(0) ile
  // başlıyordu ve sayfa yenilenince (F5), zaten izlenmiş kliplerin tamamı localStorage'da
  // (rankViewedClipIds) kayıtlı olmasına RAĞMEN her zaman 0. klipten başlıyordu — yani izlenmiş
  // bir klip tekrar "izlenmemiş" gibi görünüp tekrar tekrar puan/seri kasılabiliyordu. Artık
  // rankClips ya da rankViewedClipIds her değiştiğinde (F5 sonrası ilk yüklemede dahil) index
  // YENİDEN hesaplanıyor: ilk izlenmemiş klibe gidiliyor, hiç izlenmemiş klip kalmadıysa -1'e
  // (yani "Tüm klipleri izlediniz" ekranına) düşülüyor.
  useLayoutEffect(() => {
    if (!rankClips.length) { setRankClipIndex(-1); return; }
    const firstUnwatched = rankClips.findIndex((clip) => !rankViewedClipIds.includes(clip.id));
    setRankClipIndex(firstUnwatched);
  }, [rankClips, rankViewedClipIds]);
  useEffect(() => {
    const clip = rankClips[rankClipIndex];
    // DÜZELTME (istek — "tüm klipleri bitiren oyuncularda nedense dereceniz yok yazıyor, ne
    // kadar doğrusu olursa olsun"): eskiden aktif bir klip kalmayınca (hepsi izlenmiş)
    // rankGuessStats DOĞRUDAN null'a çekiliyordu — bu da "Oyuncular Arasında #N" rozetini
    // "Dereceniz yok"a düşürüyordu, oyuncunun toplam doğru sayısı ne olursa olsun. Artık aktif
    // klip yoksa istatistiği SIFIRLAMIYORUZ, en son bilinen (gerçek) değeri ekranda bırakıyoruz
    // — sadece hiç giriş yapılmamışsa veya hiç klip yoksa gerçekten null'a düşüyor.
    if (!currentUser) { setRankGuessStats(null); return; }
    if (!clip) return; // tüm klipler bitti — mevcut istatistiği koru, sıfırlama
    fetch(`/api/rank-guesses?clipId=${encodeURIComponent(clip.id)}&playerName=${encodeURIComponent(currentUser)}`)
      .then(async (res) => res.ok ? res.json() : Promise.reject(await res.json()))
      .then(setRankGuessStats)
      .catch(() => setRankGuessStats(null));
  }, [rankClips, rankClipIndex, currentUser]);
  // DÜZELTME (kritik hata — "Cannot access 'currentUser' before initialization"): bu efekt
  // önceden currentUser'ın TANIMLANDIĞI satırdan ÖNCE duruyordu. Dependency array'i
  // ([currentUser]) her render'da HEMEN değerlendirildiği için, JS `const` bildiriminden
  // önce erişilince "temporal dead zone" hatası fırlatıyordu ve tüm sayfa çöküyordu. Artık
  // currentUser tanımlandıktan hemen sonra çalışıyor.
  useLayoutEffect(() => {
    try {
      const savedBest = window.localStorage.getItem(`infinity_rank_best_${currentUser || "guest"}`);
      setRankBestStreak(savedBest ? parseInt(savedBest, 10) || 0 : 0);
    } catch {}
  }, [currentUser]);

  // ===== KELİME OYUNU state'leri =====
  // DÜZELTME (istek): "ilk defa kelime oyununa girilince böyle bir ekran verilecek... günlük
  // olan günde 1 kez oynanacak... limitsizde ise sınırsız oynanabilecek, her girildiğinde
  // harflere karşılık gelen kelimeler yenilenecek" — artık tek bir mod yok, sekmeye girince
  // önce bir MENÜ (Günlük / Limitsiz seçimi) görünüyor, tıpkı referans "parolla" uygulamasındaki
  // gibi. "Günlük" aşağıdaki (zaten var olan) tarih bazlı, hesap başına günde 1 kez ilerleme
  // kaydeden sistemi kullanıyor. "Limitsiz" ise HİÇBİR ŞEY KAYDETMİYOR — her girişte kelimeler
  // yeniden karılıyor, istediğin kadar oynanabiliyor.
  const [wordGameMode, setWordGameMode] = useState<"menu" | "daily" | "unlimited">("menu");
  // Sekmeden çıkıp tekrar girildiğinde referans uygulamadaki gibi yine menüden başlansın.
  useEffect(() => {
    if (activeTab === "word-game") setWordGameMode("menu");
  }, [activeTab]);

  // LİMİTSİZ MOD state'leri — günlük moddan tamamen ayrı, localStorage'a hiç yazılmıyor.
  const [unlimitedSeed, setUnlimitedSeed] = useState(0);
  const [unlimitedProgress, setUnlimitedProgress] = useState<Record<string, { status: "playing" | "correct" | "pass" | "timeout"; wrongCount: number; lastGuess?: string }>>({});
  const unlimitedWordBank: Record<string, { word: string; clue: string }> = useMemo(() => {
    const bank: Record<string, { word: string; clue: string }> = {};
    // DÜZELTME (ASIL BUG — "kelimeler istediğim gibi yenilenmiyor"): eski üreteç
    // `s = (s * 1103515245 + 12345) & 0x7fffffff` idi. Bu çarpım, s büyüdükçe JavaScript'in
    // güvenli tamsayı sınırını (2^53) fazlasıyla aşıyor — sonuç ondalık (float) hassasiyetini
    // kaybediyor, sonra "& 0x7fffffff" bu zaten bozulmuş sayı üzerinde çalışıyor. Test ettim:
    // pratikte üretilen dizi neredeyse HER ZAMAN 0 çıkıyordu (sadece ilk değer seed'in tek/çift
    // olmasına göre değişiyordu) — yani Limitsiz'e her girişte neredeyse hep AYNI varyant (0.
    // kelime) seçiliyordu, gerçekten "karılmıyordu". Çözüm: Math.imul kullanan, 32-bit sınırları
    // içinde kalan (hassasiyet kaybı olmayan) standart bir mulberry32 üreteci.
    let a = unlimitedSeed * 9973 + 1;
    const nextRandom = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    TR_ALPHABET_ROTATION.forEach((l) => {
      const variants = (WORD_GAME_VARIANTS_BY_LANG[siteLanguage] || WORD_GAME_VARIANTS_BY_LANG.TR)[l];
      bank[l] = variants[Math.floor(nextRandom() * variants.length)];
    });
    return bank;
  }, [unlimitedSeed, siteLanguage]);

  // Limitsiz moda her girişte: ilerleme sıfırlanır, kelimeler yeniden karılır.
  useEffect(() => {
    if (wordGameMode !== "unlimited") return;
    setUnlimitedSeed((s) => s + 1);
    setUnlimitedProgress({});
    setSelectedWordLetter(TR_ALPHABET_ROTATION[0]);
    setWordTimeLeft(240);
    setWordResultsAutoShown(false);
    // DÜZELTME (savunma amaçlı): hangi yoldan gelinirse gelinsin, Limitsiz'e YENİ girişte
    // önceki oturumdan kalma açık bir sonuç ekranı asla görünmesin.
    setWordResultsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordGameMode]);

  const [selectedWordLetter, setSelectedWordLetter] = useState(TR_ALPHABET_ROTATION[0]);
  const [wordGuessInput, setWordGuessInput] = useState("");
  // YENİ (istek): "yanlışta da yeşil yanıyor" — artık doğru/yanlış için AYRI, net bir görsel
  // geri bildirim var. wordFeedback kısa süreliğine "correct" (yeşil parıltı) ya da "wrong"
  // (kırmızı titreşim) oluyor, sonra otomatik temizleniyor; asla birbirine karışmıyor.
  const [wordFeedback, setWordFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wordProgress, setWordProgress] = useState<Record<string, { status: "playing" | "correct" | "pass" | "timeout"; wrongCount: number; lastGuess?: string }>>({});
  const [wordProgressLoaded, setWordProgressLoaded] = useState(false);
  const [wordTimeLeft, setWordTimeLeft] = useState(240); // harf başına 4 dakika
  // YENİ (istek): "Oyun sonunda 'Bugünün Sonuçları' ekranı açılsın" — bugünkü 28 harfin
  // tamamı bitince (doğru/pas/süre doldu fark etmez) otomatik olarak sonuç ekranı açılıyor.
  const [wordResultsOpen, setWordResultsOpen] = useState(false);

  // YENİ (istek): "bilgi yarışmasına girilince sekme değiştirirken... kelime oyununda...
  // menüye dön tuşuna basarken... skin savaşında... onaylıyor musun uyarısı çıksın, arkada
  // oyun devam etmesin" — bir oyun ORTASINDAYKEN (bitmeden) sekme değiştirmeye ya da menüye
  // dönmeye çalışınca, doğrudan çıkmak yerine önce bir onay penceresi açılıyor. Onaylanırsa
  // gerçek çıkış/sekme değişimi yapılıyor, vazgeçilirse hiçbir şey değişmiyor. Üç oyun için de
  // (bilgi yarışması, kelime oyunu, skin savaşı) AYNI ortak pencere kullanılıyor.
  // DÜZELTME (TDZ hatası — "exitConfirm used before its declaration"): bu blok eskiden
  // requireLogin'in hemen altında (dosyada çok daha aşağıda) tanımlıydı, ama kelime oyunu
  // geri sayım effect'i (birkaç satır aşağıda) exitConfirm'i ondan ÖNCE kullanıyordu — aynı
  // component fonksiyonu içinde bir `const` değişkeni tanımlanmadan önce okumak TypeScript/
  // JS'te "temporal dead zone" hatası verir. Artık ilk kullanıldığı yerden ÖNCE tanımlı.
  const [exitConfirm, setExitConfirm] = useState<null | { kind: "quiz" | "word-game" | "skin-war"; targetTab: string | null }>(null);
  // YENİ (istek): "bu tür uyarıları direkt site içinde verirsek daha iyi olur" — tarayıcının
  // kendi çirkin window.alert() kutusu yerine, sitenin kendi temasında (koyu, kırmızı vurgulu)
  // bir uyarı modalı. Kullanımı native alert ile aynı: `siteAlert("mesaj"); return;`.
  const [siteAlertMessage, setSiteAlertMessage] = useState<string | null>(null);
  const siteAlert = (message: string) => { playWrongSound(); setSiteAlertMessage(message); };
  // Zamanlayıcı interval'ları (aşağıdaki quiz ve kelime oyunu geri sayımları) bu onay penceresi
  // AÇIKKEN saniye saymayı durdurmalı ("arkada oyun devam etmesin") — interval callback'leri
  // effect kurulduğu andaki state'i closure'da tuttuğu için burada bir ref'e ayna tutuyoruz.
  const exitConfirmRef = useRef(exitConfirm);
  useEffect(() => { exitConfirmRef.current = exitConfirm; }, [exitConfirm]);
  // targetTab: null ise "aynı sekmede kal, sadece oyunu bırak / menüye dön" demek;
  // dolu ise başka bir sekmeye geçilmeye çalışılıyor demek.
  const isQuizMidProgress = isQuizStarted && !quizFinished;
  const isWordGameMidProgress = wordGameMode !== "menu" && !wordResultsOpen;
  const isSkinWarMidProgress = isSkinBattleOpen && !skinBattleDone;

  // Sekme değiştirme isteklerinin HEPSİ artık doğrudan setActiveTab yerine bu fonksiyondan
  // geçiyor — bir oyun ortasındaysa önce onay istiyor, değilse direkt sekmeyi değiştiriyor.
  const requestTabChange = (tab: string) => {
    if (tab === activeTab) return;
    if (isQuizMidProgress) { setExitConfirm({ kind: "quiz", targetTab: tab }); return; }
    if (isWordGameMidProgress) { setExitConfirm({ kind: "word-game", targetTab: tab }); return; }
    if (isSkinWarMidProgress) { setExitConfirm({ kind: "skin-war", targetTab: tab }); return; }
    setActiveTab(tab);
  };

  // Onay penceresindeki "Evet, çık" — gerçek çıkışı/sekme değişimini burada yapıyoruz.
  const confirmExitInProgress = () => {
    if (!exitConfirm) return;
    playClickSound();
    if (exitConfirm.kind === "quiz") {
      // DÜZELTME (istek): "oyuncular oradan çıkarsa o hakları gitsin ... puan yazılmasın" —
      // erken çıkış artık günlük oynama hakkını TÜKETİYOR (registerDailyPlay), ama SKORU asla
      // liderlik tablosuna göndermiyor (o fetch sadece normal bitişte, handleNextQuestion'da
      // çalışıyor) — yani hak gidiyor, puan yazılmıyor, tam istenen davranış. Ayrıca tüm soru
      // state'i burada da sıfırlanıyor ki bir sonraki "YARIŞMAYA KATIL" gerçekten sıfırdan
      // başlasın (bkz. handleJoinQuiz'deki eşdeğer sıfırlama).
      registerDailyPlay();
      setIsQuizStarted(false);
      setQuizFinished(false);
      setCurrentQuestion(0);
      setScore(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setPointsEarned(0);
    } else if (exitConfirm.kind === "word-game") {
      // DÜZELTME (istek): "onaylarsa dönmeyi o giriş hakkı gitsin, limitsizde tekrar girebilir
      // ama sorular değişecek, günlükte zaten giremez günlük hakkı gidecek" — LİMİTSİZ modda
      // zaten her yeni girişte kelimeler otomatik karılıp ilerleme sıfırlanıyor (bkz.
      // unlimitedSeed effect'i), o yüzden ekstra bir şey gerekmiyor. GÜNLÜK moddan onaylayarak
      // çıkılırsa ise bugünkü hak YANIYOR: süre bittiğinde yapılanın AYNISI — kesin bitmemiş
      // (playing/pass) tüm harfler "timeout" (kaybedilmiş) sayılıyor, yani bugün için ilerleme
      // tamamlanmış/başarısız sayılır ve aynı 24 saatlik pencerede tekrar denenemez.
      if (wordGameMode === "daily") {
        setWordProgress((prev) => {
          const next = { ...prev };
          TR_ALPHABET_ROTATION.forEach((l) => {
            const st = next[l]?.status;
            if (!st || st === "playing" || st === "pass") {
              next[l] = { status: "timeout", wrongCount: next[l]?.wrongCount || 0, lastGuess: next[l]?.lastGuess };
            }
          });
          persistWordProgress(next, wordTimeLeft);
          return next;
        });
        setWordResultsAutoShown(true);
      }
      setWordGameMode("menu");
    } else if (exitConfirm.kind === "skin-war") {
      discardPendingSkinStats();
      setIsSkinBattleOpen(false);
      setSkinBattleDone(false);
      setSkinBracketPairs([]);
      setSkinBattleIndex(0);
      setSkinRoundNumber(1);
      setSkinWinnerFlash(null);
      setSkinTotalPool(0);
      setSkinCumulativePicks(0);
      setSkinView("leaderboard");
    }
    if (exitConfirm.targetTab) setActiveTab(exitConfirm.targetTab);
    setExitConfirm(null);
  };
  const [wordResultsAutoShown, setWordResultsAutoShown] = useState(false);
  // YENİ (istek): "günlük modda 24 saatte bir, oyuncunun en son girdiğinden itibaren 24 saat
  // sonra kelimelerin değişmesi lazım, kaç saat dakika kaldığı yazsın" — eskiden set takvim
  // gününe göre (herkes için aynı anda, gece yarısı) değişiyordu. Artık HER OYUNCU İÇİN AYRI,
  // kendi son oynayışından 24 saat sonra yenileniyor. dailyUnlockAt = bir sonraki yeni kelime
  // setinin açılacağı zaman (ms); dailySetSeed = o setin hangi kelime varyantlarını göstereceği.
  const [dailyUnlockAt, setDailyUnlockAt] = useState<number | null>(null);
  const [dailySetSeed, setDailySetSeed] = useState(0);

  // DÜZELTME (istek): "günün lideri" artık SAHTE/rastgele bir isim değil. Şimdilik boş
  // başlıyor ("henüz kimse yok") ve o günün setinde TÜM kelimeleri doğru bilen İLK hesabın adı
  // geldiğinde onu gösteriyor. Diğer canlı özellikler (liderlik tablosu, nişangahlar, lobiler)
  // gibi bir /api rotasından çekiyor — rota eklenmeden sessizce boş kalır, site çökmez.
  // NOT: Bu özelliğin gerçekten çalışması için backend tarafında (henüz bu dosyada olmayan)
  // GET/POST /api/wordgame-leader rotasının eklenmesi gerekiyor (aşağıdaki fetch/submit buna göre yazıldı).
  const [dailyLeaderName, setDailyLeaderName] = useState<string | null>(null);
  const [dailyLeaderSubmittedForSeed, setDailyLeaderSubmittedForSeed] = useState<number | null>(null);
  useEffect(() => {
    if (wordGameMode === "menu" || wordGameMode === "daily") {
      (async () => {
        try {
          const res = await fetch(`/api/wordgame-leader?seed=${dailySetSeed}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data && typeof data.leaderName === "string") setDailyLeaderName(data.leaderName);
          else setDailyLeaderName(null);
        } catch {
          // /api/wordgame-leader henüz eklenmemiş olabilir — sorun değil, "henüz kimse yok" gösterilir
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordGameMode, dailySetSeed]);
  const [dailyCountdownNow, setDailyCountdownNow] = useState(() => Date.now());
  useEffect(() => {
    if (activeTab !== "word-game" || wordGameMode === "unlimited") return;
    const t = setInterval(() => setDailyCountdownNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [wordGameMode]);

  // Bugünün seti — TÜM harfler birlikte bu sete göre kelime/ipucu gösteriyor. Artık takvim
  // gününe değil, dailySetSeed'e (oyuncunun kendi 24 saatlik döngüsü) göre belirleniyor.
  const todaysWordBank: Record<string, { word: string; clue: string }> = useMemo(() => {
    const bank: Record<string, { word: string; clue: string }> = {};
    TR_ALPHABET_ROTATION.forEach((l) => {
      const variants = (WORD_GAME_VARIANTS_BY_LANG[siteLanguage] || WORD_GAME_VARIANTS_BY_LANG.TR)[l];
      bank[l] = variants[dailySetSeed % variants.length];
    });
    return bank;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailySetSeed, siteLanguage]);

  // Aşağıdaki tüm oyun mantığı (zamanlayıcı, cevap kontrolü, sonuç ekranı) artık bu "aktif"
  // banka/ilerleme çiftini kullanıyor — mod "daily" ise günlük (kayıtlı) veri, "unlimited" ise
  // limitsiz (kayıtsız) veri. Böylece aynı arayüz kodu iki modda da çalışıyor.
  const activeWordBank = wordGameMode === "unlimited" ? unlimitedWordBank : todaysWordBank;
  const activeWordProgress = wordGameMode === "unlimited" ? unlimitedProgress : wordProgress;
  const setActiveWordProgress = wordGameMode === "unlimited" ? setUnlimitedProgress : setWordProgress;

  const wordGameStorageKey = () => `infinity_wordgame_${currentUser || "guest"}`;

  // DÜZELTME (istek): "24 saatte bir, oyuncunun en son girdiğinden itibaren" — artık kayıtlı
  // kayıtta bir sonraki açılış zamanı (unlockAt) tutuluyor. O zaman henüz gelmediyse aynı set +
  // ilerleme geri yükleniyor; geldiyse (ya da hiç kayıt yoksa) YENİ bir set seçilip 24 saatlik
  // yeni bir pencere başlatılıyor ve ilerleme sıfırlanıyor.
  useLayoutEffect(() => {
    if (activeTab !== "word-game") return;
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(wordGameStorageKey());
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved.unlockAt === "number" && now < saved.unlockAt) {
        setDailyUnlockAt(saved.unlockAt);
        setDailySetSeed(saved.setSeed || 0);
        setWordProgress(saved.progress || {});
        setWordProgressLoaded(true);
        setWordResultsAutoShown(
          Object.values(saved.progress || {}).filter((p: any) => p.status === "correct" || p.status === "timeout").length >= TR_ALPHABET_ROTATION.length
        );
        // DÜZELTME (istek — toplam süre): sayfa yenilenince/geri dönülünce kalan süre de
        // (varsa) kaldığı yerden devam etsin, tekrar 240'a dönmesin.
        setWordTimeLeft(typeof saved.timeLeft === "number" ? saved.timeLeft : 240);
        return;
      }
      // Menüde yalnızca mevcut durumu göster; 24 saatlik döngü oyuncu günlük oyunu başlattığında başlar.
      if (wordGameMode !== "daily") {
        setDailyUnlockAt(saved?.unlockAt || null);
        setDailySetSeed(saved?.setSeed || 0);
        setWordProgress({});
        setWordProgressLoaded(true);
        return;
      }
      // Süre dolmuş (ya da hiç oynanmamış) — yeni 24 saatlik döngü + yeni kelime seti başlat.
      const newSeed = (saved?.setSeed ?? -1) + 1;
      const newUnlockAt = now + 24 * 60 * 60 * 1000;
      window.localStorage.setItem(wordGameStorageKey(), JSON.stringify({ unlockAt: newUnlockAt, setSeed: newSeed, progress: {}, timeLeft: 240 }));
      setDailyUnlockAt(newUnlockAt);
      setDailySetSeed(newSeed);
      setWordProgress({});
      setWordProgressLoaded(true);
      setWordResultsAutoShown(false);
      // Yeni set = yeni 4 dakikalık TOPLAM süre.
      setWordTimeLeft(240);
    } catch {
      const newUnlockAt = now + 24 * 60 * 60 * 1000;
      setDailyUnlockAt(newUnlockAt);
      setWordProgress({});
      setWordProgressLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser, wordGameMode]);

  // Seçili harf değiştiğinde SADECE giriş kutusu temizlenir. DÜZELTME (istek — "her soru için
  // 4 dakika var, bunu toplam süre olarak değiştiricez"): artık harf değişince wordTimeLeft
  // ARTIK SIFIRLANMIYOR — süre tüm sete ait TEK ortak bir bütçe, hangi harfte olursan ol akmaya
  // devam ediyor. "pass" durumundaki bir harfe geri dönülüyorsa (otomatik pas döngüsü) onu da
  // "playing"e çevirip gerçekten yeniden denenebilir hale getiriyoruz — yoksa sonsuza kadar
  // "pass" kalırdı.
  useEffect(() => {
    if (wordGameMode === "daily" && !wordProgressLoaded) return;
    const existing = activeWordProgress[selectedWordLetter];
    if (!existing || existing.status === "playing") {
      setWordGuessInput("");
    } else if (existing.status === "pass") {
      setActiveWordProgress((prev) => {
        const next = { ...prev };
        delete next[selectedWordLetter];
        if (wordGameMode === "daily") persistWordProgress(next);
        return next;
      });
      setWordGuessInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWordLetter, wordProgressLoaded, wordGameMode]);

  // DÜZELTME (istek): "her soru için 4 dakika var, bunu toplam süre olarak değiştiricez" —
  // artık 240 saniye HARF BAŞINA değil, günün/limitsiz setin TAMAMI için TEK ortak sayaç.
  // Bu yüzden kalan süre de (progress gibi) kalıcı olarak kaydediliyor — yoksa sayfa
  // yenilenince kişi süreyi bedavaya sıfırlamış olurdu (eski harf-başı modelde bu risk yoktu,
  // yeni toplam-süre modelinde bu açığı kapatmak gerekiyor).
  const persistWordProgress = (next: Record<string, { status: "playing" | "correct" | "pass" | "timeout"; wrongCount: number; lastGuess?: string }>, timeLeftOverride?: number) => {
    try {
      window.localStorage.setItem(wordGameStorageKey(), JSON.stringify({ unlockAt: dailyUnlockAt, setSeed: dailySetSeed, progress: next, timeLeft: timeLeftOverride ?? wordTimeLeft }));
    } catch {}
  };

  // Bir harfin turu bitince (doğru/pas/süre doldu) o harfe özel sonucu kaydet. DÜZELTME (istek):
  // artık "aktif" moda (günlük/limitsiz) yazıyor — limitsiz modda ASLA localStorage'a
  // yazılmıyor, sadece günlükte kalıcı hale geliyor.
  // YENİ (istek): "cevap anahtarında yanlış yapılan sorularda oyuncunun verdiği cevap yazsın" —
  // artık yanlış cevap verildiğinde oyuncunun GERÇEKTEN yazdığı metin de saklanıyor, sonuç
  // ekranındaki cevap anahtarında doğru cevabın yanında gösterilebiliyor.
  const finishWordRound = (letter: string, status: "correct" | "pass" | "timeout", finalWrongCount: number, lastGuess?: string) => {
    setActiveWordProgress((prev) => {
      const next = { ...prev, [letter]: { status, wrongCount: finalWrongCount, lastGuess: lastGuess ?? prev[letter]?.lastGuess } };
      if (wordGameMode === "daily") persistWordProgress(next);
      return next;
    });
  };

  // YENİ (istek): "oyuncu pas bıraktığı sorulara tüm harfleri bitirdikten sonra otomatik
  // pas bıraktığı harfleri gezsin ... tekrar pas bırakırsa döngü" — "pas" artık KALICI bir
  // sonuç değil, sadece GEÇİCİ bir atlama. Sıradaki harf ararken "playing" (hiç denenmemiş)
  // VEYA "pass" (daha önce atlanmış, tekrar denenmeyi bekliyor) durumundaki harfler aday
  // sayılıyor — böylece A/C/E atlanıp Y'ye kadar gidildiğinde, Y bitince otomatik olarak
  // sırayla A'ya, sonra (yine pas geçilirse) C'ye dönülüyor; bu döngü her harf gerçekten
  // DOĞRU ya da (yanlış cevap/süre dolması ile) KESİN YANLIŞ olana kadar sürüyor.
  const moveToNextWord = (fromLetter: string) => {
    const index = TR_ALPHABET_ROTATION.indexOf(fromLetter);
    const remaining = [...TR_ALPHABET_ROTATION.slice(index + 1), ...TR_ALPHABET_ROTATION.slice(0, index)];
    const next = remaining.find((letter) => {
      const st = activeWordProgress[letter]?.status;
      return !st || st === "playing" || st === "pass";
    });
    if (next) setSelectedWordLetter(next);
  };

  const currentWordProgress = activeWordProgress[selectedWordLetter];
  const currentWordStatus: "playing" | "correct" | "pass" | "timeout" = currentWordProgress?.status || "playing";
  const currentWordWrongCount = currentWordProgress?.wrongCount || 0;

  // Bugünkü/limitsizdeki harflerin tamamı bitince "Sonuçlar" ekranını (bir kez) otomatik aç.
  useEffect(() => {
    if (wordGameMode === "daily" && (!wordProgressLoaded || wordResultsAutoShown)) return;
    if (wordGameMode === "unlimited" && wordResultsAutoShown) return;
    const values = Object.values(activeWordProgress);
    const done = values.filter((p) => p.status === "correct" || p.status === "timeout").length;
    if (done >= TR_ALPHABET_ROTATION.length) {
      setWordResultsOpen(true);
      setWordResultsAutoShown(true);
      // DÜZELTME (istek): "günün lideri" — o günkü setin TAMAMINI doğru bilen ilk hesap
      // sunucuya bildiriliyor (backend, ilk gelen ismi kalıcı tutup sonrakileri yok sayabilir).
      const allCorrect = values.filter((p) => p.status === "correct").length >= TR_ALPHABET_ROTATION.length;
      if (wordGameMode === "daily" && allCorrect && currentUser && dailyLeaderSubmittedForSeed !== dailySetSeed) {
        setDailyLeaderSubmittedForSeed(dailySetSeed);
        fetch("/api/wordgame-leader", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed: dailySetSeed, name: currentUser }),
        }).then(async (res) => {
          if (!res.ok) return;
          try {
            const data = await res.json();
            if (data && typeof data.leaderName === "string") setDailyLeaderName(data.leaderName);
          } catch {}
        }).catch(() => {
          // /api/wordgame-leader henüz eklenmemiş olabilir, sorun değil
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordProgress, wordProgressLoaded, wordResultsAutoShown, wordGameMode]);

  // TOPLAM SÜRE geri sayımı (istek: "her soru için 4 dakika var, bunu toplam süre olarak
  // değiştiricez") — artık seçili harften BAĞIMSIZ, tüm 28 harflik set için TEK ortak 4
  // dakikalık bütçe akıyor. Sette en az bir "playing"/"pass" (henüz kesin bitmemiş) harf
  // olduğu sürece saniye saniye azalır. 0'a inince o ANDA kesin bitmemiş TÜM harfler birden
  // "süresi doldu" sayılır (tek tek her harfte ayrı ayrı beklemek yerine).
  useEffect(() => {
    if (activeTab !== "word-game" || wordGameMode === "menu") return;
    if (wordGameMode === "daily" && !wordProgressLoaded) return;
    if (exitConfirm) return; // onay penceresi açıkken sayaç durur ("arkada oyun devam etmesin")
    const stillPlaying = TR_ALPHABET_ROTATION.some((l) => {
      const st = activeWordProgress[l]?.status;
      return !st || st === "playing" || st === "pass";
    });
    if (!stillPlaying) return;
    if (wordTimeLeft <= 0) {
      setActiveWordProgress((prev) => {
        const next = { ...prev };
        TR_ALPHABET_ROTATION.forEach((l) => {
          const st = next[l]?.status;
          if (!st || st === "playing" || st === "pass") {
            next[l] = { status: "timeout", wrongCount: next[l]?.wrongCount || 0, lastGuess: next[l]?.lastGuess };
          }
        });
        if (wordGameMode === "daily") persistWordProgress(next, 0);
        return next;
      });
      return;
    }
    const t = setTimeout(() => {
      setWordTimeLeft((s) => {
        const nextVal = s - 1;
        if (wordGameMode === "daily") persistWordProgress(activeWordProgress, nextVal);
        return nextVal;
      });
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, wordProgressLoaded, wordTimeLeft, wordGameMode, activeWordProgress, exitConfirm]);

  // DÜZELTME (ASIL BUG — "ISO'ya iso yazınca yanlış diyor"): Türkçe'de küçük harf "i" büyütülünce
  // NOKTALI "İ" olur (toLocaleUpperCase("tr-TR")), ama "ISO" gibi özel isimler veritabanında
  // NOKTASIZ büyük "I" ile saklanıyor — bu yüzden doğru cevap yazılsa bile "İSO" ≠ "ISO" olup
  // YANLIŞ sayılıyordu (klasik "Türkçe I problemi"). Artık karşılaştırmadan önce İ/I/ı/i
  // hepsi TEK bir harfe indirgeniyor, hangi tuşla yazılırsa yazılsın eşleşiyor.
  const normalizeForCompare = (s: string) => s.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I");

  const [wordStartWarning, setWordStartWarning] = useState(false);

  const submitWordGuess = () => {
    const answer = activeWordBank[selectedWordLetter]?.word || "";
    const raw = wordGuessInput.trim();
    if (raw === "") return;

    // "bitir" yazılırsa oyun erken sonlandırılır (pas ile aynı şekilde işlenir).
    if (normalizeForCompare(raw) === "BITIR") {
      playClickSound();
      finishWordRound(selectedWordLetter, "pass", currentWordWrongCount);
      setWordGuessInput("");
      return;
    }

    // YENİ (istek): "yukarda A varsa cypher yazınca kelimen A ile başlamalı uyarısı versin,
    // oyuncu tekrar yazsın" — cevap, seçili harfle başlamıyorsa direkt YANLIŞ SAYMADAN önce
    // uyarı gösterip tekrar denemesine izin veriyoruz (deneme hakkı/süre kaybetmeden).
    if (normalizeForCompare(raw)[0] !== normalizeForCompare(selectedWordLetter)) {
      playWrongSound();
      setWordStartWarning(true);
      setWordGuessInput("");
      setTimeout(() => setWordStartWarning(false), 2200);
      return;
    }

    if (normalizeForCompare(raw) === normalizeForCompare(answer)) {
      playCorrectSound();
      setWordFeedback("correct");
      setTimeout(() => setWordFeedback(null), 600);
      finishWordRound(selectedWordLetter, "correct", currentWordWrongCount);
      setWordGuessInput("");
      setTimeout(() => moveToNextWord(selectedWordLetter), 650);
    } else {
      playWrongSound();
      setWordFeedback("wrong");
      setTimeout(() => setWordFeedback(null), 600);
      finishWordRound(selectedWordLetter, "timeout", currentWordWrongCount + 1, raw);
      setWordGuessInput("");
      setTimeout(() => moveToNextWord(selectedWordLetter), 650);
    }
  };

  const passWordRound = () => {
    playClickSound();
    finishWordRound(selectedWordLetter, "pass", currentWordWrongCount);
    setWordGuessInput("");
    setTimeout(() => moveToNextWord(selectedWordLetter), 450);
  };

  const [skinCatalogLoading, setSkinCatalogLoading] = useState(true);
  // DÜZELTME (istek): "Bıçak dışındaki silahlarda skin bulunamadı diyor" — bu yer tutucu liste
  // canlı valorant-api.com isteği bitene (ya da başarısız olursa süresiz) kadar gösteriliyor.
  // Listede "Classic" ve "Ghost" için HİÇ satır yoktu — yani o iki sekmeye bakan biri, gerçek
  // veri henüz gelmemişse (yavaş bağlantı) ya da istek başarısız olursa (aşağıdaki .catch),
  // KESİN olarak "skin bulunamadı" görüyordu. Artık 7 silahın (Vandal, Phantom, Bıçak, Sheriff,
  // Classic, Operator, Ghost) HER BİRİNDE en az birkaç yer tutucu satır var.
  const [skinCatalog, setSkinCatalog] = useState<{ id: string; name: string; weapon: string; image: string | null; votes: number }[]>([
    { id: "prime-vandal", name: "Prime Vandal", weapon: "Vandal", image: null, votes: 982 }, { id: "reaver-vandal", name: "Reaver Vandal", weapon: "Vandal", image: null, votes: 961 },
    { id: "kuronami-vandal", name: "Kuronami Vandal", weapon: "Vandal", image: null, votes: 944 }, { id: "araxys-vandal", name: "Araxys Vandal", weapon: "Vandal", image: null, votes: 926 },
    { id: "xerofang-vandal", name: "Xerøfang Vandal", weapon: "Vandal", image: null, votes: 901 }, { id: "prime-phantom", name: "Prime Phantom", weapon: "Phantom", image: null, votes: 873 },
    { id: "recon-phantom", name: "Recon Phantom", weapon: "Phantom", image: null, votes: 851 }, { id: "ion-sheriff", name: "Ion Sheriff", weapon: "Sheriff", image: null, votes: 832 },
    { id: "reaver-sheriff", name: "Reaver Sheriff", weapon: "Sheriff", image: null, votes: 817 }, { id: "ion-operator", name: "Ion Operator", weapon: "Operator", image: null, votes: 798 },
    { id: "reaver-knife", name: "Reaver Karambit", weapon: "Bıçak", image: null, votes: 785 }, { id: "kuronami-knife", name: "Kuronami no Yaiba", weapon: "Bıçak", image: null, votes: 772 },
    { id: "prime-classic", name: "Prime Classic", weapon: "Classic", image: null, votes: 760 }, { id: "reaver-classic", name: "Reaver Classic", weapon: "Classic", image: null, votes: 745 },
    { id: "prime-ghost", name: "Prime Ghost", weapon: "Ghost", image: null, votes: 733 }, { id: "ion-ghost", name: "Ion Ghost", weapon: "Ghost", image: null, votes: 720 },
  ]);

  // Skin görselleri paketlenmiş dosya değil; resmi topluluk veri kaynağından URL olarak gelir.
  // Böylece yüzlerce görseli public klasörüne tek tek koymak gerekmez.
  // DÜZELTME (istek): "skin adlarını Türkçe yapmak istiyorum" — valorant-api.com,
  // ?language=tr-TR parametresiyle çağrılınca displayName alanını doğrudan Türkçe
  // döndürüyor (örn. "Prelude to Chaos Vandal" yerine resmi Türkçe skin adı gelir).
  // Ekstra bir çeviri katmanı yazmaya gerek kalmadan API'den doğrudan Türkçe isim çekiliyor.
  useEffect(() => {
    // DÜZELTME (istek): "Bıçak dışında diğer silahlerde skin bulunamadı diyor" — bunun asıl
    // nedeni valorant-api.com isteğinin ara sıra (yavaş bağlantı/geçici kesinti) başarısız
    // olması, ve o zaman katalogun yukarıdaki YER TUTUCU listede takılı kalmasıydı. Artık ilk
    // istek başarısız olursa 1.5 saniye sonra BİR KEZ daha deneniyor; her iki deneme de
    // başarısız olursa katalog en azından 7 silahın hepsini kapsayan yer tutucu listede kalıyor
    // (yukarıya bkz.), asla tamamen boş bir sekme göstermiyor.
    let cancelled = false;
    const load = (isRetry: boolean) => {
      // DÜZELTME (ASIL BUG — "Bıçak dışındaki HER silahta skin bulunamadı"): silah eşleştirmesi
      // yalnızca tr-TR isteğinden gelen weapon.displayName metnine göre yapılıyordu. Bıçak
      // (Melee) zaten koddan sabit "Bıçak" olarak atandığı için HER ZAMAN çalışıyordu, ama
      // diğer silahlar (Vandal/Phantom/Sheriff/Classic/Operator/Ghost) tr-TR yanıtındaki
      // displayName'in sekme anahtarlarıyla (WEAPON_OPTIONS) birebir aynı gelmesine bağımlıydı
      // — küçük bir biçim farkı (boşluk, büyük/küçük harf, yerelleştirme) tek bir eşleşmeyi bile
      // bozarsa o silahın sekmesi tamamen boş kalıyordu. Artık silah TÜRÜ (weapon.uuid üzerinden)
      // dilden BAĞIMSIZ İNGİLİZCE isimle eşleştiriliyor, skin İSİMLERİ ise ayrıca tr-TR'den
      // alınıyor — böylece hangi dilde ne dönerse dönsün sekme eşleşmesi asla bozulmuyor.
      Promise.all([
        fetch("https://valorant-api.com/v1/weapons?language=tr-TR").then((res) => (res.ok ? res.json() : null)),
        fetch("https://valorant-api.com/v1/weapons").then((res) => (res.ok ? res.json() : null)),
      ])
        .then(([payload, enPayload]) => {
          if (cancelled) return;
          if (!Array.isArray(payload?.data)) {
            if (!isRetry) { setTimeout(() => load(true), 1500); return; }
            setSkinCatalogLoading(false);
            return;
          }
          // uuid -> dilden bağımsız İngilizce silah adı (Vandal, Phantom, Ghost, Sheriff,
          // Classic, Operator...). Bu isimler WEAPON_OPTIONS sekme anahtarlarıyla birebir aynı.
          const englishNameByUuid = new Map<string, string>(
            (Array.isArray(enPayload?.data) ? enPayload.data : []).map((w: any) => [w.uuid, String(w.displayName || "").trim()])
          );
          // DÜZELTME (istek): "random favorite skins" ve "standart kaplama" (K/TAC Operator gibi
          // varsayılan/temel silah görünümleri) oylama havuzundan çıkarıldı. İsim karşılaştırması
          // (displayName !== weapon.displayName) güvenilir değildi çünkü bazı temel skinlerin özel
          // isimleri var (örn. Operator'ın temel skini "K/TAC Operator"). Asıl güvenilir ayraç:
          // GERÇEK/satın alınabilir skinlerin her zaman bir "contentTierUuid" (Select/Deluxe/
          // Premium/Ultra/Exclusive nadirlik seviyesi) vardır, temel/varsayılan skinlerde bu alan
          // hiç yoktur (null). Böylece havuzda artık sadece gerçek, satın alınabilir skinler kalıyor.
          // DÜZELTME (istek): "BAĞÇÖZEN CLASSIC" gibi tamamen büyük harfli isimler yerine Title
          // Case ("Vahşiçene Classic" tarzı, her kelimenin ilk harfi büyük) — Türkçe İ/I harfleri
          // için toLocaleLowerCase/toLocaleUpperCase("tr-TR") kullanılıyor ki "i" yanlışlıkla "I"
          // olmasın.
          const toTitleCase = (str: string) =>
            str
              .toLocaleLowerCase("tr-TR")
              .split(" ")
              .map((word: string) => (word.length ? word[0].toLocaleUpperCase("tr-TR") + word.slice(1) : word))
              .join(" ");
          const mapped: { id: string; name: string; weapon: string; image: string | null; votes: number }[] = payload.data.flatMap((weapon: any) => (weapon.skins || [])
            .filter((skin: any) => skin.displayName && skin.displayName !== weapon.displayName && !!skin.contentTierUuid)
            .map((skin: any, index: number) => ({
              id: skin.uuid as string, name: toTitleCase(skin.displayName) as string,
              // DÜZELTME: weapon.displayName'in başında/sonunda görünmez boşluk gelme ihtimaline
              // karşı .trim() eklendi — WEAPON_OPTIONS sekme anahtarlarıyla (örn. "Classic")
              // birebir string eşleşmesi bu yüzden sessizce başarısız olabiliyordu.
              weapon: (weapon.category === "EEquippableCategory::Melee"
                ? "Bıçak"
                : (englishNameByUuid.get(weapon.uuid) || String(weapon.displayName || "").trim())) as string,
              image: (
                skin.displayIcon
                || skin.chromas?.[0]?.fullRender
                || skin.chromas?.[0]?.displayIcon
                || skin.levels?.[0]?.displayIcon
                || skin.chromas?.[0]?.swatch
                || null
              ) as string | null,
              votes: Math.max(80, 1000 - index * 3),
            }))
          )
            // DÜZELTME (istek): "Gösterişli Bıçak hiçbir türlü yüklenmiyor, direkt kaldırabilirsin
            // siteden böyle bi skin" — görseli hiçbir kaynaktan bulunamayan (yukarıdaki tüm
            // fallback'lere rağmen null kalan) skinler artık havuza HİÇ girmiyor; kırık/boş
            // kart göstermek yerine sessizce eleniyor.
            .filter((s: { image: string | null }) => !!s.image);
          if (mapped.length) {
            setSkinCatalog(mapped);
            // DÜZELTME: eğer daha önce seçili/kaydedilmiş silah, gerçek katalogda yoksa
            // (örn. hiç skin bulunamayan bir sekmede kalınmışsa) otomatik olarak listede
            // GERÇEKTEN var olan ilk silaha geç — böylece "0 skin bulundu" durumunda
            // kullanıcı asla boş bir sekmede takılı kalmaz.
            setSkinWeapon((current: string): string => {
              const weapons: string[] = Array.from(new Set(mapped.map((s) => s.weapon)));
              return weapons.includes(current) ? current : (weapons[0] || current);
            });
          } else if (!isRetry) {
            setTimeout(() => load(true), 1500);
            return;
          }
          setSkinCatalogLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (!isRetry) { setTimeout(() => load(true), 1500); return; }
          setSkinCatalogLoading(false);
        });
    };
    load(false);
    return () => { cancelled = true; };
  }, []);

  // Oturum bazlı giriş sistemi (gerçek kalıcı hesap için backend/veritabanı gerekir - bu client-side bir simülasyondur)
  // DÜZELTME: giriş artık localStorage'da saklanıyor, F5 / sayfa yenilemede kaybolmuyor.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // YENİ: nav sekme çizgisinin (navActiveIndicator) F5'te "titremesi" buradan geliyordu —
  // layoutId'li bir motion.div, ilk render "home" ile başlayıp useLayoutEffect kayıtlı sekmeye
  // (örn. "crosshairs") geçince, bu iki render arasında bir KAYMA animasyonu oynatıyordu (kullanıcı
  // "home" halini hiç görmese bile, Framer Motion iki commit arasındaki pozisyon farkını FLIP
  // animasyonuyla oynatıyor). navMounted, mount'tan SONRA true oluyor — ilk boyamada (henüz false
  // iken) çizgi animasyonsuz, direkt doğru yerinde beliriyor; sonraki gerçek sekme değişimlerinde
  // (kullanıcı tıklayınca, navMounted zaten true) normal kayma animasyonu çalışmaya devam ediyor.
  const [navMounted, setNavMounted] = useState(false);
  useEffect(() => { setNavMounted(true); }, []);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginWarning, setLoginWarning] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false); // YENİ: sağ üstteki hesap butonu artık direkt çıkış yapmıyor, menü açıyor
  // YENİ (istek — "mobilde üst menünün yarısı gözükmüyor, kayan bişey olmadığı için diğer
  // yerler felaket gözüküyor, giriş yapma yerleri hiç gözükmüyor"): masaüstünde iyi çalışan tek
  // satırlık nav bar (logo + arama + 8 sekme + hesap alanı) mobilde ASLA sarmıyordu/kaymıyordu,
  // sadece görünür genişliğe sığan kadarı görünüp gerisi (Forum'dan sonrası, bildirim zili,
  // giriş/hesap butonu) tamamen ekran dışında kalıyordu. Artık `lg` altında arama kutusu ve
  // sekmeler gizlenip yerine bir hamburger butonu + açılır mobil menü geliyor; hesap/giriş
  // alanı HER ZAMAN (mobilde de) görünür kalıyor.
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  // YENİ (istek): "bildirim kutusunun soluna dil seçenekleri ekleyelim" — DÜRÜST NOT: sitenin
  // TÜM içeriğini (yarışma soruları, kelime oyunu ipuçları, forum, vb.) çevirmek çok büyük ayrı
  // bir iş; bu bir dil SEÇİCİSİ ekliyor ve üst menüdeki 8 sekme etiketini gerçekten çeviriyor.
  // Geri kalan tüm içerik hâlâ Türkçe kalıyor — istersen bunu kapsamlı bir sonraki adımda
  // (tüm metinleri bir çeviri sözlüğüne taşıyarak) genişletebiliriz.
  // DÜZELTME (istek — "tüm sayfanın çevirisinin çok zor olduğunu anladım, o yüzden orayı 3'e
  // düşür, Almanca İngilizce Türkçe kalsın... onları tamamen çeviri yap"): liste 8'den 3'e
  // indirildi. Aşağıdaki UI_STRINGS sözlüğü de artık sadece bu 3 dil için TAM ve kaliteli
  // çeviriler içeriyor (önceden sadece üst menüdeki 8 sekme adı çevriliyordu).
  const SITE_LANGUAGES = [
    { code: "US", label: "English" },
    { code: "TR", label: "Türkçe" },
    { code: "DE", label: "Deutsch" },
  ];
  // NOT: siteLanguage state'i artık daha yukarıda (kelime oyunu kelime bankalarından ÖNCE)
  // tanımlı — TDZ hatasını önlemek için taşındı, bkz. currentUser'ın hemen altı.
  const changeSiteLanguage = (code: string) => {
    setSiteLanguage(code);
    try { window.localStorage.setItem("infinity_site_language", code); } catch {}
    setIsLangMenuOpen(false);
  };
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const NAV_TAB_LABELS_BY_LANG: Record<string, Record<string, string>> = {
    TR: { home: "Ana Sayfa", crosshairs: "Nişangahlar", quiz: "Bilgi Yarışması", "find-team": "Takım Bul", forum: "Forum", "rank-guess": "Rank Tahmin", "skin-war": "Skin Savaşı", "word-game": "Kelime Oyunu" },
    US: { home: "Home", crosshairs: "Crosshairs", quiz: "Quiz", "find-team": "Find Team", forum: "Forum", "rank-guess": "Rank Guess", "skin-war": "Skin War", "word-game": "Word Game" },
    DE: { home: "Startseite", crosshairs: "Fadenkreuze", quiz: "Quiz", "find-team": "Team Finden", forum: "Forum", "rank-guess": "Rang Raten", "skin-war": "Skin Kampf", "word-game": "Wortspiel" },
  };
  const NAV_TAB_LABELS: Record<string, string> = NAV_TAB_LABELS_BY_LANG[siteLanguage] || NAV_TAB_LABELS_BY_LANG.TR;

  // YENİ (istek — "3 dil kalsın... onları tamamen çeviri yap, kaliteli ve doğru çeviri olsun,
  // tüm sayfa oyunlar menüler her yer çevrilsin"): sitenin ORTAK/tekrar eden arayüz metinleri
  // (butonlar, başlıklar, boş/uyarı durumları, modallar) için genel amaçlı bir sözlük + t()
  // yardımcı fonksiyonu. DÜRÜST NOT: bu, üst menüdeki sekme adlarının ötesinde arayüzün BÜYÜK
  // kısmını kapsıyor (nav, hesap/giriş, her sekmenin başlığı, quiz/kelime oyunu/skin
  // savaşı/rank tahmin/takım bul/forum arayüz metinleri, onay pencereleri, footer). Kapsam
  // dışında kalan (çevrilmeyen) tek şey: quiz soru bankası, kelime oyunu ipucu metinleri ve
  // forum'daki KULLANICI tarafından yazılmış gönderiler — bunlar sabit arayüz metni değil,
  // veritabanı/veri içeriği; siteye eklenen HERHANGİ bir dilde serbestçe yazılabilmesi gerekir,
  // bu yüzden UI çeviri sözlüğüne değil, ileride ayrı bir "içerik çevirisi" katmanına ait.
  const UI_STRINGS: Record<string, Record<string, string>> = {
    // --- Genel / hesap / nav ---
    login: { TR: "Giriş Yap", US: "Log In", DE: "Anmelden" },
    logout: { TR: "Çıkış Yap", US: "Log Out", DE: "Abmelden" },
    save: { TR: "Kaydet", US: "Save", DE: "Speichern" },
    cancel: { TR: "Vazgeç", US: "Cancel", DE: "Abbrechen" },
    edit: { TR: "Düzenle", US: "Edit", DE: "Bearbeiten" },
    close: { TR: "Kapat", US: "Close", DE: "Schließen" },
    search: { TR: "Ara", US: "Search", DE: "Suchen" },
    loading: { TR: "Yükleniyor…", US: "Loading…", DE: "Wird geladen…" },
    viewProfile: { TR: "Profilimi Görüntüle", US: "View My Profile", DE: "Mein Profil Ansehen" },
    notifications: { TR: "Bildirimler", US: "Notifications", DE: "Benachrichtigungen" },
    noNotifications: { TR: "Henüz bildirim yok.", US: "No notifications yet.", DE: "Noch keine Benachrichtigungen." },
    reportButton: { TR: "🚩 Şikayet Et", US: "🚩 Report", DE: "🚩 Melden" },
    alreadyReported: { TR: "Zaten şikayet ettin.", US: "You already reported this.", DE: "Du hast das bereits gemeldet." },
    // --- Çıkış onay penceresi (quiz / kelime oyunu / skin savaşı) ---
    exitConfirmTitleTab: { TR: "Sekmeden çıkmak istediğine emin misin?", US: "Are you sure you want to leave this tab?", DE: "Bist du sicher, dass du diesen Tab verlassen willst?" },
    exitConfirmTitleMenu: { TR: "Menüye dönmek istediğine emin misin?", US: "Are you sure you want to return to the menu?", DE: "Bist du sicher, dass du zum Menü zurückkehren willst?" },
    exitConfirmQuiz: { TR: "Yarışma henüz bitmedi. Şimdi çıkarsan bu oyundaki ilerlemen kaydedilmeyecek, puanın liderlik tablosuna yansımayacak VE bugünkü oynama hakların birini kullanmış olacaksın.", US: "The quiz isn't finished yet. If you leave now, your progress won't be saved, your score won't count on the leaderboard, AND you'll use up one of today's attempts.", DE: "Das Quiz ist noch nicht beendet. Wenn du jetzt gehst, wird dein Fortschritt nicht gespeichert, dein Punktestand zählt nicht für die Bestenliste UND du verbrauchst einen deiner heutigen Versuche." },
    exitConfirmWordGame: { TR: "Bu set henüz tamamlanmadı. Günlük moddan şimdi çıkarsan bugünkü hakkın kullanılmış sayılır; limitsiz modda tekrar girebilirsin ama kelimeler yenilenir.", US: "This set isn't finished yet. If you leave Daily mode now, today's attempt will be used up; in Unlimited mode you can re-enter, but the words will reset.", DE: "Dieses Set ist noch nicht abgeschlossen. Wenn du den täglichen Modus jetzt verlässt, gilt dein heutiger Versuch als verbraucht; im unbegrenzten Modus kannst du erneut starten, aber die Wörter werden neu gemischt." },
    exitConfirmSkinWar: { TR: "Bu turnuva henüz bitmedi. Şimdi çıkarsan bu oturumdaki seçimlerin liderlik tablosuna yansımayacak.", US: "This tournament isn't finished yet. If you leave now, your picks this session won't count on the leaderboard.", DE: "Dieses Turnier ist noch nicht beendet. Wenn du jetzt gehst, zählen deine Auswahlen in dieser Sitzung nicht für die Bestenliste." },
    exitConfirmStay: { TR: "Vazgeç", US: "Stay", DE: "Bleiben" },
    exitConfirmLeave: { TR: "Evet, çık", US: "Yes, leave", DE: "Ja, verlassen" },
    // --- Bilgi Yarışması ---
    quizTitle: { TR: "Bilgi Yarışması", US: "Quiz", DE: "Quiz" },
    quizLiveLeaderboard: { TR: "CANLI LİDERLİK TABLOSU", US: "LIVE LEADERBOARD", DE: "LIVE-BESTENLISTE" },
    quizLiveBadge: { TR: "CANLI", US: "LIVE", DE: "LIVE" },
    quizNoOneYet: { TR: "Henüz kimse yok", US: "No one yet", DE: "Noch niemand" },
    quizHeroLine1: { TR: "OYNA. YARIŞ.", US: "PLAY. COMPETE.", DE: "SPIELEN. WETTEIFERN." },
    quizHeroLine2: { TR: "RADYANT'A ULAŞ.", US: "REACH RADIANT.", DE: "ERREICHE RADIANT." },
    quizHeroSubtitle: { TR: "Valorant evrenine ne kadar hakimsin? Soruları en hızlı şekilde doğru cevapla, topluluk liderlik tablosunda zirveye oyna!", US: "How well do you know the Valorant universe? Answer questions correctly as fast as you can and climb to the top of the community leaderboard!", DE: "Wie gut kennst du das Valorant-Universum? Beantworte die Fragen so schnell wie möglich richtig und erklimme die Spitze der Community-Bestenliste!" },
    quizRiotId: { TR: "Riot Kimliğin", US: "Your Riot ID", DE: "Deine Riot-ID" },
    quizNotLoggedIn: { TR: "Giriş yapılmadı", US: "Not logged in", DE: "Nicht angemeldet" },
    quizTotalScore: { TR: "Toplam Puanın", US: "Total Score", DE: "Gesamtpunktzahl" },
    quizYourRank: { TR: "Sıralaman", US: "Your Rank", DE: "Dein Rang" },
    quizDailyLimitReached: { TR: "GÜNLÜK HAKKIN DOLDU", US: "DAILY LIMIT REACHED", DE: "TAGESLIMIT ERREICHT" },
    quizPlaysUsedToday: { TR: "Bugün {{used}}/{{limit}} oyun hakkını kullandın", US: "You've used {{used}}/{{limit}} plays today", DE: "Du hast heute {{used}}/{{limit}} Versuche genutzt" },
    quizPlayAgainTomorrow: { TR: " · Yarın tekrar oynayabilirsin", US: " · You can play again tomorrow", DE: " · Du kannst morgen wieder spielen" },
    quizJoin: { TR: "Yarışmaya Katıl", US: "Join the Quiz", DE: "Am Quiz Teilnehmen" },
    quizScore: { TR: "Skor", US: "Score", DE: "Punktzahl" },
    quizNoAttemptsLeft: { TR: "Bugünkü hakkını kullandın, yarın tekrar dene.", US: "You've used today's attempt — try again tomorrow.", DE: "Du hast deinen heutigen Versuch verbraucht — versuch es morgen wieder." },
    // --- Kelime Oyunu ---
    wordGameTitle: { TR: "Kelime Oyunu", US: "Word Game", DE: "Wortspiel" },
    wordGameDaily: { TR: "Günlük", US: "Daily", DE: "Täglich" },
    wordGameUnlimited: { TR: "Limitsiz", US: "Unlimited", DE: "Unbegrenzt" },
    wordGameBackToMenu: { TR: "← Menüye Dön", US: "← Back to Menu", DE: "← Zurück zum Menü" },
    // --- Kelime Oyunu menü ekranı (istek: "daha fazla çeviri yap") ---
    wordGameHowToPlay: { TR: "Nasıl oynamak istersin?", US: "How do you want to play?", DE: "Wie möchtest du spielen?" },
    wordGameDailyCompetitive: { TR: "Günlük (Rekabetçi)", US: "Daily (Competitive)", DE: "Täglich (Wettkampf)" },
    wordGameOncePerAccount: { TR: "Hesap başına 24 saatte bir", US: "Once every 24 hours per account", DE: "Einmal alle 24 Stunden pro Konto" },
    wordGameTodayLeader: { TR: "Günün lideri", US: "Today's leader", DE: "Führender heute" },
    wordGameNoLeaderYet: { TR: "Henüz kimse yok", US: "No one yet", DE: "Noch niemand" },
    wordGameDailyDesc: { TR: "Bugünün soru setini oyna, günlük kelime oyunu — hesap başına günde 1 kez, sonuçların herkesle aynı {{count}} kelimeye göre.", US: "Play today's question set — once per day per account, your results are measured against the same {{count}} words as everyone else.", DE: "Spiele das heutige Fragenset — einmal pro Tag und Konto, deine Ergebnisse werden anhand derselben {{count}} Wörter wie bei allen anderen gemessen." },
    wordGameUnlimitedDesc: { TR: "Sonraki günü bekleme, rekabeti boşver — her girişte {{count}} harfin kelimeleri yeniden karılır, istediğin kadar oyna, hiçbir şey kaydedilmez.", US: "No waiting for the next day, no competition — the {{count}} letters' words reshuffle every time, play as much as you like, nothing is saved.", DE: "Kein Warten auf den nächsten Tag, kein Wettbewerb — die Wörter der {{count}} Buchstaben werden bei jedem Start neu gemischt, spiel so viel du willst, es wird nichts gespeichert." },
    wordGameUnlimitedSubtitle: { TR: "Limitsiz soru seti", US: "Unlimited question set", DE: "Unbegrenztes Fragenset" },
    wordGamePlay: { TR: "Oyna", US: "Play", DE: "Spielen" },
    wordGameContinue: { TR: "Devam Et", US: "Continue", DE: "Fortsetzen" },
    // --- Skin Savaşı ---
    skinWarTitle: { TR: "Skin Savaşı", US: "Skin War", DE: "Skin Krieg" },
    skinWarSubtitle: { TR: "{{weapon}} skinleri için topluluk sıralaması.", US: "Community ranking for {{weapon}} skins.", DE: "Community-Rangliste für {{weapon}}-Skins." },
    skinWarBackToLeaderboard: { TR: "← Sıralamaya Dön", US: "← Back to Leaderboard", DE: "← Zurück zur Bestenliste" },
    skinWarStart: { TR: "Turnuvayı Başlat", US: "Start Tournament", DE: "Turnier Starten" },
    // --- Rank Tahmin ---
    rankGuessTitle: { TR: "Rank Tahmin", US: "Rank Guess", DE: "Rang Raten" },
    rankGuessSubtitle: { TR: "Klibi izle, oyuncunun gerçek rütbesini tahmin et — seriyi bozmadan ne kadar ilerleyebilirsin?", US: "Watch the clip, guess the player's real rank — how far can you get without breaking your streak?", DE: "Sieh dir den Clip an, rate den echten Rang des Spielers — wie weit kommst du, ohne deine Serie zu verlieren?" },
    rankGuessAllWatched: { TR: "Tüm klipleri izlediniz", US: "You've watched all clips", DE: "Du hast alle Clips angesehen" },
    // --- Takım Bul ---
    findTeamTitle: { TR: "Takım Bul", US: "Find Team", DE: "Team Finden" },
    crosshairsPageTitle: { TR: "VALORANT NİŞANGAHLARI", US: "VALORANT CROSSHAIRS", DE: "VALORANT VISIERE" },
    crosshairsPageSubtitle: { TR: "Profesyonel oyuncuların ve topluluğun en beğenilen nişangahlarını keşfet, kopyala ve rakiplerinden bir adım önde ol.", US: "Discover, copy, and use the most popular crosshairs from pro players and the community — stay one step ahead of your opponents.", DE: "Entdecke und kopiere die beliebtesten Visiere von Profispielern und der Community — sei deinen Gegnern einen Schritt voraus." },
    // --- Forum ---
    forumTitle: { TR: "Forum", US: "Forum", DE: "Forum" },
    forumNewPost: { TR: "Yeni Gönderi", US: "New Post", DE: "Neuer Beitrag" },
    forumDailyLimitReached: { TR: "Bugünkü gönderi hakkını kullandın (3/3). Yarın tekrar dene.", US: "You've used today's post limit (3/3). Try again tomorrow.", DE: "Du hast dein heutiges Beitragslimit erreicht (3/3). Versuch es morgen wieder." },
    // --- Footer ---
    footerPrivacy: { TR: "Gizlilik Politikası", US: "Privacy Policy", DE: "Datenschutzrichtlinie" },
    footerTerms: { TR: "Kullanım Şartları", US: "Terms of Use", DE: "Nutzungsbedingungen" },
    footerSupport: { TR: "Destek", US: "Support", DE: "Support" },
    // --- Ana sayfa hero (istek üzerine eklendi: en görünür bölüm, öncelikli çevrildi) ---
    heroTitle: { TR: "VALORANT İSTATİSTİKLERİNİZ", US: "YOUR VALORANT STATS", DE: "DEINE VALORANT-STATISTIKEN" },
    heroSubtitle: { TR: "Riot ID'ni gir, oyun keyfini ve istatistiklerini eğlenceli analizlerle keşfet.", US: "Enter your Riot ID and explore your stats with fun, in-depth analytics.", DE: "Gib deine Riot-ID ein und entdecke deine Statistiken mit unterhaltsamen Analysen." },
    heroSearchPlaceholder: { TR: "Riot ID gir (Örn: Player#TR1)", US: "Enter Riot ID (e.g. Player#TR1)", DE: "Riot-ID eingeben (z. B. Player#TR1)" },
    heroServerOnline: { TR: "Sunucular Çevrimiçi", US: "Servers Online", DE: "Server Online" },
    heroServerOffline: { TR: "Sunucular Çevrimdışı", US: "Servers Offline", DE: "Server Offline" },
    heroOr: { TR: "VEYA", US: "OR", DE: "ODER" },
    heroLoginWithRiot: { TR: "🎮 RIOT ID İLE GİRİŞ YAP", US: "🎮 LOG IN WITH RIOT ID", DE: "🎮 MIT RIOT-ID ANMELDEN" },
    forumSectionTitle: { TR: "Topluluk Forumu", US: "Community Forum", DE: "Community-Forum" },
    forumSectionSubtitle: { TR: "Türk Valorant topluluğu için — düşüncelerini, tartışmalarını ve anketlerini paylaş.", US: "For the Turkish Valorant community — share your thoughts, discussions, and polls.", DE: "Für die türkische Valorant-Community — teile deine Gedanken, Diskussionen und Umfragen." },
    findTeamSectionTitle: { TR: "Takımını Bul", US: "Find Your Team", DE: "Finde Dein Team" },
    findTeamSubtitle: { TR: "Kendi lobini kur veya aktif bir ekibe dahil ol.", US: "Create your own lobby or join an active team.", DE: "Erstelle deine eigene Lobby oder tritt einem aktiven Team bei." },
    // --- Nişangahlar liste/filtre paneli (YENİ — çeviri genişletmesi) ---
    crosshairSearchPlaceholder: { TR: "Nişangah veya oyuncu ara...", US: "Search crosshair or player...", DE: "Visier oder Spieler suchen..." },
    sortLabel: { TR: "Sırala", US: "Sort", DE: "Sortieren" },
    sortLikes: { TR: "Beğeni", US: "Likes", DE: "Likes" },
    sortRank: { TR: "Rütbe", US: "Rank", DE: "Rang" },
    sortNew: { TR: "Yeni", US: "New", DE: "Neu" },
    addCrosshairBtn: { TR: "Nişangah Ekle", US: "Add Crosshair", DE: "Visier Hinzufügen" },
    filterAll: { TR: "Tümü", US: "All", DE: "Alle" },
    crosshairEmptyTitle: { TR: "Aramanla eşleşen bir nişangah bulunamadı.", US: "No crosshair matches your search.", DE: "Kein Visier entspricht deiner Suche." },
    crosshairEmptySubtitle: { TR: "Farklı bir kelime veya rütbe filtresi deneyebilirsin.", US: "Try a different word or rank filter.", DE: "Versuch ein anderes Wort oder einen anderen Rangfilter." },
    mostLikedBadge: { TR: "En Beğenilen", US: "Most Liked", DE: "Am Beliebtesten" },
    copyCode: { TR: "KODU KOPYALA", US: "COPY CODE", DE: "CODE KOPIEREN" },
    codeCopied: { TR: "KOD KOPYALANDI", US: "CODE COPIED", DE: "CODE KOPIERT" },
    // --- Bilgi Yarışması ekstra (YENİ) ---
    quizJoinBtn: { TR: "YARIŞMAYA KATIL", US: "JOIN QUIZ", DE: "QUIZ BEITRETEN" },
    quizBackToMenu: { TR: "Ana Menüye Dön", US: "Back to Menu", DE: "Zurück zum Menü" },
    quizNextQuestion: { TR: "Sonraki Soru", US: "Next Question", DE: "Nächste Frage" },
    quizSeeResults: { TR: "Sonuçları Gör", US: "See Results", DE: "Ergebnisse Ansehen" },
    quizPlayAgain: { TR: "Tekrar Oyna", US: "Play Again", DE: "Nochmal Spielen" },
    quizYourScore: { TR: "Puanın", US: "Your Score", DE: "Dein Punktestand" },
    quizCorrectAnswers: { TR: "Doğru Cevap", US: "Correct Answers", DE: "Richtige Antworten" },
    quizBackToMenuBtn: { TR: "Ana Menüye Dön", US: "Back to Menu", DE: "Zurück zum Menü" },
    quizQuestionLabel: { TR: "SORU", US: "QUESTION", DE: "FRAGE" },
    quizScoreLabel: { TR: "SKOR", US: "SCORE", DE: "PUNKTE" },
    quizCompleted: { TR: "Yarışma Tamamlandı", US: "Quiz Completed", DE: "Quiz Abgeschlossen" },
    quizPlayerFallback: { TR: "Oyuncu", US: "Player", DE: "Spieler" },
    quizAnonPlayer: { TR: "Anonim Oyuncu", US: "Anonymous Player", DE: "Anonymer Spieler" },
    quizCorrectAnswerCountLabel: { TR: "DOĞRU CEVAP SAYISI", US: "CORRECT ANSWERS", DE: "RICHTIGE ANTWORTEN" },
    quizGameScoreLabel: { TR: "Oyun Skoru", US: "Game Score", DE: "Spielpunkte" },
    quizTotalScoreLabel: { TR: "Toplam Puan", US: "Total Score", DE: "Gesamtpunktzahl" },
    quizRankingLabel: { TR: "Sıralama", US: "Ranking", DE: "Rang" },
    quizRetryBtn: { TR: "YENİDEN DENE", US: "TRY AGAIN", DE: "NOCHMAL VERSUCHEN" },
    // --- Takım Bul ekstra (YENİ) ---
    createLobbyBtn: { TR: "Lobi Oluştur", US: "Create Lobby", DE: "Lobby Erstellen" },
    lobbySearchPlaceholder: { TR: "Riot ID ile lobi ara...", US: "Search lobby by Riot ID...", DE: "Lobby nach Riot-ID suchen..." },
    lobbyEmptyTitle: { TR: "Henüz aktif bir lobi yok.", US: "No active lobbies yet.", DE: "Noch keine aktiven Lobbys." },
    lobbyEmptySubtitle: { TR: "İlk lobiyi sen kur!", US: "Be the first to create one!", DE: "Erstelle die erste!" },
    reportBtn: { TR: "Şikayet Et", US: "Report", DE: "Melden" },
    micRequiredBadge: { TR: "Mikrofon Zorunlu", US: "Mic Required", DE: "Mikro Erforderlich" },
    micOptionalBadge: { TR: "Mikrofon Farketmez", US: "Mic Optional", DE: "Mikro Egal" },
    copyLobbyCode: { TR: "Kopyala", US: "Copy", DE: "Kopieren" },
    // --- Forum ekstra (YENİ) ---
    forumSharePoll: { TR: "Gönderiyi Paylaş", US: "Share Post", DE: "Beitrag Teilen" },
    forumAddPoll: { TR: "Anket ekle", US: "Add poll", DE: "Umfrage hinzufügen" },
    forumPollLabel: { TR: "Anket", US: "Poll", DE: "Umfrage" },
    forumNoVotesYet: { TR: "henüz oy yok", US: "no votes yet", DE: "noch keine Stimmen" },
    forumDailyLimitBtnOpen: { TR: "Günlük Hakkın Doldu", US: "Daily Limit Reached", DE: "Tageslimit Erreicht" },
    forumNewPostBtnOpen: { TR: "+ Yeni Gönderi", US: "+ New Post", DE: "+ Neuer Beitrag" },
    forumUsedTodayLabel: { TR: "gönderi hakkını kullandın", US: "posts used today", DE: "Beiträge heute verwendet" },
    forumTodayLabel: { TR: "Bugün", US: "Today", DE: "Heute" },
    // --- Giriş Yap modalı (YENİ — çok yüksek görünürlüklü, herkesin karşılaştığı ekran) ---
    loginModalTitle: { TR: "Riot ID ile Giriş Yap", US: "Log In with Riot ID", DE: "Mit Riot-ID Anmelden" },
    loginModalSubtitle: { TR: "Nişangahlara, yarışmaya ve takım bulmaya erişmek için gerekli.", US: "Required to access crosshairs, the quiz, and team finder.", DE: "Erforderlich für Visiere, das Quiz und die Team-Suche." },
    loginModalPlaceholder: { TR: "Riot ID (Örn: Player#TR1)", US: "Riot ID (e.g. Player#TR1)", DE: "Riot-ID (z. B. Player#TR1)" },
    loginModalErrEmpty: { TR: "Lütfen bir Riot ID gir!", US: "Please enter a Riot ID!", DE: "Bitte gib eine Riot-ID ein!" },
    loginModalErrFormat: { TR: "Lütfen 'İsim#TAG' formatında gir (Örn: Player#TR1)", US: "Please enter it in 'Name#TAG' format (e.g. Player#TR1)", DE: "Bitte im Format 'Name#TAG' eingeben (z. B. Player#TR1)" },
    loginModalErrNotFound: { TR: "Bu Riot ID bulunamadı. İsim ve TAG'i kontrol et.", US: "This Riot ID was not found. Check the name and TAG.", DE: "Diese Riot-ID wurde nicht gefunden. Überprüfe Name und TAG." },
    loginModalErrConnection: { TR: "Sunucuya bağlanılamadı. İnternetini kontrol et.", US: "Could not connect to the server. Check your internet.", DE: "Verbindung zum Server fehlgeschlagen. Überprüfe deine Internetverbindung." },
    loginModalVerifying: { TR: "Doğrulanıyor...", US: "Verifying...", DE: "Wird überprüft..." },
    loginModalSubmit: { TR: "Giriş Yap", US: "Log In", DE: "Anmelden" },
    loginModalFooter: { TR: "Riot ID'nin gerçekten var olduğu doğrulanır. Şifre istenmez; girişin sayfa yenilense de korunur.", US: "We verify that your Riot ID really exists. No password required; your login persists even after refreshing.", DE: "Wir überprüfen, ob deine Riot-ID wirklich existiert. Kein Passwort nötig; dein Login bleibt auch nach dem Neuladen erhalten." },
    // --- Footer (YENİ — her sayfada görünen alt kısım) ---
    footerAboutTitle: { TR: "İNFİNİTY.GG HAKKINDA", US: "ABOUT INFINITY.GG", DE: "ÜBER INFINITY.GG" },
    footerAboutText: {
      TR: "Infınity Network, Valorant oyuncularının kendi performanslarını detaylıca analiz edebileceği, profesyonel oyuncuların nişangahları keşfedebileceği, oyun içi eğlenceli bilgi yarışmalarını ve sorularını çözebileceği, stratejiler geliştirebileceği aynı zamanda oyuncuların birbirine oyun arkadaşı bulmasını sağlayan tamamen Türk oyuncu topluluğuna yönelik kapsamlı bir takip platformudur. Kullanıcılar kendi Riot ID'leri ile giriş yaparak maç geçmişlerini, K/D oranlarını ve rütbe ilerlemelerini detaylı bir şekilde görüntüleyebilirler. Platform ayrıca Rank Tahmin ile klip üzerinden rütbe tahmini yapabileceğiniz, Skin Savaşı ile favori skininizi oylayabileceğiniz ve Kelime Oyunu ile günlük Valorant kelimelerini çözebileceğiniz yeni eğlence bölümlerini de barındırır.",
      US: "Infinity Network is a comprehensive tracking platform built for the Turkish Valorant community, where players can deeply analyze their own performance, discover crosshairs from pro players, solve fun in-game quizzes, develop strategies, and find teammates. Users log in with their own Riot ID to view detailed match history, K/D ratios, and rank progression. The platform also includes fun new sections: Rank Guess, where you guess a player's rank from a clip; Skin War, where you vote for your favorite skin; and Word Game, where you solve daily Valorant-themed words.",
      DE: "Infinity Network ist eine umfassende Tracking-Plattform für die türkische Valorant-Community, auf der Spieler ihre eigene Leistung im Detail analysieren, Visiere von Profispielern entdecken, unterhaltsame Ingame-Quizfragen lösen, Strategien entwickeln und Mitspieler finden können. Nutzer melden sich mit ihrer eigenen Riot-ID an, um Matchverlauf, K/D-Verhältnisse und Rangfortschritt im Detail einzusehen. Die Plattform enthält außerdem neue Unterhaltungsbereiche: Rang Raten (Rang aus einem Clip erraten), Skin Kampf (für deinen Lieblings-Skin abstimmen) und Wortspiel (tägliche Valorant-Wörter lösen).",
    },
    footerCopyright: { TR: "2026 © Infinity Network", US: "2026 © Infinity Network", DE: "2026 © Infinity Network" },
    footerDisclaimer: { TR: "Infinity Tracker, Riot Games tarafından onaylanmamıştır ve Riot Games'in resmi görüşlerini yansıtmaz.", US: "Infinity Tracker is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games.", DE: "Infinity Tracker wird nicht von Riot Games unterstützt und spiegelt nicht die offizielle Meinung von Riot Games wider." },
  };
  // t(key, vars?): siteLanguage'e göre çeviriyi döndürür; o dilde çeviri yoksa TR'ye, o da yoksa
  // anahtarın kendisine düşer (böylece eksik bir çeviri sayfayı asla kırmaz, en kötü ihtimalle
  // Türkçesi görünür). DÜZELTME (istek — "daha fazla çeviri yap"): birçok metin sabit değil,
  // içine kelime sayısı gibi DEĞİŞEN bir değer gerekiyordu (ör. "...aynı 21 kelimeye göre.") —
  // artık t() ikinci parametre olarak {{isim}} şeklindeki yer tutucuları gerçek değerle
  // değiştirebiliyor, örn: t("wordGameDailyDesc", { count: 21 }).
  const t = (key: string, vars?: Record<string, string | number>): string => {
    const entry = UI_STRINGS[key];
    let str = entry ? (entry[siteLanguage] || entry.TR || key) : key;
    if (vars) {
      for (const k of Object.keys(vars)) str = str.split(`{{${k}}}`).join(String(vars[k]));
    }
    return str;
  };
  const NAV_TAB_ICONS: Record<string, string> = {
    home: "🏠", crosshairs: "🎯", quiz: "🧠", "find-team": "🤝", forum: "💬", "rank-guess": "🎬", "skin-war": "⚔️", "word-game": "🔤",
  };
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
  const requireLogin = () => {
    if (isLoggedIn && currentUser) return true;
    setLoginWarning(true);
    setTimeout(() => setLoginWarning(false), 2800);
    return false;
  };

  // ==========================================
  // ŞİKAYET SİSTEMİ (istek) — forum gönderisi / lobi (sahte kod vb.) / rank tahmin klibi
  // ==========================================
  // Aynı hesap aynı içeriği bir daha şikayet edemesin diye (spam engeli) hesaba özel bir
  // "şikayet edilenler" listesi tutuluyor. Şikayet, varsa /api/report'a gönderiliyor (backend
  // rotası henüz yoksa sessizce yutuluyor — buton yine de kullanıcıya doğru geri bildirimi
  // veriyor ve tekrar tıklanmasını engelliyor; backend eklendiğinde otomatik gerçek kayda döner).
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`infinity_reported_${currentUser || "guest"}`);
      setReportedIds(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch { setReportedIds(new Set()); }
  }, [currentUser]);
  const [reportToast, setReportToast] = useState("");
  const reportContent = (kind: "forum_post" | "lobby" | "rank_clip", id: string | number, label: string) => {
    if (!requireLogin()) return;
    const key = `${kind}:${id}`;
    if (reportedIds.has(key)) {
      setReportToast(`Bu ${label}i zaten şikayet ettin.`);
      setTimeout(() => setReportToast(""), 2600);
      return;
    }
    const nextSet = new Set(reportedIds);
    nextSet.add(key);
    setReportedIds(nextSet);
    try { window.localStorage.setItem(`infinity_reported_${currentUser || "guest"}`, JSON.stringify([...nextSet])); } catch {}
    setReportToast(`${label.charAt(0).toUpperCase() + label.slice(1)} şikayetin alındı, ekibimiz inceleyecek.`);
    setTimeout(() => setReportToast(""), 2600);
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, targetId: id, reporter: currentUser }),
    }).catch(() => {}); // /api/report henüz eklenmemişse sessizce geç
  };

  // NOT: exitConfirm/requestTabChange/confirmExitInProgress bloğu artık daha yukarıda
  // (kelime oyunu geri sayım effect'inden ÖNCE) tanımlı — TDZ hatasını önlemek için taşındı.


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
        { id: "val1", img: "/valopp1.jpg", ring: "from-[#ff4655] to-red-700" },
        { id: "val2", img: "/valopp2.jpg", ring: "from-slate-400 to-slate-600" },
        { id: "val3", img: "/valopp3.webp", ring: "from-yellow-300 to-amber-500" },
        { id: "val4", img: "/valopp4.jpg", ring: "from-cyan-300 to-teal-500" },
        { id: "val5", img: "/valopp5.png", ring: "from-purple-400 to-purple-700" },
      ],
    },
  ];
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarItem>(DEFAULT_AVATAR);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  // ==========================================
  // PROFİL MODALI (istek: "profilimi görüntüle ... gönderi sayısı, takipçi sayısı, takip
  // sayısı, biyografi")
  // ==========================================
  // NOT (dürüstlük): gönderi sayısı GERÇEK (forumPosts zaten çekiliyor, author alanına göre
  // sayılıyor). Ama takipçi/takip sayısı ve biyografi şu an SADECE BU TARAYICIDA (localStorage)
  // tutuluyor — gerçek bir "takip sistemi" farklı hesapların/cihazların birbirini görebilmesi
  // için backend (Supabase tablosu + API rotası) gerektiriyor, bende o dosyalar yok. Bu yüzden
  // şimdilik takipçi/takip 0 gösteriliyor ve "takip et" gerçek bir karşı tarafa bağlanmıyor;
  // backend eklenince buraya kolayca bağlanabilecek şekilde yapı hazır bırakıldı.
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileBio, setProfileBio] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  useEffect(() => {
    if (!currentUser) { setProfileBio(""); return; }
    try {
      setProfileBio(window.localStorage.getItem(`infinity_bio_${currentUser}`) || "");
    } catch { setProfileBio(""); }
  }, [currentUser]);
  const saveProfileBio = () => {
    const trimmed = bioDraft.slice(0, 160);
    setProfileBio(trimmed);
    try { window.localStorage.setItem(`infinity_bio_${currentUser}`, trimmed); } catch {}
    setIsEditingBio(false);
  };
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

  // DÜZELTME (ASIL BUG — "ana hesapta seçtiğim avatar yan hesaba da bulaşıyor"): avatar tek bir
  // GLOBAL "infinity_avatar" anahtarında saklanıyordu — yani aslında hesaba değil TARAYICIYA
  // bağlıydı. Hesap değiştirince (çıkış yapıp başka biriyle giriş yapınca) eski hesabın avatarı
  // olduğu gibi kalıyordu. Artık her hesabın kendi anahtarı var: "infinity_avatar_<kullanıcı adı>"
  // (giriş yapılmamışken "infinity_avatar_guest").
  const avatarStorageKey = (user: string) => `infinity_avatar_${user || "guest"}`;

  // DÜZELTME (avatar F5'te titriyor / önce standarta dönüp sonra eski avatara geçiyor):
  // bu normal useEffect boyamadan SONRA çalışıyordu — yani kullanıcı bir an için varsayılan
  // (standart.jpg) avatarı GERÇEKTEN görüyordu, sonra kayıtlı avatara geçiş oluyordu. Aktif
  // sekme/giriş durumu için yapılan düzeltmenin AYNISI burada da gerekiyor: useLayoutEffect
  // boyamadan ÖNCE, senkron çalışıyor — kullanıcı artık standart hali hiç görmüyor, direkt
  // kayıtlı avatarıyla açılıyor. ÖNEMLİ: bu effect currentUser'ı restore eden effect'ten SONRA
  // tanımlı olduğu için (useLayoutEffect'ler tanım sırasına göre çalışır), currentUser burada
  // zaten doğru değerine sahip — ilk açılışta da doğru hesabın avatarını okuyor.
  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(avatarStorageKey(currentUser));
      if (saved) {
        const parsed = JSON.parse(saved);
        // Eski (emoji tabanlı) kayıtlarla uyumluluk: "img" alanı yoksa varsayılana dön.
        if (parsed && parsed.img) setSelectedAvatar(parsed);
      } else {
        setSelectedAvatar(DEFAULT_AVATAR);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const chooseAvatar = (item: AvatarItem) => {
    setSelectedAvatar(item);
    try { window.localStorage.setItem(avatarStorageKey(currentUser), JSON.stringify(item)); } catch {}
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
  // YENİ: "tablo bir anlığına sıfırlanıp eski haline dönüyor" şikayetinin sebebi buydu — tablo
  // ilk render'da hep sabit "Henüz kimse yok" placeholder'larla başlıyor, bir an sonra GERÇEK
  // veri gelince değişiyordu; bu "önce boş göster, sonra doldur" geçişi bir "sıfırlanma" gibi
  // algılanıyordu. Artık veri gelene kadar (loading=true) placeholder satırlar yerine gerçek bir
  // YÜKLENİYOR iskeleti gösteriliyor — kullanıcı bunun "boş" değil "henüz yükleniyor" olduğunu
  // net anlıyor, veri gelince tek seferde (sıfırlanma hissi olmadan) doluyor.
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

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
      } finally {
        setLeaderboardLoading(false);
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
    CROSSHAIRS_DATA.forEach((c) => { base[Number(c.id)] = parseLikes(c.likes); });
    return base;
  });
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  // DÜZELTME (Hydration Error): aynı sebepten (bkz. activeTab yorumu) burada da
  // localStorage artık lazy initializer içinde değil, mount sonrası bu effect'te okunuyor.
  useLayoutEffect(() => {
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

  // PERFORMANS DÜZELTMESİ: 500+ nişangahlık listenin filtrele+sırala işlemi eskiden
  // render gövdesi içinde (IIFE) çalışıyordu — yani "crosshairs" sekmesi açıkken sayfadaki
  // HERHANGİ BİR state değişse bile (örn. bir başka kutuya yazı yazılsa bile, çünkü tüm
  // component tek parça ve hiç memoization yoktu) bu 500 elemanlık filter+sort YENİDEN
  // çalışıyordu. useMemo ile artık SADECE gerçekten ilgili değerler (liste, arama, filtre,
  // sıralama, beğeni sayıları) değiştiğinde yeniden hesaplanıyor.
  const sortedCrosshairsList = useMemo(() => {
    const allCrosshairs = [...customCrosshairs, ...CROSSHAIRS_DATA];
    const q = crosshairSearch.toLowerCase();
    const filtered = allCrosshairs
      .filter((item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q))
      .filter((item) => tierFilter === "all" || item.rank === tierFilter);
    return [...filtered].sort((a, b) => {
      if (sortType === "tier") return getRankStyle(b.rank).order - getRankStyle(a.rank).order;
      if (sortType === "new") {
        // DÜZELTME (TS hatası): id alanı "string | number" olabildiği için doğrudan >=/-
        // kullanmak derleme hatası veriyordu, Number() ile normalize edildi (davranış aynı).
        const aId = Number(a.id);
        const bId = Number(b.id);
        const aIsSample = aId >= 900000;
        const bIsSample = bId >= 900000;
        if (aIsSample !== bIsSample) return aIsSample ? 1 : -1;
        return bId - aId;
      }
      return (likeCounts[Number(b.id)] ?? parseLikes(b.likes)) - (likeCounts[Number(a.id)] ?? parseLikes(a.likes));
    });
  }, [customCrosshairs, crosshairSearch, tierFilter, sortType, likeCounts]);
  const [isCrosshairModalOpen, setIsCrosshairModalOpen] = useState(false); // yeni eklendi: nişangah ekleme penceresi
  // YENİ: nişangah kartına tıklanınca açılan "haritada gör" penceresi — crosshair'i gerçek
  // 3 harita fotoğrafı (sunset/summit/bind) üzerinde, oyun içindeki gibi ortada gösterir.
  const [mapPreviewCrosshair, setMapPreviewCrosshair] = useState<{ code: string; title: string } | null>(null);
  const [mapPreviewIndex, setMapPreviewIndex] = useState(0);
  const [mapPreviewCopied, setMapPreviewCopied] = useState(false);
  const CROSSHAIR_PREVIEW_MAPS = [
    { name: "Sunset", img: "/sunset.webp" },
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

  // ===== FORUM (YENİ) =====
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  // DÜZELTME (TS hatası — "forumPosts used before its declaration"): profil modalındaki
  // gönderi sayısı burada, forumPosts GERÇEKTEN tanımlandıktan SONRA hesaplanıyor.
  const ownForumPostCount = forumPosts.filter((p: any) => p.author === currentUser).length;
  // DÜZELTME (istek): "bir gönderiye girip F5 atınca o gönderide kalsın, foruma dönmesin" —
  // activeTab'ın ?tab= ile yaptığı AYNI deseni burada da uyguluyoruz: seçili gönderi id'si
  // URL'nin ?post= parametresinde tutuluyor, böylece F5'te de aynı gönderi restore ediliyor.
  const urlPost = searchParams.get("post");
  const [selectedForumPostId, setSelectedForumPostId] = useState<number | null>(urlPost ? Number(urlPost) : null);
  const [forumComments, setForumComments] = useState<any[]>([]);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [newPostHasPoll, setNewPostHasPoll] = useState(false);
  const [newPostPollOptions, setNewPostPollOptions] = useState(["", ""]);
  // forumPosts state'i tanımlandıktan sonra hesaplanmalı; aksi halde ilk render'da
  // Temporal Dead Zone hatasıyla sayfa açılmadan çöker.
  const topForumPosts = useMemo(
    () => [...forumPosts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 5),
    [forumPosts]
  );
  // PERFORMANS DÜZELTMESİ ("yorum/mesaj kutucukları kasıyor" — ASIL SEBEP): forumCommentInput
  // eskiden React state'ti (value + onChange). Bu component'te (~4700 satır) HİÇ useMemo/
  // useCallback/memo YOK — yani her karakter yazıldığında setForumCommentInput çağrılıyor,
  // bu da TÜM sayfayı (crosshair listesi, forum listesi, quiz, her şey) yeniden render
  // ediyordu. "Yeni Gönderi" modalındaki başlık/içerik zaten input.value ile (uncontrolled)
  // okunuyordu — aynı deseni yorum kutusuna da uyguluyoruz: input artık bir ref üzerinden
  // okunuyor, React state'i tetiklemiyor, gönderirken tek seferlik value okunup temizleniyor.
  const forumCommentInputRef = useRef<HTMLInputElement | null>(null);
  // DÜZELTME (istek — "ana hesabımdan yan hesabımın postunu beğendim, çıkış yapıp misafir
  // olunca hâlâ beğenmiş gözüküyorum, geri çekebiliyorum, çok saçma"): forumLikedIds artık
  // SABİT bir localStorage anahtarında değil, giriş yapılan hesaba (currentUser) özel bir
  // anahtarda tutuluyor. Başlangıçta boş — currentUser hydrate olduğunda aşağıdaki effect
  // doğru hesabın listesini yükler; çıkış yapılınca da "guest" listesine (boş) düşer.
  const [forumLikedIds, setForumLikedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`infinity_forum_liked_${currentUser || "guest"}`);
      setForumLikedIds(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch { setForumLikedIds(new Set()); }
  }, [currentUser]);
  const [forumPollVoted, setForumPollVoted] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = window.localStorage.getItem("infinity_forum_polls_voted");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // DÜZELTME (istek): "F5 atınca bir anlığına mesajlar/en çok beğenilenler yok oluyor" —
  // forumPosts ilk render'da hep [] (boş) ile başlıyordu ve gerçek veri gelene kadar bu boş
  // durum "Henüz hiç gönderi yok" / "Henüz gönderi yok" olarak GERÇEKMİŞ gibi gösteriliyordu.
  // Artık ayrı bir forumPostsLoading bayrağı var — veri gelene kadar bir yükleniyor iskeleti
  // gösteriliyor, boş durum sadece istek bitip GERÇEKTEN 0 gönderi varsa gösteriliyor.
  const [forumPostsLoading, setForumPostsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/forum/posts");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.posts)) setForumPosts(data.posts);
      } catch {}
      finally { setForumPostsLoading(false); }
    })();
  }, []);

  const fetchForumComments = async (postId: number) => {
    try {
      const res = await fetch(`/api/forum/comments?postId=${postId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.comments)) setForumComments(data.comments);
    } catch {}
  };

  // DÜZELTME (istek): "bir gönderiye girip F5 atınca o gönderide kalsın, foruma dönmesin" —
  // activeTab'ın ?tab= ile yaptığı AYNI desen: seçili gönderi id'si URL'nin ?post= parametresine
  // yazılıyor, böylece F5'te (yukarıdaki urlPost okuması sayesinde) sayfa doğrudan o gönderiyle
  // açılıyor.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedForumPostId === null) url.searchParams.delete("post");
      else url.searchParams.set("post", String(selectedForumPostId));
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, [selectedForumPostId]);

  // Sayfa doğrudan ?post= ile (F5 ya da paylaşılan bir link) açıldıysa, o gönderinin yorumları
  // da otomatik çekilsin — aksi halde gönderi görünür ama yorum kutusu hep boş kalırdı.
  useEffect(() => {
    if (urlPost) fetchForumComments(Number(urlPost));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // YENİ (istek — "forumda aynı hesap 1 posta 1'den fazla görüntülenme kazandıramasın, yani
  // görüntüleyip çıkıp tekrar girip görüntüleyince 3 olmasın"): eskiden gönderiye her tıklanışta
  // (girip-çıkıp-tekrar-girse bile) /api/forum/view'a istek atılıyordu, sayaç sınırsız artıyordu.
  // Artık hangi gönderilerin bu hesaptan zaten "izlendi" sayıldığı localStorage'da (hesaba özel
  // anahtarla, forumLikedIds ile aynı desende) tutuluyor; aynı hesap aynı gönderiyi kaç kere
  // açarsa açsın sayaca sadece İLK seferde +1 gidiyor.
  const [forumViewedIds, setForumViewedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`infinity_forum_viewed_${currentUser || "guest"}`);
      setForumViewedIds(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch { setForumViewedIds(new Set()); }
  }, [currentUser]);
  const markForumPostViewed = (postId: number) => {
    if (forumViewedIds.has(postId)) return; // zaten bu hesaptan sayılmış, tekrar istek atma
    const nextSet = new Set(forumViewedIds);
    nextSet.add(postId);
    setForumViewedIds(nextSet);
    try { window.localStorage.setItem(`infinity_forum_viewed_${currentUser || "guest"}`, JSON.stringify([...nextSet])); } catch {}
    fetch("/api/forum/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: postId }) })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (typeof data?.viewCount === "number") setForumPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, view_count: data.viewCount } : p)));
      })
      .catch(() => {});
  };
  // ==========================================
  // BİLDİRİM SİSTEMİ (istek)
  // ==========================================
  // NOT (dürüstlük): beğeni API'si (/api/forum/posts/like) kimin beğendiğini KAYDETMİYOR,
  // sadece toplam sayıyı +1/-1 yapıyor. Bu yüzden "Ahmet gönderini beğendi" gibi KİŞİYE ÖZEL
  // bir bildirimi şu an UYDURMADAN üretemiyorum — bunun için o API rotasının kim beğendiğini
  // de kaydetmesi lazım (backend değişikliği, bende o dosya yok). Şu an GERÇEKTEN elimdeki
  // veriyle doğrulanabilen 2 bildirim türünü üretiyorum: (1) kendi gönderine biri yorum/yanıt
  // yazınca, (2) kendi gönderin belirli beğeni/görüntülenme eşiklerine ulaşınca. Takip
  // bildirimleri ("X seni takip etti" vb.) de aynı sebeple backend gerektiriyor; aşağıda not var.
  type AppNotification = { id: string; text: string; createdAt: number; read: boolean };
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifKey = () => `infinity_notifications_${currentUser || "guest"}`;
  useLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(notifKey());
      setNotifications(saved ? JSON.parse(saved) : []);
    } catch { setNotifications([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  const pushNotification = (text: string) => {
    setNotifications((prev) => {
      const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, createdAt: Date.now(), read: false }, ...prev].slice(0, 50);
      try { window.localStorage.setItem(notifKey(), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  // DÜZELTME (istek): "tümünü okundu yap diyince gelen bildirimler silinsin" — artık sadece
  // "read" bayrağını çevirmiyor, listeyi tamamen temizliyor (isim "okundu yap" kalsa da davranış
  // istenen: temizle).
  const markAllNotificationsRead = () => {
    setNotifications([]);
    try { window.localStorage.setItem(notifKey(), JSON.stringify([])); } catch {}
  };
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const LIKE_MILESTONES = [20, 50, 100, 1000];
  const VIEW_MILESTONES = [50, 100, 1000];
  // Kendi gönderilerin beğeni/görüntülenme eşiklerini geçince bildirim üretir.
  useEffect(() => {
    if (!currentUser || forumPostsLoading || forumPosts.length === 0) return;
    try {
      const mKey = `infinity_notif_milestones_${currentUser}`;
      const raw = window.localStorage.getItem(mKey);
      const isFirstRun = raw === null; // ilk kayıtta geçmiş performansı "bildirim yağmuruna" çevirme
      const seen: Record<number, { likes: number; views: number }> = raw ? JSON.parse(raw) : {};
      let changed = false;
      forumPosts.forEach((p: any) => {
        if (p.author !== currentUser) return;
        const prevSeen = seen[p.id] || { likes: 0, views: 0 };
        LIKE_MILESTONES.forEach((m) => {
          if ((p.likes || 0) >= m && prevSeen.likes < m) {
            if (!isFirstRun) pushNotification(`🎉 Gönderin ${m} beğenmeye ulaştı!`);
            prevSeen.likes = m;
            changed = true;
          }
        });
        VIEW_MILESTONES.forEach((m) => {
          if ((p.view_count || 0) >= m && prevSeen.views < m) {
            if (!isFirstRun) pushNotification(`👀 Gönderin ${m} görüntülemeye ulaştı!`);
            prevSeen.views = m;
            changed = true;
          }
        });
        seen[p.id] = prevSeen;
      });
      if (changed) window.localStorage.setItem(mKey, JSON.stringify(seen));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumPosts, currentUser, forumPostsLoading]);

  // Kendi gönderilerine biri yorum/yanıt yazınca bildirim üretir (gerçek /api/forum/comments verisiyle).
  useEffect(() => {
    if (activeTab !== "forum" || !currentUser || forumPostsLoading) return;
    const myPosts = forumPosts.filter((p: any) => p.author === currentUser);
    if (myPosts.length === 0) return;
    let cancelled = false;
    const seenKey = `infinity_notif_seen_comments_${currentUser}`;
    const checkReplies = async () => {
      try {
        const raw = window.localStorage.getItem(seenKey);
        const isFirstRun = raw === null;
        const seen: Record<string, true> = raw ? JSON.parse(raw) : {};
        let changed = false;
        for (const p of myPosts.slice(0, 25)) {
          const res = await fetch(`/api/forum/comments?postId=${p.id}`);
          if (!res.ok) continue;
          const data = await res.json();
          const comments = Array.isArray(data.comments) ? data.comments : [];
          for (const c of comments) {
            const key = `${p.id}-${c.id}`;
            if (seen[key]) continue;
            seen[key] = true;
            changed = true;
            if (!isFirstRun && c.author && c.author !== currentUser) {
              pushNotification(`💬 ${c.author} gönderine yanıt verdi: "${(p as any).title || "gönderin"}"`);
            }
          }
        }
        if (changed && !cancelled) window.localStorage.setItem(seenKey, JSON.stringify(seen));
      } catch {}
    };
    checkReplies();
    const interval = setInterval(checkReplies, 30000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser, forumPostsLoading, forumPosts.length]);


  const toggleForumLike = (kind: "post" | "comment", id: number, type: "like" | "dislike" = "like") => {
    // YENİ (istek): misafir artık gönderi/yorum beğenemiyor — önce giriş uyarısı çıkıyor.
    if (!requireLogin()) return;
    const key = `${kind}-${type}-${id}`;
    const already = forumLikedIds.has(key);
    const nextSet = new Set(forumLikedIds);
    if (already) nextSet.delete(key); else nextSet.add(key);
    setForumLikedIds(nextSet);
    try { window.localStorage.setItem(`infinity_forum_liked_${currentUser || "guest"}`, JSON.stringify([...nextSet])); } catch {}

    const delta = already ? -1 : 1;
    const endpoint = kind === "post" ? "/api/forum/posts/like" : "/api/forum/comments/like";
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delta, type }),
    }).catch(() => {});

    const field = type === "dislike" ? "dislikes" : "likes";
    if (kind === "post") {
      setForumPosts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: Math.max(0, p[field] + delta) } : p)));
    } else {
      setForumComments((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: Math.max(0, c[field] + delta) } : c)));
    }
  };

  const [lobbies, setLobbies] = useState<LobbyItem[]>([]); // yeni eklendi: reaktif lobi listesi
  // YENİ: "F5'te bir anlığına deneme/fake lobiler geliyor sonra düzeliyor" şikayetinin sebebi
  // buydu — liste ilk render'da hep sabit örnek (TEAM_FINDER_DATA) lobilerle başlıyor, gerçek
  // veri gelince değişiyordu. Artık gerçek veri gelene/başarısız olana kadar (loading=true)
  // örnek lobiler YERİNE bir yükleniyor iskeleti gösteriliyor — örnekler sadece API hiç yoksa
  // veya boşsa nazik bir "geri düşüş" olarak kalıyor, ama asla ilk anda GERÇEKMİŞ gibi görünüp
  // sonra "değişmiyor".
  const [lobbiesLoading, setLobbiesLoading] = useState(true);

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
      // DÜZELTME (istek — "takım bul'daki referans fake lobileri koddan kaldır, gerçekler ne
      // kadar kalırsa kalsın ama sahteler geri hiç gelmesin"): TEAM_FINDER_DATA'ya (sabit örnek
      // lobiler) yapılan TÜM geri düşüşler kaldırıldı. API başarısız olursa ya da hiç gerçek
      // lobi yoksa artık sahte lobi GÖSTERMİYORUZ — sadece boş liste (aşağıdaki "henüz lobi yok"
      // boş durumu devreye giriyor).
      if (!res.ok) { setLobbies([]); return; }
      const data = await res.json();
      if (Array.isArray(data.lobbies)) {
        const mapped: LobbyItem[] = data.lobbies.map((l: any) => ({
          id: l.id, nick: l.nick, minRank: l.min_rank, maxRank: l.max_rank, mode: l.mode,
          mic: l.mic, slots: l.slots, code: l.code, time: "", region: l.region,
          message: l.message || undefined, playerCount: l.player_count, rankCutoff: l.rank_cutoff,
          ageRange: l.age_range || null,
          createdAt: new Date(l.created_at).getTime(),
          avatarId: l.avatar_id || null,
        }));
        setLobbies(mapped);
      } else {
        setLobbies([]);
      }
    } catch {
      setLobbies([]);
    } finally {
      setLobbiesLoading(false);
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
  // YENİ (istek): "lobi oluşturma kısmına duruma göre yaş eklemesi eklenecek" — zorunlu değil,
  // mic/rütbe sınırı gibi açılıp kapanabilen opsiyonel bir tercih.
  const [ageRangeEnabled, setAgeRangeEnabled] = useState(false);
  const [ageRangeValue, setAgeRangeValue] = useState("18+");
  const AGE_RANGE_OPTIONS = ["13-15", "16-17", "18-20", "21-24", "25-30", "30+"];
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
    activeActId: string | null; tiers: { tier: number; name: string; icon: string }[]; agents: { id: string; name: string; icon: string | null }[]; maps: { id: string; name: string }[];
  }
  const [riotContent, setRiotContent] = useState<RiotContentData | null>(null);
  const [lastMatchStats, setLastMatchStats] = useState<LastMatchStats | null>(null);
  const [matchStatsLoading, setMatchStatsLoading] = useState(false);
  const [matchStatsError, setMatchStatsError] = useState("");
  // YENİ: tek maç değil, son 10 maçın GERÇEK toplanmış istatistiği (K/D, ACS, ADR, HS%, kazanma
  // oranı) — /api/riot-match-history route'undan geliyor, tracker sitelerinin yaptığı gibi
  // maç maç toplanıp hesaplanıyor (Riot bunu hazır sunmuyor).
  interface MatchHistorySummary {
    matchCount: number; wins: number; winRate: number; kills: number; deaths: number; assists: number;
    kd: number; acs: number; adr: number; hsPercent: number; competitiveTier: number | null;
  }
  interface MatchHistoryItem {
    matchId: string; agentId: string | null; mapId: string | null; competitiveTier: number | null;
    kills: number; deaths: number; assists: number; kd: number; acs: number; adr: number;
    won: boolean | null; gameStartMillis: number | null;
  }
  const [recentMatches, setRecentMatches] = useState<MatchHistoryItem[]>([]);
  const [matchSummary, setMatchSummary] = useState<MatchHistorySummary | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Sayfa açılınca içerik verisini (rütbe/ajan isimleri) ve sunucu durumunu bir kez çek.
  // DÜZELTME: "Gerçek Sunucu Liderlik Tablosu" ana sayfadan kaldırıldığı için, artık
  // gereksiz yere val-ranked-v1'e istek atılmıyor (Riot API kotasını boşuna tüketmesin diye).
  useEffect(() => {
    fetch(`/api/riot-content?region=${riotRegion}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setRiotContent(data); })
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
  // YENİ: gerçek ajan portre görselini (Riot Content API'sinin "displayIcon" alanı) getirir —
  // "Son Maçlar" satırında harf/emoji yerine gerçek ajan ikonlarını göstermek için.
  const getAgentIcon = (agentId: string | null): string | null => {
    if (!agentId || !riotContent) return null;
    return riotContent.agents.find((a) => a.id.toLowerCase() === agentId.toLowerCase())?.icon || null;
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
    setRecentMatches([]);
    setMatchSummary(null);

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

      // Doğrulama başarılı: şimdi son 10 maçı çekip GERÇEK toplu istatistik (K/D, ACS, ADR,
      // HS%, kazanma oranı) hesaplayan yeni route'u çağırıyoruz — artık tek maça değil,
      // gerçek bir tracker sitesi gibi son 10 maçın ortalamasına dayanıyor.
      setMatchStatsLoading(true);
      try {
        const historyRes = await fetch(`/api/riot-match-history?region=${riotRegion}&puuid=${data.puuid}&count=6`);
        // DÜZELTME (teşhis — "Maç verisine bağlanılamadı" bug'u): önceden .json() burada
        // hiç sarmalanmadan çağrılıyordu; sunucu ham bir hata sayfası (HTML) dönerse bu satır
        // fırlatıyor ve aşağıdaki catch bloğu HER durumu aynı jenerik mesajla gösteriyordu —
        // gerçek neden (ör. Riot'un val/match/v1'i bu API key'e kapatmış olması, 401/403) hiç
        // görünmüyordu. Artık ayrıştırma ayrı sarmalanıyor, gerçek durum kodu konsola loglanıyor.
        let historyData: any = null;
        try {
          historyData = await historyRes.json();
        } catch {
          console.error(`[handleSearch] /api/riot-match-history JSON değil — status=${historyRes.status}`);
          setMatchStatsError("Maç verisi sunucudan beklenmedik biçimde döndü. Bu genelde Riot'un maç geçmişi uç noktasının bu API anahtarına kapalı olmasından ya da isteğin zaman aşımına uğramasından kaynaklanır.");
          return;
        }

        if (!historyRes.ok) {
          console.error(`[handleSearch] /api/riot-match-history hata — status=${historyRes.status}`, historyData);
          if (historyRes.status === 401 || historyRes.status === 403) {
            setMatchStatsError("Bu hesabın maç geçmişine erişilemiyor — Riot API anahtarı bu veri türüne (maç geçmişi) izinli olmayabilir.");
          } else {
            setMatchStatsError(historyData?.error || "Maç geçmişi alınamadı.");
          }
        } else if (!historyData.matches || historyData.matches.length === 0) {
          setMatchStatsError("Bu hesap için maç geçmişi bulunamadı (hiç maç oynanmamış olabilir).");
        } else {
          setRecentMatches(historyData.matches);
          setMatchSummary(historyData.summary);
          // Geriye dönük uyumluluk: "Son Maç Detayı" bölümü hâlâ tek bir maçın (en yenisinin)
          // ayrıntısını gösteriyor, bunu da en güncel maçtan dolduruyoruz.
          const latest = historyData.matches[0];
          setLastMatchStats({
            matchId: latest.matchId,
            competitiveTier: latest.competitiveTier,
            agentId: latest.agentId,
            mapId: latest.mapId,
            queueId: "",
            isRanked: true,
            gameStartMillis: latest.gameStartMillis,
            won: latest.won,
            kills: latest.kills,
            deaths: latest.deaths,
            assists: latest.assists,
            kd: latest.kd,
            acs: latest.acs,
          });
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
  const DAILY_QUIZ_LIMIT = 8;
  // DÜZELTME: `toISOString()` tarihi HER ZAMAN UTC'ye çevirir. Türkiye (UTC+3) gibi bir
  // dilimde, örneğin gece 00:00-03:00 arası hâlâ "dünün" UTC tarihindesin — bu yüzden
  // gece yarısından sonra oynayınca limit yeni güne geçmiş gibi görünüp SIFIRLANMIYORDU.
  // Artık tarayıcının kendi yerel tarihi (yıl-ay-gün) kullanılıyor.
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  // DÜZELTME (ASIL BUG — "ana hesapta hakkımı bitirdim, yan hesaba geçince yine oynayamıyorum"):
  // günlük oynama hakkı tek bir GLOBAL "infinity_quiz_plays" anahtarında saklanıyordu — yani
  // hesaba değil TARAYICIYA bağlıydı. Artık her hesabın kendi anahtarı var, tıpkı avatarda
  // olduğu gibi: "infinity_quiz_plays_<kullanıcı adı>" (giriş yapılmamışken "..._guest").
  const quizPlaysStorageKey = () => `infinity_quiz_plays_${currentUser || "guest"}`;
  const getPlaysToday = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(quizPlaysStorageKey());
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed.date === todayKey() ? parsed.count : 0;
    } catch { return 0; }
  };
  const [playsToday, setPlaysToday] = useState(0);
  // DÜZELTME: artık currentUser değiştiğinde de (hesap değiştirme) yeniden okunuyor —
  // eskiden sadece isQuizStarted değişince okunuyordu, hesap değişse bile eski hesabın
  // sayısı ekranda kalmaya devam ederdi.
  useEffect(() => { setPlaysToday(getPlaysToday()); }, [isQuizStarted, currentUser]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  const registerDailyPlay = () => {
    try {
      const current = getPlaysToday();
      window.localStorage.setItem(quizPlaysStorageKey(), JSON.stringify({ date: todayKey(), count: current + 1 }));
      setPlaysToday(current + 1);
    } catch {}
  };

  // YENİ (istek): "forum kısmında da spamın önüne geçmek için günlük 3 gönderi hakkı
  // tanıyalım" — quiz'deki günlük hak sayacıyla AYNI mantık (localStorage + tarih anahtarı),
  // sadece forum gönderileri için ayrı bir sayaç.
  const DAILY_FORUM_POST_LIMIT = 3;
  const forumPostsStorageKey = () => `infinity_forum_posts_today_${currentUser || "guest"}`;
  const getForumPostsToday = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(forumPostsStorageKey());
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed.date === todayKey() ? parsed.count : 0;
    } catch { return 0; }
  };
  const [forumPostsToday, setForumPostsToday] = useState(0);
  useEffect(() => { setForumPostsToday(getForumPostsToday()); }, [currentUser, isNewPostModalOpen]);
  const registerDailyForumPost = () => {
    try {
      const current = getForumPostsToday();
      window.localStorage.setItem(forumPostsStorageKey(), JSON.stringify({ date: todayKey(), count: current + 1 }));
      setForumPostsToday(current + 1);
    } catch {}
  };

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (getPlaysToday() >= DAILY_QUIZ_LIMIT) return; // sınır doldu, buton zaten UI'da devre dışı bırakılıyor
    if (!requireLogin()) return;
    // DÜZELTME: her yeni oyunda QUIZ_QUESTIONS'tan rastgele QUESTIONS_PER_GAME (8) tanesi
    // seçilir — Fisher-Yates karıştırma ile sırası da her seferinde farklı olur.
    const shuffled = [...QUIZ_QUESTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setActiveQuestions(shuffled.slice(0, QUESTIONS_PER_GAME));
    // DÜZELTME (ASIL BUG — "5. sorudan bırakınca geri 5. sorudan başlıyor"): yeni bir yarışma
    // başlarken currentQuestion/score/selectedOption/isAnswered/pointsEarned HİÇ sıfırlanmıyordu
    // — yarım bırakılan bir önceki oyunun state'i (örn. currentQuestion=4) sonraki oyuna aynen
    // taşınıyordu. Artık her "YARIŞMAYA KATIL" gerçek bir sıfırdan başlangıç.
    setCurrentQuestion(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setPointsEarned(0);
    setQuizFinished(false);
    setIsQuizStarted(true);
  };

  // Her yeni soruda süreyi sıfırlar ve geri sayımı başlatır; cevaplanınca durur
  useEffect(() => {
    if (!isQuizStarted || quizFinished) return;
    setTimeLeft(QUESTION_SECONDS);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    quizTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (exitConfirmRef.current) return t; // onay penceresi açıkken sayaç durur
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

  // Süre 0'a inip cevap verilmediyse otomatik olarak yanlış say (-5 puan)
  useEffect(() => {
    if (timeLeft === 0 && !isAnswered && isQuizStarted && !quizFinished) {
      setIsAnswered(true);
      setSelectedOption(null);
      setPointsEarned((p) => p - 5);
      setLastQuestionPoints(-5);
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
    if (option === activeQuestions[currentQuestion].answer) {
      setScore((prev) => prev + 1);
      // DÜZELTME (istek): maksimum puan 50'den 30'a düşürüldü (günlük hak 6'dan 8'e çıktığı
      // için toplam puan havuzu dengelendi), AYRICA hız bonusunun etkisi artırıldı — eskiden
      // en hızlı ile en yavaş doğru cevap arasındaki fark sadece 20 puandı ve oransal olarak
      // (50 üzerinden) pek hissedilmiyordu; şimdi taban puan ile tavan arasında tam 15 puanlık
      // (30 üzerinden %50) bir fark var — son saniyeye basmakla soru gelir gelmez basmak
      // arasındaki fark artık gerçekten hissediliyor.
      const speedBonus = Math.round((timeLeft / QUESTION_SECONDS) * 15);
      const earned = 15 + speedBonus;
      setPointsEarned((p) => p + earned);
      setLastQuestionPoints(earned);
      playCorrectSound();
    } else {
      // DÜZELTME (istek): yanlış cevap cezası -10'dan -5'e düşürüldü.
      setPointsEarned((p) => p - 5);
      setLastQuestionPoints(-5);
      playWrongSound();
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setLastQuestionPoints(null);
    if (currentQuestion + 1 < activeQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      // Kullanıcının gerçek adını ve puanını canlı liderlik tablosuna ekle/güncelle
      // DEĞİŞTİ: artık "en yüksek skor" değil, oyuncunun TÜM oyunlarındaki puanları
      // TOPLANIYOR (100 + 90 = 190 gibi). Bunun kötüye kullanılmasını (sınırsız
      // oynayıp puan biriktirme) engellemek için günlük oynama sınırı eklendi (aşağıda).
      const finalName = currentUser || playerName.trim() || t("quizAnonPlayer");
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
        /* YENİ (istek): üst menüdeki aktif sekme ismi artık düz beyaz değil, altın/kırmızı
           parıldayan bir gradyan metin — arka plan konumu kayarak "ışıltı" hissi veriyor. */
        @keyframes navShine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .nav-tab-shine {
          background-image: linear-gradient(90deg, #ffffff 0%, #ffd27a 25%, #ff4655 50%, #ffd27a 75%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: navShine 3.2s linear infinite;
        }
        /* DÜZELTME ("nişangahlar sayfasının en altındayken F5 atınca kırmızı menü çubuğu çok
           titriyor"): sayfa aşağıda kaydırılmışken F5 atıldığında, tarayıcı önce eski kaydırma
           konumuna zıplıyor, SONRA asenkron veriler (nişangah listesi, beğeni sayıları vb.)
           gelip sayfanın yüksekliğini değiştiriyor — tarayıcının "scroll anchoring" özelliği bu
           yükseklik değişimini telafi etmek için kaydırma konumunu birkaç kez KENDİLİĞİNDEN
           ayarlıyor, bu da (sabit header'ın ALTINDAKİ içerik zıplarken) her şey "titriyormuş"
           hissi veriyor. overflow-anchor: none ile bu otomatik telafiyi tamamen kapatıyoruz —
           kaydırma konumu artık içerik yüklendikçe kendiliğinden oynamıyor. */
        html, body {
          overflow-anchor: none;
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
        <div className="w-full h-14 bg-[#14151a]/95 border-b border-white/10 flex items-center px-3 sm:px-6 gap-3 sm:gap-6 relative">
          {/* YENİ: sadece mobilde (lg altında) görünen hamburger butonu — arama kutusu ve
              sekmeler artık `lg` altında burada değil, açılır mobil menüde. */}
          <button
            onClick={() => setIsMobileNavOpen((v) => !v)}
            className="lg:hidden flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-colors"
            aria-label="Menü"
          >
            {isMobileNavOpen ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>

          <div className="hidden lg:flex items-center h-9 bg-[#1c1e24] rounded-lg overflow-hidden border border-white/5 max-w-[220px] w-full">
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
                  requestTabChange("home");
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

          <nav className="hidden lg:flex items-center h-full gap-4 xl:gap-6 text-[11px] xl:text-[13px] font-black text-white/70">
            {["home", "crosshairs", "quiz", "find-team", "forum", "rank-guess", "skin-war", "word-game"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  requestTabChange(tab);
                }}
                className={`relative transition-colors duration-200 h-full px-1 flex items-center gap-1.5 justify-center capitalize group tracking-wide whitespace-nowrap ${
                  activeTab === tab ? "text-white font-black" : "text-white/70 hover:text-white font-black"
                }`}
              >
                <span className={activeTab === tab ? "nav-tab-shine" : ""}>
                  {NAV_TAB_LABELS[tab]}
                </span>
                {/* DÜZELTME (istek): "giriş yapmayanlar için menülerin yanında kilit işaretleri
                    var bunlara gerek yok bunu kaldır" — sekme etiketinin yanındaki kilit ikonu
                    tamamen kaldırıldı. */}
                {/* DÜZELTME: aktif sekmenin altındaki çizgi artık kırmızı; aktif olmayan bir
                    sekmenin üstüne gelince (hover) gri bir çizgi beliriyor, tıpkı istediğin gibi. */}
                {activeTab === tab ? (
                  <motion.div
                    layoutId="navActiveIndicator"
                    initial={false}
                    transition={navMounted ? { type: "spring", stiffness: 380, damping: 30 } : { duration: 0 }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-full bg-[#ff4655]"
                  />
                ) : (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-full bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2 relative flex-shrink-0">
            {/* DÜZELTME (F5 sonrası "Giriş Yap" butonu titremesi): sekmelerdeki kilit ikonu
                "authChecked" bitene kadar bekliyordu ama BU buton beklemiyordu — localStorage'dan
                giriş durumu henüz okunmadan (isLoggedIn hâlâ varsayılan false iken) direkt
                "Giriş Yap" gösterip, authChecked bitince (bir sonraki anda) giriş yapılmışsa
                hesap menüsüne dönüşüyordu; işte titreyen/geri-giden buton buydu. Artık
                authChecked bitene kadar aynı boyutta boş bir yer tutucu gösteriliyor —
                buton hiç "yanlış" durumda görünüp geri dönmüyor. */}
            {/* YENİ (istek): "bildirim kutusunun soluna dil seçenekleri ekleyelim" — referans
                görseldeki gibi küre ikonu + aktif dil kodu + açılır liste. Girişten bağımsız,
                her zaman görünür. */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen((v) => !v)}
                className="h-9 flex items-center gap-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition duration-150"
                title="Dil / Language"
              >
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 014 9 15 15 0 01-4 9 15 15 0 01-4-9 15 15 0 014-9z" />
                </svg>
                <span className="text-[11px] font-black text-white/70">{siteLanguage}</span>
                <span className={`text-[9px] text-white/40 transition-transform ${isLangMenuOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {isLangMenuOpen && typeof document !== "undefined" && createPortal(
                <>
                  <div className="fixed inset-0 z-[95]" onClick={() => setIsLangMenuOpen(false)} />
                  <div className="fixed top-16 right-24 z-[96] w-44 rounded-xl border border-white/10 bg-[#14151a] shadow-2xl overflow-hidden py-1.5">
                    {SITE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeSiteLanguage(lang.code)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition ${siteLanguage === lang.code ? "bg-white/10" : "hover:bg-white/5"}`}
                      >
                        <span className="text-[9px] font-black text-white/40 w-6">{lang.code}</span>
                        <span className={`text-xs font-bold ${siteLanguage === lang.code ? "text-white" : "text-white/70"}`}>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </div>

            {!authChecked ? (
              <div className="h-9 w-24 rounded-full bg-white/5 animate-pulse" />
            ) : isLoggedIn ? (
              <>
                {/* YENİ (istek): "girdi yapıldığını gösteren yerin soluna bildirim kutusu" —
                    hesap menüsünün HEMEN SOLUNA bir zil ikonu + okunmamış sayaç + açılır bildirim
                    listesi eklendi. Şu an gerçekten doğrulanabilir 2 bildirim türü üretiliyor:
                    kendi gönderine gelen yorum/yanıtlar ve kendi gönderinin beğeni/görüntülenme
                    eşiklerine (20/50/100/1000 beğeni, 50/100/1000 görüntülenme) ulaşması. */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen((v) => !v)}
                    className="relative h-9 w-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition duration-150"
                    title="Bildirimler"
                  >
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#ff4655] text-[9px] font-black text-white flex items-center justify-center leading-none">
                        {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {isNotifOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[26rem] overflow-y-auto bg-[#14151a] border border-white/10 rounded-xl shadow-2xl z-50"
                        >
                          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#14151a]">
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">{t("notifications")}</p>
                            {notifications.length > 0 && (
                              <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">Tümünü okundu yap</button>
                            )}
                          </div>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-2xl mb-1.5 opacity-30">🔔</p>
                              <p className="text-xs font-bold text-white/30">{t("noNotifications")}</p>
                            </div>
                          ) : (
                            <div className="p-1.5">
                              {notifications.map((n) => (
                                <div key={n.id} className={`px-3 py-2.5 rounded-lg text-[11px] font-bold transition-colors ${n.read ? "text-white/45" : "text-white bg-white/[0.04]"}`}>
                                  <p>{n.text}</p>
                                  <p className="text-[9px] text-white/25 mt-1 font-bold">{getRelativeTime(n.createdAt)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
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
                        className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-[#14151a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
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
                          {/* YENİ (istek): "avatar değiştir kısmının üstünde profilimi görüntüle
                              olsun" — tıklayınca gönderi sayısı, takipçi/takip sayısı ve biyografi
                              gösteren profil modalı açılıyor. */}
                          <button
                            onClick={() => { setIsProfileModalOpen(true); setIsAccountMenuOpen(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white transition-colors duration-150 flex items-center gap-2.5"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profilimi Görüntüle
                          </button>
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
                            {t("logout")}
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
                className="h-9 px-3 sm:px-4 bg-[#ff4655] hover:bg-red-600 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white transition duration-150 shadow-lg shadow-red-500/20 whitespace-nowrap"
              >
                {t("login")}
              </button>
            )}
          </div>

          {/* YENİ: mobil (lg altı) açılır menü — arama kutusu + 8 sekme burada, tam genişlikte
              ve alt alta, taşma/kaybolma olmadan. */}
          <AnimatePresence>
            {isMobileNavOpen && (
              <>
                <div className="fixed inset-0 top-[104px] z-40 bg-black/60 lg:hidden" onClick={() => setIsMobileNavOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="lg:hidden absolute top-full left-0 right-0 z-50 bg-[#14151a] border-b border-white/10 shadow-2xl p-3 max-h-[75vh] overflow-y-auto"
                >
                  <div className="flex items-center h-10 bg-[#1c1e24] rounded-lg overflow-hidden border border-white/5 mb-2">
                    <div className="w-9 h-full bg-[#ff4655] flex items-center justify-center flex-shrink-0">
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
                          setIsMobileNavOpen(false);
                          requestTabChange("home");
                          setTimeout(() => {
                            document.getElementById("heroSearchSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
                            document.getElementById("heroSearchInput")?.focus();
                          }, 150);
                        }}
                        placeholder="Arama..."
                        className="w-full bg-transparent border-none outline-none text-[12px] font-semibold text-white placeholder-white/30 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {["home", "crosshairs", "quiz", "find-team", "forum", "rank-guess", "skin-war", "word-game"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { requestTabChange(tab); setIsMobileNavOpen(false); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-black transition-colors duration-150 ${
                          activeTab === tab ? "bg-[#ff4655]/15 text-white border border-[#ff4655]/30" : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                        }`}
                      >
                        <span>{NAV_TAB_ICONS[tab]}</span>
                        {NAV_TAB_LABELS[tab]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
              <p className="text-xs font-bold text-white">Bu işlemi yapmak için önce giriş yapmalısın</p>
              <button onClick={() => { setLoginWarning(false); setIsLoginModalOpen(true); }} className="text-[10px] font-bold text-red-400 hover:text-red-300 underline">
                Hemen giriş yap
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ŞİKAYET BİLDİRİMİ (TOAST) - YENİ EKLENDİ: forum gönderisi / lobi / rank tahmin klibi
          şikayet edilince, hangi sekmede olursan ol burada tek bir yerden gösteriliyor. */}
      <AnimatePresence>
        {reportToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[80] bg-[#1a1b21] border border-emerald-500/25 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-2.5"
          >
            <span className="text-base">🚩</span>
            <p className="text-xs font-bold text-white">{reportToast}</p>
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
              <h2 className="text-lg font-black uppercase tracking-tight text-white">{t("loginModalTitle")}</h2>
              <p className="text-[11px] text-white/40 mt-1">{t("loginModalSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                id="loginNameInput"
                placeholder={t("loginModalPlaceholder")}
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
                  if (!value) return setLoginModalError(t("loginModalErrEmpty"));
                  if (!value.includes("#")) return setLoginModalError(t("loginModalErrFormat"));
                  const [namePart, tagPart] = value.split("#");
                  if (!namePart.trim() || !tagPart.trim()) return setLoginModalError(t("loginModalErrFormat"));

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
                      return setLoginModalError(data.error || t("loginModalErrNotFound"));
                    }
                    loginUser(value);
                    setIsLoginModalOpen(false);
                    setLoginModalLoading(false);
                    setLoginSuccessToast(true);
                    setTimeout(() => setLoginSuccessToast(false), 3200);
                  } catch {
                    setLoginModalLoading(false);
                    setLoginModalError(t("loginModalErrConnection"));
                  }
                }}
                className="w-full h-12 bg-[#ff4655] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition duration-150"
              >
                {loginModalLoading ? t("loginModalVerifying") : t("loginModalSubmit")}
              </button>
              <p className="text-[9px] text-white/25 text-center leading-relaxed">
                {t("loginModalFooter")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROFİL MODALI - YENİ EKLENDİ (istek: "profilimi görüntüle") */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={() => { setIsProfileModalOpen(false); setIsEditingBio(false); }}>
          <div
            className="w-full max-w-md relative bg-gradient-to-b from-[#181a21] to-[#101116] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#ff4655]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>
            <button
              onClick={() => { setIsProfileModalOpen(false); setIsEditingBio(false); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors z-10"
            >
              ✕
            </button>

            <div className="relative flex flex-col items-center text-center">
              {/* İSTEK: "solda avatarlarının üstüne tıklayınca da avatar değişme kısmı açılsın" —
                  buradaki avatara tıklanınca profil modalı kapanıp avatar değiştirme ekranı açılıyor. */}
              <button
                onClick={() => { setIsProfileModalOpen(false); setIsAvatarModalOpen(true); }}
                className={`w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} ring-4 ring-white/10 hover:ring-[#ff4655]/50 transition-all duration-150 relative group`}
                title="Avatarı değiştir"
              >
                <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5l6-6 4 4 5-5m0 0v4m0-4h-4M4.5 4.5h15A1.5 1.5 0 0121 6v12a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V6a1.5 1.5 0 011.5-1.5z" />
                  </svg>
                </div>
              </button>
              <p className="text-base font-black text-white mt-3">{currentUser}</p>

              <div className="flex items-center gap-5 mt-4">
                <div className="text-center">
                  <p className="text-sm font-black text-white">{ownForumPostCount}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Gönderi</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm font-black text-white">0</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Takipçi</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm font-black text-white">0</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Takip</p>
                </div>
              </div>

              <div className="w-full mt-5 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Biyografi</p>
                  {!isEditingBio && (
                    <button onClick={() => { setBioDraft(profileBio); setIsEditingBio(true); }} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">{t("edit")}</button>
                  )}
                </div>
                {isEditingBio ? (
                  <div>
                    <textarea
                      value={bioDraft}
                      onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                      rows={3}
                      placeholder="Kendini tanıt..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 resize-none focus:outline-none focus:border-[#ff4655]/50"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-white/25">{bioDraft.length}/160</span>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingBio(false)} className="text-[10px] font-bold text-white/40 hover:text-white px-2 py-1">İptal</button>
                        <button onClick={saveProfileBio} className="text-[10px] font-black text-white bg-[#ff4655] hover:bg-red-600 rounded-md px-3 py-1">{t("save")}</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/60 leading-relaxed min-h-[1.5rem]">{profileBio || "Henüz bir biyografi yazılmamış."}</p>
                )}
              </div>

              <p className="text-[9px] text-white/25 mt-5 leading-relaxed">
                Takipçi/takip ve diğer kullanıcıları takip etme özelliği yakında — bu, hesaplar arasında paylaşılan bir sunucu tarafı kayıt gerektiriyor.
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
            {/* DÜZELTME (istek): standart.jpg (varsayılan avatar) hiçbir kategoride seçilebilir
                değildi — birisi başka bir avatar seçtikten sonra varsayılana geri dönmenin hiçbir
                yolu yoktu. Ayrı, belirgin bir "Varsayılana Dön" kartı eklendi. */}
            <div className="mt-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Varsayılan</p>
              <button
                onClick={() => chooseAvatar(DEFAULT_AVATAR)}
                className={`w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br ${DEFAULT_AVATAR.ring} transition-all duration-150 hover:scale-105 active:scale-95 border-2 relative ${
                  selectedAvatar.id === DEFAULT_AVATAR.id ? "border-white shadow-lg shadow-white/20" : "border-transparent"
                }`}
                title="Varsayılana dön"
              >
                <img src={DEFAULT_AVATAR.img} alt="Varsayılan" className="w-full h-full object-cover" />
              </button>
            </div>
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

            {/* DÜZELTME ("foto çerçevesini kaldır"): logo'yu küçük bir kutu/çerçeve içinde
                gösteren blok kaldırıldı — başlık artık üstteki ince kırmızı çizgiyle (yukarıda)
                ve tek başına daha sade/kaliteli duruyor. */}
            <div className="relative z-10 mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#ff4655]">Infinity Network</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
                {legalModalTab === "privacy" ? "Gizlilik Politikası" : legalModalTab === "terms" ? "Kullanım Şartları" : "Destek"}
              </h2>
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
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Topladığımız veriler</p>
                    <p>Giriş yaparken verdiğin Riot ID (İsim#TAG), seçtiğin avatar, oluşturduğun nişangah kodları, yarışma puanların ve kurduğun lobi bilgileri (mod, rütbe aralığı, parti kodu).</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Riot ID doğrulaması</p>
                    <p>Giriş sırasında Riot ID'nin gerçekten var olduğunu doğrulamak için Riot Games'in herkese açık hesap API'sine istek atılır. Şifren hiçbir zaman istenmez, alınmaz veya saklanmaz.</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Tarayıcıda saklananlar</p>
                    <p>Oturumun, aktif sekmen ve avatar tercihin, sayfayı yenilediğinde kaybolmasın diye tarayıcının yerel deposunda (localStorage) tutulur — bu veriler bizim sunucularımıza değil, sadece kendi cihazına kaydedilir.</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Paylaşım</p>
                    <p>Verilerini reklam amacıyla üçüncü taraflarla satmıyor veya paylaşmıyoruz. Liderlik tablosu, nişangahlar ve lobiler gibi herkese açık alanlardaki bilgiler doğası gereği diğer kullanıcılar tarafından görülebilir.</p>
                  </div>
                </>
              )}

              {legalModalTab === "terms" && (
                <>
                  <p><span className="text-white font-bold">Infinity Network</span>'ü (<a href="https://infinity.gg" target="_blank" rel="noopener noreferrer" className="text-[#ff4655] hover:underline">infinity.gg</a>) kullanarak aşağıdaki şartları kabul etmiş olursun.</p>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Bağımsız bir topluluk platformu</p>
                    <p>Infinity Network, Riot Games tarafından onaylanmamış bağımsız bir hayran platformudur ve Riot Games'in resmi görüşlerini yansıtmaz. VALORANT, Riot Games, Inc.'in bir ticari markasıdır.</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Kullanıcı içerikleri</p>
                    <p>Paylaştığın nişangah adları, lobi mesajları ve profil bilgilerinden sen sorumlusun. Taciz edici, saldırgan veya yanıltıcı içerikler önceden bildirilmeden kaldırılabilir, ilgili hesap askıya alınabilir.</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Hizmetin durumu</p>
                    <p>Platform "olduğu gibi" sunulur, kesintisiz veya hatasız çalışacağı garanti edilmez. Özellikler zaman zaman değiştirilebilir, eklenebilir veya kaldırılabilir.</p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[#ff4655]/50 bg-black/20 p-3.5">
                    <p className="text-white font-black text-[11px] uppercase tracking-wider mb-1.5">Değişiklikler</p>
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
                      <p className="text-white font-bold text-xs">infinitynw.gg@gmail.com</p>
                      <p className="text-[10px] text-white/40">Hesap, veri veya işbirliği talepleri için.</p>
                    </div>
                  </div>
                  {/* YENİ (istek): "altına da karşılaştıkları hataları içinde yazabileceklerini
                      belirt" — hata/bug bildirimlerinin de bu mail üzerinden yapılabileceği not
                      olarak eklendi. */}
                  <p className="text-[10px] text-white/30 leading-relaxed">Sitede karşılaştığın hataları/bugları da bu mail adresine (infinitynw.gg@gmail.com) yazabilirsin.</p>
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
            <div className="w-full max-w-2xl relative bg-gradient-to-b from-[#181a21] to-[#101116] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
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
                  {/* DÜZELTME (istek): "cross çok sollu duruyor, biraz ortalı dursun" — SVG'nin
                      kendi viewBox/preserveAspectRatio ortalaması matematiksel olarak doğru
                      olsa da, yandaki sabit genişlikli (w-20) harita seçici sütunuyla aynı flex
                      satırında olduğu için kutunun GERÇEK en-boy oranı bazı ekran genişliklerinde
                      tam 16:9 olmayabiliyordu. Artık SVG, kendi 16:9 kutusunu bu dış kutunun
                      TAM ORTASINA yerleştiren ayrı bir "inset-0 flex items-center justify-center"
                      katmanının içinde — dış kutu ister 16:9 olsun ister olmasın, cross her zaman
                      gerçek merkezde kalıyor. */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full max-w-full max-h-full aspect-video">
                      {parsed ? (
                        <CrosshairAccurateSVG parsed={parsed} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
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
                      siteAlert("Kod kopyalanamadı, tarayıcı izin vermiyor olabilir. Kod: " + mapPreviewCrosshair.code);
                    });
                }}
                className={`relative z-10 mt-4 w-full h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
                  mapPreviewCopied
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white hover:text-black hover:border-white"
                }`}
              >
                {mapPreviewCopied ? t("codeCopied") : t("copyCode")}
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
                {t("heroTitle")}
              </h1>
            </div>

            <p className="mt-2 text-white/40 text-xs tracking-wide max-w-xl font-medium">
              {t("heroSubtitle")}
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
                    placeholder={t("heroSearchPlaceholder")}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-white/30"
                  />
                </div>
                <button type="submit" disabled={riotLoading} className="px-5 bg-white/5 hover:bg-red-500 transition-colors duration-200 text-[11px] font-bold tracking-wider uppercase disabled:opacity-40">
                  {riotLoading ? "..." : t("search")}
                </button>
              </form>

              {serverOnline !== null && (
                <div className="flex items-center gap-1.5 mt-2 justify-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                  {/* DÜZELTME: "· Riot Status API" ibaresi kaldırıldı, sadece sade durum yazısı kaldı. */}
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                    {serverOnline ? t("heroServerOnline") : t("heroServerOffline")}
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
                        {/* DÜZELTME/YENİ: gerçek avatar sistemi entegre edildi. Aranan Riot ID
                            giriş yapmış kullanıcının kendisiyse selectedAvatar (canlı, güncel)
                            gösteriliyor; başka biriyse liderlik tablosunda o isimle eşleşen bir
                            kayıt varsa (o kişi daha önce bilgi yarışmasını oynadıysa) onun kayıtlı
                            avatarı gösteriliyor. Hiçbiri yoksa (hakkında hiçbir bilgimiz olmayan,
                            hiç oynamamış bir Riot ID) eski baş harf rozetine düşülüyor — rastgele
                            birine ait olmayan bir avatar uydurmuyoruz. */}
                        {(() => {
                          const fullRiotName = `${riotResult.gameName}#${riotResult.tagLine}`;
                          const matchedAvatar =
                            fullRiotName === currentUser
                              ? selectedAvatar
                              : (() => {
                                  const entry = liveLeaderboard.find((p) => p.name === fullRiotName);
                                  return entry && (entry as any).avatarId ? findAvatarById((entry as any).avatarId) : null;
                                })();
                          return matchedAvatar ? (
                            <div className={`w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br ${matchedAvatar.ring} flex-shrink-0 shadow-xl ring-2 ring-white/10`}>
                              <img src={matchedAvatar.img} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style ? style.gradient : "from-[#ff4655] to-red-800"} flex items-center justify-center text-2xl font-black text-black flex-shrink-0 shadow-xl ring-2 ring-white/10`}>
                              {riotResult.gameName.slice(0, 1).toUpperCase()}
                            </div>
                          );
                        })()}
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

                    {/* YENİ: MAÇLAR / KAZANMA% / K:D özet satırı — son 10 maçtan GERÇEKTEN
                        hesaplanmış (bkz. /api/riot-match-history), referans görseldeki
                        "MATCHES / WIN% / K/D" satırının karşılığı. */}
                    {matchSummary && (
                      <div className="relative flex items-center gap-6 mt-5 pt-4 border-t border-white/5">
                        <div className="text-center">
                          <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">Maçlar</p>
                          <p className="text-base font-black text-white mt-0.5">{matchSummary.matchCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">Kazanma %</p>
                          <p className={`text-base font-black mt-0.5 ${matchSummary.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{matchSummary.winRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider">K/D Oranı</p>
                          <p className="text-base font-black text-white mt-0.5">{matchSummary.kd}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* YENİ: SON MAÇLAR — küçük ajan portreleri + skor, kazanç/kayba göre renkli
                      çerçeve. Referans görseldeki "LAST 8 MATCHES" satırının karşılığı, gerçek
                      Riot verisiyle dolduruluyor. */}
                  {recentMatches.length > 0 && (
                    <div className="px-6 py-4 border-b border-white/5 bg-black/20">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2.5">Son {recentMatches.length} Maç</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {recentMatches.map((m) => {
                          const icon = getAgentIcon(m.agentId);
                          return (
                            <div
                              key={m.matchId}
                              title={`${getAgentName(m.agentId)} · ${getMapName(m.mapId)} · ${m.kills}/${m.deaths}/${m.assists}`}
                              className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden relative border-2 ${
                                m.won === null ? "border-white/10" : m.won ? "border-emerald-500/60" : "border-red-500/60"
                              }`}
                            >
                              {icon ? (
                                <Image src={icon} alt={getAgentName(m.agentId)} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-[9px] font-black text-white/30">?</div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center py-[1px]">
                                <span className="text-[8px] font-black text-white/80">{m.kd}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-5">
                    {matchStatsLoading && (
                      <div className="flex items-center justify-center gap-2.5 py-10 text-white/40 text-xs font-semibold">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Gerçek maç verisi Riot sunucularından çekiliyor...
                      </div>
                    )}

                    {!matchStatsLoading && matchStatsError && (
                      <div className="py-2">
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          {["K/D Oranı", "Kazanma %", "Son Maç"].map((label) => (
                            <div key={label} className="rounded-xl border border-white/5 bg-black/30 p-3.5">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
                              <p className="mt-1 text-lg font-black text-white/25">—</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-center">
                          <p className="text-[11px] font-bold text-amber-200/75">Profil doğrulandı; maç istatistikleri şu an Riot API tarafından sağlanmıyor.</p>
                          <p className="mt-1 text-[10px] text-white/30">{matchStatsError}</p>
                        </div>
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

            {/* DÜZELTME: "Gerçek Sunucu Liderlik Tablosu" (val-ranked-v1) kartı isteğe bağlı
                olarak kaldırıldı, ilgili API çağrısı da tamamen durduruldu. */}

            {/* YENİ: Ana sayfa eskiden hero'dan sonra bomboştu — artık siteki diğer 3
                bölüme (Nişangahlar, Bilgi Yarışması, Takım Bul) göz atan, tıklanabilir,
                renkli öne çıkan kartlar var. Sayfa artık çok daha "dolu" görünüyor. */}
            <div className="mt-14 w-full max-w-[1500px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
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
                {
                  tab: "rank-guess",
                  emoji: "🎬",
                  title: "Rank Tahmin",
                  desc: "Klipleri izle, rütbeyi tahmin et ve doğruluk oranını yükselt.",
                  accent: "from-indigo-500/15 to-transparent",
                  ring: "group-hover:border-indigo-400/40",
                },
                {
                  tab: "skin-war",
                  emoji: "⚔️",
                  title: "Skin Savaşı",
                  desc: "Favori skinini seç, topluluk sıralamasını ve eşleşmeleri belirle.",
                  accent: "from-rose-500/15 to-transparent",
                  ring: "group-hover:border-rose-400/40",
                },
                {
                  tab: "word-game",
                  emoji: "🔤",
                  title: "Kelime Oyunu",
                  desc: "Günlük Valorant kelimelerini çözmeye hazırlan.",
                  accent: "from-cyan-500/15 to-transparent",
                  ring: "group-hover:border-cyan-400/40",
                },
              ].map((card) => (
                <button
                  key={card.tab}
                  onClick={() => {
                    requestTabChange(card.tab);
                  }}
                  className={`group relative min-h-[178px] overflow-hidden text-left bg-gradient-to-br ${card.accent} bg-[#14151a]/80 border border-white/10 ${card.ring} rounded-2xl p-4 shadow-xl transition-all duration-200 hover:-translate-y-0.5`}
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
                    {t("crosshairsPageTitle")}
                  </h2>
                </div>
                <p className="text-xs text-white/40 max-w-xl leading-relaxed">
                  {t("crosshairsPageSubtitle")}
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
                    placeholder={t("crosshairSearchPlaceholder")}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-white/20 w-full"
                  />
                </div>

                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                  <span className="text-[10px] text-black bg-gradient-to-r from-white to-white/80 uppercase font-black px-2.5 py-1.5 rounded-lg hidden md:inline shadow-[0_0_10px_rgba(255,255,255,0.15)]">{t("sortLabel")}</span>
                  {/* DÜZELTME (ASIL BUG — "Rütbe"/"Yeni" sıralaması hiç çalışmıyordu): buton
                      etiketleri direkt küçük harfe çevrilip sortType olarak kullanılıyordu —
                      "Rütbe" -> "rütbe", "Yeni" -> "yeni". Ama sıralama fonksiyonu "tier" ve
                      "new" anahtarlarını arıyordu. "rütbe" hiçbir zaman "tier"e eşit olmadığı
                      için bu buton SESSİZCE hiçbir şey yapmıyor, varsayılan (beğeni) sıralamasına
                      düşüyordu — "hangi sıralamayı seçersem seçeyim en beğenilen hep üstte kalıyor"
                      şikayetinin GERÇEK sebebi buydu. Artık her etiket doğru anahtara eşleniyor. */}
                  {[
                    { label: t("sortLikes"), value: "upvotes" },
                    { label: t("sortRank"), value: "tier" },
                    { label: t("sortNew"), value: "new" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortType(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-150 ${
                        sortType === opt.value ? "bg-[#ff4655] text-white shadow-[0_0_15px_rgba(255,70,85,0.35)]" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { if (!requireLogin()) return; setIsCrosshairModalOpen(true); setCrosshairCodeInput(""); setCrosshairCodeStatus("idle"); }}
                className="h-10 px-5 bg-gradient-to-r from-[#ff4655] to-red-600 hover:brightness-110 text-white rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(255,70,85,0.3)] transition duration-200 active:scale-[0.97]"
              >
                <span className="text-sm font-black">+</span> {t("addCrosshairBtn")}
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
                {t("filterAll")}
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
              // PERFORMANS DÜZELTMESİ: filtrele+sırala işlemi artık component üstünde
              // useMemo ile (bkz. sortedCrosshairsList) hesaplanıyor, burada sadece
              // hazır sonuç kullanılıyor — bu IIFE artık sadece "boş sonuç" / sayfalama /
              // JSX üretimiyle ilgileniyor, ağır hesaplama yapmıyor.
              const sorted = sortedCrosshairsList;

              // DÜZELTME (GERÇEK BUG): "En Beğenilen" tacı, seçili sıralama/filtre ne olursa
              // olsun HER ZAMAN sitedeki mutlak en çok beğenilen nişangaha (tüm listeden,
              // filtrelenmemiş) yapışıyordu. Bu yüzden "Rütbe" veya "Yeni" sıralaması seçilse
              // bile, o taç rozeti sanki "beğeni hâlâ en üstte" izlenimi veriyordu. Artık taç
              // SADECE "Beğeni" sıralaması aktifken gösteriliyor, ve o zaman da mevcut arama/
              // rütbe filtresine göre daraltılmış listenin GERÇEK ilk sırasındaki karta yapışıyor.
              const topId = sortType === "upvotes" && sorted.length > 0 ? sorted[0].id : null;

              if (sorted.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-3xl opacity-30">🎯</span>
                    <p className="text-sm font-bold text-white/40">{t("crosshairEmptyTitle")}</p>
                    <p className="text-xs text-white/25">{t("crosshairEmptySubtitle")}</p>
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
                {/* DÜZELTME: son sayfa (ör. 3. sayfa) her zaman 20 kart dolu olmuyor, bu yüzden
                    o sayfaya geçildiğinde ızgara kısalıyor, sayfa yüksekliği aniden değişiyor,
                    tarayıcı scroll konumunu koruyamayıp sayfayı yukarı/aşağı "fırlatıyordu" — üstteki
                    menü çubuğunun titremesinin ve "sayfa değiştirince en alta/üste atlama"nın asıl
                    sebebi buydu. minHeight ile ızgaraya her zaman ~5 satırlık bir taban veriliyor,
                    az dolu sayfalarda bile toplam yükseklik neredeyse sabit kalıyor. */}
                {/* DÜZELTME (GERÇEK BUG — kartlar dev boş kutulara dönüşüyordu): minHeight,
                    grid KONTEYNERİNE veriliyordu ama grid'in kendi satırları varsayılan olarak
                    mevcut alanı doldurmak için gerilir (align-content: stretch, CSS Grid'in
                    varsayılanı). Az kart olan bir sayfada (örn. 4 kart) bu, o 4 kartın kendisini
                    dev boyutlara ŞİŞİRİYORDU — "bu kartları bu kadar uzatmak nasıl bir çözüm"
                    şikayetinin sebebi tam olarak buydu. "content-start" (align-content: start)
                    eklendi: artık fazla yükseklik satırların ALTINDA boş alan olarak kalıyor,
                    kartların kendisi hiç şişmiyor — sayfa değişince olan scroll zıplaması da
                    hâlâ önleniyor (o kısmı zaten doğruydu), sadece kartlar artık normal boyutta.
                */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 content-start transform-gpu"
                  style={{ minHeight: pageItems.length < CROSSHAIRS_PER_PAGE ? "1360px" : undefined }}
                >
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
                            👑 {t("mostLikedBadge")}
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
                              onClick={() => copyToClipboard(Number(cross.id))}
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
                            onClick={() => toggleLike(Number(cross.id))}
                            title={likedIds.has(Number(cross.id)) ? "Beğeniyi geri al" : "Beğen"}
                            className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors duration-150 active:scale-95 ${
                              likedIds.has(Number(cross.id))
                                ? "bg-red-500/20 border-red-500/40 text-red-400"
                                : "bg-black/30 border-white/5 text-white/70 hover:bg-black/50 hover:border-white/20"
                            }`}
                          >
                            <span>{likedIds.has(Number(cross.id)) ? "❤️" : "🤍"}</span>
                            <span>{(likeCounts[Number(cross.id)] ?? parseLikes(cross.likes)).toLocaleString("tr-TR")}</span>
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
                            onClick={() => copyToClipboard(Number(cross.id))}
                            className={`mt-1 w-full h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
                              isCopied
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white hover:text-black hover:border-white"
                            }`}
                          >
                            {isCopied ? t("codeCopied") : t("copyCode")}
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

            {/* NİŞANGAH EKLEME PENCERESİ — DÜZELTME: artık createPortal ile doğrudan document.body'ye
                render ediliyor. Önceden bu modal, "transform-gpu" class'lı (CSS transform uygulanan)
                bir üst öğenin İÇİNDE duruyordu — CSS'te transform'lu bir ata, içindeki "position: fixed"
                elemanların referans noktasını VIEWPORT'tan kendisine çeviriyor. Bu yüzden modal
                viewport'ta ortalanacağına, o uzun kaydırılabilir bölümün bir yerine düşüyordu
                ("kart ekranın çok aşağısında kalıyor" şikayetinin kesin sebebi buydu). Portal, bu
                sorunu DOM yapısını değiştirerek kalıcı olarak çözer. */}
            {isCrosshairModalOpen && typeof document !== "undefined" && createPortal(
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Nişangah Adı <span className="text-white/20 normal-case font-medium">(opsiyonel)</span></label>
                      <input
                        type="text"
                        id="newCrosshairTitle"
                        placeholder="Boş bırakırsan: Valorant Crosshair"
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

                        // DEĞİŞTİ: isim artık ZORUNLU DEĞİL — boş bırakılırsa otomatik "Valorant
                        // Crosshair" ismi verilir. Bunun yerine KOD zorunlu hale getirildi (boş
                        // ya da geçersiz kod artık kabul edilmiyor, önceden tam tersiydi).
                        const finalTitle = titleInput?.value.trim() || "Valorant Crosshair";

                        if (!crosshairCodeInput.trim()) {
                          return siteAlert("Lütfen geçerli bir crosshair kodu gir — kod olmadan nişangah eklenemez.");
                        }
                        if (crosshairCodeStatus !== "valid") {
                          return siteAlert("Girdiğin crosshair kodu geçersiz. Lütfen Valorant'tan kopyaladığın kodu kontrol et.");
                        }
                        // YENİ (istek): aynı kodla ikinci kez eklemeyi engelle — sitede zaten
                        // birebir aynı crosshair kodu varsa (kim eklemiş olursa olsun) reddet.
                        const normalizedInput = crosshairCodeInput.trim();
                        const isDuplicate = [...customCrosshairs, ...CROSSHAIRS_DATA].some((c) => c.code.trim() === normalizedInput);
                        if (isDuplicate) {
                          return siteAlert("Bu crosshair kodu zaten sitede mevcut — aynı kod iki kez eklenemez.");
                        }

                        // YENİ: spam'i önlemek için haftalık 5 nişangah ekleme sınırı.
                        // Son 7 gün içinde eklenen nişangahların zaman damgalarını localStorage'da
                        // tutuyoruz; 7 günden eskiler otomatik düşer, sadece güncel pencere sayılır.
                        // DÜZELTME (istek — "nişangah ekleme sınırı hesaptan hesaba olsun, yan
                        // hesabımdan da nişangah ekleyemiyorum"): anahtar eskiden SABİT
                        // ("infinity_crosshair_submissions") idi — yani sınır aslında hesaba değil,
                        // TARAYICIYA/CİHAZA bağlıydı. Artık anahtar giriş yapılan hesaba (currentUser)
                        // özel — her Riot ID kendi haftalık 5 hakkını ayrı sayıyor.
                        const WEEKLY_LIMIT = 5;
                        const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
                        const submissionsKey = `infinity_crosshair_submissions_${currentUser || "guest"}`;
                        let submissionTimestamps: number[] = [];
                        try {
                          const raw = window.localStorage.getItem(submissionsKey);
                          submissionTimestamps = raw ? JSON.parse(raw) : [];
                        } catch {}
                        const recentSubmissions = submissionTimestamps.filter((t) => Date.now() - t < WEEK_MS);
                        if (recentSubmissions.length >= WEEKLY_LIMIT) {
                          return siteAlert(`Haftalık nişangah ekleme hakkın doldu (${WEEKLY_LIMIT}/hafta). Lütfen daha sonra tekrar dene.`);
                        }

                        const parsed = parseCrosshairCode(crosshairCodeInput);

                        const payload = {
                          title: finalTitle,
                          subtitle: currentUser ? `By ${currentUser}` : "By Sen",
                          rank: newCrosshairRank,
                          color: parsed ? parsed.color : "#ff4655",
                          code: crosshairCodeInput.trim(),
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

                        // Haftalık sınır için bu eklemenin zaman damgasını hesaba özel anahtarla kaydet
                        try {
                          window.localStorage.setItem(submissionsKey, JSON.stringify([...recentSubmissions, Date.now()]));
                        } catch {}

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
              </div>,
              document.body
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
              <h3 className="text-xs font-black tracking-widest text-white uppercase">{t("quizLiveLeaderboard")}</h3>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">{t("quizLiveBadge")}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {leaderboardLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[46px] rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
                ))
              ) : (
                [...liveLeaderboard].sort((a, b) => a.rank - b.rank).slice(0, 5).map((player) => {
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
                    <span className="text-xs font-bold text-white/80">{player.name === "Henüz kimse yok" ? t("quizNoOneYet") : player.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-red-400">{player.score} PTS</span>
                </div>
              );})
              )}
            </div>
          </div>
        </div>

        {/* Sağ Panel: Giriş Yap ve Başla */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left lg:pl-6">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">
            {t("quizHeroLine1")}<br /><span className="text-[#ff4655]">{t("quizHeroLine2")}</span>
          </h1>
          <p className="text-white/40 text-xs font-medium mt-3 max-w-md leading-relaxed">
            {t("quizHeroSubtitle")}
          </p>
          <form onSubmit={handleJoinQuiz} className="relative mt-8 w-full max-w-md bg-gradient-to-b from-[#1c1420] to-[#14151a] p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-2xl backdrop-blur-sm overflow-hidden">
            {/* YENİ: bu kutu düz siyahtı, artık avatar/gizlilik pencereleriyle aynı premium
                dille (köşelerde ışıltı + üstte ince kırmızı çizgi) uyumlu. */}
            <div className="pointer-events-none absolute -top-14 -right-14 w-48 h-48 bg-[#ff4655]/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-14 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4655]/60 to-transparent" />
            <div className="relative z-10 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">{t("quizRiotId")}</label>
              <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl h-12 px-4">
                <div className={`w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br ${selectedAvatar.ring} flex-shrink-0`}>
                  <img src={selectedAvatar.img} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-white/70">{currentUser || t("quizNotLoggedIn")}</span>
              </div>
            </div>

            {/* YENİ: oynamadan önce de kullanıcı toplam puanını ve sıralamasını görebilsin diye eklendi */}
            {currentUser && (() => {
              const myEntry = liveLeaderboard.find((p) => p.name === currentUser);
              if (!myEntry) return null;
              return (
                <div className="relative z-10 grid grid-cols-2 gap-2.5">
                  <div className="px-3 py-2.5 rounded-xl border bg-gradient-to-b from-amber-500/10 to-black/40 border-amber-400/20 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-amber-200/50 uppercase">{t("quizTotalScore")}</span>
                    <span className="text-base font-black text-amber-200 mt-0.5">{myEntry.score.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="px-3 py-2.5 rounded-xl border bg-gradient-to-b from-[#ff4655]/10 to-black/40 border-[#ff4655]/20 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-red-300/50 uppercase">{t("quizYourRank")}</span>
                    <span className="text-base font-black text-[#ff4655] mt-0.5">#{myEntry.rank}</span>
                  </div>
                </div>
              );
            })()}
            <button
              type="submit"
              disabled={playsToday >= DAILY_QUIZ_LIMIT}
              className="relative z-10 w-full h-12 bg-[#ff4655] hover:bg-red-600 active:scale-[0.98] rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#ff4655]"
            >
              {playsToday >= DAILY_QUIZ_LIMIT ? t("quizDailyLimitReached") : t("quizJoin")}
            </button>
            <p className="relative z-10 text-[10px] text-center font-bold text-white/30">
              {t("quizPlaysUsedToday", { used: Math.min(playsToday, DAILY_QUIZ_LIMIT), limit: DAILY_QUIZ_LIMIT })}
              {playsToday >= DAILY_QUIZ_LIMIT ? t("quizPlayAgainTomorrow") : ""}
            </p>
          </form>
        </div>
      </div>
    )}

    {/* OYUN/YARIŞMA EKRANI (FOTOĞRAFTAKİ YENİ SİSTEM) */}
    {isQuizStarted && !quizFinished && (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 transform-gpu">

        {/* YENİ (istek): "yarışmadayken sol üst tarafa bir tane ana menüye dön tuşu ekle, ona
            basılınca diğerleri gibi onaylıyor musun uyarısı çıksın" — mevcut ortak onay
            sistemine (exitConfirm) bağlanıyor, aynı sekme-değiştirme onayı gibi çalışıyor. */}
        <button
          type="button"
          onClick={() => { playClickSound(); setExitConfirm({ kind: "quiz", targetTab: null }); }}
          className="self-start flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition"
        >
          ← {t("quizBackToMenuBtn")}
        </button>

        {/* Üst Bar: Soru Sayısı, Canlı Puan ve İlerleme Çubuğu */}
        <div className="bg-[#14151a]/90 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg tracking-wide text-white/80">
              {t("quizQuestionLabel")} {currentQuestion + 1} / {activeQuestions.length}
            </span>
            {/* YENİ: oyun skoru — kaç soruyu doğru bildiğini canlı gösteren ayrı bir rozet.
                Önceden sadece "PUAN" vardı, doğru/yanlış sayısı hiçbir yerde görünmüyordu. */}
            <span className="text-xs font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg tracking-wide text-white/80 flex items-center gap-1.5">
              <span className="opacity-60 font-bold">{t("quizScoreLabel")}</span>
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
              style={{ width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%` }}
            />
          </div>
          <div className="text-xs font-bold text-white/40">
            Cevaplanan: {isAnswered ? currentQuestion + 1 : currentQuestion} / {activeQuestions.length}
          </div>
        </div>

        {/* Orta Alan: Soru ve Görsel/Sayaç Paneli */}
        <div className="bg-[#14151a]/95 border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
          {/* Arka Plan Işık Efekti */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,70,85,0.05),_transparent_60%)] pointer-events-none" />
          
          <h2 className="text-lg md:text-2xl font-black text-white max-w-3xl leading-snug z-10">
            {activeQuestions[currentQuestion].question}
          </h2>

          {/* YENİ: görsel destekli sorular (ajan silüeti, yetenek ikonu, harita görseli).
              "image" alanı olan sorularda otomatik gösterilir; olmayan (normal metin)
              sorularda bu alan hiç render edilmez. */}
          {(activeQuestions[currentQuestion] as any).image && (
            <div className={`mt-5 mx-auto rounded-xl overflow-hidden border border-white/10 bg-black/40 relative z-10 ${
              (activeQuestions[currentQuestion] as any).imageType === "silhouette" ? "w-40 h-40" :
              (activeQuestions[currentQuestion] as any).imageType === "map" ? "w-full max-w-md h-48" :
              "w-28 h-28"
            }`}>
              <Image
                src={(activeQuestions[currentQuestion] as any).image}
                alt="Soru görseli"
                fill
                className={`object-contain p-2 ${(activeQuestions[currentQuestion] as any).imageType === "silhouette" ? "brightness-0 invert opacity-90" : ""}`}
              />
            </div>
          )}

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
          {activeQuestions[currentQuestion].options.map((option, idx) => {
  // BURASI EKSİK KALMIŞTI - RENK VE DURUM HESAPLAMALARI:
  const isCorrectAnswer = option === activeQuestions[currentQuestion].answer;
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
              {currentQuestion + 1 === activeQuestions.length ? "SONUÇLARI GÖR" : "SONRAKİ SORU"} ➔
            </button>
          </motion.div>
        )}
      </div>
    )}

    {/* BİTMİŞ/SONUÇ EKRANI (PREMIUM TASARIM — performansa göre renklenen arka plan) */}
    {quizFinished && (() => {
      const ratio = score / activeQuestions.length;
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
            {t("quizCompleted")}
          </span>
          <p className="text-lg font-bold text-white/80 mt-3">{playerName || currentUser || t("quizPlayerFallback")}</p>

          {/* Skor ve Canlı Sıralama Alanı */}
          <div className="my-8 flex flex-col items-center justify-center gap-2">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${theme.ring} flex items-center justify-center shadow-xl ring-4 ring-white/5 mb-2`}>
              <div className="w-[72px] h-[72px] rounded-full bg-[#101116] flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{score}</span>
                <span className="text-[9px] text-white/30 font-bold leading-none mt-0.5">/ {activeQuestions.length}</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t("quizCorrectAnswerCountLabel")}</p>

            {(() => {
              const finalName = currentUser || playerName.trim() || t("quizAnonPlayer");
              const myEntry = liveLeaderboard.find((p) => p.name === finalName);
              const myRank = myEntry ? myEntry.rank : liveLeaderboard.length + 1;
              const myPoints = myEntry ? myEntry.score : pointsEarned;
              return (
                <div className="mt-5 grid grid-cols-3 gap-2.5 w-full">
                  <div className={`px-3 py-3 rounded-xl border bg-black/40 flex flex-col items-center justify-center ${pointsEarned < 0 ? "border-red-500/20" : theme.border}`}>
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">{t("quizGameScoreLabel")}</span>
                    <span className={`text-lg font-black mt-1 ${pointsEarned < 0 ? "text-red-400" : theme.accent}`}>
                      {pointsEarned > 0 ? "+" : ""}{pointsEarned.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="px-3 py-3 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">{t("quizTotalScoreLabel")}</span>
                    <span className="text-lg font-black text-white mt-1">{myPoints.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="px-3 py-3 rounded-xl border bg-black/40 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black tracking-widest text-white/30 uppercase">{t("quizRankingLabel")}</span>
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
            {t("quizRetryBtn")}
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
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">{t("findTeamSectionTitle").toLocaleUpperCase("tr-TR")}</h1>
        </div>
        <p className="text-white/40 text-xs font-medium">{t("findTeamSubtitle")}</p>
      </div>
      <button
        onClick={() => { if (!requireLogin()) return; setIsLobbyModalOpen(true); }}
        className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/20 transition duration-150 self-start sm:self-center flex items-center gap-2"
      >
        <span className="text-sm">+</span> {t("createLobbyBtn")}
      </button>
    </div>

    {/* ARAMA VE MOD FİLTRESİ — DÜZELTME (GERÇEK SEBEP BULUNDU): dış kutuda "overflow-hidden"
        vardı (arka plandaki bulanık ışıltı daireleri taşmasın diye) ama bu, mod filtre
        menüsünü de görünmez şekilde KIRPIYORDU — menü state olarak açılıyordu ama hiç
        görünmüyordu. Artık dekoratif arka plan ayrı, kendi overflow-hidden'ı olan bir
        katmana alındı; dış kutu artık overflow-visible, menü rahatça taşabiliyor. */}
    <div className="relative bg-gradient-to-r from-[#1a1c24] via-[#14151a] to-[#1a1420] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-xl mb-6">
      {/* YENİ: yenileme sırasında dolan ince kırmızı çubuk — arama barının hemen üstünde,
          yenileme bitince kayboluyor. Görsel geri bildirim: "yenileniyor" hissi veriyor. */}
      <AnimatePresence>
        {isRefreshingLobbies && (
          <motion.div
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute -top-[3px] left-2 right-2 h-[3px] rounded-full bg-gradient-to-r from-[#ff4655] to-red-400 shadow-[0_0_8px_rgba(255,70,85,0.6)]"
          />
        )}
      </AnimatePresence>
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
          placeholder={t("lobbySearchPlaceholder")}
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
    {lobbiesLoading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[132px] rounded-2xl bg-gradient-to-b from-[#16171d] to-[#0f1014] border border-white/5 animate-pulse" />
        ))}
      </div>
    ) : (() => {
      const filteredLobbies = lobbies
        // DÜZELTME: artık sadece oyuncu ismine değil, parti koduna (örn. RCB605) göre de arıyor
        .filter((lobby) => lobby.nick.toLowerCase().includes(teamSearchQuery.toLowerCase()) || lobby.code.toLowerCase().includes(teamSearchQuery.toLowerCase()))
        .filter((lobby) => selectedGameMode === "Tüm Modlar" || lobby.mode === selectedGameMode);

      if (filteredLobbies.length === 0) {
        // DÜZELTME: artık sahte/örnek lobilere asla geri düşülmediği için gerçekten "hiç lobi
        // yok" durumu da mümkün — bunu "aramanla eşleşen yok" mesajından ayırdık ki kafa
        // karıştırmasın.
        const noneAtAll = lobbies.length === 0;
        return (
          <div className="flex flex-col items-center justify-center gap-3 py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <span className="text-3xl opacity-30">👥</span>
            <p className="text-sm font-bold text-white/40">{noneAtAll ? "Şu an açık bir lobi yok." : "Aramanla eşleşen bir lobi bulunamadı."}</p>
            <p className="text-xs text-white/25">{noneAtAll ? "İlk lobiyi sen oluştur, diğer oyuncular seni bulsun." : "Farklı bir isim veya mod filtresi deneyebilirsin."}</p>
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
              {/* DÜZELTME (istek): "torii ve sis detayları belli olmuyor" — eski şekil sadece
                  birkaç dikdörtgendi ve opaklık (0.07) çok düşüktü, gerçek bir torii kapısına hiç
                  benzemiyordu; "sis" de aslında düz beyaz bir blur daireden ibaretti. Artık: 1)
                  gerçek bir torii silüeti (kavisli üst kiriş + uçları kalkık köşeler + alt kiriş +
                  ortadaki tabela + iki direk), büyütülmüş boyut ve fark edilir opaklıkta; 2) alttan
                  yükselen, genişlikleri/opaklıkları farklı GERÇEK sis katmanları (tek bir blur
                  yerine üst üste 3 kat). */}
              <svg className="pointer-events-none absolute -top-4 -right-6 w-36 h-28 opacity-[0.16] text-white" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 22 Q 70 6 132 22 L 132 30 Q 70 16 8 30 Z" fill="currentColor" />
                <path d="M6 20 Q 4 26 8 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M134 20 Q 136 26 132 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                <rect x="16" y="38" width="108" height="7" rx="2" fill="currentColor" />
                <rect x="60" y="40" width="20" height="14" rx="1.5" fill="currentColor" opacity="0.6" />
                <rect x="27" y="28" width="11" height="62" rx="2" fill="currentColor" />
                <rect x="102" y="28" width="11" height="62" rx="2" fill="currentColor" />
              </svg>
              <div className="pointer-events-none absolute -bottom-6 -left-6 w-40 h-24 rounded-full bg-white/[0.06] blur-2xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-400/[0.07] via-white/[0.04] to-transparent blur-md" />
              <div className="pointer-events-none absolute bottom-0 left-1/4 right-0 h-8 bg-gradient-to-t from-white/[0.05] to-transparent blur-sm" />
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* DÜZELTME (istek): "takım bulda şikayet et yeri öyle bir yere konmuş ki
                      hayatta görünmez" — eskiden sadece %25 opaklıkta ufacık bir 🚩 ikonuydu.
                      Artık forumdaki gibi görünür bir etiketli buton (arkaplanlı, kenarlıklı). */}
                  <button
                    onClick={() => reportContent("lobby", lobby.id, "lobi")}
                    className="flex items-center gap-1 text-[9px] font-bold text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 border border-white/10 rounded-full px-2 py-1 transition-colors"
                    title="Bu lobiyi şikayet et (ör. sahte kod)"
                  >
                    {t("reportButton")}
                  </button>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${lobby.mic ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/5 text-white/40 border border-white/10"}`}>
                    {lobby.mic ? `🎙 ${t("micRequiredBadge")}` : `🔇 ${t("micOptionalBadge")}`}
                  </span>
                </div>
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
              {/* YENİ (istek): "lobi oluşturma kısmına duruma göre yaş eklemesi eklenecek" —
                  opsiyonel yaş aralığı girildiyse kart üzerinde küçük bir rozet olarak gösteriliyor. */}
              {lobby.ageRange && (
                <div className="flex items-center gap-1.5 -mt-1 mb-3">
                  <span className="text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">🎂 Yaş: {lobby.ageRange}</span>
                </div>
              )}

              {/* DÜZELTME (ASIL BUG — "mesaj olan kart diğerlerinden büyük oluyor"): bu blok
                  önceden SADECE mesaj varsa render ediliyordu ("lobby.message && (...)") — yani
                  mesajlı kartlar mesajsız kartlardan daha uzundu, grid'de düzensiz görünüyordu.
                  Artık alan HER ZAMAN ayrılıyor (sabit yükseklik, min-h-[30px]) — mesaj yoksa
                  boş kalıyor ama kartın boyunu değiştirmiyor. Mesaj girişine de (aşağıda) 80
                  karakter sınırı kondu; line-clamp-2 zaten görünümü 2 satırla sınırlıyordu ama
                  ekstra bir güvence olarak kart boyunu asla etkilemesin diye eklendi. */}
              <div className="min-h-[30px] mb-3">
                {lobby.message && (
                  <p className="text-[11px] text-white/50 italic line-clamp-2 border-l-2 border-white/10 pl-2.5">"{lobby.message}"</p>
                )}
              </div>

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

    {/* LOBİ OLUŞTURMA PENCERESİ (İLERİ DÜZEY MODAL)
        DÜZELTME (istek — "açılan sekme çok aşağıda kalıyor"): bu modal "transform-gpu"
        class'lı (CSS transform uygulanan) find-team sekmesinin İÇİNDE duruyordu. CSS'te
        transform'lu bir ata, içindeki "position: fixed" elemanların referans noktasını
        VIEWPORT'tan kendisine çeviriyor — bu yüzden modal viewport'ta ortalanacağına, o uzun
        kaydırılabilir sekmenin bir yerine (genelde ekranın çok aşağısına) düşüyordu. Aynı bug
        daha önce nişangah ve forum gönderi modallerinde de vardı, ikisi de createPortal ile
        doğrudan document.body'ye render edilerek çözüldü — burada da aynı çözüm uygulandı. */}
    {isLobbyModalOpen && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base flex-shrink-0">👥</div>
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
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Mesaj (Opsiyonel, en fazla 80 karakter)</label>
              <input
                type="text"
                id="lobbyMessage"
                placeholder="Sakin oyuncular arıyorum..."
                maxLength={80}
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

            {/* YENİ (istek): "lobi oluşturma kısmına duruma göre yaş eklemesi eklenecek" —
                opsiyonel: kapalıyken lobiye hiç yaş bilgisi eklenmiyor, açılırsa bir aralık
                seçilebiliyor (mic/rütbe sınırı toggle'larıyla aynı görsel dil). */}
            <div className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-4 h-11">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white/70">Yaş Aralığı Ekle</span>
                {!ageRangeEnabled && <span className="text-[9px] text-white/30">Opsiyonel — istersen ekleme</span>}
              </div>
              <div className="flex items-center gap-2">
                {ageRangeEnabled && (
                  <select
                    value={ageRangeValue}
                    onChange={(e) => setAgeRangeValue(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg h-8 px-2 text-[11px] font-bold text-white outline-none"
                  >
                    {AGE_RANGE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setAgeRangeEnabled((v) => !v)}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${ageRangeEnabled ? "bg-emerald-500" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${ageRangeEnabled ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
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
                    ageRange: ageRangeEnabled ? ageRangeValue : null,
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
                      ageRange: newLobby.ageRange, // YENİ: opsiyonel yaş aralığı — backend route'un bunu da kaydetmesi gerekiyor
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
      </div>,
      document.body
    )}
  </motion.section>
)}

{/* ===== FORUM SEKMESİ (YENİ) ===== */}
{activeTab === "forum" && (
  <motion.section key="forum-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 min-h-screen pt-40 px-6 pb-20 transform-gpu">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t("forumSectionTitle")}</h1>
          </div>
          <p className="text-xs text-white/40 mt-1">{t("forumSectionSubtitle")}</p>
        </div>
        <button
          onClick={() => { if (!requireLogin()) return; if (forumPostsToday >= DAILY_FORUM_POST_LIMIT) return; setIsNewPostModalOpen(true); }}
          disabled={forumPostsToday >= DAILY_FORUM_POST_LIMIT}
          className="px-5 py-2.5 bg-[#ff4655] hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition duration-150"
        >
          {forumPostsToday >= DAILY_FORUM_POST_LIMIT ? t("forumDailyLimitBtnOpen") : t("forumNewPostBtnOpen")}
        </button>
      </div>

      {/* UYARI BANNER: forum, oyuncu bulma yeri değil */}
      <div className="mb-6 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[11px] font-bold text-amber-300/90">⚠️ Bu kanal oyuncu bulmak için uygun değil. Takım arıyorsan doğru yerdesin gibi görünmeyebilir — asıl adres "Takım Bul" sekmesi.</p>
        <button
          onClick={() => requestTabChange("find-team")}
          className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 hover:text-amber-200 transition-colors flex-shrink-0"
        >
          Takım Bul'a git <span>→</span>
        </button>
      </div>

      {selectedForumPostId === null ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* GÖNDERİ LİSTESİ */}
          <div className="flex flex-col gap-3">
            {forumPostsLoading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl border border-white/10 bg-[#14151a]/60 animate-pulse" />
              ))
            ) : forumPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 border border-dashed border-white/10 rounded-xl">
                <span className="text-2xl opacity-30">💬</span>
                <p className="text-xs font-bold text-white/40">Henüz hiç gönderi yok. İlk gönderiyi sen paylaş!</p>
              </div>
            ) : null}
            {!forumPostsLoading && forumPosts.map((post) => {
              // DÜZELTME (istek — "forumda gözüken avatarlar kullanıcının güncel avatarına
              // bağlı olarak değişmiyor"): post.avatar_id, gönderi paylaşıldığı ANDAKİ avatarın
              // DONMUŞ bir kopyası (backend'de başkalarının avatarı geriye dönük güncellenmiyor).
              // Lobi listesinde zaten kullanılan AYNI desen burada da uygulandı: gönderi SANA
              // aitse canlı (güncel) selectedAvatar'ı göster, başkasına aitse kayıtlı avatar_id'yi.
              const avatar = (post.author === currentUser ? selectedAvatar : null) || findAvatarById(post.avatar_id);
              return (
                <button
                  key={post.id}
                  onClick={() => {
                    setSelectedForumPostId(post.id);
                    fetchForumComments(post.id);
                    markForumPostViewed(post.id);
                  }}
                  className="relative overflow-hidden text-left bg-[#14151a]/90 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-colors duration-150"
                >
                  {/* DÜZELTME (istek): "sakura belli olmuyor, hareketli/animasyonlu yapabilirsin,
                      yapraklar dökülsün" — dal ve çiçekler büyütülüp (28→40) opaklığı (0.08→0.18)
                      artırıldı, ayrıca daldan sürekli süzülüp düşen/sallanan birkaç bağımsız
                      yaprak (motion.ellipse ile döngüsel y + rotate + opacity animasyonu)
                      eklendi — artık statik bir çizim değil, gerçekten "dökülen" bir sakura. */}
                  <svg className="pointer-events-none absolute -top-6 -right-8 w-40 h-40 opacity-[0.18] rotate-12 overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 90 Q 30 60 50 40 Q 65 25 85 15" stroke="#ff8fa3" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M45 45 Q 50 35 60 32" stroke="#ff8fa3" strokeWidth="2" strokeLinecap="round" />
                    <path d="M60 30 Q 65 20 75 18" stroke="#ff8fa3" strokeWidth="2" strokeLinecap="round" />
                    {[[85, 15], [70, 22], [55, 38], [40, 50], [25, 65]].map(([cx, cy], idx) => (
                      <g key={idx} transform={`translate(${cx} ${cy})`}>
                        {[0, 72, 144, 216, 288].map((deg) => (
                          <ellipse key={deg} cx={0} cy={-4} rx="3.6" ry="5" fill="#ffb3c6" transform={`rotate(${deg})`} />
                        ))}
                      </g>
                    ))}
                    {/* düşen yapraklar */}
                    {[
                      { x: 30, delay: 0, dur: 4.5 },
                      { x: 55, delay: 1.2, dur: 5.2 },
                      { x: 15, delay: 2.4, dur: 4.8 },
                      { x: 70, delay: 0.6, dur: 5.6 },
                    ].map((leaf, i) => (
                      <motion.ellipse
                        key={i}
                        rx="3"
                        ry="4"
                        fill="#ffb3c6"
                        animate={{ cy: [5, 95], cx: [leaf.x, leaf.x + 10, leaf.x - 6], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: leaf.dur, delay: leaf.delay, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ))}
                  </svg>
                  <div className="relative flex items-center gap-2.5 mb-2">
                    <div className={`relative w-7 h-7 rounded-full bg-gradient-to-br ${avatar.ring} flex-shrink-0 overflow-hidden`}>
                      <Image
                        src={avatar.img}
                        alt={`${post.author} avatarı`}
                        fill
                        sizes="28px"
                        className="object-cover"
                        // DÜZELTME (istek — "bazı forumdaki avatarlarda yüklenemedi işareti
                        // gözüküyor"): görsel gerçekten yüklenemezse (bozuk/eksik dosya) artık
                        // kırık ikon yerine sessizce varsayılan avatara düşüyor.
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR.img; }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white/70">{post.author}</span>
                    <span className="text-[10px] text-white/25">· <RelativeTimeText createdAt={new Date(post.created_at).getTime()} /></span>
                    {post.poll_options && <span className="text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-1.5 py-0.5 rounded">Anket</span>}
                  </div>
                  <h3 className="relative text-sm font-black text-white mb-1">{post.title}</h3>
                  <p className="relative text-xs text-white/50 line-clamp-2">{post.content}</p>
                  <div className="relative flex items-center gap-4 mt-3 text-[11px] font-bold text-white/40">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comment_count}</span>
                    <span>👁 {post.view_count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SAĞ SIDEBAR
              DÜZELTME: "En Çok Beğenilen Gönderiler" eskiden sadece sıra numarası + düz başlık
              metniydi (görsel olarak çok yalındı). Artık her satırda yazarın avatarı, beğeni
              sayısı ve satırlar arasında gerçek kart ayrımı (arka plan/hover) var — listenin
              geri kalanındaki gönderi kartlarıyla aynı dile sahip. "Siteyi Gören Kişi Sayısı"
              kutusu tamamen kaldırıldı. */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#14151a]/90 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">En Çok Beğenilen Gönderiler</p>
              <div className="flex flex-col gap-1.5">
                {forumPostsLoading ? (
                  [0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)
                ) : (
                  <>
                    {topForumPosts.map((p, i) => {
                      const avatar = (p.author === currentUser ? selectedAvatar : null) || findAvatarById(p.avatar_id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedForumPostId(p.id); fetchForumComments(p.id); }}
                          className="text-left flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/5 transition-colors"
                        >
                          <span className="text-[10px] font-black text-white/25 w-3 flex-shrink-0">{i + 1}</span>
                          <div className={`relative w-7 h-7 rounded-full bg-gradient-to-br ${avatar.ring} flex-shrink-0 overflow-hidden`}>
                            <Image src={avatar.img} alt={`${p.author} avatarı`} fill sizes="28px" className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR.img; }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white/70 truncate">{p.title}</p>
                            <p className="text-[9px] text-white/30 truncate">{p.author}</p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-black text-white/40">❤️ {p.likes}</span>
                        </button>
                      );
                    })}
                    {forumPosts.length === 0 && <p className="text-[10px] text-white/25">Henüz gönderi yok.</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GÖNDERİ DETAYI */
        (() => {
          const post = forumPosts.find((p) => p.id === selectedForumPostId);
          if (!post) {
            // DÜZELTME (istek): F5 sonrası ?post= ile doğrudan bir gönderiye dönülürken,
            // forumPosts henüz gelmediyse (forumPostsLoading) sessizce boş ekran göstermek
            // yerine kısa bir yükleniyor durumu gösteriliyor; veri gelip de gönderi GERÇEKTEN
            // yoksa (silinmiş olabilir) kullanıcı listeye yönlendiriliyor.
            if (forumPostsLoading) {
              return (
                <div className="max-w-2xl mx-auto">
                  <div className="h-64 rounded-xl border border-white/10 bg-[#14151a]/60 animate-pulse" />
                </div>
              );
            }
            return (
              <div className="max-w-2xl mx-auto text-center py-16">
                <p className="text-xs font-bold text-white/40">Bu gönderi bulunamadı.</p>
                <button onClick={() => setSelectedForumPostId(null)} className="mt-4 text-xs font-black text-[#ff4655] hover:text-red-400">← Foruma dön</button>
              </div>
            );
          }
          const avatar = (post.author === currentUser ? selectedAvatar : null) || findAvatarById(post.avatar_id);
          const totalVotes = (post.poll_votes || []).reduce((a: number, b: number) => a + b, 0);
          const alreadyVotedPoll = forumPollVoted.has(post.id);

          return (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedForumPostId(null)} className="text-xs font-bold text-white/40 hover:text-white flex items-center gap-1.5">← Geri</button>
                {/* YENİ (istek): forumda gönderiyi şikayet etme butonu */}
                <button
                  onClick={() => reportContent("forum_post", post.id, "gönderi")}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-red-400 transition-colors"
                  title="Bu gönderiyi şikayet et"
                >
                  {t("reportButton")}
                </button>
              </div>
              <div className="bg-[#14151a]/90 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${avatar.ring} flex-shrink-0 overflow-hidden`}>
                    <Image src={avatar.img} alt={`${post.author} avatarı`} fill sizes="36px" className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR.img; }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{post.author}</p>
                    <p className="text-[10px] text-white/30"><RelativeTimeText createdAt={new Date(post.created_at).getTime()} /></p>
                  </div>
                </div>
                <h2 className="text-lg font-black text-white mb-2">{post.title}</h2>
                <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                {/* YENİ (istek): "anket şu an çok kötü duruyor, kalitesiz, premium bir tane
                    yap" — eskiden düz bg-black/30 kutular + indigo dolgu (sitenin kırmızı
                    temasıyla uyumsuz) vardı, seçim göstergesi yoktu. Artık: site temasına uygun
                    kırmızı degrade dolgu, oy vermeden önce radyo düğmesi göstergesi, kazanan
                    seçenek altın kenarlıkla öne çıkıyor, üstte toplam oy sayısı başlığı var. */}
                {post.poll_options && (
                  <div className="mt-5">
                    <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-white/35">
                      📊 Anket {totalVotes > 0 ? `· ${totalVotes} oy` : "· henüz oy yok"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {post.poll_options.map((opt: string, i: number) => {
                        const voteCount = (post.poll_votes || [])[i] || 0;
                        const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const maxVotes = Math.max(...(post.poll_votes || [0]));
                        const isWinning = alreadyVotedPoll && totalVotes > 0 && voteCount === maxVotes && maxVotes > 0;
                        return (
                          <button
                            key={i}
                            disabled={alreadyVotedPoll}
                            onClick={() => {
                              if (alreadyVotedPoll) return;
                              playClickSound();
                              const nextSet = new Set(forumPollVoted).add(post.id);
                              setForumPollVoted(nextSet);
                              try { window.localStorage.setItem("infinity_forum_polls_voted", JSON.stringify([...nextSet])); } catch {}
                              fetch("/api/forum/poll-vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id, optionIndex: i }) })
                                .then((r) => (r.ok ? r.json() : null))
                                .then((data) => { if (data?.pollVotes) setForumPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, poll_votes: data.pollVotes } : p))); })
                                .catch(() => {});
                            }}
                            className={`group relative overflow-hidden text-left rounded-xl px-4 py-3 text-xs font-bold transition-all duration-200 disabled:cursor-default ${
                              isWinning
                                ? "border-2 border-amber-400/60 bg-amber-400/[0.06] shadow-[0_0_16px_-4px_rgba(251,191,36,0.35)]"
                                : "border border-white/10 bg-black/30 hover:border-[#ff4655]/40 hover:bg-white/[0.03]"
                            }`}
                          >
                            {alreadyVotedPoll && (
                              <div
                                className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${isWinning ? "bg-gradient-to-r from-amber-400/25 to-amber-400/5" : "bg-gradient-to-r from-[#ff4655]/20 to-[#ff4655]/5"}`}
                                style={{ width: `${pct}%` }}
                              />
                            )}
                            <div className="relative flex items-center gap-2.5">
                              {!alreadyVotedPoll ? (
                                <span className="flex-shrink-0 h-4 w-4 rounded-full border-2 border-white/25 group-hover:border-[#ff4655]/70 transition-colors" />
                              ) : (
                                <span className={`flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${isWinning ? "border-amber-400 text-amber-300" : "border-white/30 text-white/50"}`}>
                                  {isWinning ? "★" : "✓"}
                                </span>
                              )}
                              <span className={`flex-1 truncate ${isWinning ? "text-amber-200" : "text-white/85"}`}>{opt}</span>
                              {alreadyVotedPoll && (
                                <span className={`flex-shrink-0 text-[10px] font-black tabular-nums ${isWinning ? "text-amber-300" : "text-white/40"}`}>{pct}% <span className="font-bold opacity-60">({voteCount})</span></span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5">
                  <button onClick={() => toggleForumLike("post", post.id, "like")} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${forumLikedIds.has(`post-like-${post.id}`) ? "text-red-400" : "text-white/40 hover:text-white"}`}>
                    ❤️ {post.likes}
                  </button>
                  <button onClick={() => toggleForumLike("post", post.id, "dislike")} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${forumLikedIds.has(`post-dislike-${post.id}`) ? "text-blue-400" : "text-white/40 hover:text-white"}`}>
                    👎 {post.dislikes}
                  </button>
                  <span className="text-xs font-bold text-white/30 ml-auto">👁 {post.view_count} görüntülenme</span>
                </div>
              </div>

              {/* YORUMLAR */}
              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">Yorumlar ({forumComments.length})</p>
                {isLoggedIn && (
                  <div className="flex gap-2 mb-4">
                    <input
                      ref={forumCommentInputRef}
                      defaultValue=""
                      placeholder="Yorum yaz..."
                      onKeyDown={(e) => {
                        // Enter'a basınca da gönderilebilsin (eskiden sadece butonla mümkündü)
                        if (e.key === "Enter") (document.getElementById(`forumCommentSend-${post.id}`) as HTMLButtonElement)?.click();
                      }}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-xs text-white outline-none focus:border-white/30"
                    />
                    <button
                      id={`forumCommentSend-${post.id}`}
                      onClick={() => {
                        const val = forumCommentInputRef.current?.value.trim() || "";
                        if (!val) return;
                        fetch("/api/forum/comments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ postId: post.id, author: currentUser, avatarId: selectedAvatar?.id || null, content: val }),
                        })
                          .then((r) => (r.ok ? r.json() : null))
                          .then((data) => {
                            if (data?.comment) {
                              setForumComments((prev) => [...prev, data.comment]);
                              setForumPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comment_count: p.comment_count + 1 } : p)));
                              if (forumCommentInputRef.current) forumCommentInputRef.current.value = "";
                            }
                          })
                          .catch(() => {});
                      }}
                      className="px-4 h-10 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors"
                    >
                      Gönder
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-2.5">
                  {forumComments.map((c) => {
                    const cAvatar = (c.author === currentUser ? selectedAvatar : null) || findAvatarById(c.avatar_id);
                    return (
                      <div key={c.id} className="bg-[#14151a]/70 border border-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`relative w-5 h-5 rounded-full bg-gradient-to-br ${cAvatar.ring} flex-shrink-0 overflow-hidden`}>
                            <Image src={cAvatar.img} alt={`${c.author} avatarı`} fill sizes="20px" className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR.img; }} />
                          </div>
                          <span className="text-[11px] font-bold text-white/70">{c.author}</span>
                          <span className="text-[9px] text-white/25">· <RelativeTimeText createdAt={new Date(c.created_at).getTime()} /></span>
                        </div>
                        <p className="text-xs text-white/60">{c.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => toggleForumLike("comment", c.id, "like")} className={`text-[10px] font-bold ${forumLikedIds.has(`comment-like-${c.id}`) ? "text-red-400" : "text-white/30 hover:text-white/60"}`}>❤️ {c.likes}</button>
                          <button onClick={() => toggleForumLike("comment", c.id, "dislike")} className={`text-[10px] font-bold ${forumLikedIds.has(`comment-dislike-${c.id}`) ? "text-blue-400" : "text-white/30 hover:text-white/60"}`}>👎 {c.dislikes}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>

    {/* YENİ GÖNDERİ MODALI */}
    {isNewPostModalOpen && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
          <button onClick={() => setIsNewPostModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white text-sm">✕</button>
          <h2 className="text-lg font-black text-white mb-4">{t("forumNewPost")}</h2>
          <div className="flex flex-col gap-3">
            <input id="newPostTitle" placeholder="Başlık" className="bg-black/40 border border-white/10 rounded-xl h-11 px-4 text-xs font-bold text-white outline-none focus:border-white/30" />
            <textarea id="newPostContent" placeholder="Ne düşünüyorsun?" rows={4} className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-medium text-white outline-none resize-none focus:border-white/30" />

            <label className="flex items-center gap-2 text-[11px] font-bold text-white/60">
              <input type="checkbox" checked={newPostHasPoll} onChange={(e) => setNewPostHasPoll(e.target.checked)} />
              {t("forumAddPoll")}
            </label>

            {newPostHasPoll && (
              <div className="flex flex-col gap-2">
                {newPostPollOptions.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => setNewPostPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                    placeholder={`Seçenek ${i + 1}`}
                    className="bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs text-white outline-none"
                  />
                ))}
                {newPostPollOptions.length < 6 && (
                  <button onClick={() => setNewPostPollOptions((prev) => [...prev, ""])} className="text-[10px] font-bold text-white/40 hover:text-white text-left">+ Seçenek ekle</button>
                )}
              </div>
            )}

            <p className="text-[10px] font-bold text-white/30 text-center">
              {t("forumTodayLabel")} {Math.min(forumPostsToday, DAILY_FORUM_POST_LIMIT)}/{DAILY_FORUM_POST_LIMIT} {t("forumUsedTodayLabel")}
            </p>

            <button
              disabled={forumPostsToday >= DAILY_FORUM_POST_LIMIT}
              onClick={() => {
                // YENİ (istek): spamı önlemek için günlük 3 gönderi sınırı.
                if (forumPostsToday >= DAILY_FORUM_POST_LIMIT) return;
                const title = (document.getElementById("newPostTitle") as HTMLInputElement)?.value.trim();
                const content = (document.getElementById("newPostContent") as HTMLTextAreaElement)?.value.trim();
                if (!title || !content) return siteAlert("Başlık ve içerik zorunludur.");
                const pollOptions = newPostHasPoll ? newPostPollOptions.map((o) => o.trim()).filter(Boolean) : null;
                if (newPostHasPoll && (!pollOptions || pollOptions.length < 2)) return siteAlert("Anket için en az 2 seçenek gir.");

                fetch("/api/forum/posts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ author: currentUser, avatarId: selectedAvatar?.id || null, title, content, pollOptions }),
                })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => { if (data?.post) setForumPosts((prev) => [data.post, ...prev]); })
                  .catch(() => {});

                registerDailyForumPost();
                setIsNewPostModalOpen(false);
                setNewPostHasPoll(false);
                setNewPostPollOptions(["", ""]);
              }}
              className="w-full h-11 bg-gradient-to-r from-[#ff4655] to-red-600 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-xs uppercase tracking-widest text-white mt-1 shadow-lg shadow-red-500/20 transition duration-150"
            >
              {forumPostsToday >= DAILY_FORUM_POST_LIMIT ? t("forumDailyLimitBtnOpen") : t("forumSharePoll")}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </motion.section>
)}

{/* ===== RANK TAHMİN ===== */}
{activeTab === "rank-guess" && (
  <motion.section key="rank-guess-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 min-h-screen pt-40 px-6 pb-20 text-center transform-gpu">
    {(() => {
      const RANK_ICONS = [
        { label: "Demir", img: "/demir.png" },
        { label: "Bronz", img: "/bronz.png" },
        { label: "Gümüş", img: "/silver.png" },
        { label: "Altın", img: "/gold.png" },
        { label: "Platin", img: "/plat.png" },
        { label: "Elmas", img: "/dia.png" },
        // DÜZELTME (istek): "rütbeni seç'te Ascendant yazıyor ama dia logosu var" — Ascendant
        // satırı yanlışlıkla Diamond'ın dosyasını ("/dia.png") kullanıyordu. "/ascendant.png"
        // adında bir görsel /public klasöründe olmalı; dosya adın farklıysa (örn. "/asc.png")
        // buradaki yolu ona göre güncelle.
        { label: "Yüce", img: "/yüce.png" },
        { label: "Ölümsüz", img: "/immo.png" },
        { label: "Radyant", img: "/radiant.png" },
      ] as const;

      const currentClip = rankClipIndex >= 0 ? rankClips[rankClipIndex] || null : null;
      const embedUrl = currentClip ? getRankClipEmbedUrl(currentClip.url) : null;
      const rankAliases: Record<string, string> = {
        iron: "demir", bronze: "bronz", silver: "gümüş", gold: "altın", platinum: "platin",
        diamond: "elmas", ascendant: "yüce", immortal: "ölümsüz", radiant: "radyant",
      };
      const normalizeRank = (rank: string) => rankAliases[rank.toLocaleLowerCase("en-US")] || rank.toLocaleLowerCase("tr-TR");
      const displayRank = (rank: string) => RANK_ICONS.find((item) => normalizeRank(item.label) === normalizeRank(rank))?.label || rank;

      const chooseRankForClip = (rank: string) => {
        if (rankGuessResult || !currentClip || !currentUser) {
          if (!currentUser) requireLogin();
          return;
        }
        // DÜZELTME (rank kasma engeli — ek güvenlik): index effect'i normalde zaten izlenmiş
        // bir klibi hiç göstermiyor, ama olası bir yarış durumunda (ör. çok hızlı art arda
        // tıklama, state henüz güncellenmeden) yine de izlenmiş bir klip ekranda kalmışsa
        // buradan puan/seri kazanılmasını engelliyoruz.
        if (rankViewedClipIds.includes(currentClip.id)) return;
        setRankPickedLabel(rank);
        const correct = normalizeRank(rank) === normalizeRank(currentClip.rank);
        setRankGuessResult(correct ? "correct" : "wrong");
        if (correct) {
          playCorrectSound();
          const next = rankStreak + 1;
          setRankStreak(next);
          if (next > rankBestStreak) {
            setRankBestStreak(next);
            try { window.localStorage.setItem(`infinity_rank_best_${currentUser || "guest"}`, String(next)); } catch {}
          }
          // Kalıcı toplam doğru sayacı — F5'te veya klipler bitse bile kaybolmuyor.
          setRankTotalCorrect((prevTotal) => {
            const updated = prevTotal + 1;
            try { window.localStorage.setItem(`infinity_rank_total_correct_${currentUser || "guest"}`, String(updated)); } catch {}
            return updated;
          });
        } else {
          playWrongSound();
          setRankStreak(0);
        }
        fetch("/api/rank-guesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clipId: currentClip.id, playerName: currentUser, guessedRank: rank }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Tahmin kaydedilemedi.");
          setRankGuessStats(data);
        }).catch((error) => setRankToast(error.message || "Tahmin kaydedilemedi."));
      };
      const nextClip = () => {
        playClickSound();
        if (currentClip) {
          const viewed = [...new Set([...rankViewedClipIds, currentClip.id])];
          setRankViewedClipIds(viewed);
          try { window.localStorage.setItem(`infinity_rank_viewed_${currentUser || "guest"}`, JSON.stringify(viewed)); } catch {}
          const nextIndex = rankClips.findIndex((clip, index) => index > rankClipIndex && !viewed.includes(clip.id));
          const firstUnwatched = rankClips.findIndex((clip) => !viewed.includes(clip.id));
          setRankClipIndex(nextIndex >= 0 ? nextIndex : firstUnwatched);
        }
        setRankGuessResult(null);
        setRankPickedLabel(null);
      };
      const shareClip = () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        navigator.clipboard?.writeText(url).then(() => {
          setRankToast("Bağlantı kopyalandı.");
          setTimeout(() => setRankToast(""), 2500);
        }).catch(() => setRankToast("Bağlantı kopyalanamadı."));
      };
      const currentCorrect = rankTotalCorrect;
      const playerRank = rankGuessStats?.playerRank || null;

      // YENİ (istek): "klipteki oyuncunun rankını yazdıktan sonra böyle bi ekran çıksın, doğru
      // ya da yanlış falan" — referans görseldeki (WHIFFED IT! / doğru rütbe / oyuncu tahminleri
      // dağılımı / NEXT CLIP) tam ekran sonuç modalı. Gerçek bir "diğer oyuncular ne tahmin
      // etti" veritabanı yok, o yüzden dağılım klibe özel SABİT bir tohumdan (seed) üretiliyor —
      // her klipte hep aynı (rastgele değişmeyen), gerçek rütbeye ağırlıklı, mantıklı görünen
      // bir yüzde dağılımı. Gerçek bir backend eklenirse burası kolayca değiştirilebilir.
      const guessDistribution = currentClip && rankGuessStats ? RANK_ICONS
        .map((rank) => ({ label: rank.label, img: rank.img, count: rankGuessStats.counts[rank.label] || 0 }))
        .sort((a, b) => b.count - a.count) : null;
      const guessTotalCount = rankGuessStats?.total || 0;

      return (
        <div className="max-w-6xl mx-auto text-left">
          {rankToast && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-emerald-400/25 bg-[#101014]/95 px-4 py-3 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur">{rankToast}</div>}
          <div className="flex items-center gap-2.5 mb-1 justify-center">
            <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t("rankGuessTitle")}</h1>
          </div>
          <p className="text-xs text-white/40 mb-6 text-center">{t("rankGuessSubtitle")}</p>

          {/* DÜZELTME (istek): "rank tahmin menüsünde ön sekme olmasın, direk menü burdan
              açılsın" + "soldaki sıralamaya dön şeyini kaldır" — ayrı bir giriş/sıralama ekranı
              kavramı tamamen kaldırıldı, sekmeye girince doğrudan oyun ekranı (klip + rütbe
              seçimi) açılıyor; "Klip Paylaş" zaten aşağıdaki oyun ekranı başlığında var, o yüzden
              kaybolan bir işlevsellik yok. */}
          {(() => {
            // ===== OYUN EKRANI (video + rütbe seçimi) =====
            return (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#14151a] via-[#19151b] to-[#14151a] px-5 py-3 mb-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
                  <span className="text-amber-300">🏆</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Toplam Doğru Tahmin</span>
                  <span className="text-sm font-black text-white">{currentCorrect}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Oyuncular Arasında</span>
                  <span className="text-sm font-black text-[#ff4655]">{playerRank ? `#${playerRank}` : "Dereceniz yok"}</span>
                </div>
                <button onClick={() => setIsRankUploadOpen(true)} className="h-9 px-4 rounded-lg bg-white text-black text-[11px] font-black transition hover:bg-white/90">🎬 Klip Paylaş</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.85fr_1fr] gap-5">
                <div className="rounded-2xl border border-white/10 bg-black overflow-hidden aspect-[16/8.2] flex items-center justify-center shadow-2xl">
                  {!isLoggedIn ? (
                    // YENİ (istek — "siteye isim tagla giriş yapmayanlar klipleride izleyemesin
                    // rank tahmindeki izlemek için giriş yapınız desin"): giriş yapılmadan klip
                    // (iframe/video) hiç render edilmiyor, kaynağı bile yüklenmiyor.
                    <div className="p-8 text-center">
                      <p className="text-3xl mb-2">🔒</p>
                      <p className="text-sm font-black text-white/70">İzlemek için giriş yapınız</p>
                      <p className="mt-2 text-xs text-white/35">Klipleri izleyip rütbe tahmin edebilmek için Riot ID ile giriş yapman gerekiyor.</p>
                      <button onClick={() => requireLogin()} className="mt-4 h-10 px-5 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black text-white transition">{t("login")}</button>
                    </div>
                  ) : !currentClip ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-black text-white/60">{rankClips.length ? "Tüm klipleri izlediniz" : "Henüz klip yok"}</p>
                      <p className="mt-2 text-xs text-white/35">{rankClips.length ? "Yeni klip eklendiğinde burada görünecek." : "İlk klibi sen paylaşarak oyunu başlat."}</p>
                      <button onClick={() => setIsRankUploadOpen(true)} className="mt-4 h-10 px-5 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black text-white transition">🎬 Klip Paylaş</button>
                    </div>
                  ) : embedUrl ? (
                    <iframe src={embedUrl} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                  ) : (
                    <video src={currentClip.url} controls className="w-full h-full object-contain" />
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#14151a]/90 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">✥ Rütbeyi Seç</p>
                  <div className="grid grid-cols-3 gap-2">
                    {RANK_ICONS.map((rank) => {
                      // YENİ (istek): "seçilme yanlış/doğru animasyonları" — doğru cevap yeşile
                      // dönüp hafifçe büyüyor (pop), YANLIŞ TIKLADIĞIN buton ise artık kırmızıya
                      // dönüp sallanıyor (shake) — eskiden sadece doğru cevap işaretleniyordu,
                      // hangi butona bastığın hiç görünmüyordu.
                      const isTheCorrectAnswer = rankGuessResult && currentClip && normalizeRank(rank.label) === normalizeRank(currentClip.rank);
                      const isWronglyPicked = rankGuessResult === "wrong" && rankPickedLabel === rank.label;
                      return (
                        <button
                          key={rank.label}
                          onClick={() => chooseRankForClip(rank.label)}
                          disabled={!currentClip || !!rankGuessResult}
                          className={`h-16 rounded-lg border flex flex-col items-center justify-center gap-1 text-[9px] font-black transition-all duration-300 disabled:opacity-100 ${
                            isTheCorrectAnswer
                              ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 scale-110 shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                              : isWronglyPicked
                              ? "border-red-500 bg-red-500/15 text-red-300 animate-[shake_0.4s_ease-in-out]"
                              : "border-white/10 bg-white/[0.03] text-white/70 hover:border-[#ff4655]/60 hover:text-white disabled:opacity-30"
                          }`}
                          style={isWronglyPicked ? { animation: "shake 0.4s ease-in-out" } : undefined}
                        >
                          <span className="relative w-6 h-6 flex-shrink-0"><Image src={rank.img} alt={rank.label} fill className="object-contain" /></span>
                          {rank.label}
                        </button>
                      );
                    })}
                  </div>
                  <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }`}</style>

                  {rankGuessResult && currentClip && (
                    <div className="mt-4 rounded-lg px-3 py-2 text-xs font-bold bg-white/[0.03] text-white/40">Sonuç ekranı açıldı →</div>
                  )}

                  <button onClick={nextClip} disabled={!currentClip} className="mt-4 w-full h-10 rounded-lg bg-[#ff4655] hover:bg-red-500 disabled:opacity-30 text-[11px] font-black text-white transition">▷ Pas & Sıradaki Klip</button>

                  {/* YENİ (istek): rütbe tahmininden sonra tam ekran sonuç modalı — referans
                      tasarımdaki gibi büyük ikon, gerçek rütbe, oyuncu tahminleri dağılımı ve
                      "NEXT CLIP" butonu. Sadece tahmin yapılınca (rankGuessResult dolunca)
                      açılıyor, maç/klip bitmeden asla kendiliğinden çıkmıyor. */}
                  {rankGuessResult && currentClip && guessDistribution && createPortal(
                    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
                      <div className={`relative w-full max-w-sm rounded-2xl border overflow-hidden ${
                        rankGuessResult === "correct" ? "border-emerald-400/30 bg-[#101410]" : "border-red-500/30 bg-[#140f10]"
                      }`}>
                        <div className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl ${rankGuessResult === "correct" ? "bg-emerald-500/15" : "bg-red-500/20"}`} />
                        <div className="relative px-6 pt-8 pb-5 text-center">
                          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl font-black ${
                            rankGuessResult === "correct" ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-red-500 bg-red-500/15 text-red-400"
                          }`}>
                            {rankGuessResult === "correct" ? "✓" : "✕"}
                          </div>
                          <h2 className={`mt-4 text-xl font-black uppercase tracking-tight ${rankGuessResult === "correct" ? "text-emerald-300" : "text-red-400"}`}>
                            {rankGuessResult === "correct" ? "Doğru Tahmin!" : "Yanlış Tahmin!"}
                          </h2>

                          <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-white/40">Gerçek Rütbe</p>
                          <div className="mt-2 flex flex-col items-center gap-1.5">
                            <span className="relative w-12 h-12"><Image src={RANK_ICONS.find((r) => normalizeRank(r.label) === normalizeRank(currentClip.rank))?.img || "/demir.png"} alt={displayRank(currentClip.rank)} fill className="object-contain" /></span>
                            <p className="text-sm font-black text-white">{displayRank(currentClip.rank)}</p>
                          </div>

                          <p className="mt-6 mb-2 text-[10px] font-black uppercase tracking-widest text-white/40">Oyuncu Tahminleri ({guessTotalCount})</p>
                          <div className="space-y-1.5">
                            {guessDistribution.map((g) => {
                              const isActual = normalizeRank(g.label) === normalizeRank(currentClip.rank);
                              return (
                                <div key={g.label} className="flex items-center gap-2 text-left">
                                  <span className="relative w-4 h-4 flex-shrink-0"><Image src={g.img} alt={g.label} fill className="object-contain" /></span>
                                  <span className={`w-14 flex-shrink-0 text-[10px] font-bold truncate ${isActual ? "text-emerald-300" : "text-white/50"}`}>{g.label}</span>
                                  <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                                    <div className={`h-full rounded-full ${isActual ? "bg-emerald-400" : "bg-white/25"}`} style={{ width: `${guessTotalCount ? Math.max((g.count / guessTotalCount) * 100, 2) : 0}%` }} />
                                  </div>
                                  <span className={`w-8 flex-shrink-0 text-right text-[10px] font-black ${isActual ? "text-emerald-300" : "text-white/40"}`}>{g.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="relative px-6 pb-6">
                          <button onClick={nextClip} className="w-full h-11 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-white transition flex items-center justify-center gap-1.5">
                            ▷ Sıradaki Klip
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {currentClip && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-[#14151a] to-[#1b151a] px-4 py-3">
                  <span className="text-[11px] font-bold text-white/55">Klip #{rankClipIndex + 1}</span>
                  <div className="flex items-center gap-2">
                    {/* YENİ (istek): rank tahmindeki klibi şikayet etme butonu */}
                    <button
                      onClick={() => reportContent("rank_clip", currentClip.id, "klip")}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition"
                      title="Bu klibi şikayet et"
                    >
                      {t("reportButton")}
                    </button>
                    <button onClick={shareClip} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/70 hover:bg-white/10 hover:text-white transition">Bağlantıyı Kopyala</button>
                  </div>
                </div>
              )}
              {/* DÜZELTME (istek): "şu alttaki çubuğun altına küçük ve saydam bir şekilde
                  bu uyarıyı yaz" */}
              <p className="mt-2 text-center text-[10px] text-white/25">Tüm kliplerin hakları sahiplerine aittir. Videolar YouTube üzerinden gömülü olarak gösterilmektedir.</p>
            </div>
            );
          })()}

          {/* KLİP PAYLAŞMA PENCERESİ — DÜZELTME: diğer modallerdeki (nişangah, forum gönderi,
              lobi) aynı createPortal çözümü burada da kullanıldı, "transform-gpu" ata elemanı
              yüzünden ekranın yanlış yerinde açılmasın diye. */}
          {isRankUploadOpen && typeof document !== "undefined" && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsRankUploadOpen(false)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden bg-gradient-to-b from-[#1b1c24] to-[#111216] border border-white/10 rounded-2xl p-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
                <h2 className="text-sm font-black uppercase tracking-tight text-white">Klip Paylaş</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">YouTube veya doğrudan video bağlantısı ekle. Yalnızca geçerli video bağlantıları paylaşılabilir.</p>
                <input
                  value={rankUploadUrl}
                  onChange={(e) => setRankUploadUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-xs font-bold text-white placeholder:text-white/25 focus:border-[#ff4655]/60 focus:outline-none"
                />
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Gerçek rütbeyi seç</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {RANK_ICONS.map((r) => (
                    <button key={r.label} type="button" onClick={() => setRankUploadRank(r.label)} className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[9px] font-black transition ${rankUploadRank === r.label ? "border-[#ff4655] bg-[#ff4655]/15 text-white shadow-[0_0_18px_rgba(255,70,85,0.22)]" : "border-white/10 bg-black/20 text-white/55 hover:border-white/25 hover:text-white"}`}>
                      <span className="relative h-7 w-7"><Image src={r.img} alt="" fill className="object-contain" /></span>
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setIsRankUploadOpen(false)} className="flex-1 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-black text-white/60 hover:text-white transition">Vazgeç</button>
                  <button onClick={submitRankClip} className="flex-1 h-10 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black text-white transition">Paylaş</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      );
    })()}
  </motion.section>
)}

{/* ===== SKİN SAVAŞI =====
    DÜZELTME (ASIL BUG — "skinler çekilmiyor"): eskiden bu sekme skinCatalog'u (yukarıda
    valorant-api.com'dan gerçek skin adı + görseliyle çekilen liste) HİÇ kullanmıyordu; sabit
    2 kurgusal eşleşmeyi ("fights" dizisi) emoji ikonlarıyla gösteriyordu. Artık: 1) bir
    "Voting Setup" ekranı ile silah + havuz boyutu seçiliyor, 2) skinCatalog'dan gerçek
    görsellerle rastgele ikili eşleşmeler (bracket) üretiliyor, 3) her eşleşmede kazanan
    seçilince kısa bir 🏆 rozet animasyonu oynayıp otomatik sıradaki eşleşmeye geçiyor. */}
{activeTab === "skin-war" && (
  <motion.section key="skin-war-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 min-h-screen pt-40 px-6 pb-20 text-center transform-gpu">
    {(() => {
      // DÜZELTME (ASIL BUG — "Vandal/Phantom/Operator seçince 0 skin bulundu"): silah listesi
      // eskiden elle yazılmış SABİT bir dizi idi ("Vandal", "Phantom" ...). Ama filtreleme
      // gerçek API'den gelen skin.weapon değeriyle YAPILIYOR; API tarafındaki gerçek değer bu
      // sabit metinlerle birebir eşleşmeyince (örn. görünmez boşluk/farklı biçim) o silah için
      // liste hep boş kalıyordu. Artık silah listesi doğrudan ÇEKİLEN KATALOGDAN türetiliyor —
      // DÜZELTME (istek): "o kadar silah ekle demedim, sadece Vandal, Bıçak, Operator, Ghost,
      // Sheriff, Classic, Phantom olsa yeter" — önceki hali skinCatalog'da bulunan TÜM silah
      // tiplerini (Shorty, Frenzy, Stinger, Bucky, Judge, Bulldog, Guardian, Marshal, Ares,
      // Odin...) otomatik sekme yapıyordu. Artık sabit, istenen 7 silahlık liste kullanılıyor.
      const WEAPON_OPTIONS: { key: string; label: string }[] = [
        { key: "Vandal", label: "Vandal" },
        { key: "Phantom", label: "Phantom" },
        { key: "Bıçak", label: "Bıçak" },
        { key: "Sheriff", label: "Sheriff" },
        { key: "Classic", label: "Classic" },
        { key: "Operator", label: "Operator" },
        { key: "Ghost", label: "Ghost" },
      ];
      const POOL_SIZES: { key: number | "all"; label: string }[] = [
        { key: "all", label: "Tüm Skinler" },
        { key: 16, label: "Top 16" },
        { key: 32, label: "Top 32" },
        { key: 64, label: "Top 64" },
      ];

      // DÜZELTME (istek): skin adları artık veri kaynağında (fetch mapping'de) Title Case'e
      // çevriliyor — bkz. yukarıdaki useEffect içindeki toTitleCase.
      const filteredPool = skinCatalog
        .filter((s) => s.weapon === skinWeapon)
        .filter((s) => s.name.toLowerCase().includes(skinSearch.trim().toLowerCase()))
        .sort((a, b) => b.votes - a.votes);

      // DÜZELTME (istek): "savaşı başlatma butonu arama kutusuna bağlı olmamalı" — arama kutusu
      // sadece kurulum ekranında belirli bir skini bulmak/önizlemek için var; savaş HER ZAMAN
      // seçili silahın TÜM skinleriyle başlıyor, arama metni havuzu daraltmıyor. Önceden arama
      // kutusundaki metin (örn. "kaos") doğrudan savaş havuzunu da filtrelediği için, tek eşleşme
      // varsa (2'den az skin) savaş hiç başlamıyordu.
      const weaponPool = Array.from(
        new Map(skinCatalog.filter((s) => s.weapon === skinWeapon).map((s) => [s.id, s])).values()
      ).sort((a, b) => b.votes - a.votes);

      // Bir skin havuzunu karıştırıp eşleşme (pair) listesine çeviren yardımcı fonksiyon.
      // Havuz tek sayıdaysa son kalan skin "bay" geçer (rakipsiz otomatik tur atlar) —
      // eskiden tek sayı olunca son skin sessizce havuzdan DÜŞÜYORDU, artık kimse elenmeden
      // adil şekilde bir sonraki roundda yer alıyor.
      const buildPairs = (pool: typeof filteredPool) => {
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const pairs: (typeof shuffled[number] | null)[][] = [];
        for (let i = 0; i < shuffled.length - 1; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
        if (shuffled.length % 2 === 1) pairs.push([shuffled[shuffled.length - 1], null]); // bay geçen skin
        return pairs;
      };

      // DÜZELTME (ASIL BUG — "oylar liderlik tablosunu etkilemiyor"): Skin katalogu sayfa
      // açılır açılmaz valorant-api.com'dan çekiliyor ama bu çekme işlemi birkaç yüz ms
      // sürüyor. O süre boyunca skinCatalog hâlâ SAHTE/yer tutucu (placeholder) skinlerle
      // dolu ("prime-vandal" gibi uydurma id'ler). Eğer kullanıcı gerçek katalog gelmeden
      // "Oylamayı Başlat"a basarsa, oylar bu SAHTE id'lere kaydediliyordu; birkaç saniye
      // sonra gerçek katalog (gerçek UUID'lerle) skinCatalog'u DEĞİŞTİRİNCE, o sahte id'ler
      // artık hiçbir skine karşılık gelmiyor ve verdiğin oylar sessizce kayboluyordu.
      // Artık katalog yüklenene kadar oylama hiç başlatılamıyor.
      const startVoting = () => {
        if (!requireLogin()) return;
        if (skinCatalogLoading) return;
        discardPendingSkinStats(); // yeni turnuva — önceki oturumdan kalma bir şey yok, temiz başla
        const size = skinBracketSize === "all" ? weaponPool.length : Math.min(skinBracketSize, weaponPool.length);
        const pool = weaponPool.slice(0, size);
        setSkinBracketPairs(buildPairs(pool));
        setSkinBattleIndex(0);
        setSkinRoundNumber(1);
        setSkinBattleDone(false);
        setSkinWinnerFlash(null);
        setSkinTotalPool(size); // YENİ: turnuva boyunca sabit kalan toplam seçim hedefi
        setSkinCumulativePicks(0);
        setIsSkinBattleOpen(true);
      };

      const currentPair = skinBracketPairs[skinBattleIndex];
      const totalPairs = skinBracketPairs.length;

      const goNext = () => {
        if (skinBattleIndex + 1 >= totalPairs) setSkinBattleDone(true);
        else setSkinBattleIndex((i) => i + 1);
      };

      const selectWinner = (skin: { id: string }, rival: { id: string } | null) => {
        if (skinWinnerFlash) return;
        setSkinVotes((votes) => ({ ...votes, [skin.id]: (votes[skin.id] || 0) + 1 }));
        recordSkinMatch(skin.id, rival ? rival.id : null);
        setSkinWinnerFlash(skin.id);
        setSkinCumulativePicks((c) => c + 1); // YENİ: toplam ilerleme sadece GERÇEK seçimlerde artar
        playCorrectSound();
        // YENİ (istek): "seçim animasyonu spamlanıyor gibi oluyor, biraz daha uzun sürebilir" —
        // 850ms çok kısaydı, kazanan/kaybeden animasyonunu görmeye yetecek kadar uzatıldı.
        setTimeout(() => { setSkinWinnerFlash(null); goNext(); }, 1700);
      };

      // DÜZELTME (istek — "atlayı öyle yapmaman lazım, gaia kuroanmıyı atla dedi ya oyuncu
      // gaianın başka biriyle eşleşmesi lazım, sıkıntı olan eşleşme ZAMANI değildi"): bir önceki
      // hâlim (aynı Gaia-Kuroan eşleşmesini kuyrukta ERTELEMEK) yanlış anlaşılmıştı — atlama,
      // "bu eşleşmeyi SONRA tekrar sor" değil, "Gaia'yı BAŞKA bir skinle eşleştir" anlamına
      // geliyor. Artık: mevcut eşleşmedeki A (Gaia), henüz oynanmamış BAŞKA bir eşleşmedeki
      // rastgele bir skinle (C) TAKAS EDİLİYOR — yani A artık C ile eşleşiyor (aynı anda,
      // hemen, sırada), eski rakip B (Kuroan) ise C'nin eski rakibi D ile eşleşiyor. Böylece
      // round'daki her skin yine tam olarak bir eşleşmede kalıyor (kimse kaybolmuyor/çoğalmıyor),
      // ama Gaia bir daha Kuroan'la eşleşmeden yepyeni bir rakiple karşına çıkıyor.
      const skipPair = () => {
        if (skinWinnerFlash) return;
        const current = skinBracketPairs[skinBattleIndex];
        if (!current || !current[0] || !current[1]) return; // "bay" geçen eşleşmede atlanacak bir şey yok
        playClickSound();
        setSkinBracketPairs((prev) => {
          const [a, b] = prev[skinBattleIndex];
          // Takas edilecek, İKİ TARAFI da dolu (bay olmayan), henüz oynanmamış başka bir eşleşme ara.
          const candidateIndexes: number[] = [];
          for (let i = skinBattleIndex + 1; i < prev.length; i++) {
            const pair = prev[i];
            if (pair && pair[0] && pair[1]) candidateIndexes.push(i);
          }
          if (candidateIndexes.length === 0) return prev; // takas edilecek başka uygun eşleşme yok
          const swapIdx = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
          const [c, d] = prev[swapIdx];
          const next = [...prev];
          if (Math.random() < 0.5) {
            next[skinBattleIndex] = [a, c];
            next[swapIdx] = [b, d];
          } else {
            next[skinBattleIndex] = [a, d];
            next[swapIdx] = [b, c];
          }
          return next;
        });
      };

      const backToLeaderboard = () => {
        setIsSkinBattleOpen(false);
        setSkinBattleDone(false);
        setSkinBracketPairs([]);
        setSkinBattleIndex(0);
        setSkinRoundNumber(1);
        setSkinWinnerFlash(null);
        setSkinTotalPool(0);
        setSkinCumulativePicks(0);
        setSkinView("leaderboard");
      };

      // ===== ROUND BİTİNCE =====
      // YENİ (istek): "round 1'den 2'ye geçişte araya bir ekran girmesin" — bir sonraki
      // round'a geçiş artık yukarıdaki useEffect içinde OTOMATİK yapılıyor (kullanıcı hiçbir
      // butona basmıyor). Burada sadece iki durum kalıyor: 1) hâlâ birden fazla kazanan varsa
      // (efekt zaten yeni round'u anında hazırlıyor) hiçbir şey göstermeden bekle — arada
      // görünecek bir "Round Tamamlandı" ekranı YOK; 2) tek şampiyon kaldıysa şampiyon
      // ekranını göster.
      if (isSkinBattleOpen && skinBattleDone) {
        const winners = skinBracketPairs
          .map(([a, b]) => (!b ? a : (skinVotes[a!.id] || 0) >= (skinVotes[b.id] || 0) ? a : b))
          .filter((s): s is NonNullable<typeof s> => !!s);

        if (winners.length > 1) {
          // Yeni round efekt tarafından bir sonraki tickte otomatik kuruluyor — burada hiçbir
          // ara ekran göstermeden bekliyoruz (interstitial yok).
          return null;
        }

        // ===== ŞAMPİYON EKRANI (tek skin kalınca) =====
        // YENİ (istek): "kazanma ekranını daha efsane yap" — referans tasarımdaki gibi çok daha
        // büyük/kalın italik başlık, kartın çevresinde kırmızı parıltılı çerçeve, altın taç
        // rozeti ve daha dramatik bir kompozisyon.
        const champion = winners[0];
        return (
          <div className="max-w-lg mx-auto">
            <h1 className="text-5xl sm:text-6xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,70,85,0.35)]">Şampiyon</h1>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Yoğun oylamanın ardından favori skinin belli oldu:</p>

            <div className="relative mt-8 rounded-2xl border-2 border-[#ff4655] bg-gradient-to-b from-[#ff4655]/15 via-[#14151a] to-[#14151a] p-7 shadow-[0_0_45px_rgba(255,70,85,0.3)]">
              <div className="h-48 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden">
                {champion?.image ? <img src={champion.image} alt={champion.name} className="max-h-full max-w-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]" /> : <span className="text-5xl opacity-30">✦</span>}
              </div>
              <motion.span
                className="mt-5 block text-4xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                👑
              </motion.span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black italic uppercase text-white">{champion?.name}</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">{skinWeapon} kaplaması</p>
            </div>
            {/* YENİ (istek): "tekrar oyna" seçeneği eklendi — bu buton direkt yeni bir tur
                başlatmak yerine, silah/havuz seçimini değiştirebilsin diye SETUP (Vandal/
                Ghost/Operator... seçim) ekranına götürüyor. */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button onClick={backToLeaderboard} className="h-12 px-6 rounded-lg bg-[#ff4655] hover:bg-red-500 text-xs font-black uppercase tracking-wide text-white transition shadow-[0_0_20px_rgba(255,70,85,0.35)]">🏆 Sıralamayı Gör</button>
              <button
                onClick={() => {
                  setIsSkinBattleOpen(false);
                  setSkinBattleDone(false);
                  setSkinBracketPairs([]);
                  setSkinBattleIndex(0);
                  setSkinRoundNumber(1);
                  setSkinWinnerFlash(null);
                  setSkinTotalPool(0);
                  setSkinCumulativePicks(0);
                  setSkinView("setup");
                }}
                className="h-12 px-6 rounded-lg bg-white/10 hover:bg-white hover:text-black text-xs font-black uppercase tracking-wide text-white transition"
              >
                ↻ Yeni Oturum
              </button>
            </div>
          </div>
        );
      }

      // ===== FACE-OFF (KARŞILAŞMA) EKRANI =====
      if (isSkinBattleOpen && currentPair && currentPair[1]) {
        const [skinA, skinB] = currentPair as [{ id: string; name: string; weapon: string; image: string | null }, { id: string; name: string; weapon: string; image: string | null }];
        // DÜZELTME (istek): kart artık SADECE skinin görselini ve ismini gösteriyor — silah
        // tipi alt yazısı ve "BUNU SEÇ" ipucu metni kaldırıldı (referans görsellerdeki gibi
        // sade). Kartın TAMAMI hâlâ tıklanabilir bir <button>; üstüne gelince/tıklanınca
        // ÇERÇEVENİN TAMAMI parlak kırmızı bir çizgiyle çevreleniyor (referans görseldeki
        // gibi), ayrı bir buton ya da bekleme yok.
        const renderCard = (skin: typeof skinA, rival: typeof skinB) => {
          const isWinner = skinWinnerFlash === skin.id;
          const isLoser = !!skinWinnerFlash && skinWinnerFlash !== skin.id;
          return (
            <button
              type="button"
              onClick={() => selectWinner(skin, rival)}
              disabled={!!skinWinnerFlash}
              className={`group relative w-full rounded-3xl border-2 p-6 text-left transition-all duration-300 cursor-pointer disabled:cursor-not-allowed ${
                isWinner
                  ? "border-emerald-400 bg-emerald-500/10 scale-[1.05] shadow-[0_0_35px_rgba(52,211,153,0.3)]"
                  : isLoser
                  ? "border-red-500/15 bg-[#14151a]/50 opacity-40 scale-[0.96]"
                  : "border-white/10 bg-gradient-to-b from-[#1b1c22] to-[#101116] hover:border-[#ff4655] hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(255,70,85,0.35)]"
              }`}
              style={isLoser ? { animation: "shake 0.4s ease-in-out" } : undefined}
            >
              {isWinner && <span className="absolute -top-3 -right-3 text-3xl drop-shadow-lg animate-bounce">🏆</span>}
              {isLoser && <span className="absolute -top-3 -right-3 text-2xl drop-shadow-lg">✕</span>}
              <style>{`@keyframes shake { 0%, 100% { transform: translateX(0) scale(0.96); } 20% { transform: translateX(-5px) scale(0.96); } 40% { transform: translateX(5px) scale(0.96); } 60% { transform: translateX(-3px) scale(0.96); } 80% { transform: translateX(3px) scale(0.96); } }`}</style>
              <div className="h-44 rounded-xl border border-white/10 bg-black/25 flex items-center justify-center overflow-hidden">
                {skin.image ? (
                  <img src={skin.image} alt={skin.name} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <span className="text-5xl opacity-30">✦</span>
                )}
              </div>
              <p className="mt-5 text-lg font-black text-white text-center">{skin.name}</p>
              {/* YENİ (istek): "altında BUNU SEÇ yazısı küçük çerçevenin içinde olsun, çerçeveye
                  tıklanınca seçsin" — kart zaten tamamen tıklanabilir bir <button>, bu artık
                  ayrı bir buton değil, sadece küçük bir görsel ipucu rozeti. */}
              <span className="mt-3 mx-auto block w-fit rounded-md border border-white/15 group-hover:border-[#ff4655]/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition">
                {isWinner ? "✓ Seçildi" : "Bunu Seç"}
              </span>
            </button>
          );
        };
        return (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* DÜZELTME (istek): "Sıralamaya Dön" biraz büyütüldü ve daha açık/parlak bir
                  beyazla yazıldı (eskiden çok soluk duran text-white/40 yerine text-white/70). */}
              {/* DÜZELTME (istek): "tamamlanmadan menüye dönülen skin savaşı seçim istatistikleri
                  liderlik tablosuna yansımasın... onaylıyor musun uyarısı çıksın" — bu buton
                  turnuva HENÜZ bitmemişken (bu render dalı zaten sadece o durumda gösteriliyor)
                  artık doğrudan çıkmıyor, önce ortak onay penceresini açıyor. */}
              <button onClick={() => setExitConfirm({ kind: "skin-war", targetTab: null })} className="text-xs font-black text-white/70 hover:text-white transition">{t("skinWarBackToLeaderboard")}</button>
              {/* DÜZELTME (istek): round numarası kaldırıldı, sade bir başlık kaldı; başlık da
                  daha açık/parlak bir beyazla yazılıyor. */}
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Valorant Skin Savaşı</p>
              {/* DÜZELTME (istek): burada artık sadece o roundun eşleşme sayısı (örn. "8")
                  değil, TÜM turnuva boyunca yapılacak toplam seçim sayısı gösteriliyor
                  (örn. Top 16 seçildiyse hedef "16"). Round değiştikçe SIFIRLANMIYOR. */}
              <div className="rounded-lg border border-[#ff4655]/30 bg-[#ff4655]/10 px-3 py-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#ff4655]">İlerleme</p>
                <p className="text-xs font-black text-white">{skinCumulativePicks} / {skinTotalPool}</p>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-[#ff4655] transition-all duration-300" style={{ width: `${skinTotalPool > 0 ? Math.min(100, (skinCumulativePicks / skinTotalPool) * 100) : 0}%` }} />
            </div>

            {/* DÜZELTME (istek): VS rozeti artık gerçekten iki kart arasında ortalanmış.
                Eskiden [skinA, skinB].map(...) İKİ eleman üretiyordu, VS ise bunlardan SONRA
                ayrı bir 3. eleman olarak ekleniyordu — grid-cols-[1fr_auto_1fr] düzeninde bu,
                sırayı skinA / skinB(ortadaki dar sütuna sıkışmış) / VS(en sağda) haline
                getiriyordu. Artık kart, VS, kart sırasıyla AÇIKÇA 3 ayrı JSX elemanı olarak
                yazılıyor — hiçbir zaman yanlış sütuna düşemez. */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
              {renderCard(skinA, skinB)}
              {/* YENİ (istek): "VS yazısının stilini değiştir" — daha büyük, italik/kalın yazı,
                  eskiden üst üste binen "ping" + "wave" animasyonları sadeleştirilip TEK bir
                  yumuşak nabız animasyonuna indirildi (referans görseldeki gibi daha sakin/temiz
                  bir rozet). */}
              <div className="relative mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#ff4655] bg-white text-lg font-black italic text-black shadow-[0_0_24px_rgba(255,70,85,0.4)]" style={{ animation: "vsPulse 1.8s ease-in-out infinite" }}>
                <style>{`@keyframes vsPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(255,70,85,0.4); } 50% { transform: scale(1.06); box-shadow: 0 0 34px rgba(255,70,85,0.6); } }`}</style>
                <span>VS</span>
              </div>
              {renderCard(skinB, skinA)}
            </div>

            {/* DÜZELTME (istek): "Bu Eşleşmeyi Atla" artık sade bir yazı değil, gerçek bir
                buton görünümünde (çerçeveli, dolgulu, hover'da belirginleşen). */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={skipPair}
                disabled={!!skinWinnerFlash}
                className="h-9 px-5 rounded-lg border border-white/15 bg-white/5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Bu Eşleşmeyi Atla ↻
              </button>
            </div>
          </div>
        );
      }

      // NOT: "SETUP" ekranı artık ayrı bir tam sayfa DEĞİL — aşağıda liderlik tablosunun
      // ÜSTÜNDE açılan bir MODAL (pop-up) olarak render ediliyor (bkz. dosyanın sonu).
      // Böylece hem silah SEÇİMİ hem havuz boyutu aynı anda, tek bir dikey pencerede
      // görünüyor ve arkadaki liderlik tablosu bulanıklaşarak görünmeye devam ediyor.

      // ===== SIRALAMA (leaderboard) EKRANI — sekmeye girince ilk görülen ekran =====
      // DÜZELTME (istek): eski liderlik tablosu "çok kötüydü" — artık referans tasarıma
      // (RANK / SKIN ASSET / IDENTIFICATION / RANKING sütunları, büyük görsel kutusu, silah
      // rozeti, win rate + toplam oy, kırmızı/yeşil "ranking" barı, üstte arama kutusu) çok
      // daha yakın. "score" (RANKING) sütunu basit bir puanlama: kazanılan/kaybedilen maç
      // oranına göre 0-1000 arası bir gösterge puanı.
      const rankedPool = filteredPool
        .map((s) => {
          const stat = skinStats[s.id];
          const matches = stat?.matches || 0;
          const wins = stat?.wins || 0;
          const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
          const score = matches > 0 ? Math.max(0, Math.min(999, Math.round(500 + wins * 14 - (matches - wins) * 7))) : 500;
          return { ...s, matches, wins, winRate, score };
        })
        .sort((a, b) => (b.score - a.score) || (b.matches - a.matches));
      const RANK_BADGE = ["bg-amber-400 text-black", "bg-white/80 text-black", "bg-orange-400/80 text-black"];
      const skinTotalPages = Math.max(1, Math.ceil(rankedPool.length / SKIN_PER_PAGE));
      const skinSafePage = Math.min(skinLeaderboardPage, skinTotalPages);
      const pagedPool = rankedPool.slice((skinSafePage - 1) * SKIN_PER_PAGE, skinSafePage * SKIN_PER_PAGE);

      return (
        <>
        <div className="max-w-4xl mx-auto text-left">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t("skinWarTitle")}</h1>
                <p className="text-[11px] text-white/40 mt-0.5">{t("skinWarSubtitle", { weapon: skinWeapon })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={skinSearch}
                onChange={(e) => setSkinSearch(e.target.value)}
                placeholder="Skin ara…"
                className="h-10 w-40 sm:w-56 rounded-lg border border-white/10 bg-black/30 px-3.5 text-xs font-bold text-white placeholder:text-white/25 focus:border-[#ff4655]/50 focus:outline-none"
              />
              <button
                onClick={() => setSkinView("setup")}
                className="h-10 px-5 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-white transition whitespace-nowrap"
              >
                ⚔ Oylamaya Başla
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 mb-5">
            {WEAPON_OPTIONS.map((w) => (
              <button
                key={w.key}
                onClick={() => setSkinWeapon(w.key)}
                className={`h-8 px-3.5 rounded-lg text-[10px] font-black uppercase transition ${
                  skinWeapon === w.key ? "bg-[#ff4655] text-white" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#14151a]/90 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[52px_140px_1fr_140px] items-center gap-4 px-5 py-3 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30">
              <span>Sıra</span>
              <span>Görsel</span>
              <span>Skin</span>
              <span className="text-right">Ranking</span>
            </div>
            {skinCatalogLoading ? (
              <p className="p-8 text-xs text-white/40 text-center">Skinler yükleniyor…</p>
            ) : rankedPool.length === 0 ? (
              <p className="p-8 text-xs text-white/40 text-center">Bu silah için skin bulunamadı.</p>
            ) : (
              pagedPool.map((skin, pagedI) => {
                const i = (skinSafePage - 1) * SKIN_PER_PAGE + pagedI;
                // DÜZELTME (istek): "az şöyle çekici efsane bi kart bekliyordum, arkaplanlı
                // dekorlu... sen renk atıp geçmişsin" — düz bir renk geçişi yerine, ilk 3 sıraya
                // artık sitenin geri kalanındaki (sakura/torii) Japon temasıyla uyumlu, GERÇEK
                // dekoratif bir arkaplan + hafif animasyon eklendi: 1. sıraya parıldayan altın
                // ışın patlaması, 2.'ye ay ışığında titreşen yıldızlar, 3.'e sıcak fener parıltısı.
                // DÜZELTME (istek): "kart tasarımları daha etkileyici renklerle dekorlarla
                // arkaplanlarla olabilir, önceki hal çok kötü" — sıradan bir renk geçişi/ince
                // kenarlık yerine ilk 3 sıraya artık belirgin şekilde daha zengin bir "kart"
                // hissi: daha koyu/doygun gradyan gövde, madalya renginde parlayan tam kenarlık
                // (sadece sol değil), ve hafif iç gölge ile derinlik.
                const topRowBg =
                  i === 0
                    ? "bg-gradient-to-r from-amber-400/25 via-amber-500/10 to-transparent border border-amber-400/50 shadow-[inset_0_1px_0_rgba(251,191,36,0.25),0_0_24px_-6px_rgba(251,191,36,0.35)] rounded-xl my-1.5"
                    : i === 1
                    ? "bg-gradient-to-r from-slate-300/20 via-slate-300/8 to-transparent border border-slate-300/40 shadow-[inset_0_1px_0_rgba(226,232,240,0.2),0_0_18px_-6px_rgba(226,232,240,0.25)] rounded-xl my-1.5"
                    : i === 2
                    ? "bg-gradient-to-r from-orange-400/20 via-orange-500/8 to-transparent border border-orange-400/40 shadow-[inset_0_1px_0_rgba(251,146,60,0.2),0_0_18px_-6px_rgba(251,146,60,0.3)] rounded-xl my-1.5"
                    : "";
                const topDecoration =
                  i === 0 ? (
                    <>
                      <motion.div
                        className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl"
                        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.12, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* DÜZELTME (istek): "kart çok kötü duruyor" — ışınlar eskiden satırın
                          DİKEY ORTASINDA ("top-1/2"), yani tam da RANKING sayısının üstünde
                          duruyordu ve rakamın içinden geçiyormuş gibi görünüyordu. Artık üst
                          kenara yaslı, daha küçük ve puanla asla çakışmıyor. */}
                      <svg className="pointer-events-none absolute right-20 -top-3 w-14 h-14 opacity-20" viewBox="0 0 100 100">
                        {[0, 30, 60, 90, 120, 150].map((deg) => (
                          <rect key={deg} x="49" y="4" width="2" height="24" fill="#fbbf24" transform={`rotate(${deg} 50 50)`} />
                        ))}
                      </svg>
                    </>
                  ) : i === 1 ? (
                    <>
                      <div className="pointer-events-none absolute -right-6 -top-8 w-28 h-28 rounded-full bg-slate-200/10 blur-xl" />
                      <svg className="pointer-events-none absolute right-20 top-2 w-8 h-8 opacity-25" viewBox="0 0 40 40" fill="none">
                        <path d="M22 4 A14 14 0 1 0 24 32 A11 11 0 0 1 22 4 Z" fill="#e2e8f0" />
                      </svg>
                      {[[92, 8], [108, 16], [80, 20]].map(([x, y], idx) => (
                        <motion.svg key={idx} className="pointer-events-none absolute w-1.5 h-1.5" style={{ right: `${x}px`, top: `${y}px` }} viewBox="0 0 8 8"
                          animate={{ opacity: [0.15, 0.7, 0.15] }} transition={{ duration: 1.8, delay: idx * 0.5, repeat: Infinity, ease: "easeInOut" }}>
                          <circle cx="4" cy="4" r="2" fill="#e2e8f0" />
                        </motion.svg>
                      ))}
                    </>
                  ) : i === 2 ? (
                    <>
                      <div className="pointer-events-none absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-orange-400/15 blur-2xl" />
                      <svg className="pointer-events-none absolute right-16 -top-2 w-7 h-11 opacity-25" viewBox="0 0 30 46" fill="none">
                        <ellipse cx="15" cy="20" rx="13" ry="16" fill="#fb923c" />
                        <rect x="13" y="2" width="4" height="8" rx="1.5" fill="#fb923c" />
                        <rect x="13" y="38" width="4" height="8" rx="1.5" fill="#fb923c" />
                      </svg>
                      <motion.div
                        className="pointer-events-none absolute right-16 -top-2 w-7 h-11 rounded-[50%] bg-orange-300/15 blur-md"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </>
                  ) : null;
                return (
                <div key={skin.id} className={`group relative overflow-hidden grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[52px_140px_1fr_140px] items-center gap-4 px-5 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors duration-300 ${topRowBg} ${i < 3 ? "hover:border-[#ff4655]/70" : ""}`}>
                  {topDecoration}
                  <span className={`relative flex-shrink-0 rounded-lg flex items-center justify-center font-black ${i < 3 ? `${RANK_BADGE[i]} w-10 h-10 text-sm shadow-lg` : "bg-white/5 text-white/40 w-8 h-8 text-xs"}`}>
                    {i === 0 && (
                      <motion.span
                        className="absolute -top-4 text-base"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        👑
                      </motion.span>
                    )}
                    {i + 1}
                  </span>
                  {/* YENİ (istek): "ilk 3'te vandal olan çerçeveye mouse götürülünce kenarlar
                      kırmızılaşsın, skin büyüsün" — üstteki satır zaten hover'da kırmızıya
                      dönüyor (grup), görsel kutusu da group-hover ile hafifçe büyüyor. */}
                  {/* DÜZELTME (istek): "silah kartları çok kötü görünüyor / görsel boş kutu
                      olarak duruyor" — asıl sebep: içindeki <img> "absolute inset-0" ile
                      konumlanıyordu ama bu kutuda "relative" YOKTU, yani görsel bu kutunun değil
                      sayfadaki en yakın konumlanmış üst elemanın içine göre yerleşiyor ve
                      pratikte görünmez oluyordu. "relative" eklendi. */}
                  <div className={`relative rounded-lg bg-black/30 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 ${
                    i === 0 ? "w-32 h-20 border-2 border-amber-400/60 shadow-[0_0_20px_-4px_rgba(251,191,36,0.5)] group-hover:border-[#ff4655] group-hover:scale-110 group-hover:shadow-[0_0_24px_-4px_rgba(255,70,85,0.6)]"
                    : i === 1 ? "w-32 h-20 border-2 border-slate-300/50 shadow-[0_0_16px_-4px_rgba(226,232,240,0.4)] group-hover:border-[#ff4655] group-hover:scale-110 group-hover:shadow-[0_0_24px_-4px_rgba(255,70,85,0.6)]"
                    : i === 2 ? "w-32 h-20 border-2 border-orange-400/50 shadow-[0_0_16px_-4px_rgba(251,146,60,0.45)] group-hover:border-[#ff4655] group-hover:scale-110 group-hover:shadow-[0_0_24px_-4px_rgba(255,70,85,0.6)]"
                    : "w-28 h-16 border border-white/10"
                  }`}>
                    {skin.image ? (
                      <>
                        <span className="text-lg opacity-40 skin-img-fallback">✦</span>
                        <img
                          src={skin.image}
                          alt={skin.name}
                          className="w-full h-full object-contain absolute inset-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          onLoad={(e) => {
                            const fallback = (e.currentTarget.parentElement as HTMLElement)?.querySelector(".skin-img-fallback") as HTMLElement | null;
                            if (fallback) fallback.style.display = "none";
                          }}
                        />
                      </>
                    ) : <span className="text-lg opacity-40">✦</span>}
                  </div>
                  <div className="min-w-0 text-left">
                    {/* DÜZELTME (istek): "Vahşiçene Classic" tarzı Title Case istenmişti ama
                        buradaki "uppercase" class'ı adı yine tamamen büyük harfe zorluyordu —
                        veri artık zaten Title Case geldiği için bu class kaldırıldı. */}
                    <p className={`font-black text-white truncate ${i < 3 ? "text-base" : "text-sm"}`}>{skin.name}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">{skinWeapon}</span>
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />%{skin.winRate} kazanma</span>
                      <span className="text-[10px] text-white/30">{skin.matches.toLocaleString("tr-TR")} maç</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-[#ff4655]">{skin.score}</p>
                    <div className="mt-1 h-1 w-full min-w-[80px] rounded-full bg-red-900/40 overflow-hidden ml-auto">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.round((skin.score / 999) * 100)}%` }} />
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* YENİ (istek): "sadece 20 skin gözüküyor" — artık nişangahlardaki gibi altta
              1, 2, 3… sayfa numaraları var, TÜM skinler (seçili silaha göre) gezilebiliyor. */}
          {skinTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8">
              <button
                onClick={() => setSkinLeaderboardPage((p) => Math.max(1, p - 1))}
                disabled={skinSafePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-colors duration-150"
                aria-label="Önceki sayfa"
              >
                ←
              </button>
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-full px-1.5 py-1.5">
                {(() => {
                  const WINDOW = 2;
                  let start = Math.max(1, skinSafePage - WINDOW);
                  let end = Math.min(skinTotalPages, skinSafePage + WINDOW);
                  if (end - start < WINDOW * 2) {
                    if (start === 1) end = Math.min(skinTotalPages, start + WINDOW * 2);
                    else if (end === skinTotalPages) start = Math.max(1, end - WINDOW * 2);
                  }
                  const pages = [];
                  for (let p = start; p <= end; p++) pages.push(p);
                  return pages.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSkinLeaderboardPage(p)}
                      className={`min-w-[2rem] h-8 px-2.5 rounded-full text-xs font-black transition-colors duration-150 ${
                        p === skinSafePage ? "bg-[#ff4655] text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ));
                })()}
              </div>
              <button
                onClick={() => setSkinLeaderboardPage((p) => Math.min(skinTotalPages, p + 1))}
                disabled={skinSafePage === skinTotalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-colors duration-150"
                aria-label="Sonraki sayfa"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* ===== SAVAŞ KURULUMU (SETUP) — YENİ: artık ayrı bir sayfa değil, dikey açılan,
            dekorlu bir MODAL (pop-up). Silah SEÇİMİ ve havuz boyutu artık AYNI pencerede,
            birlikte görünüyor — eskiden silah seçme adımı gösterilmiyormuş gibi görünen
            sorun buradan kaynaklanıyordu. */}
        {skinView === "setup" && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSkinView("leaderboard")}>
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#14151a] shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* dekoratif arkaplan parıltıları */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#ff4655]/25 blur-3xl" />
                <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl" />
              </div>

              <div className="relative flex items-start justify-between gap-3 px-6 pt-6">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#ff4655]">
                    <span>⚔</span> Savaş Kurulumu
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-white">Favori Skinini Seç</h1>
                  <p className="mt-1 text-xs text-white/45">Karşılaştırma havuzunu ayarla, tur tur elemeyle şampiyonu bul.</p>
                </div>
                <button onClick={() => setSkinView("leaderboard")} className="flex-shrink-0 text-white/40 hover:text-white transition text-lg leading-none">✕</button>
              </div>

              <div className="relative mt-6 px-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Silah Seç</p>
                <div className="flex flex-wrap gap-2">
                  {WEAPON_OPTIONS.map((w) => (
                    <button
                      key={w.key}
                      onClick={() => setSkinWeapon(w.key)}
                      className={`h-9 px-4 rounded-lg text-[11px] font-black uppercase transition ${
                        skinWeapon === w.key ? "bg-[#ff4655] text-white shadow-[0_0_16px_rgba(255,70,85,0.4)]" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Havuz Boyutu</p>
                <div className="flex flex-wrap gap-2">
                  {POOL_SIZES.map((p) => (
                    <button
                      key={String(p.key)}
                      onClick={() => setSkinBracketSize(p.key)}
                      className={`h-9 px-4 rounded-lg text-[11px] font-black uppercase transition ${
                        skinBracketSize === p.key ? "bg-[#ff4655] text-white shadow-[0_0_16px_rgba(255,70,85,0.4)]" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DÜZELTME (istek): "kaç skin bulundu" yazısı ve "Vazgeç" butonu kaldırıldı —
                  sadece tek bir net "Savaşı Başlat" butonu kaldı. Katalog hâlâ yükleniyorsa
                  buton bunu kendi metniyle belli ediyor. */}
              <div className="relative mt-6 mx-6 flex items-center justify-end border-t border-white/10 py-5">
                <button
                  onClick={startVoting}
                  disabled={skinCatalogLoading || weaponPool.length < 2}
                  className="h-11 px-6 rounded-lg bg-[#ff4655] hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black text-white transition"
                >
                  {skinCatalogLoading ? "Yükleniyor…" : "▶ Savaşı Başlat"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        </>
      );
    })()}
  </motion.section>
)}

{/* ===== KELİME OYUNU ===== */}
{activeTab === "word-game" && (
  <motion.section key="word-game-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 min-h-screen pt-40 px-6 pb-20 flex flex-col items-center text-center transform-gpu">
    {(() => {
      const entry = activeWordBank[selectedWordLetter];
      const mm = String(Math.floor(wordTimeLeft / 60)).padStart(2, "0");
      const ss = String(wordTimeLeft % 60).padStart(2, "0");
      const isOver = currentWordStatus === "correct" || currentWordStatus === "pass" || currentWordStatus === "timeout";
      const doneCount = Object.values(activeWordProgress).filter((p) => p.status === "correct" || p.status === "timeout").length;
      // YENİ (istek): "kaç saat dakika kaldığı yazsın" — bir sonraki 24 saatlik kelime setine
      // kalan süre, günlük modda okunabilir "Xs Yd" biçiminde gösteriliyor.
      const dailyRemainingMs = dailyUnlockAt ? Math.max(0, dailyUnlockAt - dailyCountdownNow) : 0;
      const dailyRemainingH = Math.floor(dailyRemainingMs / 3_600_000);
      const dailyRemainingM = Math.floor((dailyRemainingMs % 3_600_000) / 60_000);
      const dailyRemainingLabel = dailyRemainingH > 0 ? `${dailyRemainingH}s ${dailyRemainingM}d` : `${dailyRemainingM}d`;
      const correctCount = Object.values(activeWordProgress).filter((p) => p.status === "correct").length;
      const passCount = Object.values(activeWordProgress).filter((p) => p.status === "pass").length;
      const timeoutCount = Object.values(activeWordProgress).filter((p) => p.status === "timeout").length;
      const successRate = Math.round((correctCount / TR_ALPHABET_ROTATION.length) * 100);
      const selectedWordIndex = Math.max(0, TR_ALPHABET_ROTATION.indexOf(selectedWordLetter));
      const visibleWordLetters = TR_ALPHABET_ROTATION.slice(selectedWordIndex, selectedWordIndex + 6);
      const shareWordResults = () => {
        playClickSound();
        const label = wordGameMode === "unlimited" ? "Limitsiz" : "Bugün";
        const text = `İnfinity.gg Kelime Oyunu — ${label} ${correctCount}/${TR_ALPHABET_ROTATION.length} doğru (%${successRate} başarı) ⚔️`;
        if (navigator.share) navigator.share({ title: "İnfinity.gg Kelime Oyunu", text }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      };

      // DÜZELTME (istek — "kelime oyunu arayüzünde günlük moddaki sol alttaki emojileri
      // kaldır"): sahte "kaç kişi oynadı" emoji-avatar göstergesi (playedToday/avatarCount)
      // tamamen kaldırıldığı için bu değişkenlere artık gerek yok.

      // DÜZELTME (istek): "ilk defa kelime oyununa girilince böyle bir ekran verilecek... günlük
      // olan günde 1 kez oynanacak... limitsizde ise sınırsız oynanabilecek" — sekmeye girince
      // önce bu MENÜ görünüyor. Rakam/lider tamamen kozmetik (gerçek bir toplu skor backend'i
      // yok) — tarihe göre sabitlenmiş, her gün değişen ama o gün içinde HERKESE aynı görünen
      // bir simülasyon; sitedeki diğer "sahte istatistik" alanlarıyla (skin oy sayıları gibi)
      // aynı mantık.
      if (wordGameMode === "menu") {
        return (
          <div className="w-full max-w-md text-left">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">{t("wordGameTitle")}</h1>
            </div>
            <p className="text-xs text-white/40 mb-6 ml-3.5 text-left">{t("wordGameHowToPlay")}</p>

            <div className="flex flex-col gap-4 text-left">
              {/* GÜNLÜK (REKABETÇİ) — DÜZELTME (istek): "kelime oyunu menü arayüzü çok kötü
                  duruyor, güzelleştir" — kart artık kenarlıklı düz gri değil, hafif kırmızı
                  degrade zeminli, ikon parıltılı ve hover'da hafif yükseliyor; mobilde buton
                  metnin altına düşüp tam genişlik alıyor (önceden tek satıra sıkışıyordu). */}
              <div className="group relative overflow-hidden rounded-2xl border border-[#ff4655]/20 bg-gradient-to-br from-[#1a1215] to-[#14151a] p-5 transition-all duration-300 hover:border-[#ff4655]/40 hover:shadow-[0_8px_30px_-12px_rgba(255,70,85,0.35)]">
                <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#ff4655]/10 blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
                <div className="relative flex items-center flex-wrap gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4655]/25 to-[#ff4655]/5 text-base shadow-[inset_0_0_0_1px_rgba(255,70,85,0.25)]">📅</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight">{t("wordGameDailyCompetitive")}</p>
                    <p className="text-[10px] text-white/35">{t("wordGameOncePerAccount")}</p>
                  </div>
                  {dailyUnlockAt && dailyUnlockAt > dailyCountdownNow && Object.values(wordProgress).filter((p: any) => p.status !== "playing").length >= TR_ALPHABET_ROTATION.length && (
                    <span className="ml-auto rounded-full bg-[#ff4655]/10 px-2.5 py-1 text-[10px] font-black tabular-nums text-[#ff4655] whitespace-nowrap">⏱ {dailyRemainingLabel}</span>
                  )}
                </div>
                <div className="relative mt-3 w-full flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                  <span className="flex items-center gap-2 text-[11px] text-white/60">
                    <span>🏆</span> {t("wordGameTodayLeader")}{" "}
                    <span className="font-black text-white">{dailyLeaderName || t("wordGameNoLeaderYet")}</span>
                  </span>
                </div>
                <p className="relative mt-3 text-[11px] text-white/40">{t("wordGameDailyDesc", { count: TR_ALPHABET_ROTATION.length })}</p>
                {/* DÜZELTME (istek): "kelime oyunu arayüzünde günlük moddaki sol alttaki
                    emojileri kaldır" — oynayan oyuncuları temsil eden sahte emoji avatar
                    dizisi tamamen kaldırıldı, buton artık sağa yaslı. */}
                <div className="relative mt-4 flex items-center justify-end flex-wrap gap-3">
                  <button
                    disabled={!wordProgressLoaded || Object.values(wordProgress).filter((p: any) => p.status !== "playing").length >= TR_ALPHABET_ROTATION.length}
                    onClick={() => { if (!requireLogin()) return; playClickSound(); setWordGameMode("daily"); }}
                    className="h-10 px-6 w-full sm:w-auto rounded-lg bg-[#ff4655] hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-[11px] font-black uppercase tracking-widest text-white transition shadow-[0_4px_16px_-6px_rgba(255,70,85,0.6)]"
                  >
                    ▶ {Object.keys(wordProgress).length > 0 && Object.values(wordProgress).filter((p: any) => p.status !== "playing").length < TR_ALPHABET_ROTATION.length ? t("wordGameContinue") : t("wordGamePlay")}
                  </button>
                </div>
              </div>

              {/* LİMİTSİZ */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#16161b] to-[#14151a] p-5 transition-all duration-300 hover:border-white/25 hover:shadow-[0_8px_30px_-14px_rgba(255,255,255,0.15)]">
                <div className="pointer-events-none absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-white/[0.04] blur-3xl" />
                <div className="relative flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-base shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">♾️</span>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{t("wordGameUnlimited")}</p>
                    <p className="text-[10px] text-white/35">{t("wordGameUnlimitedSubtitle")}</p>
                  </div>
                </div>
                <p className="relative mt-3 text-[11px] text-white/40">{t("wordGameUnlimitedDesc", { count: TR_ALPHABET_ROTATION.length })}</p>
                <div className="relative mt-4 flex justify-end">
                  <button
                    onClick={() => { if (!requireLogin()) return; playClickSound(); setWordGameMode("unlimited"); }}
                    className="h-10 px-6 w-full sm:w-auto rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-black uppercase tracking-widest text-white transition"
                  >
                    ▶ {t("wordGamePlay")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => {
                playClickSound();
                // DÜZELTME (ASIL BUG — "limitsizden çıkıp tekrar giremedim, ekrana cevap
                // anahtarı çıkıyor"): burada sadece wordGameMode "menu"ya dönüyordu ama
                // wordResultsOpen HİÇ false yapılmıyordu. Limitsiz'e tekrar girildiğinde
                // (aşağıdaki mod-giriş efekti ilerlemeyi sıfırlasa da) wordResultsOpen hâlâ
                // true olduğu için sonuç ekranı (cevap anahtarı) hemen tekrar açılıyordu —
                // oyuncu oyuna hiç giremiyordu. Artık ikisi birden sıfırlanıyor.
                if (wordResultsOpen) { setWordGameMode("menu"); setWordResultsOpen(false); }
                else setExitConfirm({ kind: "word-game", targetTab: null });
              }}
              className="text-[11px] font-black text-white/40 hover:text-white transition"
            >
              {t("wordGameBackToMenu")}
            </button>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${wordGameMode === "unlimited" ? "bg-white/10 text-white/60" : "bg-[#ff4655]/15 text-[#ff4655]"}`}>
              {wordGameMode === "unlimited" ? `♾️ ${t("wordGameUnlimited")}` : `📅 ${t("wordGameDaily")}`}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <div className="h-6 w-1 bg-gradient-to-b from-[#ff4655] to-red-800 rounded-full" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t("wordGameTitle")}</h1>
          </div>
          <p className="text-xs text-white/40 mb-4">
            {wordGameMode === "unlimited"
              ? `${TR_ALPHABET_ROTATION.length} harf hazır — istediğin sıradan çöz. Hiçbir şey kaydedilmiyor, menüye her dönüşünde kelimeler yeniden karılır.`
              : `Bu setin ${TR_ALPHABET_ROTATION.length} harfi hazır — istediğin sıradan çöz.`}
          </p>

          {/* DÜZELTME (istek): "sonuçlar ekranı hala gözüküyor, maç bitmemesine rağmen kaldır
              onu direkt ordan, sadece maç bitince ekrana fırlasın" — önceden burada, henüz
              hiç harf bitmemişken bile tıklanabilen bir "📊 Sonuçlar" butonu vardı. Kaldırıldı;
              sonuç ekranı artık SADECE tüm harfler bitince (yukarıdaki otomatik-açılma efekti,
              wordResultsAutoShown) kendiliğinden açılıyor. */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{doneCount} / {TR_ALPHABET_ROTATION.length} harf tamamlandı</p>
          </div>
          <div className="flex h-16 items-center justify-center gap-2 overflow-hidden">
            {visibleWordLetters.map((l) => {
              const prog = activeWordProgress[l];
              const isSelected = l === selectedWordLetter;
              const isCorrect = prog?.status === "correct";
              const isPassed = prog?.status === "pass";
              const isFailed = prog?.status === "timeout";
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => currentWordStatus !== "playing" && setSelectedWordLetter(l)}
                  className={`relative flex items-center justify-center rounded-full border font-black transition-all duration-300 ${
                    isSelected ? "scale-110 h-14 w-14 text-lg" : "h-12 w-12 text-sm hover:scale-105"
                  } ${
                    isCorrect
                      ? `border-emerald-400/50 bg-emerald-400/15 text-emerald-300${isSelected ? " shadow-[0_0_16px_rgba(16,185,129,0.4)]" : ""}`
                      : isFailed
                      ? `border-red-400/40 bg-red-400/10 text-red-300${isSelected ? " shadow-[0_0_16px_rgba(248,113,113,0.4)]" : ""}`
                      : isPassed
                      ? `border-amber-400/50 bg-amber-400/15 text-amber-300${isSelected ? " shadow-[0_0_16px_rgba(251,191,36,0.4)]" : ""}`
                      : isSelected
                      ? "border-[#ff4655] bg-[#ff4655]/20 text-white shadow-[0_0_16px_rgba(255,70,85,0.45)]"
                      : "border-white/10 bg-black/20 text-white/40 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  {isSelected && !isCorrect && !isFailed && !isPassed && <span className="absolute inset-0 rounded-full border border-[#ff4655]/40 animate-ping" />}
                  <span className="relative">{isCorrect ? "✓" : isFailed ? "✕" : isPassed ? "»" : l}</span>
                </button>
              );
            })}
          </div>


          <div className={`mt-6 rounded-2xl border p-7 transition-colors duration-300 ${
            wordFeedback === "correct" ? "border-emerald-400/60 bg-emerald-500/5" : wordFeedback === "wrong" ? "border-red-500/60 bg-red-500/5" : "border-white/10 bg-[#14151a]/90"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black text-white transition-all duration-300 ${
                wordFeedback === "correct" ? "border-emerald-400 scale-110" : wordFeedback === "wrong" ? "border-red-500 animate-pulse" : "border-[#ff4655]"
              }`}>{selectedWordLetter}</span>
              <span className={`text-xs font-black tabular-nums ${wordTimeLeft <= 30 && currentWordStatus === "playing" ? "text-[#ff4655]" : "text-white/50"}`}>⏱ {mm}:{ss}</span>
            </div>

            <h1 className="mt-5 text-lg font-black uppercase tracking-tight text-white leading-relaxed">{entry?.clue}</h1>

            {currentWordStatus === "playing" && (
              <>
                <div className="mt-8 flex items-center gap-2">
                  <input
                    value={wordGuessInput}
                    onChange={(e) => setWordGuessInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitWordGuess(); }}
                    placeholder={`${selectedWordLetter}... (Cevabı Yaz)`}
                    className={`h-11 flex-1 rounded-lg border bg-black/30 px-4 text-xs font-bold text-white placeholder:text-white/25 focus:outline-none transition-colors duration-300 ${
                      wordFeedback === "wrong" ? "border-red-500 focus:border-red-500" : wordFeedback === "correct" ? "border-emerald-400 focus:border-emerald-400" : wordStartWarning ? "border-amber-400 focus:border-amber-400" : "border-white/10 focus:border-[#ff4655]/50"
                    }`}
                  />
                  <button onClick={submitWordGuess} className="h-11 flex-shrink-0 rounded-lg bg-[#ff4655] hover:bg-red-500 px-4 text-[11px] font-black text-white transition">GÖNDER</button>
                  <button onClick={passWordRound} className="h-11 flex-shrink-0 rounded-lg bg-amber-400 hover:bg-amber-300 px-4 text-[11px] font-black text-black transition">PAS</button>
                </div>
                {wordFeedback === "wrong" && <p className="mt-3 text-[11px] font-black text-red-400">✕ Yanlış cevap — sıradaki harfe geçiliyor.</p>}
                {wordStartWarning && <p className="mt-3 text-[11px] font-black text-amber-400">⚠ Cevabın "{selectedWordLetter}" harfiyle başlamalı — tekrar yaz.</p>}
                <p className="mt-3 text-[10px] text-white/25">Erkenden bitirmek istersen kutuya <span className="font-black text-white/40">bitir</span> yazıp gönderebilirsin.</p>
              </>
            )}

            {isOver && (
              <div className="mt-8">
                {currentWordStatus === "correct" && <p className="text-2xl font-black text-emerald-400">{entry?.word}</p>}
                <p className="mt-2 text-xs font-bold text-white/50">
                  {currentWordStatus === "correct" ? "Doğru bildin! 🎉" : currentWordStatus === "timeout" ? (currentWordWrongCount > 0 ? "Yanlış cevap." : "Süre doldu.") : "Bu turu geçtin."}
                </p>
                <p className="mt-4 text-[10px] text-white/30">
                  {doneCount >= TR_ALPHABET_ROTATION.length
                    ? (wordGameMode === "unlimited" ? "Bu setteki tüm harfleri tamamladın — menüye dönüp tekrar oynarsan yeni kelimeler gelir." : "Bu günlük seti tamamladın — yeni set için menüdeki geri sayımı takip edebilirsin.")
                    : "Üstteki dairelerden başka bir harf seçip devam edebilirsin."}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-5 border-t border-white/5 pt-5 text-[11px] font-bold">
            {/* DÜZELTME (istek): "alttaki pas sayacı sürekli sıfırlanıyor" — bu üç sayaç önceden
                SADECE o an ekranda duran harfin durumunu gösteriyordu (0/1), yani başka bir
                harfe geçilince hep sıfıra dönüyordu. Artık üstte zaten hesaplanan gerçek
                TOPLAMLAR (correctCount/timeoutCount/passCount) kullanılıyor — session boyunca
                biriken doğru/yanlış/pas sayısı, hangi harfte olursan ol aynı kalıyor. */}
              <span className="text-emerald-400">✓ {correctCount} Doğru</span>
              <span className="text-red-400">✕ {timeoutCount} Yanlış</span>
              <span className="text-amber-400">⏭ {passCount} Pas</span>
            </div>
          </div>
        </div>

        {/* YENİ (istek): "Oyun sonunda 'Bugünün Sonuçları' ekranı açılsın — doğru/yanlış/pas
            sayıları, başarı yüzdesi ve cevap anahtarı gösterilsin. 'Kapat' yerine 'Ana Menüye
            Dön' ve 'Sonuçları Paylaş' butonları olsun." — Parolla'daki günlük istatistik
            ekranından esinlenilmiş ama İnfinity/Valorant temasına (koyu zemin, kırmızı vurgu,
            madalyon rozetler) uyarlanmış bir sonuç modalı. */}
        {wordResultsOpen && createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setWordResultsOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-[#ff4655]/30 bg-[#101014] shadow-[0_0_60px_-15px_rgba(255,70,85,0.4)] overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#ff4655]/15 blur-3xl" />
              <div className="relative px-6 pt-6 pb-5 border-b border-white/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4655]">İnfinity.gg · Kelime Oyunu</p>
                <h2 className="mt-1 text-xl font-black text-white uppercase tracking-tight">{wordGameMode === "unlimited" ? "Limitsiz Sonuçlar" : "Bugünün Sonuçları"}</h2>
              </div>

              <div className="relative px-6 py-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 py-3">
                    <p className="text-2xl font-black text-emerald-400">{correctCount}</p>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300/70">Doğru</p>
                  </div>
                  <div className="rounded-xl border border-red-400/25 bg-red-500/10 py-3">
                    <p className="text-2xl font-black text-red-400">{timeoutCount}</p>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-red-300/70">Yanlış</p>
                  </div>
                  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 py-3">
                    <p className="text-2xl font-black text-amber-400">{passCount}</p>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300/70">Pas</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                    <span>Başarı Oranı</span>
                    <span className="text-white">%{successRate}</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ff4655] to-red-400" style={{ width: `${successRate}%` }} />
                  </div>
                </div>

                <details className="mt-4 group rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition flex items-center justify-between">
                    Cevap Anahtarı
                    <span className="text-white/30 group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 max-h-52 overflow-y-auto">
                    {TR_ALPHABET_ROTATION.map((l) => {
                      const entry = activeWordProgress[l];
                      const st = entry?.status;
                      return (
                        <div key={l} className="flex flex-col text-left">
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-[10px] font-black ${st === "correct" ? "text-emerald-400" : st === "pass" ? "text-amber-400" : st === "timeout" ? "text-red-400" : "text-white/30"}`}>{l}</span>
                            <span className="text-[10px] font-bold text-white/50 truncate">{activeWordBank[l]?.word}</span>
                          </div>
                          {/* YENİ (istek): "cevap anahtarında yanlış yapılan sorularda oyuncunun
                              verdiği cevap yazsın" — yanlış cevaplanan harflerde, oyuncunun o an
                              gerçekten yazdığı (hatalı) metin de küçük ve üstü çizili gösteriliyor. */}
                          {st === "timeout" && entry?.lastGuess && (
                            <span className="text-[9px] font-bold text-red-400/60 line-through truncate">{entry.lastGuess}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div className="relative px-6 pb-6 flex items-center gap-2.5">
                <button
                  onClick={() => { setWordResultsOpen(false); setWordGameMode("menu"); }}
                  className="flex-1 h-11 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-white transition"
                >
                  Menüye Dön
                </button>
                <button
                  onClick={shareWordResults}
                  className="flex-1 h-11 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-white transition"
                >
                  Sonuçları Paylaş
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
      );
    })()}
  </motion.section>
)}

{/* DÜZELTME (istek): "liderlik tablosunu kaldır" — sahte 8 kişilik modal tamamen kaldırıldı;
    tek gerçek gösterge artık menüdeki "Günün lideri" satırı (dailyLeaderName). */}



</AnimatePresence>

      {/* YENİ (istek): "sekme değiştirirken / menüye dön tuşuna basarken onaylıyor musun
          uyarısı çıksın, arkada oyun devam etmesin" — bilgi yarışması, kelime oyunu ve skin
          savaşı için ORTAK onay penceresi. exitConfirm dolu olduğu sürece açık kalır; hangi
          sekmede olursa olsun (AnimatePresence'ın dışında, en üstte) render edilir. */}
      {exitConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#14151a] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400/60 bg-amber-400/10 text-2xl">⚠️</div>
            <h2 className="mt-4 text-sm font-black uppercase tracking-tight text-white">
              {exitConfirm.targetTab ? t("exitConfirmTitleTab") : t("exitConfirmTitleMenu")}
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              {exitConfirm.kind === "quiz" && t("exitConfirmQuiz")}
              {exitConfirm.kind === "word-game" && t("exitConfirmWordGame")}
              {exitConfirm.kind === "skin-war" && t("exitConfirmSkinWar")}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setExitConfirm(null)}
                className="flex-1 h-11 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-white transition"
              >
                {t("exitConfirmStay")}
              </button>
              <button
                onClick={confirmExitInProgress}
                className="flex-1 h-11 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-white transition"
              >
                {t("exitConfirmLeave")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* YENİ (istek): "bu tür uyarıları direkt site içinde verirsek daha iyi olur" — nişangah
          haftalık sınırı, form doğrulama hataları vb. artık tarayıcının çirkin native
          window.alert() kutusu yerine bu modalda gösteriliyor. */}
      {siteAlertMessage && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSiteAlertMessage(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-[#14151a] border border-[#ff4655]/30 rounded-2xl p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#ff4655]/60 bg-[#ff4655]/10 text-2xl">⚠️</div>
            <p className="mt-4 text-xs leading-relaxed text-white/80">{siteAlertMessage}</p>
            <button
              onClick={() => setSiteAlertMessage(null)}
              className="mt-5 w-full h-11 rounded-lg bg-[#ff4655] hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-white transition"
            >
              Tamam
            </button>
          </div>
        </div>,
        document.body
      )}


      <footer className="relative z-10 w-full border-t border-white/5 bg-[#0a0a0f]/95 pt-16 pb-12 transform-gpu">
        <div className="w-full max-w-[1400px] mx-auto px-6 flex flex-col gap-12">
          <div className="text-left">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest opacity-80">{t("footerAboutTitle")}</h2>
            <p className="mt-3 text-white/50 leading-relaxed text-xs max-w-4xl">
             {t("footerAboutText")}
            </p>
          </div>

          {/* DÜZELTME (sıralama): banner artık "İnfinity.gg Hakkında" yazısından SONRA, alt
              kısım (telif hakkı/linkler/sosyal medya) OLMADAN ÖNCE geliyor — eskiden en üstte,
              her şeyden önce görünüyordu. DÜZELTME (boyut/siyah barlar): eskiden ne kadar
              genişse görsel o kadar "yükseklik" alıyordu (w-full h-auto) — geniş ekranlarda
              bu, banner'ı olması gerekenden çok daha BÜYÜK gösteriyordu ve görselin kendi
              şeffaf/koyu kenar boşlukları da "siyah bar" gibi görünüyordu. Artık sabit bir
              max-height'e (görsel çok büyümüyor) sahip, object-contain ile HİÇ KIRPILMADAN
              gösteriliyor ve arka planı sitenin kendi koyu rengiyle (#0a0a0f) TAM UYUMLU —
              görselin kendi kenar boşlukları artık ayrı bir "siyah çerçeve" gibi göze
              batmıyor, sayfayla kaynaşıyor. */}
          {/* DÜZELTME: banner.png artık 2103×444 (siyah çerçeveler senin tarafından kırpıldı) —
              konteyner bu YENİ orana kilitlendi (aspect-[2103/444]). object-cover ile satır
              genişliğini uçtan uca dolduruyor, hiçbir yerde boşluk/çerçeve kalmıyor. */}
          <div className="w-full relative overflow-hidden rounded-2xl bg-[#0a0a0f] aspect-[2103/444]">
            <Image
              src="/banner.png"
              alt="Infinity Network"
              fill
              className="object-cover"
              sizes="(max-width: 1400px) 100vw, 1400px"
            />
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-[11px] text-white/40 font-medium">
            <div className="flex flex-col gap-3 text-left max-w-4xl">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/60">
                <button
                  onClick={() => { requestTabChange("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-white font-semibold hover:text-[#ff4655] transition-colors duration-150"
                >
                  {t("footerCopyright")}
                </button>
                <button onClick={() => setLegalModalTab("privacy")} className="hover:text-white transition">{t("footerPrivacy")}</button>
                <button onClick={() => setLegalModalTab("terms")} className="hover:text-white transition">{t("footerTerms")}</button>
                <button onClick={() => setLegalModalTab("support")} className="hover:text-white transition">{t("footerSupport")}</button>
              </div>
              <p className="leading-relaxed text-[10px]">
                {t("footerDisclaimer")}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* DÜZELTME: X (Twitter) logosu, sitenin kendi logosuyla değiştirildi */}
              {/* DÜZELTME: bu logo eskiden sadece bir <div> idi, tıklanamıyordu — hiçbir sayfaya
                  bağlı değildi. Artık yanındaki "2026 © Infinity Network" ile aynı davranışı
                  taşıyor: ana sayfaya götürüp en üste kaydırıyor. */}
              <button
                type="button"
                onClick={() => { requestTabChange("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="w-10 h-10 relative rounded-lg overflow-hidden border border-white/10 bg-black/40 p-2 hover:border-[#ff4655]/50 transition-colors duration-150"
                aria-label="Ana sayfaya dön"
              >
                <Image src="/logo.png" alt="Infinity.gg" fill className="object-contain" />
              </button>
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
