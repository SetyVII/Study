// ============ Reveal on scroll ============
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal, .layer, .compare, .signal-card, .phase, .v-card, .pipe-block").forEach((el) => {
  revealObserver.observe(el);
});

// ============ Partículas del hero (generadas) ============
(() => {
  const hero = document.getElementById("particles");
  if (!hero) return;
  for (let i = 0; i < 25; i++) {
    const dot = document.createElement("span");
    dot.style.position = "absolute";
    dot.style.width = dot.style.height = `${2 + Math.random() * 3}px`;
    dot.style.borderRadius = "50%";
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top = `${Math.random() * 100}%`;
    dot.style.background = Math.random() > 0.5 ? "rgba(94,234,212,.45)" : "rgba(129,140,248,.45)";
    dot.style.animation = `heroFloat ${6 + Math.random() * 10}s ease-in-out ${Math.random() * 5}s infinite alternate`;
    hero.appendChild(dot);
  }

  const style = document.createElement("style");
  style.textContent = `
    @keyframes heroFloat {
      from { transform: translate(0, 0); opacity: .3; }
      to { transform: translate(${20 + Math.random() * 40}px, ${-20 - Math.random() * 40}px); opacity: .9; }
    }
  `;
  document.head.appendChild(style);
})();

// ============ Pipeline: botones de fase resaltan el bloque (Q2) ============
(() => {
  const btns = document.querySelectorAll(".pipe-btn");
  const blocks = document.querySelectorAll(".stage-block");
  if (!btns.length) return;

  let autoTimer = null;
  let autoIndex = 0;

  const activate = (idx) => {
    btns.forEach((b, i) => b.classList.toggle("active", i === idx));
    blocks.forEach((b, i) => b.classList.toggle("active-stage", i === idx));
  };

  btns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      clearInterval(autoTimer);
      activate(idx);
    });
  });

  // Tour automático suave mientras el usuario no interactúa
  autoTimer = setInterval(() => {
    activate(autoIndex);
    autoIndex = (autoIndex + 1) % blocks.length;
  }, 2200);
})();

// ============ Laboratorio de decisión (Q4) ============
(() => {
  const slider = document.getElementById("thresholdSlider");
  const out = document.getElementById("thresholdVal");
  const flow = document.getElementById("newsFlow");
  const metricsRow = document.getElementById("metricsRow");
  if (!slider) return;

  const NEWS = [
    { t: "Agencia Reuters confirma el acuerdo", s: 0.96, real: true },
    { t: "!!ÚLTIMA HORA!! ALARMANTE...", s: 0.08, real: false },
    { t: "Dato económico del INE trimestral", s: 0.91, real: true },
    { t: "Cuenta anónima: filtro oficial secreto", s: 0.22, real: false },
    { t: "Declaración de portavoz, fuente única", s: 0.55, real: true },
    { t: "Foto reciclada de otro desastre", s: 0.15, real: false },
    { t: "Crónica de corresponsal acreditado", s: 0.88, real: true },
    { t: "Titular ambiguo sin contrastar", s: 0.47, real: false },
  ];

  const GREY = 0.12; // anchura de la zona gris a cada lado del umbral

  const zoneOf = (score, th) => {
    if (score >= th + GREY) return "publish";
    if (score <= th - GREY) return "hold";
    return "review";
  };

  const render = () => {
    const th = slider.value / 100;
    out.textContent = th.toFixed(2);
    flow.innerHTML = "";

    let correct = 0;
    let publishedFake = 0;
    let heldTrue = 0;
    let queue = 0;

    NEWS.forEach((n, i) => {
      const zone = zoneOf(n.s, th);
      if (zone === "publish") {
        if (!n.real) publishedFake++;
        else correct++;
      } else if (zone === "hold") {
        if (n.real) heldTrue++;
        else correct++;
      } else {
        queue++;
      }

      const div = document.createElement("div");
      div.className = `news-item to-${zone}`;
      div.style.animationDelay = `${i * 70}ms`;
      const emoji = zone === "publish" ? "✅" : zone === "review" ? "🧐" : "🛑";
      const label = zone === "publish" ? "Publicar" : zone === "review" ? "Verificador humano" : "Retener";
      div.innerHTML = `${emoji} <strong>${n.t}</strong><span class="ni-score">score ${n.s.toFixed(2)}</span><small>${label}</small>`;
      flow.appendChild(div);
    });

    metricsRow.innerHTML = `
      <div class="metric-box"><span class="m-val">${correct}/${NEWS.length}</span><span class="m-lab">decisiones correctas automáticas</span></div>
      <div class="metric-box"><span class="m-val" style="color:${publishedFake ? "var(--no)" : "var(--yes)"}">${publishedFake}</span><span class="m-lab">falsas publicadas (peor error)</span></div>
      <div class="metric-box"><span class="m-val" style="color:${heldTrue ? "var(--hold)" : "var(--yes)"}">${heldTrue}</span><span class="m-lab">verdaderas retenidas (exclusiva perdida)</span></div>
      <div class="metric-box"><span class="m-val">${queue}</span><span class="m-lab">noticias en cola humana</span></div>
    `;
  };

  slider.addEventListener("input", render);
  render();

  // Re-render periódico con scores simulados ligeramente distintos (efecto "vivo")
  setInterval(() => {
    NEWS.forEach((n) => {
      n.s = Math.min(0.99, Math.max(0.01, n.s + (Math.random() - 0.5) * 0.06));
    });
    render();
  }, 4000);
})();
