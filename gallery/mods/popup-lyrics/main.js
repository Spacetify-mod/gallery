// Pop-up Lyrics: synced lyrics in a small window on top of the others.
//
// The lyrics come from LRCLIB (lrclib.net), a free and open collection of
// synced lyrics: only the title, artist, album and length of the song are
// sent to it. The window stays on top of your other windows when Spotify
// allows it; otherwise it floats inside Spotify and can be moved.

const PANEL_ID = "stpl-panel";
const LRCLIB = "https://lrclib.net/api";
const CACHE_SIZE = 50;
const TICK_MS = 100;

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M1.5 2.75A1.25 1.25 0 0 1 2.75 1.5h10.5a1.25 1.25 0 0 1 1.25 1.25v6.5a1.25 1.25 0 0 1-1.25 1.25H9v-1.5h4V3H3v6h2v1.5H2.75A1.25 1.25 0 0 1 1.5 9.25v-6.5zM4.5 5h7v1.25h-7zm0 2h4.5v1.25H4.5zM7.25 11.5h7.25v3H7.25z"/></svg>';

const SIZES = { small: 16, medium: 21, large: 28 };

// The window's look. The same text serves the separate window and the
// panel inside Spotify.
const STYLE = `
  .stpl { position: relative; height: 100%; overflow: hidden; color: #fff; background: #121212;
    font-family: var(--encore-body-font-stack, "Segoe UI", system-ui, sans-serif); user-select: none; }
  .stpl-bg { position: absolute; inset: -20%; background-size: cover; background-position: center;
    filter: blur(40px) saturate(1.4) brightness(.4); transition: background-image .6s; }
  .stpl[data-background="false"] .stpl-bg { display: none; }
  .stpl-lines { position: absolute; inset: 0; overflow-y: auto; padding: 45% 22px; scrollbar-width: none; }
  .stpl-lines::-webkit-scrollbar { display: none; }
  .stpl-line { margin: 0 0 .7em; line-height: 1.25; font-weight: 700; opacity: .38; cursor: pointer;
    transition: opacity .25s, transform .25s; transform-origin: center left; }
  .stpl[data-align="center"] .stpl-line { text-align: center; transform-origin: center; }
  .stpl-line:hover { opacity: .7; }
  .stpl-line.now { opacity: 1; transform: scale(1.04); }
  .stpl-plain .stpl-line { opacity: .85; cursor: default; font-weight: 600; }
  .stpl-note { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center; opacity: .7; font-size: 15px; }
  .stpl-tools { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity .2s; }
  .stpl:hover .stpl-tools { opacity: 1; }
  .stpl-tools button { min-width: 28px; height: 26px; border: 0; border-radius: 13px; padding: 0 8px; cursor: pointer;
    background: rgba(0,0,0,.55); color: #fff; font: 600 12px/26px system-ui, sans-serif; }
  .stpl-tools button:hover { background: rgba(0,0,0,.8); }
  .stpl-source { position: absolute; left: 10px; bottom: 10px; font-size: 10px; opacity: 0; transition: opacity .2s; }
  .stpl:hover .stpl-source { opacity: .5; }
`;

spacetify.addStyle(`
  ${STYLE}
  #${PANEL_ID} { position: fixed; z-index: 2147481200; right: 24px; bottom: 110px; width: 340px; height: 440px;
    border-radius: 12px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.6); resize: both;
    min-width: 220px; min-height: 200px; }
  #${PANEL_ID} .stpl-grip { position: absolute; z-index: 2; top: 0; left: 0; right: 40px; height: 28px; cursor: move; }
  #${PANEL_ID} .stpl-close { position: absolute; z-index: 2; top: 6px; right: 6px; width: 26px; height: 26px; border: 0;
    border-radius: 50%; background: rgba(0,0,0,.45); color: #fff; cursor: pointer; font-size: 16px; line-height: 26px; }
`);

// ------------------------------------------------------------ the lyrics

const cache = new Map();

// "[01:02.34]" and "[01:02]" at the start of a line, maybe several.
function parseLrc(text) {
  const lines = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const stamps = [];
    let rest = raw;
    let match;
    while ((match = /^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/.exec(rest))) {
      stamps.push(Math.round((Number(match[1]) * 60 + Number(match[2].replace(":", "."))) * 1000));
      rest = rest.slice(match[0].length);
    }
    for (const at of stamps) lines.push({ at, text: rest.trim() });
  }
  return lines.sort((a, b) => a.at - b.at);
}

async function ask(path, params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${LRCLIB}/${path}?${query}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`LRCLIB answered ${response.status}`);
  return response.json();
}

async function lyricsOf(track) {
  if (cache.has(track.uri)) return cache.get(track.uri);
  const artist = track.artists.map((a) => a.name).join(", ");
  const firstArtist = track.artists[0] ? track.artists[0].name : "";
  let found = null;
  const exact = { track_name: track.name, artist_name: firstArtist };
  if (track.album && track.album.name) exact.album_name = track.album.name;
  if (track.duration) exact.duration = String(Math.round(track.duration / 1000));
  found = await ask("get", exact);
  if (!found || (!found.syncedLyrics && !found.plainLyrics)) {
    const list = await ask("search", { track_name: track.name, artist_name: firstArtist || artist });
    if (Array.isArray(list) && list.length) {
      const near = (item) => !track.duration || Math.abs(item.duration * 1000 - track.duration) < 4000;
      found = list.find((item) => item.syncedLyrics && near(item)) || list.find((item) => item.syncedLyrics) || list[0];
    }
  }
  const result = found
    ? { synced: found.syncedLyrics ? parseLrc(found.syncedLyrics) : [], plain: found.plainLyrics || "", instrumental: !!found.instrumental }
    : null;
  cache.set(track.uri, result);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
  return result;
}

// ------------------------------------------------------------ the window

let view = null; // { doc, root, bg, lines, note, close() }
let shown = { uri: null, lines: [], current: -1 };
let offset = 0;
let timer = null;

function build(doc, container) {
  const root = doc.createElement("div");
  root.className = "stpl";
  const bg = doc.createElement("div");
  bg.className = "stpl-bg";
  const lines = doc.createElement("div");
  lines.className = "stpl-lines";
  const note = doc.createElement("div");
  note.className = "stpl-note";
  const tools = doc.createElement("div");
  tools.className = "stpl-tools";
  const tool = (text, title, action) => {
    const b = doc.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.addEventListener("click", action);
    tools.append(b);
    return b;
  };
  const offsetButton = tool("±0", t("Lyrics offset: click to reset", "Décalage des paroles : clic pour remettre à zéro"), () => {
    offset = 0;
    offsetButton.textContent = "±0";
  });
  const shift = (ms) => {
    offset += ms;
    offsetButton.textContent = `${offset > 0 ? "+" : ""}${(offset / 1000).toFixed(1)}s`;
  };
  tools.prepend(
    (() => {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = "−";
      b.title = t("Lyrics earlier", "Paroles plus tôt");
      b.addEventListener("click", () => shift(-250));
      return b;
    })(),
  );
  tool("+", t("Lyrics later", "Paroles plus tard"), () => shift(250));
  const source = doc.createElement("div");
  source.className = "stpl-source";
  source.textContent = t("Lyrics: LRCLIB", "Paroles : LRCLIB");
  root.append(bg, lines, note, tools, source);
  container.append(root);
  return { doc, root, bg, lines, note };
}

function applySettings() {
  if (!view) return;
  view.root.dataset.align = spacetify.settings.get("align");
  view.root.dataset.background = String(spacetify.settings.get("background"));
  view.lines.style.fontSize = `${SIZES[spacetify.settings.get("size")] || SIZES.medium}px`;
}

function say(text) {
  view.note.textContent = text;
  view.note.style.display = text ? "" : "none";
}

async function load(track) {
  if (!view) return;
  shown = { uri: track ? track.uri : null, lines: [], current: -1 };
  view.lines.replaceChildren();
  view.lines.classList.remove("stpl-plain");
  view.bg.style.backgroundImage = track && track.image ? `url("${String(track.image).replace(/"/g, "")}")` : "";
  if (!track) return say(t("Nothing is playing.", "Rien ne joue."));
  if (track.isLocal || track.type === "episode") return say(t("No lyrics for this one.", "Pas de paroles pour celui-ci."));
  say(t("Looking for the lyrics…", "Recherche des paroles…"));
  let found;
  try {
    found = await lyricsOf(track);
  } catch (error) {
    spacetify.log.warn("lyrics not loaded", error);
    if (shown.uri === track.uri) say(t("The lyrics could not be loaded.", "Les paroles n'ont pas pu être chargées."));
    return;
  }
  if (!view || shown.uri !== track.uri) return;
  if (!found) return say(t("No lyrics found for this song.", "Pas de paroles trouvées pour ce titre."));
  if (found.instrumental) return say(t("♪ Instrumental ♪", "♪ Instrumental ♪"));
  say("");
  const doc = view.doc;
  if (found.synced.length) {
    shown.lines = found.synced;
    for (const line of found.synced) {
      const p = doc.createElement("p");
      p.className = "stpl-line";
      p.textContent = line.text || "♪";
      p.addEventListener("click", () => spacetify.player.seek(Math.max(0, line.at - offset)));
      view.lines.append(p);
    }
  } else {
    view.lines.classList.add("stpl-plain");
    for (const text of found.plain.split(/\r?\n/)) {
      const p = doc.createElement("p");
      p.className = "stpl-line";
      p.textContent = text || " ";
      view.lines.append(p);
    }
  }
}

function tick() {
  if (!view || !shown.lines.length) return;
  const now = spacetify.player.state();
  if (!now || !now.track || now.track.uri !== shown.uri) return;
  const at = now.position + offset;
  let index = -1;
  for (let i = 0; i < shown.lines.length && shown.lines[i].at <= at; i++) index = i;
  if (index === shown.current) return;
  const nodes = view.lines.children;
  if (nodes[shown.current]) nodes[shown.current].classList.remove("now");
  shown.current = index;
  const line = nodes[index];
  if (!line) return;
  line.classList.add("now");
  view.lines.scrollTo({ top: line.offsetTop - view.lines.clientHeight * 0.42, behavior: "smooth" });
}

function start(doc, container, closer) {
  view = { ...build(doc, container), close: closer };
  applySettings();
  const now = spacetify.player.state();
  load(now ? now.track : null);
  timer = setInterval(tick, TICK_MS);
  button.setActive(true);
}

function stopped() {
  clearInterval(timer);
  timer = null;
  view = null;
  button.setActive(false);
}

// A real window on top of the others (Document Picture-in-Picture).
async function openWindow() {
  const pip = await window.documentPictureInPicture.requestWindow({ width: 340, height: 440 });
  const style = pip.document.createElement("style");
  style.textContent = `html, body { margin: 0; height: 100%; background: #121212; } ${STYLE}`;
  pip.document.head.append(style);
  pip.document.title = t("Lyrics", "Paroles");
  pip.addEventListener("pagehide", stopped);
  start(pip.document, pip.document.body, () => pip.close());
}

// Otherwise a panel inside Spotify, that can be moved and resized.
function openPanel() {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  const grip = document.createElement("div");
  grip.className = "stpl-grip";
  const close = document.createElement("button");
  close.className = "stpl-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", t("Close the lyrics", "Fermer les paroles"));
  const shut = () => {
    panel.remove();
    stopped();
  };
  close.addEventListener("click", shut);
  grip.addEventListener("pointerdown", (event) => {
    const box = panel.getBoundingClientRect();
    const dx = event.clientX - box.left;
    const dy = event.clientY - box.top;
    const move = (e) => {
      panel.style.left = `${Math.max(0, Math.min(innerWidth - 60, e.clientX - dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(innerHeight - 40, e.clientY - dy))}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  });
  panel.append(grip, close);
  document.body.append(panel);
  start(document, panel, shut);
}

async function toggle() {
  if (view) return view.close();
  if (window.documentPictureInPicture && window.documentPictureInPicture.requestWindow) {
    try {
      await openWindow();
      return;
    } catch (error) {
      spacetify.log.info("no separate window here, using a panel", error);
    }
  }
  openPanel();
}

const button = spacetify.ui.playbarButton({ label: "Pop-up lyrics", icon: ICON, onClick: toggle });

// Spotify sets its language a moment after starting: labels follow it.
const onLanguage = (draw) => {
  draw();
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
};
onLanguage(() => button.setLabel(t("Pop-up lyrics", "Paroles en fenêtre")));

spacetify.settings.onChange(applySettings);
spacetify.player.ready().then(() => {
  spacetify.player.onTrackChange((track) => {
    if (view) load(track);
  });
});
