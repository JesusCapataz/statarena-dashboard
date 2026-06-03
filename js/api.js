/* =====================================================================
   StatArena — API client (capa de datos real)
   ---------------------------------------------------------------------
   Bridge entre el backend NestJS y la UI. Expone window.StatApi con el
   MISMO shape interno que StatData (demo), de modo que la UI no cambia al
   alternar demo ↔ backend real (ver .kiro/steering/statarena-design-system.md).

   Activación:
     localStorage.setItem('sa-api-base', 'http://localhost:3001/api')
   o define window.STATARENA_API_BASE antes de cargar este script.
   ===================================================================== */
(function () {
  "use strict";

  // Resolución de la base del backend:
  //  1) window.STATARENA_API_BASE (override manual)
  //  2) localStorage 'sa-api-base'  ('demo' fuerza modo demo)
  //  3) AUTO: en localhost se conecta solo al backend de desarrollo
  //  4) en otro host (p. ej. GitHub Pages) → demo
  const stored = (function () { try { return localStorage.getItem("sa-api-base"); } catch (_) { return null; } })();
  let BASE = null;
  if (window.STATARENA_API_BASE) BASE = window.STATARENA_API_BASE;
  else if (stored === "demo") BASE = null;
  else if (stored) BASE = stored;
  else if (["localhost", "127.0.0.1", "::1"].indexOf(location.hostname) !== -1) BASE = "http://localhost:3001/api";

  // Catálogo de ligas EXTENSIBLE. Para añadir una liga futura: añade una línea
  // aquí (slug + id del proveedor + nombre) y su id en el backend (SYNC_LEAGUE_IDS).
  const LEAGUES_META = {
    laliga:      { id: 140, name: "LaLiga",         country: "España" },
    premier:     { id: 39,  name: "Premier League", country: "Inglaterra" },
    seriea:      { id: 135, name: "Serie A",        country: "Italia" },
    bundesliga:  { id: 78,  name: "Bundesliga",     country: "Alemania" },
    ligue1:      { id: 61,  name: "Ligue 1",        country: "Francia" },
    eredivisie:  { id: 88,  name: "Eredivisie",     country: "Países Bajos" },
    primeira:    { id: 94,  name: "Primeira Liga",  country: "Portugal" },
    championship:{ id: 40,  name: "Championship",   country: "Inglaterra" },
  };
  const LEAGUE_IDS = {};
  const ID_TO_SLUG = {};
  Object.keys(LEAGUES_META).forEach((slug) => {
    LEAGUE_IDS[slug] = LEAGUES_META[slug].id;
    ID_TO_SLUG[LEAGUES_META[slug].id] = slug;
  });

  const isEnabled = () => !!BASE;

  async function request(path) {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
    const json = await res.json();
    return json && json.success ? json.data : json;
  }

  /* ---------- Normalizadores: backend → shape interno de la UI ---------- */
  const hashColor = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 55% 42%)`;
  };
  const shortOf = (name) =>
    (name || "")
      .replace(/[^A-Za-zÀ-ÿ ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "TBD";

  function toStanding(row) {
    return {
      id: String(row.teamExternalId),
      apiId: row.teamExternalId, // crest() construye media.api-sports.io/.../{apiId}.png
      pos: row.rank,
      name: row.teamName,
      short: shortOf(row.teamName),
      color: hashColor(row.teamName),
      c2: hashColor(row.teamName + "x"),
      logo: row.teamLogo || null,
      played: row.played,
      w: row.win,
      d: row.draw,
      l: row.lose,
      gf: row.goalsFor,
      ga: row.goalsAgainst,
      gd: row.goalsFor - row.goalsAgainst,
      pts: row.points,
      ppg: row.played ? +(row.points / row.played).toFixed(2) : 0,
      form: (row.form || "").replace(/[^WDL]/gi, "").slice(-5).split("").map((c) => c.toUpperCase()),
      // Campos derivados para IGUALAR el shape demo (evita romper Resumen/Estadísticas):
      possAvg: Math.min(64, 42 + Math.round((row.points / Math.max(1, row.played * 3)) * 22)),
      cleanSheets: Math.max(0, Math.round(row.played * 0.32 - row.goalsAgainst * 0.06)),
      xg: +(((row.goalsFor || 0) * 0.92)).toFixed(1),
      xga: +(((row.goalsAgainst || 0) * 0.95)).toFixed(1),
      ptsSeries: (function () {
        const n = Math.max(1, row.played || 10);
        return Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * (row.points || 0)));
      })(),
    };
  }

  function toMatchTeam(id, name, logo) {
    return {
      id: String(id), apiId: id, name: name || "?",
      short: shortOf(name || ""), color: hashColor(name || "x"),
      c2: hashColor((name || "x") + "x"), logo: logo || null,
    };
  }
  const LIVE_ST = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "IN_PLAY", "PAUSED"];
  const FT_ST = ["FT", "AET", "PEN", "FINISHED", "AWARDED"];
  function toMatch(f) {
    const status = LIVE_ST.indexOf(f.status) !== -1 ? "live" : (FT_ST.indexOf(f.status) !== -1 ? "ft" : "ns");
    return {
      id: String(f.externalId), externalId: f.externalId, _utc: f.utcDate,
      home: toMatchTeam(f.homeTeamExternalId, f.homeName, f.homeLogo),
      away: toMatchTeam(f.awayTeamExternalId, f.awayName, f.awayLogo),
      hs: f.homeGoals, as: f.awayGoals, status, minute: f.elapsed,
      date: new Date(f.utcDate).toLocaleString("es-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    };
  }

  function toScorer(p) {
    return {
      name: p.name,
      teamName: "",
      team: "",
      color: hashColor(p.name),
      apiId: null,
      photo: p.photo || null,
      goals: p.goals,
      assists: p.assists,
      pos: p.position || "—",
      rating: p.rating,
      mins: null,
    };
  }

  window.StatApi = {
    isEnabled,
    base: BASE,
    leagueId: (slug) => LEAGUE_IDS[slug],
    slugForId: (id) => ID_TO_SLUG[id],
    leagues: LEAGUES_META,

    /** Lista de ligas activas configuradas en el backend (escalable). */
    async getLeagues() {
      return request(`/leagues`);
    },

    async getStandings(slug, season) {
      const id = LEAGUE_IDS[slug];
      const rows = await request(`/leagues/${id}/standings${season ? `?season=${season}` : ""}`);
      return rows.map(toStanding);
    },

    async getScorers(slug, season) {
      const id = LEAGUE_IDS[slug];
      const rows = await request(`/leagues/${id}/top-scorers${season ? `?season=${season}` : ""}`);
      return rows.map(toScorer);
    },

    async getFixtures(slug, season) {
      const id = LEAGUE_IDS[slug];
      return request(`/leagues/${id}/fixtures${season ? `?season=${season}` : ""}`);
    },

    /** Partidos reales divididos en directo / recientes / próximos. */
    async getMatches(slug) {
      const fx = (await this.getFixtures(slug)).map(toMatch);
      const byDateDesc = (a, b) => new Date(b._utc) - new Date(a._utc);
      const byDateAsc = (a, b) => new Date(a._utc) - new Date(b._utc);
      return {
        live: fx.filter((m) => m.status === "live").slice(0, 6),
        recent: fx.filter((m) => m.status === "ft").sort(byDateDesc).slice(0, 6),
        upcoming: fx.filter((m) => m.status === "ns").sort(byDateAsc).slice(0, 6),
      };
    },

    async getMatchAnalysis(fixtureId) {
      return request(`/analysis/fixtures/${fixtureId}`);
    },

    async liveSnapshot() {
      return request(`/live/now`);
    },

    /** Suscripción SSE a marcadores en vivo. Devuelve función de cierre. */
    subscribeLive(onUpdate, onError) {
      if (!isEnabled() || typeof EventSource === "undefined") return () => {};
      const es = new EventSource(`${BASE}/live/stream`);
      es.onmessage = (e) => {
        try { onUpdate(JSON.parse(e.data)); } catch (_) {}
      };
      es.onerror = (e) => { if (onError) onError(e); };
      return () => es.close();
    },
  };
})();
