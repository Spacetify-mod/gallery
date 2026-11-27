// A-B Loop: play a part of a song over and over.
//
// The button in the player bar works in three clicks: start here, end here,
// stop. A right-click on the progress bar puts the start or the end exactly
// where you clicked. The loop is drawn on the progress bar, and each song can
// keep its loop for the next time it plays.

const BAR = '[data-testid="playback-progressbar"]';
const BAND_ID = "stab-band";
const MENU_ID = "stab-menu";
const STORE = "spacetify:ab-loop";
const MIN_LENGTH_MS = 1000;
const MAX_SAVED = 200;

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5.5 3.5A4.5 4.5 0 0 0 1 8a4.5 4.5 0 0 0 4.5 4.5H7V11H5.5a3 3 0 0 1 0-6h5a3 3 0 0 1 0 6H10v-1.5L7.5 11.75 10 14v-1.5h.5A4.5 4.5 0 0 0 15 8a4.5 4.5 0 0 0-4.5-4.5h-5z"/><path d="M5 6.25h1.5v3.5H5zm4.5 0H11v3.5H9.5z"/></svg>';

spacetify.addStyle(`
  #${BAND_ID} { position: absolute; top: 50%; height: 14px; transform: translateY(-50%); pointer-events: none;
    border-left: 2px solid var(--essential-bright-accent, #1ed760); border-right: 2px solid var(--essential-bright-accent, #1ed760);
    background: color-mix(in srgb, var(--essential-bright-accent, #1ed760) 22%, transparent); border-radius: 3px; z-index: 1; }
  #${BAND_ID}[data-half="true"] { border-right-color: transparent; background: none; }
  #${MENU_ID} { position: fixed; z-index: 2147481500; min-width: 220px; padding: 4px; border-radius: 6px;
    background: var(--background-elevated-base); color: var(--text-base); box-shadow: 0 16px 40px rgba(0,0,0,.5); font-size: 14px; }
  #${MENU_ID} button { display: block; width: 100%; padding: 10px 12px; border: 0; border-radius: 4px; background: transparent;
    color: inherit; text-align: left; font: inherit; cursor: pointer; }
  #${MENU_ID} button:hover { background: var(--background-elevated-highlight); }
`);

const time = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------ the loop

let loop = null; // { uri, start, end } — end is null while only the start is set

const saved = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
};

function remember() {
  if (!spacetify.settings.get("remember") || !loop) return;
  const all = saved();
  delete all[loop.uri];
  if (loop.end !== null) all[loop.uri] = { start: loop.start, end: loop.end };
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_SAVED))) delete all[old];
  localStorage.setItem(STORE, JSON.stringify(all));
}

function setStart(ms) {
  const now = spacetify.player.state();
  if (!now || !now.track) return;
  const end = loop && loop.uri === now.track.uri ? loop.end : null;
  loop = { uri: now.track.uri, start: ms, end: end !== null && end - ms >= MIN_LENGTH_MS ? end : null };
  remember();
  draw();
}

function setEnd(ms) {
  const now = spacetify.player.state();
  if (!now || !now.track) return;
  const start = loop && loop.uri === now.track.uri ? loop.start : 0;
  if (ms - start < MIN_LENGTH_MS) return;
  loop = { uri: now.track.uri, start, end: ms };
  remember();
  draw();
  spacetify.player.seek(start);
}

function clear() {
  if (loop) {
    loop.end = null;
    remember();
  }
  loop = null;
  draw();
}

// Back to the start each time the end is reached.
setInterval(() => {
  if (!loop || loop.end === null) return;
  const now = spacetify.player.state();
  if (!now || !now.track || now.track.uri !== loop.uri || !now.isPlaying) return;
  if (now.position >= loop.end - 80 || now.position < loop.start - 1500) spacetify.player.seek(loop.start);
}, 120);

// ------------------------------------------------------------ the drawing

const button = spacetify.ui.playbarButton({ label: t("A-B loop: set the start", "Boucle A-B : placer le début"), icon: ICON, onClick: step });

function step() {
  const now = spacetify.player.state();
  if (!now || !now.track) return;
  if (!loop || loop.uri !== now.track.uri) return setStart(now.position);
  if (loop.end === null) return setEnd(now.position);
  clear();
}

function draw() {
  const now = spacetify.player.state();
  const here = loop && now && now.track && now.track.uri === loop.uri ? loop : null;
  button.setActive(!!here);
  button.setLabel(
    !here
      ? t("A-B loop: set the start", "Boucle A-B : placer le début")
      : here.end === null
        ? t(`A-B loop: set the end (start ${time(here.start)})`, `Boucle A-B : placer la fin (début ${time(here.start)})`)
        : t(`A-B loop ${time(here.start)} → ${time(here.end)}: click to stop`, `Boucle A-B ${time(here.start)} → ${time(here.end)} : clic pour arrêter`),
  );
  const bar = document.querySelector(BAR);
  let band = document.getElementById(BAND_ID);
  if (!here || !bar || !now.duration) {
    if (band) band.remove();
    return;
  }
  if (!band || band.parentElement !== bar) {
    if (band) band.remove();
    band = document.createElement("div");
    band.id = BAND_ID;
    if (getComputedStyle(bar).position === "static") bar.style.position = "relative";
    bar.append(band);
  }
  const end = here.end === null ? here.start : here.end;
  band.dataset.half = String(here.end === null);
  band.style.left = `${(here.start / now.duration) * 100}%`;
  band.style.width = `${(Math.max(0, end - here.start) / now.duration) * 100}%`;
}

// ------------------------------------------------------------ right-click on the bar

function closeMenu() {
  const menu = document.getElementById(MENU_ID);
  if (menu) menu.remove();
}

document.addEventListener(
  "contextmenu",
  (event) => {
    const bar = event.target && event.target.closest && event.target.closest(BAR);
    const now = spacetify.player.state();
    if (!bar || !now || !now.track || !now.duration) return;
    event.preventDefault();
    closeMenu();
    const box = bar.getBoundingClientRect();
    const at = Math.round(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * now.duration);
    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.setAttribute("role", "menu");
    const entry = (text, action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = text;
      item.addEventListener("click", () => {
        closeMenu();
        action();
      });
      menu.append(item);
    };
    entry(t(`Loop start here (${time(at)})`, `Début de la boucle ici (${time(at)})`), () => setStart(at));
    entry(t(`Loop end here (${time(at)})`, `Fin de la boucle ici (${time(at)})`), () => setEnd(at));
    if (loop) entry(t("Remove the loop", "Enlever la boucle"), clear);
    document.body.append(menu);
    menu.style.left = `${Math.min(event.clientX, innerWidth - menu.offsetWidth - 8)}px`;
    menu.style.top = `${Math.max(8, event.clientY - menu.offsetHeight - 8)}px`;
  },
  true,
);
document.addEventListener(
  "mousedown",
  (event) => {
    const menu = document.getElementById(MENU_ID);
    if (menu && !menu.contains(event.target)) closeMenu();
  },
  true,
);
document.addEventListener("keydown", (event) => event.key === "Escape" && closeMenu());

// ------------------------------------------------------------ keys and songs

const withKeys = (action) => () => {
  if (!spacetify.settings.get("shortcuts")) return;
  const now = spacetify.player.state();
  if (now) action(now);
};
spacetify.keyboard.add("shift+a", withKeys((now) => setStart(now.position)));
spacetify.keyboard.add("shift+b", withKeys((now) => setEnd(now.position)));
spacetify.keyboard.add("shift+x", withKeys(() => clear()));

spacetify.player.ready().then(() => {
  spacetify.player.onTrackChange((track) => {
    loop = null;
    if (track && spacetify.settings.get("remember")) {
      const kept = saved()[track.uri];
      if (kept && Number.isFinite(kept.start) && Number.isFinite(kept.end) && kept.end > kept.start) {
        loop = { uri: track.uri, start: kept.start, end: kept.end };
      }
    }
    draw();
  });
  spacetify.player.onChange(draw);
  draw();
});
// Spotify sets its language a moment after starting: labels follow it.
const onLanguage = (draw) => {
  draw();
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
};
onLanguage(draw);

// The player bar is drawn again after some page changes.
spacetify.observe(BAR, () => draw());
