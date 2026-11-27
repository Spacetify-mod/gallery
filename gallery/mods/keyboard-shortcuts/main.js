// Keyboard Shortcuts: Spotify without the mouse.
//
// Single keys, that work whatever the keyboard layout (letters are matched by
// their place). They never fire while you type in a text field. Shift + ?
// shows them all. T puts a letter on everything you can click: type it to
// click it.

const HINTS_ID = "stks-hints";
const FORWARD = '[data-testid="top-bar-forward-button"]';
const HINT_LETTERS = "asdfghjklqwertyuiopzxcvbnm";
const SEEK_MS = 10000;
const VOLUME_STEP = 0.05;

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

spacetify.addStyle(`
  #${HINTS_ID} { position: fixed; inset: 0; z-index: 2147482000; pointer-events: none; }
  #${HINTS_ID} span { position: fixed; padding: 1px 5px; border-radius: 4px; font: 700 12px/16px monospace;
    text-transform: uppercase; background: var(--essential-bright-accent, #1ed760); color: #000;
    box-shadow: 0 2px 6px rgba(0,0,0,.5); }
  #${HINTS_ID} span b { opacity: .35; }
  .stks-help { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; font-size: 14px; }
  .stks-help h3 { grid-column: 1 / -1; margin: 10px 0 2px; font-size: 13px; color: var(--text-subdued); }
  .stks-help kbd { justify-self: start; padding: 1px 7px; border-radius: 4px; font: 600 12px/18px monospace;
    background: var(--background-elevated-highlight); border: 1px solid var(--essential-subdued); }
`);

// ------------------------------------------------------------ helpers

const on = (name) => !!spacetify.settings.get(name);
let hinting = false;

// Adds a shortcut that only works while its group is on.
function key(combo, group, action) {
  spacetify.keyboard.add(combo, () => {
    if (hinting || !on(group)) return;
    action();
  });
}

// The page's main scrolling area: the biggest one on screen.
function scroller() {
  let best = null;
  let bestArea = 0;
  for (const el of document.querySelectorAll("div, main, section")) {
    if (el.scrollHeight <= el.clientHeight + 20) continue;
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY)) continue;
    const area = el.clientWidth * el.clientHeight;
    if (area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}

function scroll(by) {
  const el = scroller();
  if (el) el.scrollBy({ top: by === "top" ? -1e9 : by === "bottom" ? 1e9 : by * el.clientHeight, behavior: "smooth" });
}

const click = (selector) => {
  const el = document.querySelector(selector);
  if (el && !el.disabled) el.click();
};

async function seekBy(ms) {
  const now = spacetify.player.state();
  if (now) await spacetify.player.seek(Math.max(0, Math.min(now.duration - 500, now.position + ms)));
}

async function seekTo(fraction) {
  const now = spacetify.player.state();
  if (now && now.duration) await spacetify.player.seek(Math.floor(now.duration * fraction));
}

let volumeBeforeMute = null;
async function volumeBy(step) {
  const volume = await spacetify.player.getVolume();
  await spacetify.player.setVolume(Math.max(0, Math.min(1, volume + step)));
}
async function toggleMute() {
  const volume = await spacetify.player.getVolume();
  if (volume > 0) {
    volumeBeforeMute = volume;
    await spacetify.player.setVolume(0);
  } else {
    await spacetify.player.setVolume(volumeBeforeMute || 0.5);
  }
}

const REPEAT_NEXT = { off: "context", context: "track", track: "off" };

// ------------------------------------------------------------ shortcuts

key("j", "navigation", () => scroll(0.35));
key("k", "navigation", () => scroll(-0.35));
key("g", "navigation", () => scroll("top"));
key("shift+g", "navigation", () => scroll("bottom"));
// The back arrow comes right before the forward one.
key("h", "navigation", () => {
  const forward = document.querySelector(FORWARD);
  const back = forward && forward.previousElementSibling;
  if (back && back.matches("button") && !back.disabled) back.click();
});
key("l", "navigation", () => click(FORWARD));

key("n", "playback", () => spacetify.player.next());
key("p", "playback", () => spacetify.player.previous());
key("m", "playback", toggleMute);
key("s", "playback", () => {
  const now = spacetify.player.state();
  if (now) spacetify.player.setShuffle(!now.shuffle);
});
key("r", "playback", () => {
  const now = spacetify.player.state();
  if (now) spacetify.player.setRepeat(REPEAT_NEXT[now.repeat] || "off");
});
key("shift+arrowleft", "playback", () => seekBy(-SEEK_MS));
key("shift+arrowright", "playback", () => seekBy(SEEK_MS));
key("shift+arrowup", "playback", () => volumeBy(VOLUME_STEP));
key("shift+arrowdown", "playback", () => volumeBy(-VOLUME_STEP));
for (let digit = 0; digit <= 9; digit++) {
  key(String(digit), "playback", () => seekTo(digit / 10));
}

// ------------------------------------------------------------ the list

const list = () => [
  [t("Move around", "Se déplacer"), "navigation", [
    ["J / K", t("Scroll down / up", "Défiler vers le bas / le haut")],
    ["G / Shift + G", t("Top / bottom of the page", "Haut / bas de la page")],
    ["H / L", t("Back / forward", "Page précédente / suivante")],
    ["Ctrl + K", t("Search (Spotify's own shortcut)", "Rechercher (raccourci de Spotify)")],
  ]],
  [t("Music", "Musique"), "playback", [
    ["N / P", t("Next / previous", "Suivant / précédent")],
    ["0 … 9", t("Jump to 0 %, 10 % … 90 % of the song", "Aller à 0 %, 10 % … 90 % du morceau")],
    ["Shift + ← / →", t("10 seconds back / forward", "10 secondes en arrière / en avant")],
    ["Shift + ↑ / ↓", t("Volume up / down", "Volume plus fort / moins fort")],
    ["M", t("Mute", "Couper le son")],
    ["S / R", t("Shuffle / repeat", "Aléatoire / répétition")],
  ]],
  [t("Click with the keyboard", "Cliquer au clavier"), "hints", [
    ["T", t("A letter on everything you can click: type it", "Une lettre sur tout ce qui se clique : tape-la")],
    ["Esc", t("Hide the letters", "Cacher les lettres")],
  ]],
];

function help() {
  const grid = document.createElement("div");
  grid.className = "stks-help";
  for (const [title, group, rows] of list()) {
    const head = document.createElement("h3");
    head.textContent = on(group) ? title : `${title} — ${t("off in the settings", "désactivé dans les réglages")}`;
    grid.append(head);
    for (const [keys, what] of rows) {
      const kbd = document.createElement("kbd");
      kbd.textContent = keys;
      const text = document.createElement("span");
      text.textContent = what;
      grid.append(kbd, text);
    }
  }
  spacetify.ui.popup({ title: t("Keyboard shortcuts", "Raccourcis clavier"), content: grid, width: 520 });
}
spacetify.keyboard.add("shift+?", () => {
  if (!hinting) help();
});

// ------------------------------------------------------------ hints

let hints = [];
let typed = "";

function clickable() {
  const seen = new Set();
  const found = [];
  const candidates = document.querySelectorAll(
    'a[href], button, input, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"]',
  );
  for (const el of candidates) {
    if (found.length >= 300) break;
    if (el.disabled || el.closest(`#${HINTS_ID}`)) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 6 || box.height < 6) continue;
    if (box.bottom < 0 || box.right < 0 || box.top > innerHeight || box.left > innerWidth) continue;
    // Only what is not hidden under something else.
    const x = Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2));
    const top = document.elementFromPoint(x, y);
    if (!top || !(el === top || el.contains(top) || top.contains(el))) continue;
    // A link inside a button (or the reverse) gets one letter only.
    const owner = el.parentElement && el.parentElement.closest("a[href], button, [role='button']");
    if (owner && seen.has(owner)) continue;
    seen.add(el);
    found.push({ el, box });
  }
  return found;
}

function codes(count) {
  const letters = HINT_LETTERS.split("");
  if (count <= letters.length) return letters.slice(0, count);
  const out = [];
  for (const a of letters) for (const b of letters) out.push(a + b);
  return out.slice(0, count);
}

function showHints() {
  const found = clickable();
  if (!found.length) return;
  hinting = true;
  typed = "";
  const layer = document.createElement("div");
  layer.id = HINTS_ID;
  const names = codes(found.length);
  hints = found.map((item, index) => {
    const tag = document.createElement("span");
    tag.textContent = names[index];
    tag.style.left = `${Math.max(0, item.box.left)}px`;
    tag.style.top = `${Math.max(0, item.box.top)}px`;
    layer.append(tag);
    return { el: item.el, code: names[index], tag };
  });
  document.body.appendChild(layer);
}

function hideHints() {
  hinting = false;
  hints = [];
  typed = "";
  const layer = document.getElementById(HINTS_ID);
  if (layer) layer.remove();
}

function typeHint(letter) {
  typed += letter;
  const left = hints.filter((hint) => hint.code.startsWith(typed));
  if (!left.length) return hideHints();
  const exact = left.find((hint) => hint.code === typed);
  if (exact) {
    const el = exact.el;
    hideHints();
    if (el.matches("input")) el.focus();
    else el.click();
    return;
  }
  drawTyped();
}

function drawTyped() {
  for (const hint of hints) {
    const match = hint.code.startsWith(typed);
    hint.tag.style.display = match ? "" : "none";
    if (match) {
      hint.tag.replaceChildren();
      const done = document.createElement("b");
      done.textContent = typed;
      hint.tag.append(done, hint.code.slice(typed.length));
    }
  }
}

let startedBy = null;
spacetify.keyboard.add("t", (event) => {
  if (hinting) return;
  startedBy = event;
  if (on("hints")) showHints();
});

// While letters are shown, every key goes to them.
window.addEventListener(
  "keydown",
  (event) => {
    if (!hinting || event === startedBy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === "Escape") return hideHints();
    if (event.key === "Backspace") {
      typed = typed.slice(0, -1);
      drawTyped();
      return;
    }
    // The letter as typed, so the codes read the same on every keyboard.
    const letter = String(event.key || "").toLowerCase();
    if (/^[a-z]$/.test(letter)) typeHint(letter);
  },
  true,
);
// Scrolling or clicking moves things: the letters would be wrong.
window.addEventListener("wheel", () => hinting && hideHints(), true);
window.addEventListener("mousedown", () => hinting && hideHints(), true);
