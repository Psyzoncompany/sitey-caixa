// ui-liquid.js — parallax + “lens iOS” (UI only, no backend)
(() => {
  const root = document.documentElement;

  // Ensure background layers exist even if user doesn't edit HTML
  if (!document.querySelector(".liquid-bg")) {
    const bg = document.createElement("div");
    bg.className = "liquid-bg";
    document.body.prepend(bg);
  }
  if (!document.querySelector(".noise")) {
    const n = document.createElement("div");
    n.className = "noise";
    document.body.prepend(n);
  }

  // Lens
  let lens = document.querySelector(".lens");
  if (!lens) {
    lens = document.createElement("div");
    lens.className = "lens";
    document.body.appendChild(lens);
  }

  const setParallax = (x, y) => {
    root.style.setProperty("--mx", String(x));
    root.style.setProperty("--my", String(y));
  };

  const setLens = (px, py) => {
    root.style.setProperty("--lx", `${px}px`);
    root.style.setProperty("--ly", `${py}px`);
  };

  const norm = (val, max) => Math.max(0, Math.min(1, val / max));

  // Mouse / pointer
  let lastMove = 0;

  const onMove = (clientX, clientY) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;

    const x = norm(clientX, w);
    const y = norm(clientY, h);

    setParallax(x, y);
    setLens(clientX, clientY);

    const now = performance.now();
    if (now - lastMove > 16) lastMove = now;
  };

  // Show lens only while touching/pressing (more iOS-like)
  const onDown = () => lens.classList.add("on");
  const onUp = () => lens.classList.remove("on");

  window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  // Subtle motion even when idle
  let t = 0;
  const tick = () => {
    t += 0.004;
    const x = 0.5 + Math.sin(t) * 0.06;
    const y = 0.5 + Math.cos(t * 0.9) * 0.06;
    // only if user isn't interacting
    if (!lens.classList.contains("on")) setParallax(x, y);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();