// Seed script: fan reactions + comments for key matches
// Run: node scripts/seed-comments.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load env files in priority order
for (const f of [".env.seed", ".env.local", ".env.production.local", ".env"]) {
  try {
    const env = readFileSync(f, "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

// Strip channel_binding param — not supported by @neondatabase/serverless in Node.js
const dbUrl = (process.env.DATABASE_URL || "").replace(/[&?]channel_binding=require/, "");
const sql = neon(dbUrl);

await sql`
  CREATE TABLE IF NOT EXISTS match_reactions (
    match_id TEXT NOT NULL, emoji TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (match_id, emoji)
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS match_comments (
    id SERIAL PRIMARY KEY, match_id TEXT NOT NULL, email TEXT,
    username TEXT NOT NULL, body TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
await sql`CREATE INDEX IF NOT EXISTS idx_comments_match ON match_comments(match_id)`;

// ── Reactions ─────────────────────────────────────────────────────────
const reactions = [
  // Big matches — high counts
  ["fra-sen",  { fire: 187, ball: 134, shock: 52  }],
  ["arg-alg",  { fire: 243, ball: 158, shock: 41  }],
  ["por-cod",  { fire: 198, ball: 121, shock: 38  }],
  ["bra-mar",  { fire: 211, ball: 167, shock: 63  }],
  ["bra-hai",  { fire: 148, ball: 192, shock: 29  }],
  ["arg-aut",  { fire: 219, ball: 143, shock: 47  }],
  ["fra-irq",  { fire: 174, ball: 108, shock: 33  }],
  ["por-uzb",  { fire: 162, ball: 97,  shock: 28  }],
  ["nor-fra",  { fire: 203, ball: 89,  shock: 178 }],
  ["jor-arg",  { fire: 195, ball: 131, shock: 156 }],
  ["col-por",  { fire: 184, ball: 112, shock: 89  }],
  ["sco-bra",  { fire: 176, ball: 145, shock: 121 }],
  ["usa-par",  { fire: 143, ball: 98,  shock: 44  }],
  ["usa-aus",  { fire: 121, ball: 87,  shock: 31  }],
  ["ger-cuw",  { fire: 138, ball: 104, shock: 22  }],
  ["esp-cpv",  { fire: 127, ball: 93,  shock: 18  }],
  ["ned-jpn",  { fire: 112, ball: 88,  shock: 67  }],
  ["eng-cro",  { fire: 156, ball: 119, shock: 44  }],
  // Smaller matches
  ["mex-rsa",  { fire: 76,  ball: 54,  shock: 23  }],
  ["kor-cze",  { fire: 64,  ball: 48,  shock: 31  }],
  ["can-bih",  { fire: 58,  ball: 42,  shock: 17  }],
  ["qat-sui",  { fire: 49,  ball: 37,  shock: 29  }],
];

// ── Comments ──────────────────────────────────────────────────────────
// Format: [match_id, username, body, likes, minutesAgo]
const comments = [
  // ── Brazil vs Morocco ──
  ["bra-mar", "SambaKing",     "Vinicius Jr is going to tear this defense apart. Morocco had a great WC2022 run but this is a different level. BRA 3-0 🇧🇷", 47, 180],
  ["bra-mar", "AtlasDiehard",  "Don't underestimate Morocco. They shocked the world in Qatar, they'll do it again. YALLAH ATLAS LIONS! 🦁", 38, 165],
  ["bra-mar", "xG_Wizard",     "Expected goals model gives Brazil 72% win probability but Morocco's defensive block is genuinely world-class. This could be closer than people think.", 29, 140],
  ["bra-mar", "EndrickWatch",  "If Endrick starts… just saying. Kid is special. 🌟", 22, 120],
  ["bra-mar", "TacticsTim",    "Morocco will park the bus and hit on the counter. Brazil need to be patient and not force it.", 18, 90],
  ["bra-mar", "VivaLaBrasil",  "JOGA BONITO! No team plays football like Brazil when they're on form. Buckle up! ⚽🇧🇷", 34, 60],

  // ── Argentina vs Algeria ──
  ["arg-alg", "La_Albiceleste", "This is a formality. Messi lifts the trophy again, simple as. The GOAT carrying his nation to glory once more 🐐🇦🇷", 89, 200],
  ["arg-alg", "GoatDebater",    "MESSI IS THE TRUE KING OF FOOTBALL. Anyone who doubts him after Qatar 2022 is delusional. Greatest player to ever live, no discussion.", 76, 185],
  ["arg-alg", "NorthAfricaFC",  "Algeria will surprise everyone. This team has heart. Mahrez era is over but the new generation is hungry! 🇩🇿", 31, 170],
  ["arg-alg", "StatsBaller",    "Argentina's form since Qatar has been elite. 22-game unbeaten run coming in. Algeria have quality but the gap is significant.", 27, 150],
  ["arg-alg", "MessiFan2026",   "I literally started watching football because of Messi. Watching him play at 38 and still dominate is unreal. LEGEND.", 62, 130],
  ["arg-alg", "FootballNerd",   "Algeria's pressing game could cause Argentina some issues in the first 20 minutes. But Messi reading the game makes it so hard to press effectively.", 19, 100],
  ["arg-alg", "BuenosAiresBoy", "Mi Argentina bella! Vamos campeones del mundo! 🇦🇷⭐⭐⭐", 44, 80],

  // ── Portugal vs Congo DR ──
  ["por-cod", "CR7Forever",     "SIUUUUU! Ronaldo is going to show everyone why he's still the best. 900 career goals and counting. Haters will be eating their words tonight. 🐐", 92, 210],
  ["por-cod", "RonaldoOrMessi", "This is the difference between Ronaldo and Messi — Ronaldo keeps going, keeps scoring at 41. RESPECT. The greatest athlete of this generation.", 71, 195],
  ["por-cod", "LisbonLad",      "Félix, Leão, Bernardo, Vitinha… Portugal have so much quality beyond Ronaldo now. This team is genuinely scary on a good day 🇵🇹", 33, 175],
  ["por-cod", "AfricaWatch",    "Congo DR might surprise. Remember, no easy games at a World Cup. Mbokani generation built this team with pride.", 24, 150],
  ["por-cod", "TacticsNerd",    "Portugal's high press combined with Bernardo Silva's movement is one of the most underrated things in football. Surgical.", 17, 120],
  ["por-cod", "PortuFan88",     "Ronaldo to score first, Portugal to win 3-1. Screenshot this. 📸🇵🇹", 38, 90],

  // ── France vs Senegal ──
  ["fra-sen", "MbappéMagic",    "Nobody can stop Mbappé at full speed. Nobody. PSG or Real — it doesn't matter. When he's motivated for France the whole world stops. 🇫🇷⚡", 54, 220],
  ["fra-sen", "LesBleusFan",    "Defending champions with the best squad depth in the world. France are winning this World Cup, full stop. Griezmann + Mbappé is unplayable.", 41, 200],
  ["fra-sen", "TerrangaLions",  "SENEGAL IS DANGEROUS. Mané might be at his last World Cup. The team wants to win this for him. Don't sleep on the lions! 🦁🇸🇳", 38, 175],
  ["fra-sen", "AfroFootball",   "This is the match I've been waiting for. Two African footballing nations (one naturally, one historically) with so much talent on show.", 22, 140],
  ["fra-sen", "xG_Wizard",      "France's attacking options from the bench alone could start for most World Cup teams. Incredible squad depth.", 29, 110],

  // ── Brazil vs Haiti ──
  ["bra-hai", "SambaKing",      "Brazil need to win this well to boost GD. 5-0 minimum, I'm calling it. Endrick is starting. 🇧🇷🔥", 43, 150],
  ["bra-hai", "PetitFoot",      "Haiti players will give everything for this moment. Don't be surprised if they score. Every underdog has their day.", 28, 130],
  ["bra-hai", "VivaLaBrasil",   "VAMOS BRASIIIL! Neymar era over but the new generation is READY. Rodrygo and Vinicius are the future 🌟", 36, 100],
  ["bra-hai", "FootballNerd",   "Technically Haiti have nothing to lose which makes them dangerous for exactly one half. Then Brazil's fitness takes over.", 19, 70],

  // ── Argentina vs Austria ──
  ["arg-aut", "La_Albiceleste", "Messi with another assist, Di María with a goal, Argentina cruise. You heard it here first. 🐐🇦🇷", 51, 160],
  ["arg-aut", "GoatDebater",    "MESSI GOAT MESSI GOAT MESSI GOAT. Three World Cups, two finals, one champion. End of discussion.", 67, 145],
  ["arg-aut", "AustriaUltra",   "Austria are dark horses! Alaba healthy, Sabitzer in form — we'll give Argentina something to think about!", 23, 120],
  ["arg-aut", "StatsBaller",    "This should be routine for Argentina but Scaloni's conservative setup sometimes makes easy games look hard.", 15, 90],

  // ── France vs Iraq ──
  ["fra-irq", "MbappéMagic",    "France in second gear and they'll still win 3-0. Deschamps will rotate but the quality is just on another level.", 32, 170],
  ["fra-irq", "IraqiProud",     "Iraqi football has come so far. Being at the World Cup is a miracle in itself. We play for pride. 🇮🇶", 29, 150],
  ["fra-irq", "LesBleusFan",    "Tchouaméni starting in midfield is such a statement. France's defensive structure is elite.", 18, 120],

  // ── Portugal vs Uzbekistan ──
  ["por-uzb", "CR7Forever",     "Hat-trick for Ronaldo incoming. Mark my words. 🎯🎯🎯 SIUUUU 🇵🇹", 58, 180],
  ["por-uzb", "LisbonLad",      "Easy three points but Portugal need to stay focused. Uzbekistan are physical and well-organized.", 21, 150],
  ["por-uzb", "UzbekStar",      "Central Asian football is growing! Our players compete in top European leagues. Show some respect! 🇺🇿", 25, 120],

  // ── Norway vs France ──
  ["nor-fra", "HaalandEffect",  "If Haaland is fit this could be the UPSET OF THE TOURNAMENT. Norway with Haaland vs France… this is not a mismatch, people. 😮🇳🇴", 72, 200],
  ["nor-fra", "MbappéMagic",    "France will win but Norway are dangerous on the counter. Haaland in space against any defense is lethal. Should be a cracker.", 44, 175],
  ["nor-fra", "xG_Wizard",      "This is genuinely the hardest group stage game to predict. Norway's direct play vs France's possession — xG models are almost useless here.", 38, 150],
  ["nor-fra", "NorwayViking",   "NORWAY WILL SHOCK THE WORLD. Haaland, Ødegaard, Sörloth — this is our golden generation! VIKING BATTLE CRY! 🇳🇴⚡", 55, 130],
  ["nor-fra", "LesBleusFan",    "France have lost to Iceland, Algeria, Switzerland at recent tournaments. Complacency is their biggest enemy.", 31, 100],
  ["nor-fra", "FootballNerd",   "Tactically fascinating. France press high, Norway go direct. Ødegaard as a 10 could completely bypass France's midfield press.", 26, 70],

  // ── Jordan vs Argentina ──
  ["jor-arg", "La_Albiceleste", "Argentina are going to score FIVE against Jordan. Messi masterclass. Don't even need to watch, just tick the W. 🐐", 48, 190],
  ["jor-arg", "GoatDebater",    "Every game Messi plays at this World Cup could be his last. Appreciate the GOAT while you can. He's rewriting history in real time.", 79, 170],
  ["jor-arg", "JordanProud",    "Jordan at the World Cup! Whatever happens, this is a historic achievement. We fight with everything we have! 🇯🇴", 34, 150],
  ["jor-arg", "MessiFan2026",   "38 years old and STILL the best player on the planet. Other players retire at this age. Messi just keeps going. LEGEND.", 61, 120],

  // ── Colombia vs Portugal ──
  ["col-por", "CR7Forever",     "This will test Portugal. Colombia are physical and fast. But Ronaldo thrives under pressure. Born for moments like this. 🐐🇵🇹", 44, 180],
  ["col-por", "CaféColombia",   "James Rodríguez, Falcao era is gone but this new generation has FIRE. Colombia to the knockout round! ☕🇨🇴", 37, 160],
  ["col-por", "TacticsNerd",    "Colombia's wide players vs Portugal's fullbacks will be the key battle. Portugal can be exposed in behind.", 22, 130],
  ["col-por", "LisbonLad",      "Portugal need all three points here to be safe. Ronaldo knows it. Watch him turn up when it matters.", 28, 100],

  // ── Scotland vs Brazil ──
  ["sco-bra", "SambaKing",      "Brazil will win but Scotland's aggressive pressing could make the first 20 minutes uncomfortable. After that? 3-0 minimum. 🇧🇷", 39, 170],
  ["sco-bra", "TartanArmy",     "COME ON SCOTLAND! We have nothing to lose against Brazil. Play for the shirt and make the fans proud! 🏴󠁧󠁢󠁳󠁣󠁴󠁿", 52, 150],
  ["sco-bra", "xG_Wizard",      "Scotland away from home, against Brazil, having already qualified (or not). Form window makes this one of the strangest games to predict.", 17, 120],
  ["sco-bra", "VivaLaBrasil",   "Vinicius will be dancing by the end of this one. Brazil in a good mood = must-watch football! 💃🇧🇷", 31, 90],

  // ── USA vs Paraguay ──
  ["usa-par", "USASoccer",      "HOME NATION ADVANTAGE! The US crowd is going to be ELECTRIC. Pulisic to bag a brace. Let's GOOOO! 🇺🇸⚡", 42, 160],
  ["usa-par", "MLS_Fan",        "USA football has grown so much. This team could genuinely make the QF at home. Don't count us out.", 28, 140],
  ["usa-par", "ParaguayOrgullo","Paraguay will make this ugly. Defensive, disciplined. USA will struggle to break through. Underdog alert! 🇵🇾", 23, 110],

  // ── USA vs Australia ──
  ["usa-aus", "USASoccer",      "Two English-speaking nations with growing football cultures. This is a proper game. USA has the edge at home though.", 24, 120],
  ["usa-aus", "SocceroosFan",   "Australia punched above our weight in Qatar with Mathew Leckie. We have the quality to repeat that here! 🇦🇺", 19, 100],

  // ── Germany vs Curaçao ──
  ["ger-cuw", "Bundesliga_Fan", "Germany are back. New generation, new mentality, Wirtz is the real deal. 4-0 easy. 🇩🇪", 31, 130],
  ["ger-cuw", "MatchdayMike",   "Germany need a statement win to shake off the early exit memories. Expect them to go for goals here.", 22, 100],

  // ── Spain vs Cape Verde Islands ──
  ["esp-cpv", "TikiTaka",       "Spain's tiki-taka under De la Fuente has evolved. More vertical, more dangerous. Yamal could do anything this tournament.", 27, 120],
  ["esp-cpv", "CaboVerde",      "Cape Verde Islands! Small nation, massive heart. We'll give everything and make our country proud 🇨🇻", 21, 100],

  // ── Netherlands vs Japan ──
  ["ned-jpn", "OranjeFever",    "Netherlands with a proper striker for once. Exciting times! Japan will make it tough but Oranje have the quality. 🇳🇱", 26, 110],
  ["ned-jpn", "SamuraiBlue",    "Japan shocked Spain and Germany in Qatar. The Netherlands will not be taking us lightly — nor should they. ⚔️🇯🇵", 34, 90],

  // ── England vs Croatia ──
  ["eng-cro", "ThreeLions",     "We FINALLY beat Croatia in a final (Euro 2021). This is redemption for all the near misses. England are coming home this time! 🏴󠁧󠁢󠁥󠁮󠁧󠁿", 38, 140],
  ["eng-cro", "CroatiaFan",     "Modrić still pulling strings at 40?! If he's fit Croatia are dangerous. Ask Russia 2018.", 29, 120],
  ["eng-cro", "xG_Wizard",      "England's biggest problem isn't quality — it's bottle. They always have the xG but somehow find a way to make it dramatic.", 44, 90],

  // ── Mexico vs South Africa ──
  ["mex-rsa", "ElTriFan",       "Opening match energy! Mexico needs to set the tone early. Hirving Lozano and the new generation ready. ARRIBA MEXICO! 🇲🇽", 28, 150],
  ["mex-rsa", "BafanaFan",      "South Africa have surprised before. Motivated team playing for the continent. 🇿🇦", 17, 120],

  // ── Mexico vs South Korea ──
  ["mex-kor", "ElTriFan",       "Mexico need this win badly after the opening game. El Tri have quality when motivated.", 19, 100],
  ["mex-kor", "KoreanWave",     "South Korea's set pieces are dangerous. Son Heung-min could be the difference maker. 🇰🇷", 22, 80],
];

// ── Insert reactions ──────────────────────────────────────────────────
console.log("Seeding reactions...");
for (const [matchId, rx] of reactions) {
  for (const [emoji, count] of Object.entries(rx)) {
    await sql`
      INSERT INTO match_reactions (match_id, emoji, count)
      VALUES (${matchId}, ${emoji}, ${count})
      ON CONFLICT (match_id, emoji) DO UPDATE SET count = EXCLUDED.count
    `;
  }
}
console.log(`✓ ${reactions.length} matches seeded with reactions`);

// ── Insert comments ───────────────────────────────────────────────────
// Clear existing seed comments first (email IS NULL = seeded)
await sql`DELETE FROM match_comments WHERE email IS NULL`;
console.log("Seeding comments...");
let commentCount = 0;
for (const [matchId, username, body, likes, minutesAgo] of comments) {
  const ts = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  await sql`
    INSERT INTO match_comments (match_id, email, username, body, likes, created_at)
    VALUES (${matchId}, NULL, ${username}, ${body}, ${likes}, ${ts})
  `;
  commentCount++;
}
console.log(`✓ ${commentCount} comments seeded`);
console.log("Done! 🎉");
