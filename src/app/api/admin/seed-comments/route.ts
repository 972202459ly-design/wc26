import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const maxDuration = 60;

// Comments cover live + upcoming fixtures (Jun 21 onwards, incl. matchday 3).
// Past matches: reactions only — no fabricated post-match comments.
// Tone is real football-internet banter; all strictly pre-match (no scorelines,
// no betting/odds language — keeps it AdSense-safe).

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
    // Matchday 3 (Jun 25-28)
    ["ecu-ger",  { fire: 221, ball: 167, shock: 73  }],
    ["ury-esp",  { fire: 287, ball: 198, shock: 91  }],
    ["col-por",  { fire: 356, ball: 234, shock: 142 }],
    ["jor-arg",  { fire: 498, ball: 287, shock: 88  }],
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
  // Pre-match banter only — no fabricated scorelines, no betting/odds talk.
  // Tone: real football-internet energy — hot takes, meltdowns, jokes, banter.
  type C = [string, string, string, number, number, number];
  const comments: C[] = [

    // ══ Spain vs Saudi Arabia (Jun 21) ══
    ["esp-ksa", "yamal_szn",        "yamal is 18 and already the best dribbler on the planet. saudi defenders gonna need google maps to find him tonight 🗺️", 142, 11, 320],
    ["esp-ksa", "greenfalcon_77",   "everyone forgot we beat ARGENTINA in 2022. we are not here for tourism. respect the green falcons 🇸🇦", 96, 24, 300],
    ["esp-ksa", "notreadingallthat", "spain gonna pass it 900 times then yamal does something illegal in the 80th min. you already know the script", 118, 7, 270],
    ["esp-ksa", "tikitaka_enjoyer",  "pedri and gavi run a midfield like it's a group chat only they're in. nobody else invited", 88, 5, 230],
    ["esp-ksa", "ai_says",          "the model has spain at 81% but football doesn't read spreadsheets. saudi sit deep and counter, this could be 1-0 for an hour easy", 64, 6, 190],
    ["esp-ksa", "alhilal_til_i_die", "al-dawsari only needs ONE chance. we've all seen what he does with one chance. spain stay pressed pls 🙏🇸🇦", 51, 14, 150],

    // ══ Belgium vs Iran (Jun 21) ══
    ["bel-irn", "kdb_apologist",     "de bruyne could thread a pass through a keyhole from 40 yards while half asleep. iran's backline about to suffer", 91, 9, 290],
    ["bel-irn", "teammelli_4ever",   "queiroz turned us into a wall. belgium gonna have 70% possession and nothing to show for it. screenshot this 🧱🇮🇷", 77, 16, 260],
    ["bel-irn", "redagain",         "belgium's golden generation: the sequel nobody asked for but here we are. pls don't break my heart again lads 🇧🇪😭", 84, 12, 220],
    ["bel-irn", "lukaku_truther",    "put big rom on at 60 mins and watch the whole game change. he's washed they say. washed men don't bully centre backs", 63, 22, 170],
    ["bel-irn", "ai_says",          "model says belgium 68%. iran's set pieces are genuinely scary though. one corner and the whole vibe flips", 47, 5, 130],

    // ══ Uruguay vs Cape Verde (Jun 21) ══
    ["ury-cpv", "garra_charrua",     "darwin nunez will either score 4 or hit the corner flag 4 times. there is no in between and that's why we love him 🇺🇾", 103, 8, 250],
    ["ury-cpv", "cabo_verde_dreams", "smallest country at the world cup. 500k people. we are ALL watching the same screen tonight. history either way 🇨🇻❤️", 89, 4, 220],
    ["ury-cpv", "bielsa_disciple",   "bielsa has uruguay pressing like their lives depend on it. cape verde brave but this is a different intensity", 54, 6, 180],
    ["ury-cpv", "ai_says",          "uruguay 77% per the model. darwin to miss 3 sitters then score the winner. it's the uruguayan way", 61, 7, 140],

    // ══ New Zealand vs Egypt (Jun 22) ══
    ["nzl-egy", "allwhites_mate",    "nz at a world cup again and we're all pretending we know the offside rule. ride the wave lads 🇳🇿", 58, 6, 250],
    ["nzl-egy", "mosalah_szn",       "salah doesn't even need to score to win a game. he bends the whole defence toward him. egypt by 2 🇪🇬", 72, 11, 220],
    ["nzl-egy", "ai_says",          "egypt 61% but it's closer than it looks. if salah's not 100% fit this is a real banana skin", 41, 5, 180],

    // ══ Argentina vs Austria (Jun 22 — BIG MATCH) ══
    ["arg-aut", "messi_walked_dog",  "man is 38 and still making centre backs file for emotional damage. enjoy him while he's here, we won't see another 🐐🇦🇷", 312, 38, 600],
    ["arg-aut", "10yearsofpain",     "if argentina lose i'm not going to work tomorrow. or the day after. this is a medical condition at this point 🇦🇷", 247, 19, 560],
    ["arg-aut", "austria_andy",      "everyone in here typing love letters to messi like that's gonna stop alaba and our low block. we WILL make this ugly 🇦🇹", 188, 71, 530],
    ["arg-aut", "depaul_bodyguard",  "de paul runs 14km a game just so messi doesn't have to walk. greatest hype man in sports history honestly", 164, 13, 490],
    ["arg-aut", "vamos_carajo",      "DI MARIA on the big stage again. man only shows up for finals and important nights. tonight counts. VAMOS 🔥🇦🇷", 142, 16, 440],
    ["arg-aut", "neutral_enjoyer",   "i don't even support argentina i just want to say i watched messi live one more time before he retires. setting an alarm for this", 156, 7, 400],
    ["arg-aut", "austria_andy2",     "we held germany. we beat france in a friendly. austria are a proper side now. keep underestimating us, it's fuel 🇦🇹", 88, 34, 350],
    ["arg-aut", "ai_says",          "model has argentina dominating, austria parking 11 men in a phone booth. messi's patience vs their discipline is the whole game", 79, 9, 300],
    ["arg-aut", "scaloneta_real",    "the depth is unfair. alvarez, lautaro, mac allister, enzo... you take messi off and they're STILL the best team here", 118, 11, 240],
    ["arg-aut", "just_here_4_leo",   "telling my grandkids i was online watching the messi farewell tour. crying typing this and the game hasn't started 😭🇦🇷", 134, 28, 180],

    // ══ France vs Iraq (Jun 22) ══
    ["fra-irq", "mbappe_left_foot",  "france in 2nd gear still beats most teams in 5th. mbappe gonna jog around then score from his own half or something ⚡🇫🇷", 128, 17, 480],
    ["fra-irq", "lesbleus_deep",     "deschamps could field the SUBS and still win the group. the depth is borderline illegal. embarrassment of riches", 102, 14, 450],
    ["fra-irq", "lions_of_meso",     "iraq at a world cup. you have no idea what this means back home. every player carries a whole country tonight 🇮🇶❤️", 114, 6, 420],
    ["fra-irq", "iraq_til_death",    "people calling this a walkover. we qualified above south korea. SHOW RESPECT. lions of mesopotamia don't fold 🦁🇮🇶", 96, 21, 350],
    ["fra-irq", "ai_says",          "france are massive favourites per the model obviously. but they ALWAYS sleepwalk the group stage. 1-0 snoozefest incoming maybe", 67, 8, 280],

    // ══ Norway vs Senegal (Jun 23 — must watch) ══
    ["nor-sen", "haaland_cyborg",    "haaland scored in like 14 straight for norway. the man is not human, he's a striker-shaped machine. one chance = one goal 🤖🇳🇴", 208, 22, 560],
    ["nor-sen", "teranga_roar",      "senegal are AFCON champions and people keep treating us like underdogs. africa came to WIN not wave flags 🦁🇸🇳", 187, 26, 530],
    ["nor-sen", "odegaard_pass",     "haaland gets the headlines but odegaard is the brain. best playmaker here not named messi. norway believe 🇳🇴", 124, 14, 490],
    ["nor-sen", "ai_says",          "genuinely the only 50/50 game of the round. every number i have says coin flip. norway power vs senegal pace, no idea who wins", 142, 9, 440],
    ["nor-sen", "gana_gueye_stan",   "gueye eats midfielders for breakfast and he's STILL underrated. odegaard gonna have a quiet one tonight, mark it 🇸🇳", 88, 12, 380],
    ["nor-sen", "match_of_the_day",  "blocking out my whole evening for this one. haaland hat trick or mane 90th min winner, both feel equally possible. box office", 116, 6, 300],
    ["nor-sen", "norway_finally",    "we've got haaland AND odegaard at a world cup. do you understand how long norwegians waited for this?? don't fumble it lads 🇳🇴🙏", 97, 15, 220],

    // ══ Jordan vs Algeria (Jun 23) ══
    ["jor-alg", "nashama_pride",     "jordan at a WORLD CUP. whatever happens we already won. but the lads want more than vibes tonight 🇯🇴", 84, 9, 470],
    ["jor-alg", "desert_foxes_dz",   "algeria have the talent to hurt anyone when we're switched on. problem is we're allergic to being switched on. pls focus lads 🇩🇿", 71, 13, 430],
    ["jor-alg", "altaamari_watch",   "al-taamari is jordan's whole attack and he's genuinely a problem. give him grass to run into and algeria suffer", 48, 7, 380],
    ["jor-alg", "ai_says",          "model leans algeria but jordan have been so organised at the back. smells like a 1-0 either way kind of night", 39, 6, 320],

    // ══ Portugal vs Uzbekistan (Jun 23 — BIG MATCH) ══
    ["por-uzb", "siuuu_enjoyer",     "ronaldo at 41 still got a vertical jump that defies physics. man hangs in the air longer than my wifi. siuuu incoming 🚀🇵🇹", 196, 31, 560],
    ["por-uzb", "beyond_ronaldo",    "everyone obsesses over CR7 but portugal's bench could win a different world cup. leao, felix, bernardo, vitinha... it's not fair", 148, 17, 530],
    ["por-uzb", "uzbek_white_wolves", "central asia at the world cup for the FIRST time. you don't know our players yet. you will after this tournament 🐺🇺🇿", 119, 24, 500],
    ["por-uzb", "here_for_the_cope",  "not me showing up just to watch the comment section meltdown when uzbekistan score first 🍿", 132, 28, 460],
    ["por-uzb", "white_wolves_2",     "we travelled thousands of km, our players grinded their whole lives for one night. underestimate us, please. we love that 🇺🇿❤️", 87, 9, 420],
    ["por-uzb", "bruno_penalty",      "bruno fernandes either runs the whole game or disappears for 80 mins. flip a coin. but tonight feels like a 'runs it' night 🇵🇹", 94, 16, 370],
    ["por-uzb", "ai_says",           "portugal heavy favourites per the model. but cup debutants on adrenaline are dangerous for 30 mins. survive the start and they're fine", 71, 7, 320],
    ["por-uzb", "pepe_is_immortal",   "pepe is 43 and still out here ready to commit war crimes in the box. man will outlive us all. legend behaviour 😂🇵🇹", 108, 11, 260],

    // ══ England vs Ghana (Jun 23) ══
    ["eng-gha", "its_coming_home",   "FOOTBALL'S COMING HOME (i say this every tournament and get hurt every tournament but THIS year lads. THIS year) 🏴󠁧󠁢󠁥󠁮󠁧󠁿🦁", 204, 33, 540],
    ["eng-gha", "blackstars_4ever",  "ghana sent uruguay home in 2010 and nearly ended england in 2006. we have history with breaking hearts. sleep on us, we dare you ⭐🇬🇭", 168, 25, 510],
    ["eng-gha", "ai_says",          "england's xG is always gorgeous. the trophy cabinet is always empty. the model can't measure bottling, that's the one variable 😬", 189, 38, 470],
    ["eng-gha", "kudus_problem",     "kudus is going to give the england right back actual nightmares. quote me. real madrid don't want him for no reason 🇬🇭", 102, 14, 410],
    ["eng-gha", "saka_szn",         "saka vs their fullback is the whole game. starboy gets in behind and it's a long night for ghana. simple as 🏴󠁧󠁢󠁥󠁮󠁧󠁿", 96, 12, 350],
    ["eng-gha", "tuchel_in",        "if england go out in the GROUP with this squad it's officially the funniest thing to ever happen to me. please don't but also kind of want it", 144, 47, 280],
    ["eng-gha", "ghana_diaspora",    "premier league, bundesliga, serie a — our lads play everywhere. ghana are not tourists. the black stars came to dance 🇬🇭🔥", 88, 11, 210],

    // ══ Panama vs Croatia (Jun 23) ══
    ["pan-cro", "panama_canaleros",  "PANAMA back at the world cup with nothing to lose. play free, scare a big nation, make the canal proud 🇵🇦", 74, 10, 460],
    ["pan-cro", "modric_forever",    "modric is 40 and still passing like he's got a cheat code. man's been elite since flip phones existed. respect the maestro 🇭🇷", 96, 12, 430],
    ["pan-cro", "vatreni_til_end",   "every world cup people write croatia off and every world cup we go deep. it's a tradition at this point. never bet against the checkerboard", 82, 14, 380],
    ["pan-cro", "ai_says",          "croatia favourites but panama are stubborn and this screams 1-0 grind. modric magic moment decides it probably", 53, 7, 320],

    // ══ Colombia vs Congo DR (Jun 24) ══
    ["col-cod", "cafetero_luis",     "luis diaz is the best south american at this tournament and it's not even close right now. congo's fullback in danger ☕🇨🇴", 91, 11, 440],
    ["col-cod", "leopards_rise",     "congo dr here on pure merit. africa keeps proving the doubters wrong every single tournament. watch us tonight 🇨🇩", 68, 9, 410],
    ["col-cod", "ai_says",          "colombia clear favourites per model but bakambu on the counter is a real threat. one mistake and it's a game", 49, 6, 360],
    ["col-cod", "james_era_over",    "james era done but diaz carries the creative load now. colombia look genuinely scary going forward this tournament 🇨🇴", 62, 8, 300],

    // ══ Scotland vs Brazil (Jun 24 — giant killing hope) ══
    ["sco-bra", "tartan_army_loud",  "SCOTLAND vs BRAZIL. nothing to lose. play like it's the last game of your life and let the army sing 🏴󠁧󠁢󠁳󠁣󠁴󠁿🔥", 238, 27, 600],
    ["sco-bra", "samba_supremacy",   "vini, rodrygo, endrick all in one front three. scotland's defenders gonna need a lie down by half time 🇧🇷", 201, 21, 570],
    ["sco-bra", "gemmill_1978",      "archie gemmill scored THAT goal. gordon banks made THAT save vs brazil. scotland CAN make magic. i refuse to be normal about this 🏴󠁧󠁢󠁳󠁣󠁴󠁿", 134, 13, 530],
    ["sco-bra", "ai_says",          "this is the game where xG goes to die. scotland will run through walls. whether running through walls beats brazil is the question 😅", 162, 16, 490],
    ["sco-bra", "endrick_loading",   "if endrick starts this could be a teenager announcing himself to the planet. 19 and zero fear. scary stuff 🇧🇷", 121, 18, 430],
    ["sco-bra", "no_scotland_no",    "the tartan army will out-sing 11 brazilians, 50,000 neutrals and the stadium PA combined. we lose everything but the noise 🏴󠁧󠁢󠁳󠁣󠁴󠁿🎵", 116, 9, 360],
    ["sco-bra", "respect_scotland",  "brazilian here. huge respect for scotland's passion, genuinely. but we have the best squad since 2002. it'll be a battle though 🇧🇷", 138, 29, 290],

    // ══ Ecuador vs Germany (Jun 25 — matchday 3) ══
    ["ecu-ger", "tricolor_ecu",      "ecuador's midfield is young, fearless and runs forever. germany better not sleepwalk this one or we punish them 🇪🇨", 79, 10, 220],
    ["ecu-ger", "dfb_rebuild",       "this new germany actually plays with joy again. wirtz and musiala on the same pitch is borderline unfair 🇩🇪", 92, 13, 200],
    ["ecu-ger", "ai_says",          "model leans germany but ecuador are a proper banana skin. physical, organised, dangerous on the break. closer than the odds suggest", 51, 6, 160],

    // ══ Uruguay vs Spain (Jun 27 — group decider) ══
    ["ury-esp", "garra_charrua",     "uruguay vs spain for top spot. bielsa's pressing machine vs spain's passing carousel. this is a proper heavyweight clash 🇺🇾🇪🇸", 118, 12, 180],
    ["ury-esp", "tikitaka_enjoyer",  "spain will have 65% possession and uruguay will spend 90 mins trying to kick them off the park. classic styles clash. love to see it", 96, 9, 150],
    ["ury-esp", "ai_says",          "tightest game of the matchday by far per the model. group could come down to goal difference. nobody's parking the bus here", 64, 5, 120],

    // ══ Colombia vs Portugal (Jun 27 — Ronaldo big one) ══
    ["col-por", "siuuu_enjoyer",     "ronaldo vs luis diaz's colombia. CR7 lives for these big nights. don't give him a sniff in the box or it's curtains 🇵🇹", 134, 19, 170],
    ["col-por", "cafetero_luis",     "diaz vs portugal's fullbacks is must-see tv. colombia are NOT here to roll over for ronaldo's highlight reel ☕🇨🇴", 112, 14, 140],
    ["col-por", "ai_says",          "genuinely even on paper per the model. two elite attacking sides, could be a 3-3 thriller or a tense 1-0. either way appointment viewing", 71, 6, 100],

    // ══ Jordan vs Argentina (Jun 28 — Messi watch) ══
    ["jor-arg", "messi_walked_dog",  "another night to just watch messi exist on a football pitch. cherish it. the countdown to the end is real 🐐🇦🇷", 156, 14, 90],
    ["jor-arg", "nashama_pride",     "jordan vs the world champions. we get to share a pitch with MESSI. pinch me. but we're not just here for selfies, we fight 🇯🇴", 98, 11, 70],
    ["jor-arg", "ai_says",          "argentina overwhelming favourites obviously. but jordan's block is stubborn. messi will need one moment of magic to crack it, and he has plenty", 58, 5, 50],

    // ══ Long tail — low/zero-engagement walk-ins (realistic comment section) ══
    ["esp-ksa", "mariodvd",         "here we go 🍿", 0, 0, 95],
    ["esp-ksa", "kevin_t89",        "streaming this at work, wish me luck", 2, 0, 88],
    ["esp-ksa", "lateef.k",         "yamal my goat 🐐", 1, 0, 76],
    ["esp-ksa", "noura___",         "green falcons today inshallah 🇸🇦", 3, 1, 64],
    ["esp-ksa", "donpedro22",       "spain gonna make this boring i can feel it", 0, 0, 41],
    ["esp-ksa", "ghassan_99",       "anyone got a working stream link", 0, 2, 33],
    ["esp-ksa", "the_real_javi",    "vamos espana 🇪🇸", 1, 0, 18],

    ["bel-irn", "tom_vh",           "kdb day is the best day", 1, 0, 92],
    ["bel-irn", "persian_pride_",   "iran 🇮🇷🦁 lets see", 2, 0, 70],
    ["bel-irn", "wafflesnbeer",     "belgium always finds a way to stress me out", 0, 0, 55],
    ["bel-irn", "amir.gh",          "queiroz ball incoming, 0-0 till the 85th", 1, 0, 39],
    ["bel-irn", "just_a_neutral",   "no strong opinion just want goals", 0, 0, 21],

    ["ury-cpv", "matias_uy",        "darwin pls just one tap in today 🙏", 2, 0, 80],
    ["ury-cpv", "ilhademaio",       "cape verde 🇨🇻 the whole island is watching", 4, 0, 61],
    ["ury-cpv", "celeste10",        "garra charrua 🇺🇾", 0, 0, 44],
    ["ury-cpv", "randomfan2026",    "first time seeing cape verde play, here for it", 1, 0, 25],

    ["nzl-egy", "kiwi_dave",        "up the all whites 🇳🇿", 1, 0, 78],
    ["nzl-egy", "salah_szn_",       "mo just needs one moment", 0, 0, 50],
    ["nzl-egy", "cairo_ahmed",      "egypt 🇪🇬 lets go", 2, 0, 30],

    ["arg-aut", "leo_forever_",     "VAMOS 🇦🇷🇦🇷", 5, 0, 240],
    ["arg-aut", "wieneradler",      "österreich oida 🇦🇹", 3, 1, 210],
    ["arg-aut", "santi.bsas",       "cant focus at work today, it's matchday", 4, 0, 175],
    ["arg-aut", "mateo_arg10",     "messi 🐐 nothing else to say", 2, 0, 150],
    ["arg-aut", "fran_arg",         "nervous and it's literally austria lol", 1, 0, 120],
    ["arg-aut", "klausi1990",       "we just need to frustrate them for 70 min", 0, 0, 95],
    ["arg-aut", "neutral_guy44",    "tuning in just for leo, won't lie", 3, 0, 70],
    ["arg-aut", "diego_77",         "10 vs 10 we lose but messi makes it 11.5 vs 10", 6, 1, 45],
    ["arg-aut", "anna_vie",         "alaba carry us pls", 1, 0, 28],

    ["fra-irq", "kyl_paris",        "allez les bleus 🇫🇷", 2, 0, 200],
    ["fra-irq", "baghdad_boy",      "iraq 🇮🇶 proud no matter what", 4, 0, 160],
    ["fra-irq", "midfieldgeneral_", "france second string still terrifying", 1, 0, 110],
    ["fra-irq", "samir.iq",         "our keeper about to have the night of his life", 3, 0, 75],
    ["fra-irq", "justwatching__",   "mbappe vs a tired iraqi defence, ouch", 0, 0, 40],

    ["nor-sen", "bergen_ole",       "haaland 🇳🇴🤖", 3, 0, 230],
    ["nor-sen", "dakarlion",        "senegal 🦁🇸🇳 africa stand up", 5, 0, 195],
    ["nor-sen", "thabo_m",          "this is the only game i care about today", 2, 0, 150],
    ["nor-sen", "viking_erik",      "if we don't concede early we win this", 1, 0, 100],
    ["nor-sen", "popcorn_ready",    "biggest game of the round and it's not close 🍿", 4, 0, 60],
    ["nor-sen", "saliou_sn",        "gueye gonna boss that midfield watch", 2, 0, 35],

    ["jor-alg", "amman_kid",        "nashama 🇯🇴 history already", 3, 0, 180],
    ["jor-alg", "dz_karim",         "one one nation 🇩🇿 lets focus today", 2, 1, 130],
    ["jor-alg", "neutral_obs",      "rooting for jordan ngl, love an underdog", 1, 0, 70],

    ["por-uzb", "ronaldo7_pt",      "SIUUU 🇵🇹🚀", 6, 1, 200],
    ["por-uzb", "tashkent_aziz",    "uzbekistan 🇺🇿 first world cup vibes are unreal", 5, 0, 165],
    ["por-uzb", "leao_enjoyer",     "watch leao not ronaldo, that's the play", 2, 0, 120],
    ["por-uzb", "porto_guy",        "bruno or vitinha runs this. uzbeks beware", 1, 0, 85],
    ["por-uzb", "just_popcorn",     "came for ronaldo staying for the comment wars 🍿", 4, 0, 50],
    ["por-uzb", "umid_uz",          "we are not just happy to be here. believe 🇺🇿", 3, 0, 22],

    ["eng-gha", "harry_lfc",        "it's coming home (copium) 🏴󠁧󠁢󠁥󠁮󠁧󠁿", 4, 1, 210],
    ["eng-gha", "accra_kwame",      "black stars ⭐🇬🇭 dance time", 5, 0, 170],
    ["eng-gha", "saka_7",           "starboy szn 🌟", 2, 0, 125],
    ["eng-gha", "doomer_eng",       "we're gonna bottle it i can feel it already", 3, 0, 90],
    ["eng-gha", "kojo_gh",          "kudus about to embarrass someone today", 4, 0, 55],
    ["eng-gha", "neutral_nick",     "england comment sections are pure comedy 😂", 6, 0, 30],

    ["pan-cro", "canalero_jose",    "PANAMA 🇵🇦 nothing to lose lets dance", 2, 0, 150],
    ["pan-cro", "zagreb_luka",      "modric 🐐 one more magic night pls 🇭🇷", 4, 0, 110],
    ["pan-cro", "ref_watcher",      "croatia always grind these out somehow", 1, 0, 60],

    ["col-cod", "bogota_andres",    "mi seleccion 🇨🇴☕ vamos", 2, 0, 130],
    ["col-cod", "kinshasa_j",       "congo 🇨🇩 leopards rise", 3, 0, 95],
    ["col-cod", "diaz_stan",        "lucho is HIM right now", 1, 0, 45],

    ["sco-bra", "glasgow_gav",      "no scotland no party 🏴󠁧󠁢󠁳󠁣󠁴󠁿", 5, 0, 220],
    ["sco-bra", "rio_thiago",       "brasil 🇧🇷🟡 just enjoy the samba", 4, 0, 180],
    ["sco-bra", "tartan_lass",      "we're gonna lose and i'll still cry happy tears", 6, 0, 140],
    ["sco-bra", "endrick_hype",     "endrick about to go viral worldwide today", 2, 0, 95],
    ["sco-bra", "neutral_sam",      "watching purely for the tartan army singing 🎵", 3, 0, 50],

    ["ecu-ger", "quito_dani",       "ecuador 🇪🇨 fearless today pls", 1, 0, 120],
    ["ecu-ger", "berlin_max",       "wirtz + musiala is just unfair 🇩🇪", 3, 0, 80],
    ["ecu-ger", "ai_doubter",       "the ai underrates ecuador every time imo", 2, 0, 40],

    ["ury-esp", "monte_uy",         "two great styles colliding, can't wait 🇺🇾🇪🇸", 3, 0, 90],
    ["ury-esp", "madrid_pau",       "spain to pass them into the ground", 2, 1, 55],
    ["ury-esp", "groupwatcher",     "this decides the group, huge", 1, 0, 25],

    ["col-por", "lucho_col",        "diaz vs ronaldo, appointment tv ☕🇨🇴", 4, 0, 70],
    ["col-por", "cr7_til_i_die",    "doubt him again, go on 🇵🇹", 3, 1, 45],
    ["col-por", "popcorn_pls",      "this might be the game of the group stage 🍿", 2, 0, 20],

    ["jor-arg", "amman_layla",      "we share a pitch with MESSI 🇯🇴😭", 4, 0, 60],
    ["jor-arg", "vamos_again",      "leo farewell tour continues 🇦🇷🐐", 3, 0, 35],
    ["jor-arg", "neutral_fan_x",    "tuning in for messi one more time", 1, 0, 15],
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
