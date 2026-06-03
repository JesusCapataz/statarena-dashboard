/* =====================================================================
   StatArena — App controller
   Une datos (StatData) + gráficos (Charts) + UI. Render por vistas.
   ===================================================================== */
(function () {
  "use strict";

  const state = {
    league: "laliga",
    view: "resumen",
    compare: { a: null, b: null },
  };

  /* ---------- DOM refs ---------- */
  const app = document.getElementById("app");
  const content = document.getElementById("content");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  /* ---------- Helpers de presentación ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function textColorOn(hex) {
    // luminancia para decidir texto claro/oscuro sobre el escudo
    const c = hex.replace("#", "");
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#0b0f14" : "#ffffff";
  }
  function crest(team, size) {
    const s = size || 30;
    const fg = textColorOn(team.color);
    const fsz = Math.max(8, Math.round(s * 0.38));
    const mono = `<span class="crest__mono" style="background:linear-gradient(135deg, ${team.color}, ${team.c2 || team.color});color:${fg};font-size:${fsz}px;${team.apiId ? "display:none" : ""}">${esc(team.short)}</span>`;
    const img = team.apiId
      ? `<img src="https://media.api-sports.io/football/teams/${team.apiId}.png" alt="${esc(team.name)}" loading="lazy" decoding="async" onerror="this.remove();var m=this.parentNode.querySelector('.crest__mono');if(m)m.style.display='grid';">`
      : "";
    return `<span class="crest" style="width:${s}px;height:${s}px">${img}${mono}</span>`;
  }
  function avatar(name, color) {
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return `<span class="avatar" style="background:linear-gradient(135deg, ${color}, ${color}aa);color:${textColorOn(color)}">${esc(initials)}</span>`;
  }
  // Foto real del jugador si está disponible (modo live); si no, monograma.
  function playerFace(p) {
    return p.photo
      ? `<img class="avatar" style="object-fit:cover" src="${p.photo}" alt="${esc(p.name)}" loading="lazy" />`
      : avatar(p.name, p.color);
  }
  function formGuide(form) {
    return `<span class="form">${form.map((f) => `<span class="${f.toLowerCase()}" title="${f}">${f}</span>`).join("")}</span>`;
  }
  function rankClass(pos, league) {
    const ucl = league === "bundesliga" ? 4 : 4;
    const uel = league === "bundesliga" ? 6 : 6;
    const relStart = (StatData.getLeague(league).teams.length) - 2;
    if (pos <= ucl) return "ucl";
    if (pos <= uel) return "uel";
    if (pos > relStart) return "rel";
    return "";
  }

  /* =====================================================================
     PAGE META por vista
     ===================================================================== */
  const META = {
    resumen: (s) => ["Resumen de la competición", `${s.leagueName} · Jornada ${s.round} de ${s.rounds}`],
    partidos: (s) => ["Partidos", `${s.leagueName} · En vivo, recientes y próximos`],
    clasificacion: (s) => ["Clasificación", `${s.leagueName} · Temporada ${s.season}`],
    equipos: (s) => ["Equipos", `${s.leagueName} · ${StatData.getLeague(state.league).teams.length} clubes`],
    jugadores: (s) => ["Jugadores", `${s.leagueName} · Líderes y máximos goleadores`],
    estadisticas: (s) => ["Estadísticas avanzadas", `${s.leagueName} · Métricas de rendimiento`],
    comparador: (s) => ["Comparador de equipos", `${s.leagueName} · Enfrentamiento estadístico`],
    analisis: (s) => ["Análisis de partido", `${s.leagueName} · Eventos, alineaciones, xG y momentum`],
    marca: () => ["Marca", "Sistema de identidad de StatArena"],
  };

  /* =====================================================================
     VISTA: RESUMEN
     ===================================================================== */
  function viewResumen() {
    const lg = state.league;
    const s = StatData.getSummary(lg);
    const table = StatData.getStandings(lg);
    const scorers = StatData.getScorers(lg);
    const matches = StatData.getMatches(lg);

    const html = `
      <div class="view">
        <!-- KPIs -->
        <div class="kpis">
          ${kpiCard("Goles totales", s.totalGoals, "+8.4%", true, "ball",
            table[0].ptsSeries.map((_, i) => 2 + Math.sin(i / 2) + Math.random()))}
          ${kpiCard("Media de goles/partido", s.avgGoals, "+0.12", true, "trend",
            s.goalsByRound)}
          ${kpiCard("Partidos jugados", s.totalMatches, `${s.round}/${s.rounds} jornadas`, null, "calendar",
            table[0].ptsSeries)}
          ${kpiCard("Asistencia media", (s.avgAttendance / 1000).toFixed(1) + "K", "+3.1%", true, "people",
            Array.from({ length: 12 }, () => 28 + Math.random() * 30))}
        </div>

        <!-- Gráfico principal + líder -->
        <div class="grid cols-2" style="margin-top:18px">
          <div class="card">
            <div class="card__head">
              <div>
                <div class="card__title">Goles por jornada</div>
                <div class="card__sub">Media de la liga a lo largo de la temporada</div>
              </div>
              <div class="seg" id="segGoals">
                <button class="is-active" data-r="all">Temporada</button>
                <button data-r="10">Últimas 10</button>
              </div>
            </div>
            <div class="chart-wrap" id="chartGoals"></div>
            <div class="legend">
              <span><i style="background:${cssVar('--brand')}"></i>Goles / jornada</span>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <div class="card__title">Líder de la competición</div>
            </div>
            ${leaderBlock(table[0], lg)}
          </div>
        </div>

        <!-- En vivo + goleadores -->
        <div class="grid cols-2" style="margin-top:18px">
          <div class="card">
            <div class="card__head">
              <div class="card__title">Partidos en directo</div>
              <span class="tag-live">EN VIVO</span>
            </div>
            ${matches.live.map(matchRow).join("")}
            <div class="card__head" style="margin:18px 0 12px">
              <div class="card__title" style="font-size:13px">Resultados recientes</div>
            </div>
            ${matches.recent.slice(0, 3).map(matchRow).join("")}
          </div>

          <div class="card">
            <div class="card__head">
              <div class="card__title">Pichichi</div>
              <button class="btn btn--sm btn--ghost" data-go="jugadores">Ver todos</button>
            </div>
            <div class="rowlist">
              ${scorers.slice(0, 6).map((p, i) => scorerRow(p, i)).join("")}
            </div>
          </div>
        </div>

        <!-- Mini tabla + distribución -->
        <div class="grid cols-2" style="margin-top:18px">
          <div class="card">
            <div class="card__head">
              <div class="card__title">Clasificación (Top 6)</div>
              <button class="btn btn--sm btn--ghost" data-go="clasificacion">Tabla completa</button>
            </div>
            ${standingsTable(table.slice(0, 6), lg, true)}
          </div>
          <div class="card">
            <div class="card__head">
              <div class="card__title">Distribución de resultados</div>
              <div class="card__sub">Local · empate · visitante</div>
            </div>
            <div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap;justify-content:center;padding:10px 0">
              <div id="donutResults"></div>
              <div class="legend" style="flex-direction:column;align-items:flex-start;gap:10px">
                <span><i style="background:${cssVar('--win')}"></i>Victoria local</span>
                <span><i style="background:${cssVar('--draw')}"></i>Empate</span>
                <span><i style="background:${cssVar('--info')}"></i>Victoria visitante</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    content.innerHTML = html;

    // charts
    const gb = s.goalsByRound;
    Charts.area(
      document.getElementById("chartGoals"),
      { labels: gb.map((_, i) => "J" + (i + 1)), series: [{ name: "goles", color: cssVar("--brand"), values: gb }] },
      { height: 250 }
    );
    Charts.donut(
      document.getElementById("donutResults"),
      [
        { label: "Local", value: 45, color: cssVar("--win") },
        { label: "Empate", value: 26, color: cssVar("--draw") },
        { label: "Visitante", value: 29, color: cssVar("--info") },
      ],
      { center: { value: s.totalMatches, label: "partidos" } }
    );

    // segmented control demo
    const seg = document.getElementById("segGoals");
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      const vals = b.dataset.r === "all" ? gb : gb.slice(-10);
      Charts.area(
        document.getElementById("chartGoals"),
        { labels: vals.map((_, i) => "J" + (i + 1)), series: [{ name: "goles", color: cssVar("--brand"), values: vals }] },
        { height: 250 }
      );
    });
  }

  function kpiCard(label, value, delta, up, icon, spark) {
    const id = "spk" + Math.random().toString(36).slice(2, 7);
    const chip = delta
      ? up === null
        ? `<span class="chip">${esc(delta)}</span>`
        : `<span class="chip ${up ? "is-up" : "is-down"}">${up ? "▲" : "▼"} ${esc(delta)}</span>`
      : "";
    setTimeout(() => {
      const m = document.getElementById(id);
      if (m && spark) Charts.sparkline(m, spark, cssVar("--brand"));
    }, 0);
    return `
      <div class="card kpi">
        <div class="kpi__top">
          <span class="kpi__icon">${ICONS[icon] || ""}</span>
          <span class="kpi__label">${esc(label)}</span>
          ${chip ? `<span class="kpi__delta">${chip}</span>` : ""}
        </div>
        <div class="kpi__value num">${esc(value)}</div>
        <div class="kpi__spark" id="${id}"></div>
      </div>`;
  }

  function leaderBlock(team, lg) {
    return `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
        ${crest(team, 56)}
        <div>
          <div style="font-size:18px;font-weight:800">${esc(team.name)}</div>
          <div class="muted" style="font-size:12.5px">${team.pts} pts · ${team.w}V ${team.d}E ${team.l}D</div>
        </div>
      </div>
      <div class="tile__stats">
        <div class="tile__stat"><b>${team.gf}</b><span>GF</span></div>
        <div class="tile__stat"><b>${team.ga}</b><span>GC</span></div>
        <div class="tile__stat"><b>${team.gd > 0 ? "+" : ""}${team.gd}</b><span>DG</span></div>
      </div>
      <div style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px">
          <span class="muted">Forma reciente</span>${formGuide(team.form)}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px">
          <span class="muted">Puntos por partido</span><b>${team.ppg}</b>
        </div>
        <div class="bar" style="margin-top:6px"><i style="width:${(team.ppg / 3) * 100}%"></i></div>
      </div>`;
  }

  /* =====================================================================
     VISTA: PARTIDOS
     ===================================================================== */
  function viewPartidos() {
    const m = StatData.getMatches(state.league);
    content.innerHTML = `
      <div class="view grid cols-3">
        <div class="card">
          <div class="card__head"><div class="card__title">En directo</div><span class="tag-live">EN VIVO</span></div>
          ${m.live.map(matchRow).join("")}
        </div>
        <div class="card">
          <div class="card__head"><div class="card__title">Resultados recientes</div></div>
          ${m.recent.map(matchRow).join("")}
        </div>
        <div class="card">
          <div class="card__head"><div class="card__title">Próximos partidos</div></div>
          ${m.upcoming.map(matchRow).join("")}
        </div>
      </div>`;
  }

  function matchRow(m) {
    const live = m.status === "live";
    const ns = m.status === "ns";
    const score = ns ? `<div class="match__score" style="font-size:12px">VS</div>`
                     : `<div class="match__score">${m.hs}<span style="opacity:.4"> : </span>${m.as}</div>`;
    const meta = live ? `<div class="match__meta"><span class="tag-live">${m.minute}'</span></div>`
              : ns ? `<div class="match__meta">${esc(m.date)}</div>`
              : `<div class="match__meta">Final</div>`;
    return `
      <div class="match ${live ? "live" : ""}">
        <div class="match__team home">
          <strong>${esc(m.home.name)}</strong>${crest(m.home, 28)}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          ${score}${meta}
        </div>
        <div class="match__team away">
          ${crest(m.away, 28)}<strong>${esc(m.away.name)}</strong>
        </div>
      </div>`;
  }

  /* =====================================================================
     VISTA: CLASIFICACIÓN
     ===================================================================== */
  function viewClasificacion() {
    const lg = state.league;
    const table = StatData.getStandings(lg);
    content.innerHTML = `
      <div class="view">
        <div class="card">
          <div class="card__head">
            <div>
              <div class="card__title">Tabla de clasificación</div>
              <div class="card__sub">Haz clic en una columna para entender la leyenda de colores</div>
            </div>
            <div class="legend" style="margin:0">
              <span><i style="background:${cssVar('--info')}"></i>Champions</span>
              <span><i style="background:${cssVar('--draw')}"></i>Europa</span>
              <span><i style="background:${cssVar('--loss')}"></i>Descenso</span>
            </div>
          </div>
          ${standingsTable(table, lg, false)}
        </div>
      </div>`;
  }

  function standingsTable(rows, lg, compact) {
    return `
      <div class="table-wrap">
        <table class="stats">
          <thead>
            <tr>
              <th style="width:38px">#</th>
              <th class="t-team" style="text-align:left">Equipo</th>
              <th>PJ</th><th>G</th><th>E</th><th>P</th>
              ${compact ? "" : "<th>GF</th><th>GC</th>"}
              <th>DG</th>
              ${compact ? "" : '<th>Forma</th>'}
              <th class="t-pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((t) => `
              <tr>
                <td><span class="rank ${rankClass(t.pos, lg)}">${t.pos}</span></td>
                <td class="t-team"><div class="team-cell">${crest(t)}<strong>${esc(t.name)}</strong></div></td>
                <td>${t.played}</td>
                <td style="color:var(--win)">${t.w}</td>
                <td style="color:var(--draw)">${t.d}</td>
                <td style="color:var(--loss)">${t.l}</td>
                ${compact ? "" : `<td>${t.gf}</td><td>${t.ga}</td>`}
                <td><b>${t.gd > 0 ? "+" : ""}${t.gd}</b></td>
                ${compact ? "" : `<td>${formGuide(t.form)}</td>`}
                <td class="t-pts">${t.pts}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* =====================================================================
     VISTA: EQUIPOS
     ===================================================================== */
  function viewEquipos() {
    const table = StatData.getStandings(state.league);
    content.innerHTML = `
      <div class="view">
        <div class="tiles">
          ${table.map((t) => `
            <div class="tile" data-team="${t.id}" tabindex="0" role="button" aria-label="Ver ${esc(t.name)}">
              <div class="tile__head">
                ${crest(t, 46)}
                <div>
                  <div class="tile__name">${esc(t.name)}</div>
                  <div class="tile__sub">${t.pos}º · ${t.pts} pts</div>
                </div>
              </div>
              <div class="tile__stats">
                <div class="tile__stat"><b>${t.w}</b><span>Ganados</span></div>
                <div class="tile__stat"><b>${t.gf}</b><span>Goles</span></div>
                <div class="tile__stat"><b>${t.possAvg}%</b><span>Posesión</span></div>
              </div>
              <div style="margin-top:14px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:6px">
                  <span class="muted">Forma</span>${formGuide(t.form)}
                </div>
              </div>
            </div>`).join("")}
        </div>
      </div>`;

    content.querySelectorAll(".tile").forEach((tile) => {
      tile.addEventListener("click", () => openTeam(tile.dataset.team));
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTeam(tile.dataset.team); }
      });
    });
  }

  function openTeam(teamId) {
    const lg = state.league;
    const t = StatData.getTeam(lg, teamId);
    if (!t) return;
    state.compare.a = teamId;
    navigate("comparador");
  }

  /* =====================================================================
     VISTA: JUGADORES
     ===================================================================== */
  function viewJugadores() {
    const scorers = StatData.getScorers(state.league);
    const topAssist = [...scorers].sort((a, b) => b.assists - a.assists).slice(0, 6);
    const topRating = [...scorers].sort((a, b) => b.rating - a.rating).slice(0, 6);

    content.innerHTML = `
      <div class="view grid cols-3">
        <div class="card">
          <div class="card__head"><div class="card__title">Máximos goleadores</div></div>
          <div class="rowlist">${scorers.slice(0, 8).map((p, i) => scorerRow(p, i)).join("")}</div>
        </div>
        <div class="card">
          <div class="card__head"><div class="card__title">Asistencias</div></div>
          <div class="rowlist">${topAssist.map((p, i) => scorerRow(p, i, "assists")).join("")}</div>
        </div>
        <div class="card">
          <div class="card__head"><div class="card__title">Mejor valoración</div></div>
          <div class="rowlist">${topRating.map((p, i) => scorerRow(p, i, "rating")).join("")}</div>
        </div>
      </div>`;
  }

  function scorerRow(p, i, metric) {
    metric = metric || "goals";
    const val = metric === "goals" ? p.goals : metric === "assists" ? p.assists : p.rating;
    const unit = metric === "goals" ? "goles" : metric === "assists" ? "asist." : "media";
    return `
      <div class="rowlist__item">
        <span class="rowlist__rank">${i + 1}</span>
        ${playerFace(p)}
        <div class="rowlist__name">
          <strong>${esc(p.name)}</strong>
          <span>${esc(p.teamName)} · ${esc(p.pos)}</span>
        </div>
        <div class="rowlist__val">${val} <small>${unit}</small></div>
      </div>`;
  }

  /* =====================================================================
     VISTA: ESTADÍSTICAS AVANZADAS
     ===================================================================== */
  function viewEstadisticas() {
    const lg = state.league;
    const table = StatData.getStandings(lg);
    const topAttack = [...table].sort((a, b) => b.gf - a.gf).slice(0, 8);
    const topDefense = [...table].sort((a, b) => a.ga - b.ga).slice(0, 8);

    content.innerHTML = `
      <div class="view">
        <div class="grid cols-2">
          <div class="card">
            <div class="card__head">
              <div><div class="card__title">Mejores ataques</div><div class="card__sub">Goles a favor</div></div>
            </div>
            <div id="barsAttack"></div>
          </div>
          <div class="card">
            <div class="card__head">
              <div><div class="card__title">Mejores defensas</div><div class="card__sub">Goles en contra</div></div>
            </div>
            <div id="barsDefense"></div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:18px">
          <div class="card">
            <div class="card__head">
              <div><div class="card__title">Goles esperados (xG vs Goles)</div><div class="card__sub">Top 8 por ataque</div></div>
            </div>
            <div class="chart-wrap" id="chartXg"></div>
            <div class="legend">
              <span><i style="background:${cssVar('--brand')}"></i>Goles reales</span>
              <span><i style="background:${cssVar('--info')}"></i>xG (esperados)</span>
            </div>
          </div>
          <div class="card">
            <div class="card__head">
              <div><div class="card__title">Perfil del líder</div><div class="card__sub">${esc(table[0].name)}</div></div>
            </div>
            <div style="display:grid;place-items:center" id="radarLeader"></div>
          </div>
        </div>
      </div>`;

    Charts.bars(document.getElementById("barsAttack"),
      topAttack.map((t) => ({ label: t.name, value: t.gf, color: t.color })));
    Charts.bars(document.getElementById("barsDefense"),
      topDefense.map((t) => ({ label: t.name, value: t.ga, color: t.color })));

    Charts.area(document.getElementById("chartXg"), {
      labels: topAttack.map((t) => t.short),
      series: [
        { name: "Goles", color: cssVar("--brand"), values: topAttack.map((t) => t.gf) },
        { name: "xG", color: cssVar("--info"), values: topAttack.map((t) => Math.round(t.xg)) },
      ],
    }, { height: 250, fill: false });

    const L = table[0];
    Charts.radar(
      document.getElementById("radarLeader"),
      ["Ataque", "Defensa", "Posesión", "Forma", "Eficacia"],
      [{
        name: L.name, color: cssVar("--brand"),
        values: [
          Math.min(100, (L.gf / L.played) * 35),
          Math.min(100, 100 - (L.ga / L.played) * 35),
          L.possAvg,
          (L.form.filter((f) => f === "W").length / 5) * 100,
          Math.min(100, (L.pts / (L.played * 3)) * 100),
        ],
      }],
      { max: 100, size: 300 }
    );
  }

  /* =====================================================================
     VISTA: COMPARADOR
     ===================================================================== */
  function viewComparador() {
    const lg = state.league;
    const table = StatData.getStandings(lg);
    if (!state.compare.a) state.compare.a = table[0].id;
    if (!state.compare.b) state.compare.b = table[1].id;

    const opts = (sel) => table.map((t) => `<option value="${t.id}" ${t.id === sel ? "selected" : ""}>${esc(t.name)}</option>`).join("");

    content.innerHTML = `
      <div class="view">
        <div class="card">
          <div class="compare-head">
            <div class="compare-pick">
              <select id="cmpA">${opts(state.compare.a)}</select>
            </div>
            <span class="vs">VS</span>
            <div class="compare-pick">
              <select id="cmpB">${opts(state.compare.b)}</select>
            </div>
          </div>
        </div>
        <div class="grid cols-2" style="margin-top:18px">
          <div class="card" id="cmpStats"></div>
          <div class="card">
            <div class="card__head"><div class="card__title">Perfil comparado</div></div>
            <div style="display:grid;place-items:center" id="cmpRadar"></div>
            <div class="legend" id="cmpLegend" style="justify-content:center"></div>
          </div>
        </div>
      </div>`;

    const a = document.getElementById("cmpA");
    const b = document.getElementById("cmpB");
    a.addEventListener("change", () => { state.compare.a = a.value; renderCompare(); });
    b.addEventListener("change", () => { state.compare.b = b.value; renderCompare(); });
    renderCompare();
  }

  function renderCompare() {
    const lg = state.league;
    const A = StatData.getTeam(lg, state.compare.a);
    const B = StatData.getTeam(lg, state.compare.b);
    if (!A || !B) return;

    const metrics = [
      ["Puntos", A.pts, B.pts],
      ["Victorias", A.w, B.w],
      ["Goles a favor", A.gf, B.gf],
      ["Goles en contra", A.ga, B.ga, true],
      ["Diferencia", A.gd, B.gd],
      ["Posesión media", A.possAvg + "%", B.possAvg + "%", false, A.possAvg, B.possAvg],
      ["Porterías a 0", A.cleanSheets, B.cleanSheets],
      ["Puntos/partido", A.ppg, B.ppg, false, A.ppg, B.ppg],
    ];

    document.getElementById("cmpStats").innerHTML = `
      <div class="card__head" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px">${crest(A, 34)}<strong>${esc(A.short)}</strong></div>
        <div class="card__title" style="font-size:13px">Cara a cara</div>
        <div style="display:flex;align-items:center;gap:10px"><strong>${esc(B.short)}</strong>${crest(B, 34)}</div>
      </div>
      ${metrics.map((m) => {
        const va = m[4] != null ? m[4] : (typeof m[1] === "number" ? m[1] : parseFloat(m[1]));
        const vb = m[5] != null ? m[5] : (typeof m[2] === "number" ? m[2] : parseFloat(m[2]));
        const tot = (va + vb) || 1;
        const pa = (va / tot) * 100, pb = (vb / tot) * 100;
        const lowerBetter = m[3] === true;
        const aWins = lowerBetter ? va < vb : va > vb;
        return `
          <div class="compare-row">
            <b style="text-align:left;color:${aWins ? "var(--brand)" : "var(--text)"}">${m[1]}</b>
            <div>
              <div class="compare-label">${esc(m[0])}</div>
              <div class="compare-bar"><span class="a" style="width:${pa}%"></span><span class="b" style="width:${pb}%"></span></div>
            </div>
            <b style="text-align:right;color:${!aWins ? "var(--info)" : "var(--text)"}">${m[2]}</b>
          </div>`;
      }).join("")}`;

    Charts.radar(
      document.getElementById("cmpRadar"),
      ["Ataque", "Defensa", "Posesión", "Forma", "Eficacia"],
      [
        { name: A.name, color: cssVar("--brand"), values: teamProfile(A) },
        { name: B.name, color: cssVar("--info"), values: teamProfile(B) },
      ],
      { max: 100, size: 300 }
    );
    document.getElementById("cmpLegend").innerHTML =
      `<span><i style="background:${cssVar('--brand')}"></i>${esc(A.short)}</span>
       <span><i style="background:${cssVar('--info')}"></i>${esc(B.short)}</span>`;
  }

  function teamProfile(t) {
    return [
      Math.min(100, (t.gf / t.played) * 35),
      Math.min(100, 100 - (t.ga / t.played) * 35),
      t.possAvg,
      (t.form.filter((f) => f === "W").length / 5) * 100,
      Math.min(100, (t.pts / (t.played * 3)) * 100),
    ];
  }

  /* =====================================================================
     VISTA: ANÁLISIS DE PARTIDO
     ===================================================================== */
  function viewAnalisis() {
    const lg = state.league;
    const list = StatData.getMatchList(lg);
    if (!state.matchId || !list.find((x) => x.id === state.matchId)) state.matchId = list[0].id;
    const a = StatData.getMatchAnalysis(lg, state.matchId);

    const opts = list
      .map((m) => `<option value="${m.id}" ${m.id === state.matchId ? "selected" : ""}>${esc(m.home.name)} vs ${esc(m.away.name)}</option>`)
      .join("");
    const status = a.status === "live"
      ? `<div class="scoreboard__status live"><span class="tag-live">${a.minute}'</span></div>`
      : `<div class="scoreboard__status">Final</div>`;

    const evMeta = (e) =>
      e.type === "goal" ? { cls: "goal", label: "Gol" }
      : e.type === "card" ? (e.detail === "Red Card" ? { cls: "red", label: "Roja" } : { cls: "card", label: "Amarilla" })
      : { cls: "subst", label: "Cambio" };
    const eventRow = (e) => {
      const m = evMeta(e);
      const cell = `<div class="tl-side ${e.side}"><span class="tl-ico ${m.cls}"></span><span class="tl-name">${esc(e.player || "")}<small> · ${m.label}${e.assist ? ` (${esc(e.assist)})` : ""}</small></span></div>`;
      const blank = `<div></div>`;
      return `<div class="tl-item">${e.side === "home" ? cell : blank}<span class="tl-min num">${e.minute}'</span>${e.side === "away" ? cell : blank}</div>`;
    };
    const lineupBlock = (team, lu) => `
      <div class="lineup">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">${crest(team, 22)}<strong style="font-size:13px">${esc(team.short)}</strong><span class="lineup__formation">${esc(lu.formation)}</span></div>
        <div class="xi">${lu.startXI.map((p) => `<div class="xi-item"><span class="xi-num">${p.number}</span><span class="tl-name">${esc(p.name)}</span><span class="xi-pos">${esc(p.pos)}</span></div>`).join("")}</div>
        <div class="card__sub" style="margin-top:8px">Suplentes</div>
        <div style="font-size:12px;color:var(--text-2);margin-top:4px;line-height:1.6">${lu.substitutes.map((p) => esc(p.name)).join(" · ")}</div>
      </div>`;

    content.innerHTML = `
      <div class="view">
        <div class="card">
          <div class="card__head">
            <div class="match-pick">
              <span class="eyebrow">Partido</span>
              <select id="matchSel" aria-label="Seleccionar partido">${opts}</select>
            </div>
            <span class="chip">xG ${a.xg.home} – ${a.xg.away}</span>
          </div>
          <div class="scoreboard">
            <div class="scoreboard__team">${crest(a.home, 48)}<strong>${esc(a.home.name)}</strong></div>
            <div class="scoreboard__center"><div class="scoreboard__score num">${a.hs} : ${a.as}</div>${status}</div>
            <div class="scoreboard__team">${crest(a.away, 48)}<strong>${esc(a.away.name)}</strong></div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <div class="card__head"><div><div class="card__title">Momentum</div><div class="card__sub">Presión por minuto · + ${esc(a.home.short)} / − ${esc(a.away.short)}</div></div></div>
            <div class="chart-wrap" id="momentumChart"></div>
          </div>
          <div class="card">
            <div class="card__head"><div class="card__title">Estadísticas</div></div>
            <div id="statCompare"></div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <div class="card__head"><div class="card__title">Cronología</div></div>
            <div class="timeline">${a.events.length ? a.events.map(eventRow).join("") : '<p class="muted center" style="padding:18px">Sin eventos.</p>'}</div>
          </div>
          <div class="card">
            <div class="card__head"><div class="card__title">Alineaciones</div></div>
            <div class="lineups">${lineupBlock(a.home, a.lineups.home)}${lineupBlock(a.away, a.lineups.away)}</div>
          </div>
        </div>
      </div>`;

    Charts.area(
      document.getElementById("momentumChart"),
      { labels: a.momentum.map((p) => p.minute + "'"), series: [{ name: "momentum", color: cssVar("--accent"), values: a.momentum.map((p) => p.value) }] },
      { height: 230 },
    );

    document.getElementById("statCompare").innerHTML = a.stats
      .map((s) => {
        const tot = (Math.abs(s.ha) + Math.abs(s.aa)) || 1;
        const pa = (s.ha / tot) * 100, pb = (s.aa / tot) * 100;
        const aWin = s.label === "Faltas" ? s.ha < s.aa : s.ha > s.aa;
        return `<div class="compare-row"><b style="text-align:left;color:${aWin ? "var(--accent)" : "var(--text)"}">${s.home}</b><div><div class="compare-label">${esc(s.label)}</div><div class="compare-bar"><span class="a" style="width:${pa}%"></span><span class="b" style="width:${pb}%"></span></div></div><b style="text-align:right;color:${!aWin ? "var(--info)" : "var(--text)"}">${s.away}</b></div>`;
      })
      .join("");

    document.getElementById("matchSel").addEventListener("change", (e) => {
      state.matchId = e.target.value;
      viewAnalisis();
      appendDisclaimer();
    });
  }

  /* =====================================================================
     VISTA: MARCA (sistema de identidad)
     ===================================================================== */
  function markSvg(size, o) {
    o = o || {};
    const s = size || 40;
    const bg = o.bg || "var(--mark-bg)";
    const bars = o.bars || "#eef2f7";
    const accent = o.accent || "var(--accent)";
    return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" role="img" aria-label="StatArena"><rect width="64" height="64" rx="15" fill="${bg}"/><rect x="17" y="33" width="7" height="13" rx="3" fill="${bars}"/><rect x="28.5" y="27" width="7" height="19" rx="3" fill="${bars}"/><rect x="40" y="20" width="7" height="26" rx="3" fill="${bars}"/><path d="M20.5,32.5 L32,26.5 L43.5,20" fill="none" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="43.5" cy="20" r="4.2" fill="${accent}"/></svg>`;
  }
  function markMono(size, color) {
    const s = size || 40, c = color || "currentColor";
    return `<svg viewBox="0 0 64 64" width="${s}" height="${s}"><rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="none" stroke="${c}" stroke-width="3"/><rect x="17" y="33" width="7" height="13" rx="3" fill="${c}"/><rect x="28.5" y="27" width="7" height="19" rx="3" fill="${c}"/><rect x="40" y="20" width="7" height="26" rx="3" fill="${c}"/><path d="M20.5,32.5 L32,26.5 L43.5,20" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="43.5" cy="20" r="4.2" fill="${c}"/></svg>`;
  }

  const BRAND_PROMPT = [
    "Minimalist vector logo / app icon for \"StatArena\", a professional football (soccer) analytics platform.",
    "Concept: a rounded-square dark ink tile (#0e141c) containing three ascending off-white stat bars, overlaid by a rising orange trend line (#ff6a00) ending in a glowing orange node (a live data point).",
    "Style: flat, geometric, broadcast/editorial sports aesthetic, high contrast, crisp at small sizes, no gradients, no text in the icon.",
    "Palette: ink #0e141c, floodlight orange #ff6a00, off-white #eef2f7.",
    "Deliver: primary icon on transparent background, plus a monochrome (single-color) version and an inverse version for dark backgrounds. SVG-like clean edges, centered, generous padding. Modern, ownable, NOT a generic AI look.",
  ].join("\n\n");

  function viewMarca() {
    const swatch = (name, hex, use) => `<div class="swatch"><div class="swatch__chip" style="background:${hex}"></div><div class="swatch__meta"><b>${name}</b><span>${hex}</span><div class="muted" style="font-size:10.5px">${use}</div></div></div>`;
    content.innerHTML = `
      <div class="view">
        <div class="logo-hero">
          ${markSvg(72)}
          <div class="logo-hero__word"><span class="logo-hero__name">StatArena</span><span class="logo-hero__tag">Football Intelligence</span></div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <div class="card__head"><div><div class="card__title">Variantes</div><div class="card__sub">Para cualquier fondo</div></div></div>
            <div class="variant-grid">
              <div class="variant on-dark">${markSvg(56)}<span class="variant__label">Principal</span></div>
              <div class="variant on-light">${markSvg(56)}<span class="variant__label">Sobre claro</span></div>
              <div class="variant on-accent">${markMono(56, "#1a0c00")}<span class="variant__label">Sobre acento</span></div>
              <div class="variant on-dark">${markMono(56, "#eef2f7")}<span class="variant__label">Monocromo</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card__head"><div><div class="card__title">Escalabilidad</div><div class="card__sub">Legible hasta 20px (favicon)</div></div></div>
            <div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap;padding:8px 0">
              ${[64, 40, 28, 20].map((s) => `<div style="text-align:center"><div>${markSvg(s)}</div><div class="variant__label" style="margin-top:8px">${s}px</div></div>`).join("")}
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card__head"><div><div class="card__title">Paleta de marca</div><div class="card__sub">Color con significado (léxico de dominio)</div></div></div>
          <div class="swatches">
            ${swatch("Floodlight", "#ff6a00", "Acento / acción")}
            ${swatch("Pitch", "#2bb673", "Positivo")}
            ${swatch("Card yellow", "#f5a524", "Aviso")}
            ${swatch("Card red", "#e5484d", "Negativo")}
            ${swatch("Kickoff", "#4c8dff", "Información")}
            ${swatch("Ink", "#0e141c", "Base oscura")}
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <div class="card__head"><div class="card__title">Uso correcto</div></div>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-2);line-height:1.8">
              <li>Área de respeto ≥ a la altura del isotipo.</li>
              <li>No deformar ni alterar los colores del isotipo.</li>
              <li>Sobre fotos, usar la versión monocroma.</li>
              <li>Tamaño mínimo del isotipo: 20&nbsp;px.</li>
              <li>Archivos SVG en <code>/brand</code> del repo.</li>
            </ul>
          </div>
          <div class="card">
            <div class="card__head"><div><div class="card__title">Prompt para IA</div><div class="card__sub">Genera una versión raster y adjúntala; la integro</div></div></div>
            <div class="prompt-box"><button class="btn btn--sm copy-btn" id="copyPrompt">Copiar</button><pre id="promptText">${esc(BRAND_PROMPT)}</pre></div>
          </div>
        </div>
      </div>`;

    const btn = document.getElementById("copyPrompt");
    btn.addEventListener("click", () => {
      try {
        navigator.clipboard.writeText(BRAND_PROMPT);
        btn.textContent = "Copiado";
        setTimeout(() => (btn.textContent = "Copiar"), 1500);
      } catch (_) {}
    });
  }

  /* =====================================================================
     ROUTER
     ===================================================================== */
  const VIEWS = {
    resumen: viewResumen,
    partidos: viewPartidos,
    clasificacion: viewClasificacion,
    equipos: viewEquipos,
    jugadores: viewJugadores,
    estadisticas: viewEstadisticas,
    comparador: viewComparador,
    analisis: viewAnalisis,
    marca: viewMarca,
  };

  /* ---------- Fuente de datos: LIVE (backend) con fallback a DEMO ----------
     Patrón seguro: si no hay backend configurado (sa-api-base), todo sigue
     en demo idéntico. Si lo hay, precargamos del backend y los getters de
     StatData devuelven los datos reales sin tocar las vistas. */
  const liveMode = () => !!(window.StatApi && window.StatApi.isEnabled());
  const LIVE = { standings: {}, scorers: {} };
  const _demoStandings = StatData.getStandings.bind(StatData);
  const _demoScorers = StatData.getScorers.bind(StatData);
  const _demoTeam = StatData.getTeam.bind(StatData);
  StatData.getStandings = (lg) => (liveMode() && LIVE.standings[lg]) ? LIVE.standings[lg] : _demoStandings(lg);
  StatData.getScorers = (lg) => (liveMode() && LIVE.scorers[lg]) ? LIVE.scorers[lg] : _demoScorers(lg);
  StatData.getTeam = (lg, id) => {
    if (liveMode() && LIVE.standings[lg]) return LIVE.standings[lg].find((t) => t.id === String(id)) || LIVE.standings[lg][0];
    return _demoTeam(lg, id);
  };
  async function ensureLive(lg) {
    if (!liveMode() || (LIVE.standings[lg] && LIVE.scorers[lg])) return;
    const [st, sc] = await Promise.all([
      window.StatApi.getStandings(lg).catch(() => null),
      window.StatApi.getScorers(lg).catch(() => null),
    ]);
    if (st && st.length) LIVE.standings[lg] = st;
    if (sc && sc.length) LIVE.scorers[lg] = sc;
  }

  function appendDisclaimer() {
    const host = content.querySelector(".view") || content;
    const d = document.createElement("div");
    d.className = "disclaimer";
    const icon = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    d.innerHTML = liveMode()
      ? `${icon}<span><b>Datos reales</b> vía backend StatArena (API-Football). Clasificación y goleadores en vivo con fotos reales; el resto en demo mientras se completa el binding.</span>`
      : `${icon}<span><b>Datos simulados</b> con fines de demostración (deterministas). Escudos reales vía media.api-sports.io · Conecta el backend para datos en vivo.</span>`;
    host.appendChild(d);
  }

  async function navigate(view) {
    if (!VIEWS[view]) view = "resumen";
    state.view = view;
    // nav active
    document.querySelectorAll(".nav__item").forEach((n) => n.classList.toggle("is-active", n.dataset.view === view));
    // precarga de datos reales (si hay backend); en demo no hace nada
    if (liveMode()) {
      try { await ensureLive(state.league); } catch (_) {}
    }
    // meta
    const s = StatData.getSummary(state.league);
    const [title, sub] = META[view](s);
    pageTitle.textContent = title;
    pageSubtitle.textContent = sub;
    // render
    VIEWS[view]();
    appendDisclaimer();
    // close mobile menu
    app.classList.remove("is-open");
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    content.scrollTop = 0;
  }

  /* ---------- Icons ---------- */
  const ICONS = {
    ball: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3l2.4 1.7-.9 2.8h-3l-.9-2.8L12 5zM6.2 10l2.7.2 1 2.7-2 1.9-2.5-1.2A8 8 0 016.2 10zm11.6 0a8 8 0 01.8 3.6l-2.5 1.2-2-1.9 1-2.7 2.7-.2z"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8v5h2V3h-7v2h3l-6 6-4-4-8 8z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><path d="M7 2v2H5a2 2 0 00-2 2v13a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2H7zm12 7v10H5V9h14z"/></svg>',
    people: '<svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 10-3-3 3 3 0 003 3zm-8 0a3 3 0 10-3-3 3 3 0 003 3zm0 2c-2.3 0-5 1.2-5 3.5V19h7v-2.5c0-.9.3-1.7.8-2.4C9.9 13.4 8.9 13 8 13zm8 0c-2.3 0-5 1.2-5 3.5V19h10v-2.5c0-2.3-2.7-3.5-5-3.5z"/></svg>',
  };

  /* ---------- utils ---------- */
  function cssVar(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  /* =====================================================================
     EVENTOS GLOBALES
     ===================================================================== */
  function initEvents() {
    // nav
    document.querySelectorAll(".nav__item").forEach((n) => {
      n.addEventListener("click", (e) => { e.preventDefault(); navigate(n.dataset.view); });
    });
    // botones "ver todos" / data-go
    content.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]");
      if (go) navigate(go.dataset.go);
    });

    // league switch
    document.getElementById("leagueSelect").addEventListener("change", (e) => {
      state.league = e.target.value;
      state.compare = { a: null, b: null };
      navigate(state.view);
    });

    // theme menu (theme-factory): Floodlight / Terminal / Cobalt / Broadcast
    const THEMES = ["dark", "terminal", "cobalt", "light"];
    const themeBtn = document.getElementById("themeBtn");
    const themeMenu = document.getElementById("themeMenu");
    function markTheme(t) {
      themeMenu.querySelectorAll(".theme-opt").forEach((o) => o.classList.toggle("is-active", o.dataset.themeSet === t));
    }
    function setTheme(t, rerender) {
      if (!THEMES.includes(t)) t = "dark";
      document.documentElement.setAttribute("data-theme", t);
      try { localStorage.setItem("sa-theme", t); } catch (_) {}
      markTheme(t);
      if (rerender) navigate(state.view); // refresca colores de los SVG
    }
    function closeThemeMenu() { themeMenu.hidden = true; themeBtn.setAttribute("aria-expanded", "false"); }
    themeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = themeMenu.hidden;
      themeMenu.hidden = !willOpen;
      themeBtn.setAttribute("aria-expanded", String(willOpen));
    });
    themeMenu.addEventListener("click", (e) => {
      const o = e.target.closest(".theme-opt");
      if (!o) return;
      setTheme(o.dataset.themeSet, true);
      closeThemeMenu();
    });
    document.addEventListener("click", () => { if (!themeMenu.hidden) closeThemeMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !themeMenu.hidden) closeThemeMenu(); });
    // init (sin re-render: el boot hace el primer render)
    let savedTheme = "dark";
    try { savedTheme = localStorage.getItem("sa-theme") || "dark"; } catch (_) {}
    setTheme(savedTheme, false);

    // sidebar collapse (desktop) + menu (mobile)
    document.getElementById("sidebarCollapse").addEventListener("click", () => app.classList.toggle("is-collapsed"));
    document.getElementById("menuToggle").addEventListener("click", () => app.classList.toggle("is-open"));
    // scrim para cerrar en móvil
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.addEventListener("click", () => app.classList.remove("is-open"));
    app.appendChild(scrim);

    // búsqueda en vivo con dropdown de resultados + empty state
    const search = document.getElementById("globalSearch");
    const searchResults = document.getElementById("searchResults");
    function closeSearch() { searchResults.hidden = true; search.setAttribute("aria-expanded", "false"); }
    function renderSearch(q) {
      q = (q || "").trim();
      if (!q) { closeSearch(); return; }
      const res = StatData.search(state.league, q);
      let html = "";
      if (res.teams.length) {
        html += `<p class="sr-group">Equipos</p>`;
        html += res.teams.map((t) => `<div class="sr-item" data-kind="team" data-id="${t.id}">${crest(t, 26)}<strong>${esc(t.name)}</strong><span class="sr-meta">${t.pos}º · ${t.pts} pts</span></div>`).join("");
      }
      if (res.players.length) {
        html += `<p class="sr-group">Jugadores</p>`;
        html += res.players.map((p) => `<div class="sr-item" data-kind="player">${avatar(p.name, p.color)}<strong>${esc(p.name)}</strong><span class="sr-meta">${p.goals} goles</span></div>`).join("");
      }
      if (!res.teams.length && !res.players.length) {
        html = `<div class="empty" style="padding:26px 16px"><div class="empty__icon"><svg viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2"><path d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"/></svg></div><p>Sin resultados para <b>“${esc(q)}”</b></p></div>`;
      }
      searchResults.innerHTML = html;
      searchResults.hidden = false;
      search.setAttribute("aria-expanded", "true");
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    });
    search.addEventListener("input", () => renderSearch(search.value));
    search.addEventListener("focus", () => { if (search.value.trim()) renderSearch(search.value); });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); search.blur(); return; }
      if (e.key === "Enter") {
        const res = StatData.search(state.league, search.value.trim());
        if (res.teams[0]) { state.compare.a = res.teams[0].id; navigate("comparador"); }
        else if (res.players[0]) navigate("jugadores");
        closeSearch(); search.value = "";
      }
    });
    searchResults.addEventListener("click", (e) => {
      const it = e.target.closest(".sr-item");
      if (!it) return;
      if (it.dataset.kind === "team") { state.compare.a = it.dataset.id; navigate("comparador"); }
      else navigate("jugadores");
      closeSearch(); search.value = "";
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".search")) closeSearch(); });

    // hash inicial
    window.addEventListener("hashchange", () => {
      const v = location.hash.replace("#", "");
      if (VIEWS[v] && v !== state.view) navigate(v);
    });
  }

  /* ---------- Tiempo real (SSE) — sólo si hay backend configurado ---------- */
  function setupLive() {
    if (!window.StatApi || !window.StatApi.isEnabled()) return;
    const footStrong = document.querySelector(".datasrc__body strong");
    const footSpan = document.querySelector(".datasrc__body span");
    const dot = document.querySelector(".datasrc__dot");
    try {
      window.StatApi.subscribeLive(
        (payload) => {
          if (footStrong) footStrong.textContent = `EN VIVO · ${payload.count} en juego`;
          if (footSpan) footSpan.textContent = `Backend conectado · ${new Date(payload.at).toLocaleTimeString()}`;
          if (dot) dot.style.background = "var(--loss)";
        },
        () => {
          if (footStrong) footStrong.textContent = "Backend sin conexión";
          if (dot) dot.style.background = "var(--text-3)";
        },
      );
    } catch (_) {}
  }

  /* ---------- Boot ---------- */
  function boot() {
    initEvents();
    const initial = location.hash.replace("#", "");
    navigate(VIEWS[initial] ? initial : "resumen");
    setupLive();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
