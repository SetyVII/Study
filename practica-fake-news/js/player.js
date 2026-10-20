/* ============================================================
   player.js — motor del "vídeo seminteractivo".
   Cada escena tiene pasos; el reproductor permite
   reproducir/pausar, avanzar/retroceder y reiniciar.
   ============================================================ */
window.Player = (() => {
  class ScenePlayer {
    constructor(sceneEl, simFactory, opts = {}) {
      this.sceneEl = sceneEl;
      this.simEl = sceneEl.querySelector(".sim");
      this.controlsEl = sceneEl.querySelector(".controls");
      this.stepEls = Array.from(sceneEl.querySelectorAll(".step"));
      this.sim = simFactory(this.simEl, this);
      this.autoplayDelay = opts.autoplayDelay ?? 3200;

      this.step = 0;
      this.playing = true;
      this.timer = null;

      this.buildControls();
      this.goto(0);
      this.setPlaying(true);
    }

    buildControls() {
      this.btnRestart = this.controlsEl.querySelector(".restart");
      this.btnPrev = this.controlsEl.querySelector(".prev");
      this.btnPlay = this.controlsEl.querySelector(".play");
      this.btnNext = this.controlsEl.querySelector(".next");
      this.dotsEl = this.controlsEl.querySelector(".dots");
      this.titleEl = this.controlsEl.querySelector(".step-title");

      this.btnRestart.addEventListener("click", () => this.restart());
      this.btnPrev.addEventListener("click", () => { this.goto(Math.max(0, this.step - 1)); this.setPlaying(false); });
      this.btnNext.addEventListener("click", () => { this.goto(Math.min(this.stepCount - 1, this.step + 1)); this.setPlaying(false); });
      this.btnPlay.addEventListener("click", () => this.setPlaying(!this.playing));

      this.stepCount = Math.max(this.stepEls.length, this.sim.steps);
      this.dots = [];
      for (let i = 0; i < this.stepCount; i++) {
        const d = document.createElement("button");
        d.className = "dot";
        d.title = `Paso ${i + 1}`;
        d.addEventListener("click", () => { this.goto(i); this.setPlaying(false); });
        this.dotsEl.appendChild(d);
        this.dots.push(d);
      }
    }

    goto(n) {
      this.step = n;
      this.stepEls.forEach((el, i) => el.classList.toggle("active", i === n));
      this.dots.forEach((d, i) => {
        d.classList.toggle("active", i === n);
        d.classList.toggle("seen", i <= n);
      });
      const titleEl = this.stepEls[n] ? this.stepEls[n].querySelector("h3") : null;
      this.titleEl.textContent = titleEl ? titleEl.textContent.replace(/\s*UT1.*$/, "").trim() : `Paso ${n + 1}`;
      if (this.sim.onStep) this.sim.onStep(n);
    }

    setPlaying(p) {
      this.playing = p;
      this.btnPlay.textContent = p ? "⏸" : "▶";
      clearInterval(this.timer);
      if (p) {
        this.timer = setInterval(() => {
          if (this.step < this.stepCount - 1) this.goto(this.step + 1);
          else this.setPlaying(false);
        }, this.autoplayDelay);
      }
    }

    restart() {
      this.goto(0);
      if (this.sim.onRestart) this.sim.onRestart();
      this.setPlaying(true);
    }

    stopAutoplay() { this.setPlaying(false); }
  }

  const registry = [];

  function mount(sceneId, simFactory, opts) {
    const el = document.getElementById(sceneId);
    if (!el) return;
    registry.push(new ScenePlayer(el, simFactory, opts));
  }

  return { mount };
})();
