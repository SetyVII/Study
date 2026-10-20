/* ============================================================
   sims.js — visualizaciones (SVG puro, sin librerías).
   Cada sim es una fábrica (simEl, player) => { steps, onStep, onRestart? }
   Las animaciones representan el funcionamiento descrito en la UT1:
   colas, saturación, escalado, latencias, umbrales... sin adornos falsos.
   ============================================================ */
window.Sims = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const palette = {
    accent: "#5eead4", accent2: "#818cf8", ok: "#34d399",
    warn: "#fbbf24", bad: "#f87171", blue: "#60a5fa",
    muted: "#98a3c9", text: "#e9edff", line: "rgba(148,163,216,.16)",
    panel: "#182138"
  };

  function svg(w, h) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    return s;
  }
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  function node(parent, x, y, w, h, title, sub, opts = {}) {
    const g = el("g", {}, parent);
    const r = el("rect", { x, y, width: w, height: h, rx: 10, fill: palette.panel, stroke: opts.stroke || palette.line, "stroke-width": opts.strong ? 2 : 1 }, g);
    const t = el("text", { x: x + w / 2, y: y + (sub ? h / 2 - 6 : h / 2 + 4), "text-anchor": "middle", fill: opts.color || palette.text, "font-size": 12, "font-weight": 600 }, g);
    t.textContent = title;
    if (sub) {
      const st = el("text", { x: x + w / 2, y: y + h / 2 + 12, "text-anchor": "middle", fill: palette.muted, "font-size": 10 }, g);
      st.textContent = sub;
    }
    return { g, rect: r, text: t };
  }
  function label(parent, x, y, txt, opts = {}) {
    const t = el("text", { x, y, fill: opts.color || palette.muted, "font-size": opts.size || 10, "text-anchor": opts.anchor || "start", "font-weight": opts.bold ? 700 : 400 }, parent);
    t.textContent = txt;
    return t;
  }
  function caption(simEl, txt) {
    let c = simEl.querySelector(".sim-caption");
    if (!c) {
      c = document.createElement("div");
      c.className = "sim-caption";
      simEl.appendChild(c);
    }
    c.textContent = txt;
  }
  function clearPackets(root) {
    root.querySelectorAll(".g-packet").forEach((p) => p.remove());
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ================= SIM 0 — Problema: 1 máquina vs clúster ================= */
  function sim0(simEl, player) {
    const s = svg(560, 360);
    simEl.appendChild(s);
    let mode = 1; // nº de nodos
    let running = true;
    let queue = [];
    let tick = 0;

    const machine = node(s, 190, 40, 180, 60, "Servidor", "CPU · RAM · disco", { stroke: "rgba(148,163,216,.3)" });
    const qG = el("g", {}, s);
    const meter = el("rect", { x: 160, y: 150, width: 0, height: 14, rx: 7, fill: palette.bad }, s);
    const qLabel = label(s, 160, 143, "Cola de noticias sin procesar", { size: 10 });

    function drawNodes() {
      s.querySelectorAll(".cl-node").forEach((n) => n.remove());
      for (let i = 0; i < mode; i++) {
        const n = node(s, 120 + i * (320 / Math.max(mode, 1)) * 1.15, 40, 46, 34, "N" + (i + 1), null, { color: palette.accent, stroke: "rgba(94,234,212,.35)" });
        n.g.setAttribute("class", "cl-node");
        n.g.style.opacity = 0;
        requestAnimationFrame(() => { n.g.style.transition = "opacity .5s"; n.g.style.opacity = 1; });
      }
    }
    drawNodes();

    const ui = document.createElement("div");
    ui.className = "param-row";
    ui.style.position = "absolute";
    ui.style.left = "1rem";
    ui.innerHTML = `<span>Nodos:</span><input type="range" id="sim0n" min="1" max="4" value="1"><output>1</output>`;
    simEl.appendChild(ui);
    ui.querySelector("input").addEventListener("input", (e) => {
      mode = +e.target.value;
      ui.querySelector("output").textContent = mode;
      drawNodes();
      player.stopAutoplay();
    });

    function frame() {
      if (!running) return;
      tick++;
      // llegan noticias según velocidad (la fuente produce más de lo que un nodo procesa)
      const capacity = mode;
      const arrivals = 1 + (tick % 3 === 0 ? 1 : 0);
      for (let i = 0; i < arrivals; i++) queue.push(tick);
      // cada nodo procesa 1 noticia por tick
      for (let i = 0; i < capacity && queue.length; i++) queue.shift();
      // dibujar cola
      queue.slice(-14).forEach((q, i) => {
        el("rect", { x: 165 + i * 15, y: 152, width: 10, height: 10, rx: 2, fill: "rgba(248,113,113,.5)" }, qG);
      });
      while (qG.childNodes.length > Math.min(queue.length, 14)) qG.removeChild(qG.lastChild);
      meter.setAttribute("width", Math.min(queue.length, 30) * 8);
      meter.setAttribute("fill", queue.length > 20 ? palette.bad : queue.length > 10 ? palette.warn : palette.ok);
      caption(simEl, mode === 1
        ? "1 nodo: llega más de lo que se procesa → la cola crece sin límite (desborda recursos, UT1 p. 4)"
        : `${mode} nodos trabajando en paralelo (scale-out): capacidad ${mode} noticias/tick. Sube la fuente a tope para ver el límite.`);
      setTimeout(frame, 350);
    }
    frame();

    return {
      steps: 3,
      onStep(n) {
        if (n === 2 && mode === 1) { mode = 3; drawNodes(); ui.querySelector("input").value = 3; ui.querySelector("output").textContent = 3; }
      },
      onRestart() { queue = []; }
    };
  }

  /* ================= SIM 1 — Capas + batch/streaming ================= */
  function sim1(simEl, player) {
    const s = svg(560, 380);
    simEl.appendChild(s);
    const blocks = [
      ["📥", "Ingesta", "Kafka: corresponsales, agencias, redes, comunicados"],
      ["🧩", "Colección", "un esquema común de «noticia»"],
      ["🗄️", "Almacenamiento", "lake HDFS/S3 + NoSQL (A+P · BASE)"],
      ["⚡", "Procesamiento", "Streaming (caliente) + Batch (nocturno)"],
      ["🤖", "Analítica", "modelo de veracidad → score"],
      ["📡", "Servicio", "API a clientes + cuadro de mando"]
    ];
    const positions = blocks.map((_, i) => ({ x: 20 + (i % 2) * 285, y: 30 + Math.floor(i / 2) * 90 }));
    const nodes = blocks.map((b, i) => {
      const n = node(s, positions[i].x, positions[i].y, 250, 58, `${b[0]} ${b[1]}`, b[2]);
      n.rect.style.opacity = 0.35;
      n.text.style.opacity = 0.3;
      const sub = n.g.querySelectorAll("text")[1];
      if (sub) sub.style.opacity = 0.3;
      return n;
    });
    label(s, 20, 330, "🔒 Seguridad y 📈 monitorización: transversales a todas las capas (UT1 p. 36)", { size: 10 });

    const focus = (i) => {
      nodes.forEach((n, j) => {
        const on = j <= i;
        const sub = n.g.querySelectorAll("text")[1];
        n.rect.style.opacity = on ? 1 : 0.35;
        n.rect.setAttribute("stroke", j === i ? palette.accent : palette.line);
        n.rect.setAttribute("stroke-width", j === i ? 2 : 1);
        n.text.style.opacity = on ? 1 : 0.3;
        if (sub) sub.style.opacity = on ? 1 : 0.3;
      });
      caption(simEl, `Capa ${i + 1}: ${blocks[i][1]} — ${blocks[i][2]}`);
    };

    return { steps: 4, onStep(n) { focus(Math.min(n, blocks.length - 1)); } };
  }

  /* ================= SIM 2 — Pipeline con búfer y CAP ================= */
  function sim2(simEl, player) {
    const s = svg(560, 380);
    simEl.appendChild(s);
    const srcs = node(s, 15, 60, 90, 70, "📻 Fuentes", "4 tipos", {});
    const buf = node(s, 140, 60, 100, 70, "⏳ Kafka", "búfer", { stroke: "rgba(251,191,36,.4)" });
    const lake = node(s, 285, 20, 120, 55, "🗄️ Data lake", "histórico", {});
    const nosql = node(s, 285, 105, 120, 55, "NoSQL", "operativo", {});
    const spark = node(s, 440, 60, 100, 70, "⚡ Spark", "stream+batch", {});
    const ia = node(s, 440, 170, 100, 55, "🤖 IA", "score", { color: palette.accent });
    const cli = node(s, 285, 250, 120, 55, "📡 Clientes", "prensa·TV·radio", {});
    const human = node(s, 140, 250, 100, 55, "🧑‍⚖️ Editor", "zona gris", { stroke: "rgba(251,191,36,.4)" });
    el("line", { x1: 105, y1: 95, x2: 140, y2: 95, class: "g-edge" }, s);
    el("line", { x1: 240, y1: 80, x2: 285, y2: 47, class: "g-edge" }, s);
    el("line", { x1: 240, y1: 110, x2: 285, y2: 132, class: "g-edge" }, s);
    el("line", { x1: 405, y1: 95, x2: 440, y2: 95, class: "g-edge" }, s);
    el("line", { x1: 490, y1: 130, x2: 490, y2: 170, class: "g-edge" }, s);
    el("line", { x1: 440, y1: 197, x2: 405, y2: 270, class: "g-edge" }, s);
    el("line", { x1: 285, y1: 277, x2: 240, y2: 277, class: "g-edge" }, s);

    let prodRate = 1;
    let running = true;
    let inFlight = [];

    const ui = document.createElement("div");
    ui.className = "param-row";
    ui.style.position = "absolute";
    ui.style.left = "1rem";
    ui.innerHTML = `<span>Producción fuentes:</span><input type="range" id="sim2r" min="1" max="5" value="1"><output>1×</output>`;
    simEl.appendChild(ui);
    ui.querySelector("input").addEventListener("input", (e) => {
      prodRate = +e.target.value;
      ui.querySelector("output").textContent = prodRate + "×";
      player.stopAutoplay();
    });

    const capSel = document.createElement("div");
    capSel.className = "param-row";
    capSel.style.position = "absolute";
    capSel.style.right = "1rem";
    capSel.innerHTML = `<span>CAP:</span>
      <select style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:.2rem">
        <option value="AP">A+P (BASE) ✔</option>
        <option value="CP">C+P</option>
        <option value="CAP">C+A+P (imposible)</option>
      </select>`;
    simEl.appendChild(capSel);
    const sel = capSel.querySelector("select");
    sel.addEventListener("change", () => {
      player.stopAutoplay();
      if (sel.value === "CAP") {
        caption(simEl, "❌ C+A+P es imposible (teorema CAP, UT1 p. 26): al partir la red, un nodo no puede saber si otro ha escrito. Elige 2.");
        nosql.rect.setAttribute("stroke", palette.bad);
      } else if (sel.value === "CP") {
        caption(simEl, "C+P: ante el corte, el nodo aislado se BLOQUEA (consistencia antes que disponibilidad) → la agencia deja de servir noticias.");
        nosql.rect.setAttribute("stroke", palette.warn);
      } else {
        caption(simEl, "A+P / BASE (elección del diseño): ante el corte se sigue respondiendo con consistencia eventual — disponible ahora, exacto en segundos.");
        nosql.rect.setAttribute("stroke", "rgba(94,234,212,.4)");
      }
    });

    function packet(color = palette.accent, isBad = false) {
      const g = el("g", { class: "g-packet" + (isBad ? " bad" : "") }, s);
      const r = el("rect", { x: 0, y: 0, width: 26, height: 14, rx: 4 }, g);
      const t = el("text", { x: 13, y: 10, "text-anchor": "middle", "font-size": 8, fill: isBad ? palette.bad : palette.text }, g);
      t.textContent = isBad ? "FAKE" : "OK";
      r.setAttribute("fill", isBad ? "rgba(248,113,113,.25)" : "rgba(94,234,212,.2)");
      r.setAttribute("stroke", color);
      return g;
    }

    function animatePath(g, points, dur) {
      const t0 = performance.now();
      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const seg = Math.min(points.length - 2, Math.floor(p * (points.length - 1)));
        const lp = p * (points.length - 1) - seg;
        const x = points[seg][0] + (points[seg + 1][0] - points[seg][0]) * lp;
        const y = points[seg][1] + (points[seg + 1][1] - points[seg][1]) * lp;
        g.setAttribute("transform", `translate(${x},${y})`);
        if (p < 1 && running && g.isConnected) requestAnimationFrame(step);
        else if (g.isConnected && p >= 1) g.remove();
      }
      requestAnimationFrame(step);
    }

    let stepIdx = 0;
    const captions = [
      "Una noticia entra por su fuente y llega al búfer de ingesta.",
      "Kafka descarga las fuentes: acumula si llega más de lo que se procesa y vacía cuando hay margen.",
      "Se guarda replicada: data lake (histórico crudo) + NoSQL operativo.",
      "Spark puntúa en streaming cada noticia en caliente; de noche, batch reentrena con TODO el histórico (C+V del SCV).",
      "El modelo emite score: alto → cliente; bajo → retenida; gris → editor humano, que realimenta el aprendizaje."
    ];

    function spawn() {
      if (!running) return;
      const isBad = Math.random() < 0.3;
      const g = packet(isBad ? palette.bad : palette.accent, isBad);
      const path = isBad
        ? [[105, 95], [140, 95], [190, 95], [240, 100], [300, 130], [360, 132], [440, 197]]
        : [[105, 95], [140, 95], [240, 80], [300, 47], [490, 95], [490, 170], [440, 197], [405, 270], [360, 275]];
      animatePath(g, path, 4000);
      setTimeout(spawn, 1400 / prodRate);
    }
    spawn();

    return {
      steps: 4,
      onStep(n) {
        stepIdx = n;
        caption(simEl, captions[Math.min(n, captions.length - 1)]);
        if (n >= 1) { buf.rect.setAttribute("stroke", palette.warn); buf.rect.setAttribute("stroke-width", 2); }
        if (n >= 2) { lake.rect.setAttribute("stroke", palette.accent); nosql.rect.setAttribute("stroke", "rgba(94,234,212,.4)"); }
        if (n >= 3) spark.rect.setAttribute("stroke", palette.accent);
        if (n >= 3) spark.rect.setAttribute("stroke-width", 2);
      },
      onRestart() {
        [buf, lake, nosql, spark].forEach((b) => { b.rect.setAttribute("stroke", palette.line); b.rect.setAttribute("stroke-width", 1); });
        nosql.rect.setAttribute("stroke", "rgba(94,234,212,.4)");
      }
    };
  }

  /* ================= SIM 3 — Señales + reglas vs modelo ================= */
  function sim3(simEl, player) {
    const s = svg(560, 370);
    simEl.appendChild(s);
    const signals = [
      ["📝 Contenido", "sensacionalista, MAYÚSCULAS, absolutos"],
      ["🕵️ Fuente", "medio sin reputación, cuenta nueva"],
      ["🔗 Contrastación", "ninguna agencia lo confirma"],
      ["🚀 Difusión", "pico viral anómalo"],
      ["🖼️ Multimedia", "foto reciclada, metadatos incoherentes"]
    ];
    const rows = signals.map((sig, i) => {
      const y = 30 + i * 44;
      const n = node(s, 15, y, 220, 34, sig[0], null, { color: palette.text });
      const st = el("text", { x: 245, y: y + 21, fill: palette.muted, "font-size": 9 }, s);
      st.textContent = sig[1];
      const meter = el("rect", { x: 245, y: y + 9, width: 0, height: 6, rx: 3, fill: palette.accent2 }, s);
      return { n, meter, on: false, w: rnd(30, 70) };
    });
    const scoreBar = el("rect", { x: 15, y: 270, width: 0, height: 26, rx: 8, fill: palette.accent }, s);
    label(s, 15, 264, "Evidencia acumulada → score de sospecha", { size: 10 });
    const scoreTxt = label(s, 300, 288, "", { size: 13, bold: true, color: palette.text });

    const ui = document.createElement("div");
    ui.className = "sim-overlay-btns";
    ui.innerHTML = `<button class="sim-btn" data-a="signals">Alternar señales</button>
                    <button class="sim-btn" data-a="mutate">Mutar bulo</button>
                    <button class="sim-btn danger" data-a="rules">Probar regla fija</button>`;
    simEl.appendChild(ui);

    let mutated = false;
    let score = 0;

    function recompute() {
      score = rows.filter((r) => r.on).reduce((a, r) => a + (mutated && r.n.text.textContent.includes("Contenido") ? r.w * 0.35 : r.w), 0);
      if (mutated) score = Math.max(10, score - 18); else score = rows.filter(r => r.on).reduce((a, r) => a + r.w, 0);
      const total = Math.min(100, score);
      scoreBar.setAttribute("width", total * 4.6);
      scoreBar.setAttribute("fill", total > 66 ? palette.bad : total > 33 ? palette.warn : palette.ok);
      scoreTxt.textContent = (total / 100).toFixed(2) + (total > 66 ? "  → RETENER" : total > 33 ? "  → HUMANO" : "  → PUBLICAR");
      caption(simEl, mutated
        ? "Bulo mutado: la regla fija ('contiene ALARMANTE') ya NO lo detecta, pero las demás señales siguen acumulando evidencia — así aprende el modelo supervisado."
        : "Activa señales y mira cómo se acumula la evidencia. Cada una aporta peso; el score es la combinación.");
    }

    ui.addEventListener("click", (e) => {
      const a = e.target.dataset.a;
      player.stopAutoplay();
      if (a === "signals") {
        const anyOff = rows.some((r) => !r.on);
        rows.forEach((r, i) => {
          r.on = anyOff;
          r.meter.setAttribute("width", r.on ? r.w * 2.2 : 0);
        });
      } else if (a === "mutate") {
        mutated = !mutated;
        const first = rows[0].n.text;
        first.textContent = mutated ? "📝 Contenido (mutado)" : "📝 Contenido";
        first.setAttribute("fill", mutated ? palette.bad : palette.text);
      } else if (a === "rules") {
        caption(simEl, "Regla fija: 'si contiene ALARMANTE → falsa'. El emisor escribe 'A L A R M A N T E' o 'IMPACTANTE' y la regla muere. Las señales estructurales (fuente, difusión) siguen ahí.");
        return;
      }
      recompute();
    });

    rows.forEach((r, i) => {
      r.n.g.style.cursor = "pointer";
      r.n.g.addEventListener("click", () => {
        player.stopAutoplay();
        r.on = !r.on;
        r.meter.setAttribute("width", r.on ? r.w * 2.2 : 0);
        recompute();
      });
    });

    return {
      steps: 4,
      onStep(n) {
        if (n >= 1) { rows.slice(0, 3).forEach((r) => { r.on = true; r.meter.setAttribute("width", r.w * 2.2); }); recompute(); }
        if (n >= 2) { rows.forEach((r) => { r.on = true; r.meter.setAttribute("width", r.w * 2.2); }); recompute(); }
        if (n >= 3) recompute();
      },
      onRestart() {
        rows.forEach((r) => { r.on = false; r.meter.setAttribute("width", 0); });
        mutated = false;
        rows[0].n.text.textContent = "📝 Contenido";
        rows[0].n.text.setAttribute("fill", palette.text);
        scoreBar.setAttribute("width", 0);
        scoreTxt.textContent = "";
      }
    };
  }

  /* ================= SIM 4 — Umbrales y matriz de confusión ================= */
  function sim4(simEl, player) {
    const s = svg(560, 380);
    simEl.appendChild(s);
    const NEWS = [
      { t: "Reuters confirma el acuerdo", sc: 0.94, real: true },
      { t: "Dato del INE trimestral", sc: 0.9, real: true },
      { t: "Crónica de corresponsal acreditado", sc: 0.85, real: true },
      { t: "Declaración de portavoz, fuente única", sc: 0.6, real: true },
      { t: "Titular ambiguo sin contrastar", sc: 0.5, real: false },
      { t: "Cuenta anónima: «secreto oficial»", sc: 0.25, real: false },
      { t: "!!ÚLTIMA HORA!! ALARMANTE…", sc: 0.08, real: false },
      { t: "Foto reciclada de otro desastre", sc: 0.12, real: false }
    ];
    let th = 0.5, grey = 0.1;

    const zone = (sc) => sc >= th + grey ? "pub" : sc <= th - grey ? "hold" : "rev";

    label(s, 15, 22, "Noticias ordenadas por score del modelo (score alto = fiable)", { size: 10 });
    const items = NEWS.map((n, i) => {
      const y = 32 + i * 26;
      const bg = el("rect", { x: 15, y, width: 280, height: 22, rx: 6, fill: palette.panel }, s);
      const tx = label(s, 22, y + 15, n.t, { size: 9.5, color: palette.text });
      const bar = el("rect", { x: 300, y: y + 4, width: n.sc * 140, height: 14, rx: 4, fill: palette.accent2 }, s);
      const sv = label(s, 300 + n.sc * 140 + 4, y + 15, n.sc.toFixed(2), { size: 9 });
      return { bg, bar, n, y };
    });

    // línea de umbral (móvil)
    const thLine = el("line", { x1: 300, y1: 28, x2: 300, y2: 245, stroke: palette.warn, "stroke-width": 2, "stroke-dasharray": "5,4" }, s);
    const thGrey1 = el("rect", { x: 300, y: 28, width: 0, height: 217, fill: "rgba(96,165,250,.12)" }, s);
    const thLabel = label(s, 300, 260, "umbral", { size: 9, color: palette.warn, anchor: "middle" });

    // matriz de confusión
    const mx = 455, my = 60;
    label(s, mx - 40, my - 12, "Matriz de confusión", { size: 10, bold: true, color: palette.text });
    const cells = {};
    const defs = [
      ["tp", mx, my, "✅ publicadas OK", palette.ok],
      ["fn", mx + 0, my + 58, "🚨 FALSAS PUBLICADAS", palette.bad],
      ["fp", mx - 40, my + 116, "⏸ verdades retenidas", palette.warn],
      ["rev", mx + 0, my + 174, "🧐 cola humana", palette.blue]
    ];
    defs.forEach(([k, x, y, txt, col]) => {
      const box = el("rect", { x: x - 40, y, width: 120, height: 44, rx: 8, fill: palette.panel, stroke: col, "stroke-opacity": .5 }, s);
      const num = el("text", { x: x + 20, y: y + 19, "text-anchor": "middle", fill: col, "font-size": 16, "font-weight": 700 }, s);
      const lab = el("text", { x: x + 20, y: y + 35, "text-anchor": "middle", fill: palette.muted, "font-size": 7.5 }, s);
      lab.textContent = txt;
      cells[k] = num;
    });
    const costTxt = label(s, mx - 40, my + 240, "", { size: 10, bold: true });

    const ui = document.createElement("div");
    ui.className = "param-row";
    ui.style.position = "absolute";
    ui.style.left = "1rem";
    ui.style.bottom = "3.2rem";
    ui.innerHTML = `<span>Umbral:</span><input type="range" id="sim4t" min="20" max="80" value="50"><output>0.50</output>
                    <span style="margin-left:.6rem">Zona gris:</span><input type="range" id="sim4g" min="2" max="20" value="10" style="max-width:80px"><output>0.10</output>`;
    simEl.appendChild(ui);
    const tIn = ui.querySelector("#sim4t"), gIn = ui.querySelector("#sim4g");
    const upd = () => {
      th = tIn.value / 100; grey = gIn.value / 100;
      ui.querySelectorAll("output")[0].textContent = th.toFixed(2);
      ui.querySelectorAll("output")[1].textContent = grey.toFixed(2);
      render();
      player.stopAutoplay();
    };
    tIn.addEventListener("input", upd);
    gIn.addEventListener("input", upd);

    function render() {
      thLine.setAttribute("x1", 300 + th * 140);
      thLine.setAttribute("x2", 300 + th * 140);
      thGrey1.setAttribute("x", 300 + (th - grey) * 140);
      thGrey1.setAttribute("width", grey * 280);
      thLabel.setAttribute("x", 300 + th * 140);
      let tp = 0, fn = 0, fp = 0, rev = 0;
      items.forEach((it) => {
        const z = zone(it.n.sc);
        if (z === "pub") it.n.real ? tp++ : fn++;
        else if (z === "hold") it.n.real ? fp++ : 0;
        else rev++;
        it.bg.setAttribute("fill", z === "pub" ? "rgba(52,211,153,.12)" : z === "hold" ? "rgba(248,113,113,.12)" : "rgba(96,165,250,.12)");
        it.bg.setAttribute("stroke", z === "pub" ? palette.ok : z === "hold" ? palette.bad : palette.blue);
        it.bg.setAttribute("stroke-width", 1);
      });
      cells.tp.textContent = tp;
      cells.fn.textContent = fn;
      cells.fp.textContent = fp;
      cells.rev.textContent = rev;
      const cost = fn * 10 + fp * 2 + rev * 0.5;
      costTxt.textContent = `Coste simulado: ${cost.toFixed(1)} (falsa publicada ×10, exclusiva perdida ×2, revisión ×0.5)`;
      costTxt.setAttribute("fill", fn > 0 ? palette.bad : fp > 2 ? palette.warn : palette.ok);
      caption(simEl, fn > 0
        ? `⚠ ${fn} falsa(s) publicada(s): el peor error para una agencia. Sube el umbral o la zona gris.`
        : `Sin falsas publicadas. Coste actual dominado por ${fp} exclusiva(s) retenida(s) y ${rev} revisión(es).`);
    }
    render();

    return {
      steps: 4,
      onStep(n) {
        if (n === 1) { tIn.value = 50; grey = .1; }
        if (n === 2) { tIn.value = 62; th = .62; grey = .12; }
        if (n === 3) { tIn.value = 68; th = .68; grey = .16; }
        ui.querySelectorAll("output")[0].textContent = th.toFixed(2);
        ui.querySelectorAll("output")[1].textContent = grey.toFixed(2);
        render();
      },
      onRestart() { tIn.value = 50; th = .5; gIn.value = 10; grey = .1; render(); }
    };
  }

  /* ================= SIM 5 — Fases vs big-bang ================= */
  function sim5(simEl, player) {
    const s = svg(560, 330);
    simEl.appendChild(s);
    const phases = [
      ["F1 · Histórico", "entrenar batch, validar offline"],
      ["F2 · Sombra", "puntúa sin decidir · riesgo 0"],
      ["F3 · Asistida", "automático solo en extremos"],
      ["F4 · Producción", "decide + drift + reentrenado"]
    ];
    const nodes = phases.map((p, i) => node(s, 20 + i * 132, 40, 118, 62, p[0], p[1]));
    nodes.forEach((n) => {
      n.rect.style.opacity = .3;
      n.text.style.opacity = .3;
    });
    el("line", { x1: 138, y1: 71, x2: 152, y2: 71, class: "g-edge" }, s);
    el("line", { x1: 270, y1: 71, x2: 284, y2: 71, class: "g-edge" }, s);
    el("line", { x1: 402, y1: 71, x2: 416, y2: 71, class: "g-edge" }, s);

    const chartY = 240;
    el("line", { x1: 20, y1: chartY, x2: 540, y2: chartY, stroke: palette.line, "stroke-width": 1 }, s);
    label(s, 20, chartY + 14, "noticias incorrectas llegando al cliente, por semana", { size: 9 });
    let series = [];

    const ui = document.createElement("div");
    ui.className = "sim-overlay-btns";
    ui.innerHTML = `<button class="sim-btn" data-a="phased">Despliegue por fases</button>
                    <button class="sim-btn danger" data-a="bigbang">Simular big-bang</button>`;
    simEl.appendChild(ui);

    function drawSeries(data, color) {
      s.querySelectorAll(".serie").forEach((p) => p.remove());
      const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${20 + i * (520 / (data.length - 1))} ${chartY - v * 3}`).join(" ");
      el("path", { d: path, fill: "none", stroke: color, "stroke-width": 2.5, class: "serie" }, s);
      data.forEach((v, i) => {
        el("circle", { cx: 20 + i * (520 / (data.length - 1)), cy: chartY - v * 3, r: 3, fill: color, class: "serie" }, s);
      });
    }

    ui.addEventListener("click", (e) => {
      const a = e.target.dataset.a;
      player.stopAutoplay();
      if (a === "phased") {
        // semanas 1-16: F1 (offline, 0 errores directos), F2 sombra (0), F3 pocos, F4 estables bajos
        series = [2, 1, 1, 0, 0, 0, 0, 1, 1, 1, 2, 2, 1, 1, 1, 1];
        drawSeries(series, palette.ok);
        caption(simEl, "Por fases: en sombra (F2) el sistema no decide → 0 errores directos; al automatizar (F3-F4) ya está calibrado. Errores bajos y estables.");
      } else {
        series = [14, 12, 15, 9, 10, 6, 7, 8, 5, 6, 4, 5, 3, 4, 3, 3];
        drawSeries(series, palette.bad);
        caption(simEl, "Big-bang: umbrales sin calibrar desde el día 1 → falsas publicadas masivas al principio, credibilidad dañada, y tarda semanas en converger.");
      }
    });

    return {
      steps: 4,
      onStep(n) {
        nodes.forEach((nd, i) => {
          const on = i <= n;
          nd.rect.style.opacity = on ? 1 : .3;
          nd.rect.setAttribute("stroke", i === n ? palette.accent : palette.line);
          nd.rect.setAttribute("stroke-width", i === n ? 2 : 1);
          nd.text.style.opacity = on ? 1 : .3;
        });
        if (n === 0) caption(simEl, "F1: construir el histórico etiquetado y validar el modelo OFFLINE. Nada llega al cliente sin verificar.");
        if (n === 1) caption(simEl, "F2 · modo sombra: el pipeline puntúa todo en paralelo, pero NO decide. Se compara con la decisión humana real (línea base).");
        if (n === 2) caption(simEl, "F3: automatizar solo lo evidente (scores extremos). La zona gris sigue en manos humanas.");
        if (n === 3) { caption(simEl, "F4: producción plena con monitorización de drift y reentrenado periódico. Pulsa «Despliegue por fases» vs «Big-bang»."); }
      },
      onRestart() { s.querySelectorAll(".serie").forEach((p) => p.remove()); }
    };
  }

  /* ================= SIM 6 — 5 Vs sobre el diseño ================= */
  function sim6(simEl, player) {
    const s = svg(560, 340);
    simEl.appendChild(s);
    const vs = [
      ["Volumen", "miles/día + histórico → lake distribuido"],
      ["Velocidad", "flujo continuo → streaming"],
      ["Variedad", "RSS·JSON·PDF·foto·vídeo → colección"],
      ["Veracidad", "señal vs ruido: el corazón del reto"],
      ["Valor", "una falsa entregada vale < 0"]
    ];
    const blocks = [
      ["🗄️ Lake", 30, 60], ["⚡ Streaming", 160, 60], ["🧩 Colección", 290, 60],
      ["🤖 Modelo IA", 420, 60], ["📡 Servicio", 225, 180]
    ];
    const bNodes = blocks.map(([t, x, y]) => node(s, x, y, 110, 50, t));
    const vRows = vs.map((v, i) => {
      const y = 250 + i * 20;
      const t = label(s, 30, y, "", { size: 10, color: palette.accent });
      return { t, v };
    });

    const map = [ [0], [1], [2], [3], [4] ]; // V i → bloque i
    let active = 0;

    function render() {
      vRows.forEach((r, i) => {
        const on = i < active;
        r.t.textContent = on ? `${r.v[0]}: ${r.v[1]}` : r.v[0];
        r.t.setAttribute("fill", on ? palette.accent : palette.muted);
      });
      bNodes.forEach((n, i) => {
        const on = i < active + 1 && active > 0;
        n.rect.style.opacity = on ? 1 : .3;
        n.rect.setAttribute("stroke", on ? palette.accent : palette.line);
      });
      caption(simEl, active === 0
        ? "Cada V de la UT1 empuja una pieza del diseño. Avanza para conectarlas."
        : `${vs[Math.min(active, 5) - 1][0]} → justifica un componente concreto del sistema.`);
    }

    return {
      steps: 2,
      onStep(n) { active = n === 0 ? 0 : 5; render(); if (n === 1) { active = 1; const iv = setInterval(() => { if (active < 5 && player.playing !== false) { active++; render(); } else clearInterval(iv); }, 600); } },
      onRestart() { active = 0; render(); }
    };
  }

  return { sim0, sim1, sim2, sim3, sim4, sim5, sim6 };
})();
