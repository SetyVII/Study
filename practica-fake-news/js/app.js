/* ============================================================
   app.js — monta el sidebar, las escenas y la navegación.
   ============================================================ */
(() => {
  // Sidebar con las escenas
  const scenes = Array.from(document.querySelectorAll(".scene"));
  const nav = document.getElementById("sidebarNav");
  scenes.forEach((sc) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.innerHTML = `<span class="nav-ic">${sc.dataset.icon}</span> ${sc.dataset.title}`;
    btn.addEventListener("click", () => sc.scrollIntoView({ behavior: "smooth" }));
    nav.appendChild(btn);
    sc._navBtn = btn;
  });

  const markVisible = (sc) => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    if (sc && sc._navBtn) sc._navBtn.classList.add("active");
  };

  // Marca la escena visible en el sidebar (con fallback si no hay IntersectionObserver)
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) markVisible(e.target); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    scenes.forEach((sc) => obs.observe(sc));
  } else {
    scenes.forEach((sc) => sc.addEventListener("click", () => markVisible(sc)));
    markVisible(scenes[0]);
  }

  // Montar reproductores
  Player.mount("s0", Sims.sim0);
  Player.mount("s1", Sims.sim1);
  Player.mount("s2", Sims.sim2);
  Player.mount("s3", Sims.sim3);
  Player.mount("s4", Sims.sim4);
  Player.mount("s5", Sims.sim5);
  Player.mount("s6", Sims.sim6);
})();
