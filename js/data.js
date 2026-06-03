/* =====================================================================
   StatArena — Data layer
   ---------------------------------------------------------------------
   Capa de datos DESACOPLADA. Hoy genera datos representativos de forma
   determinista (seed) para que el dashboard sea autocontenido y offline.

   Para conectar datos REALES, sustituye los métodos de `StatData` por
   llamadas a un proveedor (ej. API-Football, football-data.org):

     async function getStandings(leagueId) {
       const r = await fetch(`${API}/standings?league=${id}&season=2025`, {
         headers: { 'X-Auth-Token': API_KEY }
       });
       return adapt(await r.json());   // mapear al shape interno
     }

   El resto de la app sólo consume el shape interno, así que la UI no
   cambia al cambiar de fuente.
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
     teams en orden aproximado de fuerza (idx 0 = más fuerte).
     color = principal del escudo, c2 = secundario para gradiente. */
  const LEAGUES = {
    laliga: {
      name: "LaLiga EA Sports", country: "España", flag: "🇪🇸",
      season: "2025/26", rounds: 38, round: 32,
      teams: [
        ["Real Madrid", "RMA", "#1d2a5b", "#febe10"],
        ["FC Barcelona", "BAR", "#a50044", "#004d98"],
        ["Atlético de Madrid", "ATM", "#cb3524", "#262e62"],
        ["Athletic Club", "ATH", "#ee2523", "#ffffff"],
        ["Real Sociedad", "RSO", "#0067b1", "#ffffff"],
        ["Villarreal CF", "VIL", "#ffe667", "#005187"],
        ["Real Betis", "BET", "#00954c", "#ffffff"],
        ["Valencia CF", "VAL", "#ee3524", "#000000"],
        ["Girona FC", "GIR", "#cd2534", "#ffffff"],
        ["Sevilla FC", "SEV", "#d80b16", "#ffffff"],
        ["CA Osasuna", "OSA", "#0a346f", "#d91a21"],
        ["Rayo Vallecano", "RAY", "#e53027", "#ffffff"],
        ["RC Celta", "CEL", "#8ac3ee", "#ffffff"],
        ["Getafe CF", "GET", "#005999", "#ffffff"],
        ["RCD Mallorca", "MLL", "#e20613", "#000000"],
        ["CD Leganés", "LEG", "#005bac", "#ffffff"],
        ["Deportivo Alavés", "ALA", "#0761af", "#ffffff"],
        ["RCD Espanyol", "ESP", "#007fc8", "#0067b1"],
        ["UD Las Palmas", "LPA", "#fede00", "#0055a5"],
        ["Real Valladolid", "VLL", "#921c7a", "#ffffff"],
      ],
    },
    premier: {
      name: "Premier League", country: "Inglaterra", flag: "🏴",
      season: "2025/26", rounds: 38, round: 31,
      teams: [
        ["Manchester City", "MCI", "#6cabdd", "#1c2c5b"],
        ["Arsenal", "ARS", "#ef0107", "#ffffff"],
        ["Liverpool", "LIV", "#c8102e", "#00b2a9"],
        ["Aston Villa", "AVL", "#670e36", "#95bfe5"],
        ["Tottenham Hotspur", "TOT", "#132257", "#ffffff"],
        ["Chelsea", "CHE", "#034694", "#ffffff"],
        ["Newcastle United", "NEW", "#241f20", "#ffffff"],
        ["Manchester United", "MUN", "#da291c", "#fbe122"],
        ["West Ham United", "WHU", "#7a263a", "#1bb1e7"],
        ["Brighton", "BHA", "#0057b8", "#ffffff"],
        ["Wolves", "WOL", "#fdb913", "#231f20"],
        ["Fulham", "FUL", "#000000", "#ffffff"],
        ["Brentford", "BRE", "#e30613", "#ffffff"],
        ["Crystal Palace", "CRY", "#1b458f", "#c4122e"],
        ["Everton", "EVE", "#003399", "#ffffff"],
        ["Nottingham Forest", "NFO", "#dd0000", "#ffffff"],
        ["Bournemouth", "BOU", "#da291c", "#000000"],
        ["Leicester City", "LEI", "#003090", "#fdbe11"],
        ["Ipswich Town", "IPS", "#3a64a3", "#ffffff"],
        ["Southampton", "SOU", "#d71920", "#ffffff"],
      ],
    },
    seriea: {
      name: "Serie A", country: "Italia", flag: "🇮🇹",
      season: "2025/26", rounds: 38, round: 30,
      teams: [
        ["Inter", "INT", "#0068a8", "#000000"],
        ["Juventus", "JUV", "#000000", "#ffffff"],
        ["AC Milan", "MIL", "#fb090b", "#000000"],
        ["Napoli", "NAP", "#12a0d7", "#ffffff"],
        ["Atalanta", "ATA", "#1d71b8", "#000000"],
        ["AS Roma", "ROM", "#8e1f2f", "#f0bc42"],
        ["Lazio", "LAZ", "#87d8f7", "#ffffff"],
        ["Fiorentina", "FIO", "#592c82", "#ffffff"],
        ["Bologna", "BOL", "#1a2b4c", "#a01e20"],
        ["Torino", "TOR", "#8b1a1a", "#ffffff"],
        ["Udinese", "UDI", "#000000", "#ffffff"],
        ["Genoa", "GEN", "#c8102e", "#1c2c5b"],
        ["Monza", "MON", "#e2001a", "#ffffff"],
        ["Hellas Verona", "VER", "#fff100", "#1a2b4c"],
        ["Cagliari", "CAG", "#a4133c", "#1d3461"],
        ["Lecce", "LEC", "#f9d616", "#c8102e"],
        ["Empoli", "EMP", "#005ca9", "#ffffff"],
        ["Parma", "PAR", "#fdd000", "#1c4f9c"],
        ["Como", "COM", "#0a2a5e", "#ffffff"],
        ["Venezia", "VEN", "#000000", "#f29400"],
      ],
    },
    bundesliga: {
      name: "Bundesliga", country: "Alemania", flag: "🇩🇪",
      season: "2025/26", rounds: 34, round: 28,
      teams: [
        ["Bayern München", "BAY", "#dc052d", "#ffffff"],
        ["Bayer Leverkusen", "B04", "#e32219", "#000000"],
        ["RB Leipzig", "RBL", "#dd0741", "#001f47"],
        ["VfB Stuttgart", "VFB", "#e30613", "#ffffff"],
        ["Borussia Dortmund", "BVB", "#fde100", "#000000"],
        ["Eintracht Frankfurt", "SGE", "#e1000f", "#000000"],
        ["SC Freiburg", "SCF", "#000000", "#e30613"],
        ["VfL Wolfsburg", "WOB", "#65b32e", "#ffffff"],
        ["Borussia M'gladbach", "BMG", "#000000", "#1a9c3e"],
        ["Werder Bremen", "SVW", "#1d9053", "#ffffff"],
        ["FC Augsburg", "FCA", "#ba3733", "#46714d"],
        ["1. FC Union Berlin", "FCU", "#eb1923", "#ffe600"],
        ["1899 Hoffenheim", "TSG", "#1c63b7", "#ffffff"],
        ["FSV Mainz 05", "M05", "#c3141e", "#ffffff"],
        ["FC St. Pauli", "STP", "#65352b", "#ffffff"],
        ["1. FC Heidenheim", "HDH", "#e30613", "#1a2b4c"],
        ["VfL Bochum", "BOC", "#005ca9", "#ffffff"],
        ["Holstein Kiel", "KIE", "#1c4f9c", "#e30613"],
      ],
    },
  };

  /* ---------- Pools de nombres para plantillas (representativos) ---------- */
  const FIRST = ["Lucas","Marco","Diego","Hugo","Iker","Pablo","Álex","Mateo","Nico","Leo",
    "Bruno","Adam","Noah","Liam","Tom","Jan","Luka","Theo","Yann","Omar","Karim","Joel",
    "Eric","Pau","Gael","Aaron","Iván","Saúl","Dani","Raúl","Sergio","Jude","Vini","Rodri"];
  const LAST = ["García","Martín","López","Fernández","Rossi","Conti","Müller","Schmidt",
    "Silva","Costa","Santos","Moreno","Romero","Torres","Núñez","Kane","Haaland","Vlahović",
    "Lautaro","Griezmann","Lewków","Öztürk","Mbeki","Andersen","Novák","Petit","Dubois","Berg"];
  const POS = ["DEL", "MED", "DEF", "POR"];

  /* ---------- Generación determinista de una liga ---------- */
  function buildLeague(id) {
    const cfg = LEAGUES[id];
    const r = rng(hash(id) ^ 0x9e3779b9);
    const N = cfg.teams.length;
    const played = cfg.round;

    const table = cfg.teams.map((t, i) => {
      const [name, short, color, c2] = t;
      // fuerza 0..1 (mejores arriba) con algo de ruido
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
        // goles del partido
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
        id: short.toLowerCase(), name, short, color, c2,
        played, w, d, l, gf, ga, gd: gf - ga, pts,
        form, ppg: +(pts / played).toFixed(2),
        xg, xga, possAvg: randInt(r, 40, 40 + Math.round(s * 22)),
        cleanSheets: Math.round((1 - s) * 4 + s * 14 + r() * 3),
        ptsSeries,
      };
    });

    // ordenar como tabla real: pts, gd, gf
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

  /* ---------- Goleadores ---------- */
  function buildScorers(id, table) {
    const r = rng(hash(id + "scorers"));
    const top = table.slice(0, 12);
    const scorers = top.map((team, i) => {
      const goals = Math.max(4, Math.round(22 - i * 1.4 - r() * 3));
      const assists = randInt(r, 2, 12);
      return {
        name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
        team: team.short, teamName: team.name, color: team.color,
        goals, assists,
        pos: i < 6 ? "DEL" : pick(r, ["DEL", "MED"]),
        shots: goals * randInt(r, 2, 4) + randInt(r, 3, 10),
        mins: randInt(r, 1800, 2700),
        rating: +(6.6 + r() * 1.6).toFixed(2),
      };
    }).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
    return scorers;
  }

  /* ---------- Partidos: en vivo, recientes, próximos ---------- */
  function buildMatches(id, table) {
    const r = rng(hash(id + "matches"));
    const teams = [...table];
    // emparejar de forma estable
    const shuffled = teams.slice().sort(() => r() - 0.5);
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

  /* ---------- Cache + API pública ---------- */
  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id];
    const { cfg, table } = buildLeague(id);
    const scorers = buildScorers(id, table);
    const matches = buildMatches(id, table);

    // KPIs de cabecera derivados
    const totalGoals = table.reduce((a, t) => a + t.gf, 0);
    const totalMatches = Math.round(table.reduce((a, t) => a + t.played, 0) / 2);
    const avgGoals = +(totalGoals / Math.max(1, totalMatches)).toFixed(2);
    const leader = table[0];
    const topScorer = scorers[0];

    // serie de goles por jornada (media liga) para el área chart
    const goalsByRound = [];
    for (let j = 1; j <= cfg.round; j++) {
      goalsByRound.push(+(2.2 + Math.sin(j / 3) * 0.5 + (rng(hash(id) + j)() - 0.5)).toFixed(2));
    }

    const summary = {
      leagueName: cfg.name, flag: cfg.flag, season: cfg.season,
      round: cfg.round, rounds: cfg.rounds, country: cfg.country,
      totalGoals, totalMatches, avgGoals,
      leader, topScorer,
      avgAttendance: randInt(rng(hash(id + "att")), 28000, 62000),
      cleanSheetPct: Math.round(table.reduce((a, t) => a + t.cleanSheets, 0) / table.length / cfg.round * 100),
      goalsByRound,
    };

    return (cache[id] = { cfg, table, scorers, matches, summary });
  }

  /* ---------- Interfaz consumida por la app ---------- */
  window.StatData = {
    leagues: Object.keys(LEAGUES).map((k) => ({ id: k, ...LEAGUES[k] })),
    getLeague: (id) => load(id).cfg,
    getStandings: (id) => load(id).table,
    getScorers: (id) => load(id).scorers,
    getMatches: (id) => load(id).matches,
    getSummary: (id) => load(id).summary,
    getTeam: (id, teamId) => load(id).table.find((t) => t.id === teamId),
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
