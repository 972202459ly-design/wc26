import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const maxDuration = 60;

// Upcoming matches only (Jun 20 17:00Z onwards).
// Past matches: reactions only — no fake post-match comments.
// All comments are clearly pre-match discussion/prediction style.

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  await sql`CREATE TABLE IF NOT EXISTS match_reactions (
    match_id TEXT NOT NULL, emoji TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (match_id, emoji)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS match_comments (
    id SERIAL PRIMARY KEY, match_id TEXT NOT NULL, email TEXT,
    username TEXT NOT NULL, body TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    dislikes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE match_comments ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_match ON match_comments(match_id)`;

  // ── Reactions: all matches (past + upcoming) ──────────────────────────
  // Past match reactions are fine — just emoji counts, no result claims.
  const reactions: Array<[string, Record<string, number>]> = [
    // Upcoming
    ["ned-swe",  { fire: 312, ball: 234, shock: 88  }],
    ["ger-civ",  { fire: 243, ball: 178, shock: 61  }],
    ["ecu-cuw",  { fire: 134, ball: 98,  shock: 41  }],
    ["tun-jpn",  { fire: 198, ball: 154, shock: 112 }],
    ["esp-ksa",  { fire: 267, ball: 187, shock: 54  }],
    ["bel-irn",  { fire: 198, ball: 143, shock: 67  }],
    ["ury-cpv",  { fire: 154, ball: 112, shock: 38  }],
    ["nzl-egy",  { fire: 121, ball: 89,  shock: 44  }],
    ["arg-aut",  { fire: 587, ball: 341, shock: 124 }],
    ["fra-irq",  { fire: 298, ball: 187, shock: 72  }],
    ["nor-sen",  { fire: 344, ball: 156, shock: 289 }],
    ["jor-alg",  { fire: 213, ball: 147, shock: 198 }],
    ["por-uzb",  { fire: 412, ball: 267, shock: 103 }],
    ["eng-gha",  { fire: 356, ball: 244, shock: 91  }],
    ["pan-cro",  { fire: 198, ball: 143, shock: 167 }],
    ["col-cod",  { fire: 178, ball: 134, shock: 89  }],
    ["sco-bra",  { fire: 478, ball: 312, shock: 256 }],
    // Past (reactions only — no comments seeded)
    ["mex-rsa",  { fire: 176, ball: 124, shock: 53  }],
    ["kor-cze",  { fire: 164, ball: 118, shock: 71  }],
    ["can-bih",  { fire: 158, ball: 112, shock: 37  }],
    ["usa-par",  { fire: 243, ball: 178, shock: 84  }],
    ["qat-sui",  { fire: 149, ball: 107, shock: 89  }],
    ["bra-mar",  { fire: 411, ball: 287, shock: 143 }],
    ["hai-sco",  { fire: 167, ball: 134, shock: 98  }],
    ["aus-tur",  { fire: 143, ball: 112, shock: 67  }],
    ["ger-cuw",  { fire: 238, ball: 194, shock: 42  }],
    ["ned-jpn",  { fire: 212, ball: 168, shock: 127 }],
    ["civ-ecu",  { fire: 156, ball: 121, shock: 78  }],
    ["swe-tun",  { fire: 187, ball: 143, shock: 67  }],
    ["esp-cpv",  { fire: 227, ball: 173, shock: 38  }],
    ["bel-egy",  { fire: 198, ball: 154, shock: 56  }],
    ["ksa-ury",  { fire: 167, ball: 134, shock: 112 }],
    ["irn-nzl",  { fire: 134, ball: 98,  shock: 54  }],
    ["fra-sen",  { fire: 387, ball: 254, shock: 112 }],
    ["irq-nor",  { fire: 277, ball: 143, shock: 248 }],
    ["arg-alg",  { fire: 543, ball: 312, shock: 98  }],
    ["aut-jor",  { fire: 234, ball: 178, shock: 212 }],
    ["por-cod",  { fire: 398, ball: 234, shock: 87  }],
    ["eng-cro",  { fire: 356, ball: 219, shock: 84  }],
    ["gha-pan",  { fire: 143, ball: 112, shock: 67  }],
    ["uzb-col",  { fire: 167, ball: 123, shock: 78  }],
    ["cze-rsa",  { fire: 112, ball: 87,  shock: 34  }],
    ["sui-bih",  { fire: 134, ball: 98,  shock: 41  }],
    ["can-qat",  { fire: 156, ball: 112, shock: 54  }],
    ["mex-kor",  { fire: 184, ball: 131, shock: 57  }],
    ["usa-aus",  { fire: 221, ball: 157, shock: 71  }],
    ["sco-mar",  { fire: 191, ball: 153, shock: 118 }],
    ["bra-hai",  { fire: 298, ball: 354, shock: 67  }],
    ["tur-par",  { fire: 167, ball: 123, shock: 54  }],
  ];

  for (const [matchId, rx] of reactions) {
    for (const [emoji, count] of Object.entries(rx)) {
      await sql`INSERT INTO match_reactions (match_id, emoji, count)
        VALUES (${matchId}, ${emoji}, ${count})
        ON CONFLICT (match_id, emoji) DO UPDATE SET count = EXCLUDED.count`;
    }
  }

  // ── Comments: upcoming matches only, all pre-match discussion style ───
  await sql`DELETE FROM match_comments WHERE email IS NULL`;

  // [matchId, username, body, likes, dislikes, minutesAgo]
  type C = [string, string, string, number, number, number];
  const comments: C[] = [

    // ══ Netherlands vs Sweden (Jun 20) ══
    ["ned-swe", "OranjeFever",     "Netherlands have looked so sharp going forward. Van Dijk commanding the box, Gakpo terrorising every left back. This is our time. 🇳🇱🔥", 134, 12, 380],
    ["ned-swe", "SwedishViking",   "Sweden have surprised bigger nations before. Isak + Kulusevski up front is a genuinely dangerous combination. Stop writing us off! 🇸🇪⚡", 98, 23, 360],
    ["ned-swe", "TacticsNerd",     "Key battle: Gakpo vs Sweden's right back. If Gakpo gets space in behind, Netherlands could be 2 up before the half hour. Watch this space.", 67, 8, 340],
    ["ned-swe", "xG_Wizard",       "Model puts NED at 61% but Sweden are genuinely dangerous on the counter. Don't write off a draw or even a Sweden win.", 89, 11, 300],
    ["ned-swe", "KoningVoetbal",   "Netherlands 2-1 Sweden. Gakpo brace, Isak pulls one back. Calling it now. Come back and see. 📸🇳🇱", 76, 34, 280],
    ["ned-swe", "SoccerAnalyst",   "Netherlands without a true defensive midfielder is a real weakness. Sweden can exploit central spaces if they're disciplined in their shape.", 43, 9, 260],
    ["ned-swe", "SwedishViking2",  "Forsberg has been brilliant this tournament. He can unlock any defence with his passing range. Sweden's secret weapon tonight. 🇸🇪", 61, 15, 240],
    ["ned-swe", "OranjeFan88",     "Last time Sweden caused us grief in a major tournament I didn't sleep for a week. NOT THIS TIME. COME ON ORANJE! 💪🇳🇱", 88, 19, 220],
    ["ned-swe", "MatchdayMike",    "Both teams need a result. This is genuinely the best Group F game. Neutrals are in for a treat tonight.", 52, 6, 200],
    ["ned-swe", "TacticsNerd2",    "Sweden's 4-4-2 mid block vs Netherlands' positional play is a fascinating tactical puzzle. If Blind drops between the CBs it creates overloads wide.", 38, 4, 180],
    ["ned-swe", "PureFootball",    "The atmosphere in this stadium is going to be absolutely electric. Two passionate fanbases. Winner-takes-all stakes. Pure football. ⚽", 67, 5, 140],
    ["ned-swe", "SwedishViking3",  "We've qualified from tough groups before. We have the MENTALITY to grind results out. Sweden 1-1 Netherlands and I'll take that point all day. 🇸🇪", 41, 22, 100],
    ["ned-swe", "OranjeFever2",    "If Weghorst comes off the bench in the second half it's game over. He's the ultimate impact sub. NED 2-0 final score.", 72, 28, 60],
    ["ned-swe", "SwedenBelieve",   "COME ON SWEDEN!! Show them what we're made of! Zlatanless but not spiritless! 🇸🇪🔥", 91, 41, 20],
    ["ned-swe", "GoalAlert2026",   "Pre-match odds have NED at 1.55. Feels right — quality difference is real but Sweden can definitely nick something here. Should be entertaining.", 47, 9, 10],

    // ══ Germany vs Ivory Coast (Jun 20) ══
    ["ger-civ", "Bundesliga_Fan",  "Germany have been reborn under this new generation. Wirtz is the most naturally gifted player I've seen in the Bundesliga in years. DFB to the semis. 🇩🇪", 112, 18, 340],
    ["ger-civ", "ElephantsFC",     "Ivory Coast shocked Spain at AFCON 2023. Never underestimate the Elephants! This team has serious hunger. 🐘🇨🇮", 87, 24, 320],
    ["ger-civ", "TacticsNerd",     "Germany's high press vs Ivory Coast's technical midfield is going to be fascinating. Whoever controls tempo and the midfield battle wins this.", 64, 7, 300],
    ["ger-civ", "MatchdayMike",    "Germany need a statement win after last tournament's early exit. Expect them to go for goals hard from the first whistle.", 78, 31, 280],
    ["ger-civ", "ElephantsFC2",    "Cornet, Pepe, Gradel… we have pace and quality in wide areas. Germany's fullbacks will have a tough evening if our wingers get going.", 44, 12, 240],
    ["ger-civ", "xG_Wizard",       "Model gives GER 74%. But Ivory Coast's counter-attack speed is among the highest in the group stage. One Germany mistake and this flips.", 67, 9, 220],
    ["ger-civ", "NeutralFan2",     "Ivory Coast to go a goal up and hold for a draw. Germany always go through a shaky period early in tournaments. 1-1 wouldn't shock me.", 39, 27, 180],
    ["ger-civ", "ElephantsFC3",    "We BELONG here. Not just happy to participate — the Elephants want to WIN. You'll see tonight what we're capable of. 🇨🇮🔥", 56, 21, 140],

    // ══ Ecuador vs Curaçao (Jun 21) ══
    ["ecu-cuw", "EcuadorFan",      "Ecuador have the quality to cruise this one. Caicedo in midfield is elite. Clean sheet and 3 points, please. 🇪🇨", 67, 8, 280],
    ["ecu-cuw", "CuracaoFan",      "Curaçao are playing in their first ever World Cup! Whatever happens, this is a historic night for our small island nation. 🇨🇼", 54, 6, 250],
    ["ecu-cuw", "xG_Wizard",       "Ecuador 79% win probability. But Curaçao have surprise potential — every underdog has their moment. Never fully write off a debutant.", 43, 5, 210],
    ["ecu-cuw", "MatchdayMike",    "Moises Caicedo vs Curaçao midfield is going to be a complete mismatch. Chelsea money well spent. The man is a machine.", 38, 7, 160],

    // ══ Tunisia vs Japan (Jun 21) ══
    ["tun-jpn", "SamuraiBlue",     "Japan shocked Spain and Germany in Qatar. Tunisia have quality but we are NOT intimidated by anyone. Samurai Blue fight! ⚔️🇯🇵", 98, 14, 310],
    ["tun-jpn", "TunisiaFan",      "Tunisia are organized, disciplined, and dangerous on the break. Japan's high defensive line will be exposed by Khazri in behind.", 67, 11, 280],
    ["tun-jpn", "TacticsNerd",     "Japan's press is metronomic — they'll win the ball high up the pitch. But if Tunisia survive the first 20 minutes they become more dangerous.", 54, 7, 250],
    ["tun-jpn", "xG_Wizard",       "Fascinating Group F game. Japan at 52% to win. This is genuinely close. Tunisia's defensive record this tournament has been impressive.", 78, 9, 210],
    ["tun-jpn", "SamuraiBlue2",    "Kubo is in the form of his career right now. If he gets 5 minutes of space on the ball tonight, Tunisia's defence will not enjoy it. 🇯🇵", 65, 12, 170],
    ["tun-jpn", "TunisiaFan2",     "The Eagles of Carthage have beaten Japan before in World Cup history. We know how to play this opponent. 🇹🇳🦅", 43, 8, 130],

    // ══ Spain vs Saudi Arabia (Jun 21) ══
    ["esp-ksa", "TikiTaka",        "Spain under De la Fuente play the most progressive tiki-taka we've ever seen. More vertical, more dangerous. Yamal and Nico Williams both starting tonight?? 🔥🇪🇸", 112, 14, 340],
    ["esp-ksa", "SaudiEagle",      "Saudi Arabia shocked Argentina in 2022. People forget that. Never underestimate a motivated underdog at a World Cup.", 87, 21, 310],
    ["esp-ksa", "TacticsNerd",     "Yamal at 18 against Saudi Arabia's experienced defence is genuinely exciting. His dribbling under pressure is absurdly mature for his age.", 76, 8, 280],
    ["esp-ksa", "xG_Wizard",       "Spain 81% win probability but Saudi's tactical discipline makes them dangerous until the first goal. Once Spain score it usually becomes routine.", 67, 7, 240],
    ["esp-ksa", "TikiTaka2",       "Pedri + Gavi in midfield is the best central midfield partnership at this tournament. Their connection off the ball is telepathic.", 89, 11, 200],
    ["esp-ksa", "SaudiEagle2",     "Al-Dawsari plays for Al-Hilal and is the most dangerous man in Saudi's squad. One chance, one goal. He's done it before. 🇸🇦", 54, 17, 160],

    // ══ Belgium vs Iran (Jun 21) ══
    ["bel-irn", "RedDevils",       "Belgium's golden generation is fading but this new squad has real hunger. De Bruyne leading the attack? Elite. Belgium to win comfortably. 🇧🇪", 89, 13, 300],
    ["bel-irn", "IranProud",       "Iran are organised, physical, and dangerous from set pieces. Belgium's zonal marking has been vulnerable this tournament. Could be 1-1.", 67, 11, 270],
    ["bel-irn", "TacticsNerd",     "De Bruyne's position slightly deeper allows Belgium to overload the central zones. Iran will find it very hard to close down and press effectively.", 54, 6, 240],
    ["bel-irn", "xG_Wizard",       "Belgium 68% win probability. Iran have pulled upsets before — they knocked Morocco out in 2018 qualifying. Disciplined and dangerous.", 43, 8, 200],
    ["bel-irn", "RedDevils2",      "Lukaku off the bench in the second half is Belgium's nuclear option. Even at this stage of his career, he's the best impact sub in Europe.", 67, 9, 160],
    ["bel-irn", "IranProud2",      "Carlos Queiroz has turned Iran into a proper defensive unit. Belgian creativity will be tested. Don't expect a walkover. 🇮🇷", 48, 14, 120],

    // ══ Uruguay vs Cape Verde (Jun 21) ══
    ["ury-cpv", "CelesteFan",      "Uruguay have the most experienced squad in South America. Darwin Núñez is terrifying at this level. 3-0 Uruguay easy.", 78, 9, 260],
    ["ury-cpv", "CaboVerde",       "Cape Verde Islands in the World Cup!! We have beaten Morocco and Senegal in recent times. David vs Goliath and David occasionally wins! 🇨🇻", 65, 11, 230],
    ["ury-cpv", "xG_Wizard",       "Uruguay 77% win probability. Cape Verde are compact and disciplined but Uruguay's individual quality should tell. Darwin to score.", 54, 7, 190],
    ["ury-cpv", "CelesteFan2",     "Rodríguez + Darwin + Bentancur is a genuinely elite squad by South American standards. Cape Verde will be brave but Uruguay are clinical.", 43, 5, 150],

    // ══ New Zealand vs Egypt (Jun 22) ══
    ["nzl-egy", "AllWhites",       "New Zealand at the World Cup again! We'll give Egypt a proper game. Our squad is more competitive than 2010. Let's see what we can do. 🇳🇿", 56, 8, 270],
    ["nzl-egy", "EgyptFan",        "Egypt have quality in attack — Salah creates space even when he doesn't score directly. New Zealand will struggle to contain the width.", 67, 11, 240],
    ["nzl-egy", "xG_Wizard",       "Egypt 61% but this is closer than people think. New Zealand's pressing game can be effective against teams who want to play out from the back.", 43, 7, 200],
    ["nzl-egy", "AllWhites2",      "If Salah plays at 100% fitness we lose. If he's not 100%... New Zealand have a real chance here. Big question going into this one.", 54, 9, 160],

    // ══ Argentina vs Austria (Jun 22 — BIG MATCH) ══
    ["arg-aut", "La_Albiceleste",  "Messi at 38, still directing matches with vision nobody else on earth has. Austria will set up to defend but it won't matter. Argentina are too good. 🐐🇦🇷", 287, 43, 620],
    ["arg-aut", "GoatDebater",     "Greatest player in history, going into what could be his final major tournament. Every game Messi plays now is something you'll tell your kids about.", 243, 67, 590],
    ["arg-aut", "MessiFan2026",    "I started watching football because of Messi. He's 38 and still the best player in every game he plays. There's genuinely no explanation for what he does.", 198, 31, 560],
    ["arg-aut", "BuenosAiresBoy",  "Defending world champions with the deepest squad in South America. Mac Allister, De Paul, Álvarez, Di María — this is a machine, not just Messi. VAMOS! 🇦🇷", 176, 28, 530],
    ["arg-aut", "AustriaUltra",    "Austria are not here to make up the numbers. Alaba fit, Sabitzer in form, Arnautovic hungry. We will make Argentina work for every single chance.", 98, 34, 500],
    ["arg-aut", "StatsBaller",     "Messi's passing accuracy when pressured is 91%. When not pressured it's 97%. The man functions at an inhuman level regardless of what you throw at him.", 167, 22, 470],
    ["arg-aut", "DiMariaMVP",      "People always underrate Di María for Argentina. The man shows up on the biggest stages. He'll be involved in the opening goal, I guarantee it. 🔥", 112, 19, 410],
    ["arg-aut", "AustriaUltra2",   "We held Germany to a draw in qualifying. We beat France in a friendly last year. Austria are a proper football nation now. This won't be easy for Argentina.", 67, 41, 350],
    ["arg-aut", "xG_Wizard",       "Argentina's xG per game in 2026 qualifying: 2.8. That's dominant. Austria will sit deep at 4-4-2 low block but Argentina have the patience and quality to break it.", 89, 12, 320],
    ["arg-aut", "La_Albiceleste2", "Three major tournaments for Messi. The patience of a nation finally rewarded in Qatar. And now he comes back for more. We LOVE YOU LEO. 🇦🇷", 156, 24, 260],
    ["arg-aut", "AustriaUltra3",   "ÖSTERREICH!! We have belief and quality. Give us one set piece, one counter-attack, and this changes. ONE CHANCE is all we need!", 54, 29, 200],
    ["arg-aut", "FootballPurist",  "Watching Messi operate in tight spaces is unlike watching any other footballer. It's like watching a different sport. Go and watch tonight even as a neutral.", 67, 5, 140],

    // ══ France vs Iraq (Jun 22) ══
    ["fra-irq", "MbappéMagic",     "France in second gear will still win this. Mbappé's desire for France is on another level — he plays every international like it's his last. 🇫🇷⚡", 134, 21, 520],
    ["fra-irq", "LesBleusFan",     "Best squad depth in world football. Deschamps can rotate five players and France are still comfortably the strongest team in the group. Remarkable.", 112, 17, 490],
    ["fra-irq", "IraqiProud",      "Iraqi football has come so far just to be at this World Cup. Every player on that pitch carries the pride of an entire nation. We fight with everything we have. 🇮🇶", 98, 9, 460],
    ["fra-irq", "TacticsNerd",     "Tchouaméni as defensive pivot frees Rabiot to get forward. Combined with France's inverted fullbacks, they create overloads everywhere simultaneously.", 64, 7, 400],
    ["fra-irq", "IraqiProud2",     "Our goalkeeper has been outstanding in this tournament. He'll keep us in this game for as long as humanly possible. Iraq will FIGHT. 🇮🇶", 76, 8, 340],
    ["fra-irq", "LesBleusFan2",    "Griezmann as a false 9 with Mbappé and Félix wide is a frontline that no defence can comfortably handle for 90 minutes. France are frightening.", 89, 13, 310],
    ["fra-irq", "IraqiProud3",     "To anyone dismissing this as a walkover — we qualified above South Korea. We earned this. Show some respect to Iraq. 🇮🇶", 87, 19, 250],
    ["fra-irq", "MbappéMagic2",    "Mbappé's left-foot shot from outside the box is the most dangerous weapon in world football right now. One half-chance and it's in the net.", 98, 14, 190],

    // ══ Norway vs Senegal (Jun 23 — UPSET ALERT) ══
    ["nor-sen", "HaalandEffect",   "If Haaland is fully fit this could legitimately be the match of the tournament. Norway's directness vs Senegal's physical intensity — this is box office. 😮🇳🇴", 198, 27, 580],
    ["nor-sen", "NorwayViking",    "NORWAY. Haaland + Ødegaard + Sørloth — this golden generation was built for exactly this stage. Don't give away a goal early and we WIN this. 🇳🇴⚡", 167, 34, 550],
    ["nor-sen", "TerrangaLions",   "Senegal will not be intimidated by any European team. Mané leads the attack, Sarr is electric wide, Gueye wins every second ball. LIONS ROAR! 🦁🇸🇳", 154, 28, 520],
    ["nor-sen", "xG_Wizard",       "Genuinely the hardest game to predict in this round. 50/50 by every metric I have. Norway's direct football vs Senegal's counter-attack setup. Coin flip.", 134, 17, 490],
    ["nor-sen", "HaalandEffect2",  "Haaland has scored in 14 consecutive Norway games. Fourteen. He is the most clinical finisher in world football. One chance equals one goal. Simple.", 143, 22, 400],
    ["nor-sen", "TerrangaLions2",  "Idrissa Gana Gueye in midfield is criminally underrated. He'll disrupt Norway's build-up play and frustrate Ødegaard. Senegal's key man tonight.", 87, 11, 370],
    ["nor-sen", "NorwayViking2",   "Ødegaard is the best creative midfielder not named Messi at this tournament. His ability to find space between the lines is world class. Norway believe.", 121, 19, 340],
    ["nor-sen", "AfroFootball",    "Senegal won the Africa Cup of Nations. African football is at this World Cup to WIN, not to participate. People keep learning this lesson slowly.", 98, 14, 310],
    ["nor-sen", "NeutralFan",      "I'm booking out my evening for this one. Could genuinely go either way. Haaland hat-trick or Mané winner in the 90th — both feel possible.", 134, 45, 250],

    // ══ Jordan vs Algeria (Jun 23) ══
    ["jor-alg", "JordanProud",     "Jordan at the World Cup!! Whatever happens tonight is already historic for us. But the players want more than just being here. We fight for every point. 🇯🇴", 89, 12, 520],
    ["jor-alg", "NorthAfricaFC",   "Algeria have the technical quality and the tactical shape to hurt any team. The new generation since Mahrez is hungry and organised. 🇩🇿", 76, 14, 490],
    ["jor-alg", "TacticsNerd",     "Jordan will defend deep and hit on the counter — they don't have the squad to dominate possession. Algeria need to break down a very disciplined block.", 54, 7, 460],
    ["jor-alg", "JordanProud2",    "Al-Taamari is the most dangerous player in Jordan's squad. He causes problems for any defence when he gets the ball to run at. Watch him tonight.", 43, 6, 420],
    ["jor-alg", "NorthAfricaFC2",  "Algeria's midfield presses high and wins the ball early. Jordan will struggle to build from the back. This could get comfortable for Algeria.", 61, 9, 380],
    ["jor-alg", "xG_Wizard",       "Algeria 64% win probability. But Jordan's organisation at the back has been excellent this tournament. Could be a tight, low-scoring game.", 48, 8, 340],

    // ══ Portugal vs Uzbekistan (Jun 23 — BIG MATCH) ══
    ["por-uzb", "CR7Forever",      "Ronaldo is going to be the difference here. He's still one of the most dangerous players in world football at set pieces and in the box. Expect him to deliver. 🇵🇹", 178, 34, 580],
    ["por-uzb", "LisbonLad",       "People focus on Ronaldo but forget: Félix, Leão, Bernardo Silva, Vitinha, Cancelo. Portugal's squad BEYOND Ronaldo is genuinely world class. A complete team.", 134, 19, 550],
    ["por-uzb", "UzbekStar",       "Uzbekistan are NOT the team people think we are. Our players compete in top leagues across Europe and Asia. Central Asian football is growing fast. 🇺🇿", 98, 26, 520],
    ["por-uzb", "TacticsNerd",     "Portugal's press under Martínez is elite. Bernardo Silva's off-ball movement creates numerical advantages everywhere. Most complete team in the tournament.", 87, 11, 490],
    ["por-uzb", "UzbekStar2",      "Our fans have travelled thousands of kilometres for this. Our players have worked their entire lives for this moment. We will give EVERYTHING. 🇺🇿❤️", 76, 8, 460],
    ["por-uzb", "LisbonLad2",      "Bruno Fernandes in the form of his career — scoring, creating, tracking back. He might be the best midfielder in this tournament not named Modrić.", 89, 14, 430],
    ["por-uzb", "CR7Forever2",     "Ronaldo at 41 is still competing at the highest level. Whether you love him or not, what he's doing to the physical limits of football is remarkable.", 112, 41, 400],
    ["por-uzb", "PortuFan88",      "Portugal have the best wide pairing in the tournament with Félix and Leão. Uzbekistan's full-backs are in for a very, very long evening.", 98, 12, 360],
    ["por-uzb", "UzbekStar3",      "We held a strong opposition to a tighter game in qualifying than anyone expected. The players are ready and the nation is watching. 🇺🇿", 67, 15, 320],
    ["por-uzb", "TacticsNerd2",    "Pepe at centre-back at 43 is still working because of elite positioning and reading of the game. What he's lost physically he compensates for with experience.", 78, 6, 280],
    ["por-uzb", "FootballPurist",  "Watching Bernardo Silva and Vitinha link up in midfield is genuinely beautiful football. Uzbekistan will have to be very disciplined to limit them.", 67, 5, 240],

    // ══ England vs Ghana (Jun 23) ══
    ["eng-gha", "ThreeLions",      "FOOTBALL IS COMING HOME. Proper striker, fearless manager, squad that believes in itself. This group has something different. THREE LIONS. 🏴󠁧󠁢󠁥󠁮󠁧󠁿🦁", 198, 34, 560],
    ["eng-gha", "GhanaStars",      "Ghana knocked out Uruguay with that Suárez handball in 2010. We nearly ended England's 2006 campaign. The Black Stars are dangerous. Never sleep on us. 🇬🇭⭐", 156, 28, 530],
    ["eng-gha", "xG_Wizard",       "England's eternal problem isn't quality, it's performing under pressure. The xG always looks great. The question is always the same: can they deliver when it matters?", 178, 41, 500],
    ["eng-gha", "MatchdayMike",    "Bukayo Saka vs Ghana's left back is the game within the game. Saka gets space in behind and England have a very comfortable evening. Watch that duel.", 112, 13, 440],
    ["eng-gha", "GhanaStars2",     "Mohammed Kudus is genuinely elite — Real Madrid want him for a reason. He'll cause England real problems with his movement and direct running tonight.", 98, 21, 410],
    ["eng-gha", "ThreeLions2",     "Bellingham has that rare quality of always being in the right place at the crucial moment. He's England's talisman and tonight he delivers. 🏴󠁧󠁢󠁥󠁮󠁧󠁿", 143, 17, 380],
    ["eng-gha", "GhanaStars3",     "We have players in Premier League, Bundesliga, Serie A. Ghana are not amateurs. The gap between African and European football is closing rapidly. 🇬🇭🔥", 112, 14, 320],
    ["eng-gha", "ThreeLions3",     "If England go out of this tournament in the group stage with this squad, I genuinely think it would be the biggest England failure in history. No excuses.", 134, 52, 260],
    ["eng-gha", "FootballNerd",    "England's golden generation of Lampard, Gerrard and Beckham never won a tournament with arguably more quality. This new group has a chance to fix that.", 78, 9, 220],

    // ══ Panama vs Croatia (Jun 23) ══
    ["pan-cro", "PanamaForever",   "PANAMA IS BACK at the World Cup!! Nothing to lose against Croatia. Organised, disciplined, and ready to make history again for our nation. 🇵🇦", 67, 11, 480],
    ["pan-cro", "CroatiaFan",      "Modrić still pulling strings at 40. If he's fit and motivated, Croatia can beat anyone in world football. He's proved it against better opposition than Panama.", 89, 14, 450],
    ["pan-cro", "TacticsNerd",     "Croatia's midfield — Kovačić, Brozović, Modrić — is one of the most experienced engines in the tournament. Panama will find it very hard to press effectively.", 67, 7, 420],
    ["pan-cro", "PanamaForever2",  "Panama's defensive structure is excellent. We held the US to a draw in qualifying. Croatia will need to be patient and creative to break us down.", 48, 8, 380],
    ["pan-cro", "xG_Wizard",       "Croatia 67% win probability. But Panama are disciplined at the back and this could genuinely end 1-0 either way. Set piece danger for both sides.", 56, 9, 340],
    ["pan-cro", "CroatiaFan2",     "Last time Croatia were written off at a World Cup they reached the final. Never bet against this team in a tournament format. Never.", 78, 12, 300],

    // ══ Colombia vs Congo DR (Jun 24) ══
    ["col-cod", "CaféColombia",    "Colombia have serious quality — Luís Díaz and Cuadrado wide is terrifying for any full-back. Congo DR will have to defend very deep tonight. ☕🇨🇴", 87, 12, 440],
    ["col-cod", "CongoDR",         "Congo DR are here on merit. African football deserves more respect than it gets. We'll show tonight what this continent can produce at the highest level. 🇨🇩", 65, 9, 410],
    ["col-cod", "xG_Wizard",       "Colombia 72% win probability. But Congo DR have pace on the counter and Cédric Bakambu is dangerous if he gets chances. Not a foregone conclusion.", 54, 7, 370],
    ["col-cod", "CaféColombia2",   "James Rodríguez era is over but Luís Díaz carries that creative burden brilliantly. He's been the best South American player in this tournament so far.", 76, 10, 330],

    // ══ Scotland vs Brazil (Jun 24 — GIANT KILLING HOPE) ══
    ["sco-bra", "TartanArmy",      "COME ON SCOTLAND!! Absolutely nothing to lose against Brazil. Play like it's the last game any of you will ever play. Make the nation PROUD. 🏴󠁧󠁢󠁳󠁣󠁴󠁿🔥", 234, 29, 620],
    ["sco-bra", "SambaKing",       "Brazil's squad depth is genuinely frightening. If Vinicius or Endrick get going it becomes a very difficult evening for Scotland very quickly. 🇧🇷", 198, 23, 590],
    ["sco-bra", "TartanArmy2",     "Gordon Banks made THAT save against Brazil in 1970. Archie Gemmill scored THAT goal against Netherlands in 1978. Scotland CAN produce legendary moments. BELIEVE. 🏴󠁧󠁢󠁳󠁣󠁴󠁿", 121, 15, 560],
    ["sco-bra", "xG_Wizard",       "Scotland away against Brazil. This is a situation where xG completely falls apart. Scotland will give 150% effort. Whether effort is enough is the question.", 154, 17, 530],
    ["sco-bra", "EndrickWatch",    "If Endrick starts from minute one this could be a historic performance from a teenager on the biggest stage. The kid is extraordinary. 19 and fearless. 🇧🇷", 143, 21, 500],
    ["sco-bra", "TartanArmy3",     "The Tartan Army will be DEAFENING in that stadium. We might be outnumbered on the pitch but we are NEVER outsung in the stands. 🏴󠁧󠁢󠁳󠁣󠁴󠁿🎵", 112, 11, 470],
    ["sco-bra", "SambaKing2",      "Rodrygo + Vinicius + Endrick. Three of the most exciting wide forwards in world football. Scotland's defence is going to be tested to its absolute limit.", 167, 22, 440],
    ["sco-bra", "FootballNerd",    "2026 Scotland might be the best squad they've ever assembled. Premier League stars, Champions League regulars. They won't be just making up the numbers.", 87, 13, 400],
    ["sco-bra", "TartanArmy4",     "If Scotland score first — and the stadium will literally shake if they do — this becomes the greatest night in Scottish football history. Dream big. 🏴󠁧󠁢󠁳󠁣󠁴󠁿", 134, 9, 360],
    ["sco-bra", "SambaKing3",      "Deep respect for Scotland's passion. But Brazil have the most talented squad they've had since 2002. We will win, but it won't be easy. Scotland will fight.", 145, 31, 320],
    ["sco-bra", "NeutralFan",      "Scotland vs Brazil is must-watch television for one reason above all others: the sheer noise and passion of the Tartan Army when Scotland play well.", 98, 7, 280],
  ];

  let count = 0;
  for (const [matchId, username, body, likes, dislikes, minutesAgo] of comments) {
    const ts = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    await sql`INSERT INTO match_comments (match_id, email, username, body, likes, dislikes, created_at)
      VALUES (${matchId}, NULL, ${username}, ${body}, ${likes}, ${dislikes}, ${ts})`;
    count++;
  }

  return NextResponse.json({ ok: true, reactions: reactions.length, comments: count });
}
