/* =====================================================================
   StatArena — Chart engine (SVG puro, sin dependencias)
   Expone window.Charts con: area, bars, donut, radar, sparkline.
   Todos los gráficos son responsivos (viewBox) y soportan tooltip.
   ===================================================================== */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();

  /* ---- Tooltip global compartido ---- */
  let tip;
  function ensureTip() {
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "svg-tip";
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(html, x, y) {
    const t = ensureTip();
    t.innerHTML = html;
    t.classList.add("show");
    const r = t.getBoundingClientRect();
    t.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + "px";
    t.style.top = (y - r.height - 12) + "px";
  }
  function hideTip() { if (tip) tip.classList.remove("show"); }

  /* ---- helpers de path ---- */
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y} ${cx} ${p1.y} ${p1.x} ${p1.y}`;
    }
    return d;
  }

  /* =====================================================================
     AREA / LINE chart
     data: { labels:[], series:[{name,color,values:[]}] }
     ===================================================================== */
  function area(mount, data, opts = {}) {
    mount.innerHTML = "";
    const W = 720, H = opts.height || 260;
    const pad = { t: 18, r: 16, b: 28, l: 36 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, preserveAspectRatio: "none" });

    const all = data.series.flatMap((s) => s.values);
    const max = opts.max ?? Math.max(...all) * 1.12;
    const min = opts.min ?? Math.min(0, ...all);
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const X = (i) => pad.l + (i / (data.labels.length - 1)) * iw;
    const Y = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;

    const grid = css("--line");
    const txt = css("--text-3");

    // gridlines + eje Y
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = min + ((max - min) * i) / ticks;
      const y = Y(v);
      svg.appendChild(el("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: grid, "stroke-width": 1 }));
      const tk = el("text", { x: pad.l - 8, y: y + 4, fill: txt, "font-size": 10, "text-anchor": "end" });
      tk.textContent = Math.round(v);
      svg.appendChild(tk);
    }
    // labels eje X (cada n)
    const step = Math.ceil(data.labels.length / 8);
    data.labels.forEach((lb, i) => {
      if (i % step !== 0 && i !== data.labels.length - 1) return;
      const tx = el("text", { x: X(i), y: H - 8, fill: txt, "font-size": 10, "text-anchor": "middle" });
      tx.textContent = lb;
      svg.appendChild(tx);
    });

    data.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => ({ x: X(i), y: Y(v), v, i }));
      const line = smoothPath(pts);
      const gid = `grad-${si}-${Math.random().toString(36).slice(2, 7)}`;
      const defs = el("defs", {});
      const lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      lg.appendChild(el("stop", { offset: "0", "stop-color": s.color, "stop-opacity": opts.fill === false ? 0 : 0.34 }));
      lg.appendChild(el("stop", { offset: "1", "stop-color": s.color, "stop-opacity": 0 }));
      defs.appendChild(lg); svg.appendChild(defs);

      if (opts.fill !== false) {
        const areaD = `${line} L ${pts[pts.length - 1].x} ${Y(min)} L ${pts[0].x} ${Y(min)} Z`;
        svg.appendChild(el("path", { d: areaD, fill: `url(#${gid})` }));
      }
      const p = el("path", { d: line, fill: "none", stroke: s.color, "stroke-width": 2.5, "stroke-linecap": "round" });
      p.style.strokeDasharray = p.getTotalLength ? "" : "";
      svg.appendChild(p);

      // puntos interactivos
      pts.forEach((pt) => {
        const dot = el("circle", { cx: pt.x, cy: pt.y, r: 3.2, fill: css("--surface"), stroke: s.color, "stroke-width": 2 });
        const hit = el("circle", { cx: pt.x, cy: pt.y, r: 12, fill: "transparent", style: "cursor:pointer" });
        hit.addEventListener("mousemove", (e) => {
          dot.setAttribute("r", 5);
          showTip(`<b>${pt.v}</b> ${s.name}<br><small>${data.labels[pt.i]}</small>`, e.clientX, e.clientY);
        });
        hit.addEventListener("mouseleave", () => { dot.setAttribute("r", 3.2); hideTip(); });
        svg.appendChild(dot); svg.appendChild(hit);
      });

      // animación de trazo
      requestAnimationFrame(() => {
        try {
          const len = p.getTotalLength();
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
          p.style.transition = "stroke-dashoffset 1s ease";
          requestAnimationFrame(() => (p.style.strokeDashoffset = 0));
        } catch (_) {}
      });
    });

    mount.appendChild(svg);
  }

  /* =====================================================================
     BAR chart (horizontal)
     data: [{label, value, color, sub}]
     ===================================================================== */
  function bars(mount, data, opts = {}) {
    mount.innerHTML = "";
    const max = Math.max(...data.map((d) => d.value)) * 1.05;
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "12px";

    data.forEach((d, i) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "120px 1fr auto";
      row.style.alignItems = "center";
      row.style.gap = "12px";

      const label = document.createElement("div");
      label.style.fontSize = "12.5px";
      label.style.fontWeight = "700";
      label.style.whiteSpace = "nowrap";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.textContent = d.label;

      const track = document.createElement("div");
      track.className = "bar";
      track.style.height = "12px";
      const fill = document.createElement("i");
      fill.style.width = "0%";
      fill.style.background = d.color
        ? `linear-gradient(90deg, ${d.color}, ${d.color})`
        : "linear-gradient(90deg, var(--brand), var(--brand-2))";
      track.appendChild(fill);
      requestAnimationFrame(() => {
        fill.style.transition = "width .9s cubic-bezier(.4,0,.2,1)";
        setTimeout(() => (fill.style.width = (d.value / max) * 100 + "%"), 40 + i * 50);
      });

      const val = document.createElement("div");
      val.style.fontWeight = "800";
      val.style.fontVariantNumeric = "tabular-nums";
      val.style.fontSize = "14px";
      val.innerHTML = `${d.value}${d.sub ? ` <small class="muted" style="font-weight:600">${d.sub}</small>` : ""}`;

      row.append(label, track, val);
      wrap.appendChild(row);
    });
    mount.appendChild(wrap);
  }

  /* =====================================================================
     DONUT chart
     data: [{label, value, color}]
     ===================================================================== */
  function donut(mount, data, opts = {}) {
    mount.innerHTML = "";
    const size = 180, r = 70, sw = 22, cx = size / 2, cy = size / 2;
    const total = data.reduce((a, d) => a + d.value, 0);
    const C = 2 * Math.PI * r;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
    svg.appendChild(el("circle", { cx, cy, r, fill: "none", stroke: css("--surface-3"), "stroke-width": sw }));

    let offset = 0;
    data.forEach((d) => {
      const frac = d.value / total;
      const seg = el("circle", {
        cx, cy, r, fill: "none", stroke: d.color, "stroke-width": sw,
        "stroke-dasharray": `${frac * C} ${C}`,
        "stroke-dashoffset": -offset * C,
        transform: `rotate(-90 ${cx} ${cy})`,
        "stroke-linecap": "butt",
        style: "cursor:pointer; transition: stroke-width .2s",
      });
      seg.addEventListener("mousemove", (e) => {
        seg.setAttribute("stroke-width", sw + 5);
        showTip(`<b>${Math.round(frac * 100)}%</b> ${d.label}<br><small>${d.value} de ${total}</small>`, e.clientX, e.clientY);
      });
      seg.addEventListener("mouseleave", () => { seg.setAttribute("stroke-width", sw); hideTip(); });
      svg.appendChild(seg);
      offset += frac;
    });

    const box = document.createElement("div");
    box.style.position = "relative";
    box.style.width = size + "px";
    box.style.height = size + "px";
    box.appendChild(svg);
    if (opts.center) {
      const center = document.createElement("div");
      center.className = "donut-center";
      center.style.position = "absolute";
      center.style.inset = "0";
      center.style.display = "flex";
      center.style.justifyContent = "center";
      center.style.flexDirection = "column";
      center.innerHTML = `<b>${opts.center.value}</b><span>${opts.center.label}</span>`;
      box.appendChild(center);
    }
    mount.appendChild(box);
  }

  /* =====================================================================
     RADAR chart
     axes: [labels], series: [{name,color,values:[0..max]}], max
     ===================================================================== */
  function radar(mount, axes, series, opts = {}) {
    mount.innerHTML = "";
    const size = opts.size || 300, cx = size / 2, cy = size / 2, R = size / 2 - 38;
    const max = opts.max || 100;
    const n = axes.length;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: "100%", height: size });
    const grid = css("--line"), txt = css("--text-3");
    const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i, rad) => ({ x: cx + Math.cos(ang(i)) * rad, y: cy + Math.sin(ang(i)) * rad });

    // anillos
    const rings = 4;
    for (let g = 1; g <= rings; g++) {
      const rr = (R * g) / rings;
      let d = "";
      for (let i = 0; i <= n; i++) { const p = pt(i % n, rr); d += (i === 0 ? "M" : "L") + ` ${p.x} ${p.y} `; }
      svg.appendChild(el("path", { d, fill: "none", stroke: grid, "stroke-width": 1 }));
    }
    // ejes + etiquetas
    axes.forEach((label, i) => {
      const p = pt(i, R);
      svg.appendChild(el("line", { x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: grid, "stroke-width": 1 }));
      const lp = pt(i, R + 18);
      const t = el("text", {
        x: lp.x, y: lp.y, fill: txt, "font-size": 10.5, "font-weight": 600,
        "text-anchor": Math.abs(lp.x - cx) < 6 ? "middle" : lp.x > cx ? "start" : "end",
        "dominant-baseline": "middle",
      });
      t.textContent = label;
      svg.appendChild(t);
    });

    series.forEach((s) => {
      const pts = s.values.map((v, i) => pt(i, (Math.min(v, max) / max) * R));
      let d = "";
      pts.forEach((p, i) => (d += (i === 0 ? "M" : "L") + ` ${p.x} ${p.y} `));
      d += "Z";
      svg.appendChild(el("path", { d, fill: s.color, "fill-opacity": 0.18, stroke: s.color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
      pts.forEach((p, i) => {
        const dot = el("circle", { cx: p.x, cy: p.y, r: 3.4, fill: s.color });
        const hit = el("circle", { cx: p.x, cy: p.y, r: 11, fill: "transparent", style: "cursor:pointer" });
        hit.addEventListener("mousemove", (e) => showTip(`<b>${s.values[i]}</b> ${axes[i]}<br><small>${s.name}</small>`, e.clientX, e.clientY));
        hit.addEventListener("mouseleave", hideTip);
        svg.appendChild(dot); svg.appendChild(hit);
      });
    });
    mount.appendChild(svg);
  }

  /* =====================================================================
     SPARKLINE (mini)
     ===================================================================== */
  function sparkline(mount, values, color, opts = {}) {
    mount.innerHTML = "";
    const W = 100, H = 46, pad = 4;
    const max = Math.max(...values), min = Math.min(...values);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "100%", preserveAspectRatio: "none" });
    const X = (i) => pad + (i / (values.length - 1)) * (W - pad * 2);
    const Y = (v) => H - pad - ((v - min) / Math.max(1, max - min)) * (H - pad * 2);
    const pts = values.map((v, i) => ({ x: X(i), y: Y(v) }));
    const line = smoothPath(pts);
    const gid = "sg" + Math.random().toString(36).slice(2, 7);
    const defs = el("defs", {});
    const lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.appendChild(el("stop", { offset: "0", "stop-color": color, "stop-opacity": 0.4 }));
    lg.appendChild(el("stop", { offset: "1", "stop-color": color, "stop-opacity": 0 }));
    defs.appendChild(lg); svg.appendChild(defs);
    svg.appendChild(el("path", { d: `${line} L ${X(values.length - 1)} ${H} L ${X(0)} ${H} Z`, fill: `url(#${gid})` }));
    svg.appendChild(el("path", { d: line, fill: "none", stroke: color, "stroke-width": 2, "stroke-linecap": "round" }));
    mount.appendChild(svg);
  }

  window.Charts = { area, bars, donut, radar, sparkline };
})();
