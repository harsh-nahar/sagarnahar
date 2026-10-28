import create, { meta } from "./vendor/ascii-magic/pieces/camel-caravan-dusk.js";
import { paint, renderMode } from "./vendor/ascii-magic/runtime/canvas.js";

const canvas = document.querySelector("#ascii-landscape");
const control = document.querySelector("#ascii-toggle");
const context = canvas.getContext("2d");
const draw = create();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const look = { ...meta.dots, lift: false };
let paused = reducedMotion.matches, visible = false, elapsed = .5, previous = 0, lastPaint = 0, request;

function render() {
  const width = canvas.clientWidth || canvas.parentElement.clientWidth;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const height = width * meta.rows / meta.cols;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const cell = width / meta.cols;
  paint(context, draw(elapsed), meta.palette, {
    ...look, cw: cell, ch: cell, mode: renderMode(meta), ink: "#e4e4e7", dpr
  });
}

function tick(now) {
  if (previous) elapsed += (now - previous) / 1000;
  previous = now;
  if (now - lastPaint >= 1000 / meta.fps) {
    render();
    lastPaint = now;
  }
  request = requestAnimationFrame(tick);
}

function schedule() {
  cancelAnimationFrame(request);
  previous = 0;
  control.textContent = paused ? "Play animation" : "Pause animation";
  control.setAttribute("aria-pressed", String(!paused));
  if (!paused && visible && !document.hidden) request = requestAnimationFrame(tick);
}

control.hidden = false;
control.addEventListener("click", () => { paused = !paused; schedule(); });
document.addEventListener("visibilitychange", schedule);
reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; schedule(); });
new ResizeObserver(render).observe(canvas);
new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  schedule();
}).observe(canvas);
render();
canvas.closest("figure").classList.add("animation-ready");
schedule();
