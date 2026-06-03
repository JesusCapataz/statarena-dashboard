/* =====================================================================
   StatArena — Data layer
   ---------------------------------------------------------------------
   Capa de datos DESACOPLADA. Genera clasificaciones representativas de
   forma determinista (seed) para que el dashboard sea autocontenido,
   pero usa ESCUDOS REALES de los clubes vía CDN (media.api-sports.io),
   referenciados por el id de equipo (apiId).

   Para conectar datos REALES, sustituye los métodos de `StatData` por
   llamadas a un proveedor (API-Football, football-data.org, Opta...):

     async function getStandings(leagueId) {
       const r = await fetch(`${API}/standings?league=${id}&season=2025`, {
         headers: { 'x-apisports-key': API_KEY }
       });
       return adapt(await r.json());   // mapear al shape interno
     }

   La UI sólo consume el shape interno: cambiar de fuente no cambia la UI.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- PRNG determinista (mulberry32) ---------- */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const randInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  /* ---------- Catálogo de competiciones ----------
     [nombre, código, color, color2, apiId]
     apiId -> https://media.api-sports.io/football/teams/{apiId}.png  */
  const LEAGUES = {
    laliga: {
      name: "LaLiga EA Sports", country: "España", flag: "ES",
      season: "2025/26", rounds: 38, round: 32,
      teams: [
        ["Real Madrid", "RMA", "#1d2a5b", "#febe10", 541],
        ["FC Barcelona", "BAR", "#a50044", "#004d98", 529],
        ["Atlético de Madrid", "ATM", "#cb3524", "#262e62", 530],
        ["Athletic Club", "ATH", "#ee2523", "#ffffff", 531],
        ["Real Sociedad", "RSO", "#0067b1", "#ffffff", 548],
        ["Villarreal CF", "VIL", "#ffe667", "#005187", 533],
        ["Real Betis", "BET", "#00954c", "#ffffff", 543],
        ["Valencia CF", "VAL", "#ee3524", "#000000", 532],
        ["Girona FC", "GIR", "#cd2534", "#ffffff", 547],
        ["Sevilla FC", "SEV", "#d80b16", "#ffffff", 536],
        ["CA Osasuna", "OSA", "#0a346f", "#d91a21", 727],
        ["Rayo Vallecano", "RAY", "#e53027", "#ffffff", 728],
        ["RC Celta", "CEL", "#8ac3ee", "#e83e8c", 538],
        ["Getafe CF", "GET", "#005999", "#ffffff", 546],
        ["RCD Mallorca", "MLL", "#e20613", "#000000", 798],
        ["CD Leganés", "LEG", "#005bac", "#ffffff", 539],
        ["Deportivo Alavés", "ALA", "#0761af", "#ffffff", 542],
        ["RCD Espanyol", "ESP", "#007fc8", "#0067b1", 540],
        ["UD Las Palmas", "LPA", "#fede00", "#0055a5", 534],
        ["Real Valladolid", "VLL", "#921c7a", "#ffffff", 720],
      ],
    },
    premier: {
      name: "Premier League", country: "Inglaterra", flag: "EN",
      season: "2025/26", rounds: 38, round: 31,
      teams: [
        ["Manchester City", "MCI", "#6cabdd", "#1c2c5b", 50],
        ["Arsenal", "ARS", "#ef0107", "#ffffff", 42],
        ["Liverpool", "LIV", "#c8102e", "#00b2a9", 40],
        ["Aston Villa", "AVL", "#670e36", "#95bfe5", 66],
        ["Tottenham Hotspur", "TOT", "#132257", "#ffffff", 47],
        ["Chelsea", "CHE", "#034694", "#ffffff", 49],
        ["Newcastle United", "NEW", "#241f20", "#ffffff", 34],
        ["Manchester United", "MUN", "#da291c", "#fbe122", 33],
        ["West Ham United", "WHU", "#7a263a", "#1bb1e7", 48],
        ["Brighton", "BHA", "#0057b8", "#ffffff", 51],
        ["Wolves", "WOL", "#fdb913", "#231f20", 39],
        ["Fulham", "FUL", "#000000", "#ffffff", 36],
        ["Brentford", "BRE", "#e30613", "#ffffff", 55],
        ["Crystal Palace", "CRY", "#1b458f", "#c4122e", 52],
        ["Everton", "EVE", "#003399", "#ffffff", 45],
        ["Nottingham Forest", "NFO", "#dd0000", "#ffffff", 65],
        ["Bournemouth", "BOU", "#da291c", "#000000", 35],
        ["Leicester City", "LEI", "#003090", "#fdbe11", 46],
        ["Ipswich Town", "IPS", "#3a64a3", "#ffffff", 57],
        ["Southampton", "SOU", "#d71920", "#ffffff", 41],
      ],
    },
    seriea: {
      name: "Serie A", country: "Italia", flag: "IT",
      season: "2025/26", rounds: 38, round: 30,
      teams: [
        ["Inter", "INT", "#0068a8", "#000000", 505],
        ["Juventus", "JUV", "#000000", "#ffffff", 496],
        ["AC Milan", "MIL", "#fb090b", "#000000", 489],
        ["Napoli", "NAP", "#12a0d7", "#ffffff", 492],
        ["Atalanta", "ATA", "#1d71b8", "#000000", 499],
        ["AS Roma", "ROM", "#8e1f2f", "#f0bc42", 497],
        ["Lazio", "LAZ", "#87d8f7", "#ffffff", 487],
        ["Fiorentina", "FIO", "#592c82", "#ffffff", 502],
        ["Bologna", "BOL", "#1a2b4c", "#a01e20", 500],
        ["Torino", "TOR", "#8b1a1a", "#ffffff", 503],
        ["Udinese", "UDI", "#000000", "#ffffff", 494],
        ["Genoa", "GEN", "#c8102e", "#1c2c5b", 495],
        ["Monza", "MON", "#e2001a", "#ffffff", 1579],
        ["Hellas Verona", "VER", "#fff100", "#1a2b4c", 504],
        ["Cagliari", "CAG", "#a4133c", "#1d3461", 490],
        ["Lecce", "LEC", "#f9d616", "#c8102e", 867],
        ["Empoli", "EMP", "#005ca9", "#ffffff", 511],
        ["Parma", "PAR", "#fdd000", "#1c4f9c", null],
        ["Como", "COM", "#0a2a5e", "#ffffff", null],
        ["Venezia", "VEN", "#000000", "#f29400", null],
      ],
    },
    bundesliga: {
      name: "Bundesliga", country: "Alemania", flag: "DE",
      season: "2025/26", rounds: 34, round: 28,
      teams: [
        ["Bayern München", "BAY", "#dc052d", "#ffffff", 157],
        ["Bayer Leverkusen", "B04", "#e32219", "#000000", 168],
        ["RB Leipzig", "RBL", "#dd0741", "#001f47", 173],
        ["VfB Stuttgart", "VFB", "#e30613", "#ffffff", 172],
        ["Borussia Dortmund", "BVB", "#fde100", "#000000", 165],
        ["Eintracht Frankfurt", "SGE", "#e1000f", "#000000", 169],
        ["SC Freiburg", "SCF", "#000000", "#e30613", 160],
        ["VfL Wolfsburg", "WOB", "#65b32e", "#ffffff", 161],
        ["Borussia M'gladbach", "BMG", "#000000", "#1a9c3e", 163],
        ["Werder Bremen", "SVW", "#1d9053", "#ffffff", 162],
        ["FC Augsburg", "FCA", "#ba3733", "#46714d", 170],
        ["1. FC Union Berlin", "FCU", "#eb1923", "#ffe600", 182],
        ["1899 Hoffenheim", "TSG", "#1c63b7", "#ffffff", 167],
        ["FSV Mainz 05", "M05", "#c3141e", "#ffffff", 164],
        ["FC St. Pauli", "STP", "#65352b", "#ffffff", 186],
        ["1. FC Heidenheim", "HDH", "#e30613", "#1a2b4c", 180],
        ["VfL Bochum", "BOC", "#005ca9", "#ffffff", 176],
        ["Holstein Kiel", "KIE", "#1c4f9c", "#e30613", 191],
      ],
    },
  };

  /* ---------- Pools de nombres (plantillas representativas) ---------- */
  const FIRST = ["Lucas","Marco","Diego","Hugo","Iker","Pablo","Álex","Mateo","Nico","Leo",
    "Bruno","Adam","Noah","Liam","Tom","Jan","Luka","Theo","Yann","Omar","Karim","Joel",
    "Eric","Pau","Gael","Aaron","Iván","Saúl","Dani","Raúl","Sergio","Jude","Vini","Rodri"];
  const LAST = ["García","Martín","López","Fernández","Rossi","Conti","Müller","Schmidt",
    "Silva","Costa","Santos","Moreno","Romero","Torres","Núñez","Kane","Haaland","Vlahović",
    "Lautaro","Griezmann","Lewków","Öztürk","Mbeki","Andersen","Novák","Petit","Dubois","Berg"];

  /* ---------- Generación determinista ---------- */
  function buildLeague(id) {
    const cfg = LEAGUES[id];
    const r = rng(hash(id) ^ 0x9e3779b9);
    const N = cfg.teams.length;
    const played = cfg.round;

    const table = cfg.teams.map((t, i) => {
      const [name, short, color, c2, apiId] = t;
      const strength = 1 - i / (N - 1);
      const s = Math.max(0.05, Math.min(0.95, strength * 0.8 + 0.1 + (r() - 0.5) * 0.18));

      let w = 0, d = 0, l = 0, gf = 0, ga = 0;
      const ptsSeries = [];
      let cum = 0;
      for (let m = 0; m < played; m++) {
        const roll = r();
        const pWin = 0.18 + s * 0.55;
        const pDraw = 0.22 + (0.5 - Math.abs(s - 0.5)) * 0.18;
        let res;
        if (roll < pWin) res = "W";
        else if (roll < pWin + pDraw) res = "D";
        else res = "L";
        const teamGoals = randInt(r, res === "W" ? 1 : 0, res === "W" ? 4 : 2);
        const oppGoals = res === "L" ? randInt(r, 1, 3) : (res === "D" ? teamGoals : randInt(r, 0, Math.max(0, teamGoals - 1)));
        gf += teamGoals; ga += oppGoals;
        if (res === "W") { w++; cum += 3; }
        else if (res === "D") { d++; cum += 1; }
        else l++;
        ptsSeries.push(cum);
      }
      const pts = w * 3 + d;
      const form = buildForm(r);
      const xg = +(gf * (0.82 + r() * 0.3)).toFixed(1);
      const xga = +(ga * (0.82 + r() * 0.3)).toFixed(1);
      return {
        id: short.toLowerCase(), name, short, color, c2, apiId,
        played, w, d, l, gf, ga, gd: gf - ga, pts,
        form, ppg: +(pts / played).toFixed(2),
        xg, xga, possAvg: randInt(r, 40, 40 + Math.round(s * 22)),
        cleanSheets: Math.round((1 - s) * 4 + s * 14 + r() * 3),
        ptsSeries,
      };
    });

    table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    table.forEach((t, i) => (t.pos = i + 1));
    return { cfg, table };
  }

  function buildForm(r) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const x = r();
      out.push(x < 0.5 ? "W" : x < 0.78 ? "D" : "L");
    }
    return out;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function buildScorers(id, table) {
    const r = rng(hash(id + "scorers"));
    const top = table.slice(0, 12);
    return top.map((team, i) => {
      const goals = Math.max(4, Math.round(22 - i * 1.4 - r() * 3));
      const assists = randInt(r, 2, 12);
      return {
        name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
        team: team.short, teamName: team.name, color: team.color, apiId: team.apiId,
        goals, assists,
        pos: i < 6 ? "DEL" : pick(r, ["DEL", "MED"]),
        shots: goals * randInt(r, 2, 4) + randInt(r, 3, 10),
        mins: randInt(r, 1800, 2700),
        rating: +(6.6 + r() * 1.6).toFixed(2),
      };
    }).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  }

  function buildMatches(id, table) {
    const r = rng(hash(id + "matches"));
    const shuffled = [...table].sort(() => r() - 0.5);
    const pairs = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);

    const live = pairs.slice(0, 3).map((p, i) => ({
      home: p[0], away: p[1],
      hs: randInt(r, 0, 3), as: randInt(r, 0, 3),
      minute: [38, 57, 71][i] || randInt(r, 20, 85),
      status: "live",
    }));
    const recent = pairs.slice(3, 8).map((p) => ({
      home: p[0], away: p[1],
      hs: randInt(r, 0, 4), as: randInt(r, 0, 4),
      status: "ft",
    }));
    const upcoming = pairs.slice(8, 13).map((p, i) => ({
      home: p[0], away: p[1],
      date: ["Sáb 18:30", "Sáb 21:00", "Dom 14:00", "Dom 16:15", "Dom 18:30"][i] || "Próx.",
      status: "ns",
    }));
    return { live, recent, upcoming };
  }

  /* ---------- Análisis de partido (demo determinista) ---------- */
  const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '3-4-3'];
  const genName = (r) => `${pick(r, FIRST)} ${pick(r, LAST)}`;

  function buildLineup(r) {
    const formation = pick(r, FORMATIONS);
    const rows = formation.split('-').map(Number);
    const posByRow = ['DEF', 'MED', 'MED', 'DEL'];
    const startXI = [{ name: genName(r), number: 1, pos: 'POR' }];
    let num = 2;
    rows.forEach((count, ri) => {
      for (let i = 0; i < count; i++) {
        startXI.push({ name: genName(r), number: num++, pos: posByRow[Math.min(ri, 3)] });
      }
    });
    const substitutes = Array.from({ length: 7 }, () => ({ name: genName(r), number: num++ }));
    return { formation, startXI, substitutes };
  }

  function buildMatchAnalysis(lg, m, id) {
    const r = rng(hash(lg + id));
    const hs = m.hs != null ? m.hs : randInt(r, 0, 3);
    const as = m.as != null ? m.as : randInt(r, 0, 3);

    const events = [];
    const addGoals = (n, side) => {
      for (let i = 0; i < n; i++) {
        events.push({
          minute: randInt(r, 1, 90), type: 'goal', side,
          player: genName(r), assist: r() > 0.4 ? genName(r) : null,
          detail: r() > 0.85 ? 'Penalty' : null,
        });
      }
    };
    addGoals(hs, 'home');
    addGoals(as, 'away');
    for (let i = 0; i < randInt(r, 2, 5); i++) {
      events.push({
        minute: randInt(r, 10, 90), type: 'card',
        detail: r() > 0.86 ? 'Red Card' : 'Yellow Card',
        side: r() > 0.5 ? 'home' : 'away', player: genName(r),
      });
    }
    for (let i = 0; i < randInt(r, 4, 6); i++) {
      events.push({
        minute: randInt(r, 55, 89), type: 'subst',
        side: r() > 0.5 ? 'home' : 'away', player: genName(r), assist: genName(r),
      });
    }
    events.sort((a, b) => a.minute - b.minute);

    let h = 0, a = 0;
    const goalsTimeline = [{ minute: 0, home: 0, away: 0 }];
    events.filter((e) => e.type === 'goal').forEach((e) => {
      if (e.side === 'home') h++; else a++;
      goalsTimeline.push({ minute: e.minute, home: h, away: a });
    });

    const possHome = randInt(r, 38, 64);
    const shotsHome = randInt(r, 6, 20), shotsAway = randInt(r, 5, 18);
    const sotHome = randInt(r, 2, Math.max(2, Math.round(shotsHome * 0.55)));
    const sotAway = randInt(r, 1, Math.max(2, Math.round(shotsAway * 0.55)));
    const xgHome = +(shotsHome * (0.08 + r() * 0.06)).toFixed(2);
    const xgAway = +(shotsAway * (0.08 + r() * 0.06)).toFixed(2);

    const stats = [
      { label: 'Posesión', home: possHome + '%', away: (100 - possHome) + '%', ha: possHome, aa: 100 - possHome },
      { label: 'Remates', home: shotsHome, away: shotsAway, ha: shotsHome, aa: shotsAway },
      { label: 'A puerta', home: sotHome, away: sotAway, ha: sotHome, aa: sotAway },
      { label: 'xG', home: xgHome, away: xgAway, ha: xgHome, aa: xgAway },
      { label: 'Córners', home: randInt(r, 1, 11), away: randInt(r, 1, 10), ha: 1, aa: 1 },
      { label: 'Faltas', home: randInt(r, 6, 18), away: randInt(r, 6, 18), ha: 1, aa: 1 },
      { label: 'Pases', home: randInt(r, 320, 660), away: randInt(r, 300, 620), ha: 1, aa: 1 },
      { label: 'Precisión', home: randInt(r, 74, 92) + '%', away: randInt(r, 72, 90) + '%', ha: 1, aa: 1 },
    ];
    stats.forEach((s) => {
      if (s.ha === 1 && s.aa === 1) {
        const ph = parseFloat(s.home), pa = parseFloat(s.away);
        s.ha = ph; s.aa = pa;
      }
    });

    const momentum = [];
    let mv = 0;
    for (let min = 0; min <= 90; min += 3) {
      mv += (r() - 0.5) * 2 + (possHome - 50) / 90;
      momentum.push({ minute: min, value: +mv.toFixed(2) });
    }

    return {
      id, league: lg, home: m.home, away: m.away, hs, as,
      status: m.status, minute: m.minute, date: m.date,
      lineups: { home: buildLineup(r), away: buildLineup(r) },
      events, goalsTimeline, momentum, stats,
      possession: { home: possHome, away: 100 - possHome },
      xg: { home: xgHome, away: xgAway },
    };
  }

  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id];
    const { cfg, table } = buildLeague(id);
    const scorers = buildScorers(id, table);
    const matches = buildMatches(id, table);

    const totalGoals = table.reduce((a, t) => a + t.gf, 0);
    const totalMatches = Math.round(table.reduce((a, t) => a + t.played, 0) / 2);
    const avgGoals = +(totalGoals / Math.max(1, totalMatches)).toFixed(2);

    const goalsByRound = [];
    for (let j = 1; j <= cfg.round; j++) {
      goalsByRound.push(+(2.2 + Math.sin(j / 3) * 0.5 + (rng(hash(id) + j)() - 0.5)).toFixed(2));
    }

    const summary = {
      leagueName: cfg.name, flag: cfg.flag, season: cfg.season,
      round: cfg.round, rounds: cfg.rounds, country: cfg.country,
      totalGoals, totalMatches, avgGoals,
      leader: table[0], topScorer: scorers[0],
      avgAttendance: randInt(rng(hash(id + "att")), 28000, 62000),
      cleanSheetPct: Math.round(table.reduce((a, t) => a + t.cleanSheets, 0) / table.length / cfg.round * 100),
      goalsByRound,
    };

    return (cache[id] = { cfg, table, scorers, matches, summary });
  }

  window.StatData = {
    leagues: Object.keys(LEAGUES).map((k) => ({ id: k, ...LEAGUES[k] })),
    getLeague: (id) => load(id).cfg,
    getStandings: (id) => load(id).table,
    getScorers: (id) => load(id).scorers,
    getMatches: (id) => load(id).matches,
    getSummary: (id) => load(id).summary,
    getTeam: (id, teamId) => load(id).table.find((t) => t.id === teamId),
    getMatchList: (id) => {
      const m = load(id).matches;
      return [
        ...m.live.map((x, i) => ({ id: 'l' + i, ...x })),
        ...m.recent.map((x, i) => ({ id: 'r' + i, ...x })),
      ];
    },
    getMatchAnalysis: (id, matchId) => {
      const list = window.StatData.getMatchList(id);
      const m = list.find((x) => x.id === matchId) || list[0];
      return buildMatchAnalysis(id, m, m.id);
    },
    search: (id, q) => {
      q = (q || "").trim().toLowerCase();
      if (!q) return { teams: [], players: [] };
      const d = load(id);
      return {
        teams: d.table.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 5),
        players: d.scorers.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5),
      };
    },
  };
})();
