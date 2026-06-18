import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL env var is required. Run: DATABASE_URL=... node scripts/seed-players.mjs");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// Individual leaderboard bots — scores 1100–2400, beatable by active players
const players = [
  { name:"GoalMachine",   team:"arg", pts:2380, wins:8, bets:11 },
  { name:"PredictorX",    team:"bra", pts:2210, wins:7, bets:10 },
  { name:"xGWizard",      team:"fra", pts:2050, wins:6, bets:9  },
  { name:"TacticalFan",   team:"eng", pts:1920, wins:6, bets:10 },
  { name:"MatchAnalyst",  team:"esp", pts:1780, wins:5, bets:9  },
  { name:"BallTracker",   team:"ger", pts:1650, wins:5, bets:8  },
  { name:"FinalWhistle",  team:"por", pts:1520, wins:4, bets:8  },
  { name:"OffsideTrap",   team:"ned", pts:1410, wins:4, bets:7  },
  { name:"DeadballKing",  team:"usa", pts:1290, wins:3, bets:7  },
  { name:"SweepstakePro", team:"mex", pts:1180, wins:3, bets:6  },
  { name:"SetPieceGuru",  team:"jpn", pts:1130, wins:2, bets:6  },
  { name:"CounterPress",  team:"mar", pts:1090, wins:2, bets:5  },
];

const matchPool = [
  ["arg-pol","home"], ["bra-ser","home"], ["fra-dnk","home"],
  ["eng-wal","home"], ["esp-ger","away"], ["por-ury","home"],
  ["mar-can","home"], ["ned-swe","home"], ["usa-pan","home"],
  ["mex-par","home"], ["jpn-kor","draw"], ["ger-civ","away"],
];

const flagCodes = {
  arg:"ar",bra:"br",fra:"fr",eng:"gb",esp:"es",ger:"de",
  por:"pt",ned:"nl",usa:"us",mex:"mx",jpn:"jp",mar:"ma",
};

let total = 0;
for (let i = 0; i < players.length; i++) {
  const p = players[i];
  const email = `seedbot_p${i}@wc26.bot`;

  await sql`
    INSERT INTO subscribers (email, preferences, points, username, favorite_team)
    VALUES (${email}, 'npc', ${p.pts}, ${p.name}, ${p.team})
    ON CONFLICT (email) DO UPDATE SET
      preferences='npc', username=${p.name}, favorite_team=${p.team}, points=${p.pts}
  `;

  // Insert won picks so they show on leaderboard
  for (let j = 0; j < p.wins; j++) {
    const [matchId, pick] = matchPool[(i + j) % matchPool.length];
    const payout = Math.round((p.pts - 1000) / p.wins * 0.9);
    const stake = Math.round(payout / 2.1);
    await sql`
      INSERT INTO picks (email, match_id, pick, stake, odds, status, payout, settled_at)
      VALUES (${email}, ${matchId + "_w" + j}, ${pick}, ${stake}, 2.1, 'won', ${payout}, NOW())
      ON CONFLICT (email, match_id) DO UPDATE SET status='won', payout=${payout}
    `;
  }
  // Insert lost picks
  for (let j = 0; j < (p.bets - p.wins); j++) {
    const [matchId, pick] = matchPool[(i + j + 5) % matchPool.length];
    await sql`
      INSERT INTO picks (email, match_id, pick, stake, odds, status, payout, settled_at)
      VALUES (${email}, ${matchId + "_l" + j}, ${pick}, 100, 2.1, 'lost', 0, NOW())
      ON CONFLICT (email, match_id) DO UPDATE SET status='lost'
    `;
  }
  total++;
}

console.log("Seeded", total, "individual leaderboard bots");
