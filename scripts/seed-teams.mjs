import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_r7KmpksnIAq4@ep-damp-hall-ap8onwvg-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

const teams = [
  { id:"arg", fans:["Messi_Fan","PampasEagle","BsAs_Blue","AlbicelesteFan","TangoKing","CopaRey27","RioPlataFC","LaPulga10"], pts:[3200,2800,2100,1900,1600,1300,1100,900] },
  { id:"bra", fans:["SambaGold","CanarinhoFC","RioFan","SelecaoFan","NeymarBoy","Pelevive","BrazilForever"], pts:[2700,2400,1800,1500,1300,1000,800] },
  { id:"fra", fans:["AliezLesBleus","ParisFan","BleuBlanc","MbappeGo","FranceFoot","ChampionsFR"], pts:[2300,2000,1700,1400,1100,900] },
  { id:"eng", fans:["ThreeLions","WembleyFan","GarethFan","FootballHome","ENG2026"], pts:[2100,1800,1500,1200,900] },
  { id:"esp", fans:["VivaEspana","LaRoja26","TikiTaka","VamosRoja","FuryFC"], pts:[1900,1600,1300,1000,800] },
  { id:"ger", fans:["DasMaschine","BundesKing","GermanFoot","DFBFan"], pts:[1700,1400,1100,900] },
  { id:"por", fans:["PortugalFC","CristianoFan","Lusitano26","FcpFan"], pts:[1600,1300,1000,800] },
  { id:"mar", fans:["AtlasLions","MarocFan","MaghrebFC"], pts:[1400,1100,850] },
  { id:"usa", fans:["USAFootball","USMNT26","AmericaFC","HomeTeamFan"], pts:[1300,1000,800,600] },
  { id:"mex", fans:["ElTriFan","MexicoGol","AztecaFC"], pts:[1200,950,700] },
  { id:"ned", fans:["OrangeFan","TulipFC","HollandBoy"], pts:[1100,900,700] },
  { id:"jpn", fans:["SamuraiBlue","NipponFC"], pts:[950,750] },
];

const matchIds = ["arg-pol","bra-ser","fra-dnk","eng-wal","esp-ger","ger-esp","por-ury","mar-can"];

let total = 0;
for (const team of teams) {
  for (let i = 0; i < team.fans.length; i++) {
    const email = `teambot_${team.id}_${i}@wc26.bot`;
    const username = team.fans[i];
    const points = team.pts[i] + 1000;
    const payout = team.pts[i];
    const matchId = matchIds[i % matchIds.length];
    const stake = Math.round(payout / 2);

    await sql`
      INSERT INTO subscribers (email, preferences, points, username, favorite_team)
      VALUES (${email}, 'bot', ${points}, ${username}, ${team.id})
      ON CONFLICT (email) DO UPDATE SET username=${username}, favorite_team=${team.id}, points=${points}
    `;
    await sql`
      INSERT INTO picks (email, match_id, pick, stake, odds, status, payout, settled_at)
      VALUES (${email}, ${matchId}, 'home', ${stake}, 2.1, 'won', ${payout}, NOW())
      ON CONFLICT (email, match_id) DO UPDATE SET status='won', payout=${payout}, settled_at=NOW()
    `;
    total++;
  }
}
console.log("Seeded", total, "team bots");
