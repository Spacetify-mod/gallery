// Skip Explicit: no song marked explicit, unless you allow it.
//
// A button in the player bar turns it on and off. Right-click a song or an
// artist to always allow it. Spotify itself says which songs are explicit;
// if a whole playlist is explicit, it pauses instead of skipping forever.

const TOAST_ID = "stse-toast";
const STORE = "spacetify:skip-explicit";
const LOOP_WINDOW_MS = 15000;
const LOOP_MAX = 8;

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5zM3 3v10h10V3H3zm2.5 1.75h5v1.5H7v1.5h3.25v1.5H7v1.5h3.5v1.5h-5v-7.5z"/></svg>';

spacetify.addStyle(`
  #${TOAST_ID} { position: fixed; z-index: 2147481500; left: 50%; bottom: 110px; transform: translateX(-50%);
    max-width: 70vw; padding: 10px 16px; border-radius: 8px; background: var(--background-elevated-highlight);
    color: var(--text-base); box-shadow: 0 8px 24px rgba(0,0,0,.4); font-size: 14px; pointer-events: none; }
`);

let toastTimer = null;
function toast(text) {
  let box = document.getElementById(TOAST_ID);
  if (!box) {
    box = document.createElement("div");
    box.id = TOAST_ID;
    box.setAttribute("role", "status");
    document.body.appendChild(box);
  }
  box.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.remove(), 3500);
}

// ------------------------------------------------------ what you allow

const load = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "{}");
    const uris = (list) => (Array.isArray(list) ? list.filter((uri) => typeof uri === "string") : []);
    return { songs: uris(data.songs), artists: uris(data.artists) };
  } catch {
    return { songs: [], artists: [] };
  }
};
const save = (allowed) => localStorage.setItem(STORE, JSON.stringify(allowed));

function isAllowed(track, allowed) {
  if (allowed.songs.includes(track.uri)) return true;
  return track.artists.some((artist) => allowed.artists.includes(artist.uri));
}

const listOf = (type) => (type === "track" ? "songs" : type === "artist" ? "artists" : null);

function setAllowed(target, on) {
  const list = listOf(target.type);
  if (!list) return;
  const allowed = load();
  const uris = target.uris && target.uris.length ? target.uris : [target.uri];
  allowed[list] = on
    ? [...new Set([...allowed[list], ...uris])]
    : allowed[list].filter((uri) => !uris.includes(uri));
  save(allowed);
}

// Spotify sets its language a moment after starting: labels follow it.
const onLanguage = (draw) => {
  draw();
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
};

let menuItems = [];
onLanguage(() => {
  for (const item of menuItems) item.remove();
  menuItems = [];
  menuItems.push(spacetify.ui.contextMenuItem({
    label: t("Skip Explicit: always allow", "Skip Explicit : toujours autoriser"),
    when: (target) => !!listOf(target.type) && !load()[listOf(target.type)].includes(target.uri),
    onClick: (target) => {
      setAllowed(target, true);
      toast(t("Allowed: it will play even if explicit.", "Autorisé : il passera même s'il est explicite."));
    },
  }));
  menuItems.push(spacetify.ui.contextMenuItem({
    label: t("Skip Explicit: stop allowing", "Skip Explicit : ne plus autoriser"),
    when: (target) => !!listOf(target.type) && load()[listOf(target.type)].includes(target.uri),
    onClick: (target) => setAllowed(target, false),
  }));
});

// ------------------------------------------------------------ skipping

let skips = [];
let lastSkipped = null;

// Next, or a pause when nothing comes after (a song played on its own).
async function skipOrPause() {
  try {
    await spacetify.player.next();
  } catch {
    // Spotify may already have moved on by itself: nothing more to do.
    await spacetify.player.pause().catch(() => {});
  }
}

async function check(track) {
  if (!track || !track.isExplicit || !spacetify.settings.get("enabled")) return;
  if (isAllowed(track, load())) return;
  // Spotify can tell the same change more than once.
  if (lastSkipped === track.uri) return;
  lastSkipped = track.uri;
  setTimeout(() => {
    if (lastSkipped === track.uri) lastSkipped = null;
  }, 3000);
  const now = Date.now();
  skips = skips.filter((at) => now - at < LOOP_WINDOW_MS);
  if (skips.length >= LOOP_MAX) {
    skips = [];
    await spacetify.player.pause();
    toast(t("Everything here is explicit: paused.", "Tout est explicite ici : mis en pause."));
    return;
  }
  skips.push(now);
  await skipOrPause();
  if (spacetify.settings.get("notify")) {
    toast(t(`Explicit « ${track.name} » skipped`, `« ${track.name} » (explicite) passé`));
  }
}

// ------------------------------------------------------------ the button

const label = () =>
  spacetify.settings.get("enabled")
    ? t("Skip Explicit: on", "Skip Explicit : activé")
    : t("Skip Explicit: off", "Skip Explicit : désactivé");

const button = spacetify.ui.playbarButton({
  label: label(),
  icon: ICON,
  onClick: () => spacetify.settings.set("enabled", !spacetify.settings.get("enabled")),
});

function refresh() {
  button.setActive(!!spacetify.settings.get("enabled"));
  button.setLabel(label());
}
onLanguage(refresh);

spacetify.settings.onChange((name) => {
  refresh();
  if (name === "enabled") {
    const now = spacetify.player.state();
    if (now) check(now.track);
  }
});

spacetify.player.ready().then(() => {
  if (!spacetify.player.available) {
    spacetify.log.warn("Spotify's player is hidden: explicit songs cannot be recognised for now");
  }
  spacetify.player.onTrackChange(check);
  const now = spacetify.player.state();
  if (now) check(now.track);
});
