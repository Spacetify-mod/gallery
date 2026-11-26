// Full Screen: the song playing, full screen.
//
// Everything comes from what Spotify shows: the cover, title and artists of
// the player bar, its progress bar and its buttons. The controls here click
// Spotify's own buttons, and the progress bar moves Spotify's own slider, so
// nothing reaches into Spotify's code and nothing breaks with its updates.

const ROOT_ID = "stfs-root";
const BUTTON_ID = "stfs-open";
const SEL = {
  volume: '[data-testid="volume-bar"]',
  widget: '[data-testid="now-playing-widget-v2"]',
  byline: '[data-testid="now-playing-widget-v2-byline"]',
  title: '[data-testid="context-item-link"]',
  cover: '[data-testid="cover-art-image"]',
  progress: '[data-testid="playback-progressbar"] input[type="range"]',
  play: '[data-testid="control-button-playpause"]',
  back: '[data-testid="control-button-skip-back"]',
  next: '[data-testid="control-button-skip-forward"]',
  shuffle: '[data-testid="control-button-shuffle"]',
  repeat: '[data-testid="control-button-repeat"]',
};

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON_EXPAND =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M1 1h5v1.5H3.56l3.22 3.22-1.06 1.06L2.5 3.56V6H1V1zm9 0h5v5h-1.5V3.56l-3.22 3.22-1.06-1.06 3.22-3.22H10V1zM2.5 10v2.44l3.22-3.22 1.06 1.06-3.22 3.22H6V15H1v-5h1.5zm11 0H15v5h-5v-1.5h2.44l-3.22-3.22 1.06-1.06 3.22 3.22V10z"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06z"/></svg>';

spacetify.addStyle(`
  #${BUTTON_ID} { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; color: var(--text-subdued); cursor: pointer; flex-shrink: 0; border-radius: 50%; }
  #${BUTTON_ID}:hover { color: var(--text-base); transform: scale(1.06); }
  #${ROOT_ID} { position: fixed; inset: 0; z-index: 2147481000; overflow: hidden; color: #fff;
    background: var(--background-base); display: flex; align-items: center; justify-content: center;
    font-family: inherit; animation: stfs-in .25s ease-out; }
  @keyframes stfs-in { from { opacity: 0; } to { opacity: 1; } }
  #${ROOT_ID} .stfs-bg { position: absolute; inset: -10%; background-size: cover; background-position: center;
    filter: blur(70px) saturate(1.3) brightness(.45); transform: scale(1.1); transition: background-image .6s; }
  #${ROOT_ID}[data-blur="false"] .stfs-bg { display: none; }
  #${ROOT_ID} .stfs-shade { position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.35) 70%, rgba(0,0,0,.6) 100%); }
  #${ROOT_ID} .stfs-main { position: relative; display: flex; align-items: center; gap: clamp(24px, 5vw, 72px);
    padding: 48px; max-width: 1400px; width: 100%; }
  #${ROOT_ID} .stfs-cover { width: min(52vh, 40vw); aspect-ratio: 1; border-radius: 12px; object-fit: cover;
    box-shadow: 0 24px 80px rgba(0,0,0,.55); flex-shrink: 0; background: rgba(255,255,255,.06); }
  #${ROOT_ID} .stfs-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
  #${ROOT_ID} .stfs-title { font-size: clamp(28px, 5vw, 64px); line-height: 1.05; font-weight: 800; letter-spacing: -.02em;
    margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
  #${ROOT_ID} .stfs-artists { font-size: clamp(16px, 2vw, 26px); color: rgba(255,255,255,.75); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #${ROOT_ID} .stfs-progress { display: flex; align-items: center; gap: 12px; margin-top: 18px;
    font-size: 13px; color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
  #${ROOT_ID} .stfs-progress input { flex: 1; height: 6px; appearance: none; border-radius: 3px; cursor: pointer;
    background: linear-gradient(to right, var(--essential-bright-accent) var(--stfs-done, 0%), rgba(255,255,255,.25) var(--stfs-done, 0%)); }
  #${ROOT_ID} .stfs-progress input::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; }
  #${ROOT_ID} .stfs-controls { display: flex; align-items: center; gap: 22px; margin-top: 6px; }
  #${ROOT_ID}[data-controls="false"] .stfs-controls { display: none; }
  #${ROOT_ID} .stfs-control { width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; padding: 0;
    display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; opacity: .85; }
  #${ROOT_ID} .stfs-control:hover { opacity: 1; transform: scale(1.06); }
  #${ROOT_ID} .stfs-control svg { width: 22px; height: 22px; fill: currentColor; }
  #${ROOT_ID} .stfs-control.stfs-big { width: 64px; height: 64px; background: #fff; color: #000 !important; opacity: 1; }
  #${ROOT_ID} .stfs-control.stfs-big svg { width: 26px; height: 26px; }
  #${ROOT_ID} .stfs-close { position: absolute; top: 84px; right: 24px; width: 40px; height: 40px; border-radius: 50%;
    border: 0; background: rgba(0,0,0,.35); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  #${ROOT_ID} .stfs-close:hover { background: rgba(0,0,0,.55); }
  @media (max-aspect-ratio: 1/1) {
    #${ROOT_ID} .stfs-main { flex-direction: column; text-align: center; }
    #${ROOT_ID} .stfs-cover { width: min(60vw, 45vh); }
    #${ROOT_ID} .stfs-controls { justify-content: center; }
  }
`);

const icon = (markup) => {
  const span = document.createElement("span");
  span.style.display = "inline-flex";
  span.innerHTML = markup; // constant drawings of this file only
  return span;
};

// Sets Spotify's slider like a person dragging it.
const setRange = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const time = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// A bigger picture of the same cover, if Spotify has one.
const bigCover = (src) => (src ? src.replace(/ab67616d0000(?:4851|1e02|11eb)/, "ab67616d0000b273") : "");

let root = null;
let timer = null;
let view = null;

function control(name, label, big) {
  const button = document.createElement("button");
  button.className = `stfs-control${big ? " stfs-big" : ""}`;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", () => {
    const real = document.querySelector(SEL[name]);
    if (real) real.click();
    setTimeout(update, 150);
  });
  return button;
}

// Shows the same drawing and colour as Spotify's own button.
function mirror(ours, real, big) {
  // Spotify does not always show every button (shuffle, for one).
  if (!real) {
    ours.style.display = "none";
    return;
  }
  ours.style.display = "";
  const svg = real.querySelector("svg");
  const key = svg ? svg.innerHTML : "";
  if (ours.dataset.key !== key) {
    ours.dataset.key = key;
    ours.replaceChildren(...(svg ? [svg.cloneNode(true)] : []));
  }
  if (!big) ours.style.color = getComputedStyle(real).color;
}

function build() {
  root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", t("Full screen", "Plein écran"));
  const bg = document.createElement("div");
  bg.className = "stfs-bg";
  const shade = document.createElement("div");
  shade.className = "stfs-shade";

  const cover = document.createElement("img");
  cover.className = "stfs-cover";
  cover.alt = "";
  cover.addEventListener("error", () => {
    // The bigger picture does not exist: take the one Spotify shows.
    const small = document.querySelector(SEL.cover);
    if (small && cover.src !== small.src) cover.src = small.src;
  });
  const title = document.createElement("h1");
  title.className = "stfs-title";
  const artists = document.createElement("p");
  artists.className = "stfs-artists";

  const now = document.createElement("span");
  const end = document.createElement("span");
  const seek = document.createElement("input");
  seek.type = "range";
  seek.min = "0";
  seek.setAttribute("aria-label", t("Position in the song", "Position dans le morceau"));
  seek.addEventListener("input", () => {
    seek.dataset.dragging = "1";
    now.textContent = time(Number(seek.value));
    seek.style.setProperty("--stfs-done", `${(Number(seek.value) / (Number(seek.max) || 1)) * 100}%`);
  });
  seek.addEventListener("change", () => {
    const real = document.querySelector(SEL.progress);
    if (real) setRange(real, seek.value);
    delete seek.dataset.dragging;
  });
  const progress = document.createElement("div");
  progress.className = "stfs-progress";
  progress.append(now, seek, end);

  const buttons = {
    shuffle: control("shuffle", t("Shuffle", "Lecture aléatoire")),
    back: control("back", t("Previous", "Précédent")),
    play: control("play", t("Play or pause", "Lecture ou pause"), true),
    next: control("next", t("Next", "Suivant")),
    repeat: control("repeat", t("Repeat", "Répéter")),
  };
  const controls = document.createElement("div");
  controls.className = "stfs-controls";
  controls.append(...Object.values(buttons));

  const info = document.createElement("div");
  info.className = "stfs-info";
  info.append(title, artists, progress, controls);
  const main = document.createElement("div");
  main.className = "stfs-main";
  main.append(cover, info);

  const close = document.createElement("button");
  close.className = "stfs-close";
  close.setAttribute("aria-label", t("Leave full screen", "Quitter le plein écran"));
  close.append(icon(ICON_CLOSE));
  close.addEventListener("click", hide);

  root.append(bg, shade, main, close);
  view = { bg, cover, title, artists, seek, now, end, buttons };
}

function update() {
  if (!root || !view) return;
  root.dataset.blur = String(spacetify.settings.get("blur"));
  root.dataset.controls = String(spacetify.settings.get("controls"));

  const small = document.querySelector(SEL.cover);
  const wanted = bigCover(small ? small.src : "");
  if (wanted && view.cover.dataset.from !== wanted) {
    view.cover.dataset.from = wanted;
    view.cover.src = wanted;
    view.bg.style.backgroundImage = `url("${wanted.replace(/"/g, "")}")`;
  }
  const title = document.querySelector(SEL.title);
  view.title.textContent = title ? title.textContent.trim() : "";
  const byline = document.querySelector(SEL.byline);
  view.artists.textContent = byline ? byline.textContent.trim() : "";

  const real = document.querySelector(SEL.progress);
  if (real && !view.seek.dataset.dragging) {
    const max = Number(real.max) || 0;
    const value = Number(real.value) || 0;
    view.seek.max = String(max);
    view.seek.value = String(value);
    view.seek.style.setProperty("--stfs-done", `${max ? (value / max) * 100 : 0}%`);
    view.now.textContent = time(value);
    view.end.textContent = time(max);
  }
  for (const [name, ours] of Object.entries(view.buttons)) {
    mirror(ours, document.querySelector(SEL[name]), name === "play");
  }
}

function show() {
  if (root && root.isConnected) return;
  if (!root) build();
  document.body.appendChild(root);
  update();
  timer = setInterval(update, 500);
  if (spacetify.settings.get("window") && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function hide() {
  if (timer) clearInterval(timer);
  timer = null;
  if (root) root.remove();
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

const toggle = () => (root && root.isConnected ? hide() : show());

// The button sits next to the volume, in Spotify's player bar.
spacetify.observe(SEL.volume, (volume) => {
  if (document.getElementById(BUTTON_ID)) return;
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.append(icon(ICON_EXPAND));
  button.addEventListener("mouseenter", () => {
    button.title = t("Full screen", "Plein écran");
  });
  button.setAttribute("aria-label", t("Full screen", "Plein écran"));
  button.addEventListener("click", toggle);
  volume.before(button);
});

const typing = (el) =>
  el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && root && root.isConnected) {
    hide();
    return;
  }
  if (!spacetify.settings.get("shortcut") || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.key === "f" || event.key === "F") && !typing(document.activeElement)) {
    event.preventDefault();
    toggle();
  }
});

spacetify.settings.onChange(() => update());
