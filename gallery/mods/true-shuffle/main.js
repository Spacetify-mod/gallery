// True Shuffle: every song once, in a really random order.
//
// Spotify's own shuffle prefers some songs. This mixes them with the
// Fisher–Yates method, where every order is equally likely, and plays them
// as a list of their own (the queue would keep only about 80). For a
// playlist or Liked Songs it takes every track, however many. Right-click a playlist or an album, or use the button in the player
// bar to mix what is playing now. When the mixed songs are over, it
// stops (or lets Spotify go on, in the settings).

const TOAST_ID = "stts-toast";
const CONTEXT_TYPES = ["playlist", "album", "artist", "collection", "show"];

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.15.35a.5.5 0 0 1 .7 0l2 2a.5.5 0 0 1 0 .7l-2 2a.5.5 0 0 1-.7-.7L14.29 3.2h-1.37a3.5 3.5 0 0 0-2.8 1.4L6.9 8.95a5 5 0 0 1-4 2H.75a.75.75 0 0 1 0-1.5h2.15a3.5 3.5 0 0 0 2.8-1.4l3.22-4.35a5 5 0 0 1 4-2h1.37L13.15 1.05a.5.5 0 0 1 0-.7zM.75 3.45H2.9a5 5 0 0 1 3.73 1.67l-.92 1.24A3.5 3.5 0 0 0 2.9 4.95H.75a.75.75 0 0 1 0-1.5zm9.37 6.15.92-1.24a3.5 3.5 0 0 0 1.88 2.64h1.37l-1.14-1.15a.5.5 0 1 1 .7-.7l2 2a.5.5 0 0 1 0 .7l-2 2a.5.5 0 0 1-.7-.7l1.14-1.15h-1.37a5 5 0 0 1-2.8-.86z"/><circle cx="8" cy="13.5" r="1.5"/></svg>';

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
  toastTimer = setTimeout(() => box.remove(), 4000);
}

// Fisher–Yates: each order has the same chance.
function shuffle(list) {
  const out = list.slice();
  const random = new Uint32Array(1);
  for (let i = out.length - 1; i > 0; i--) {
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const playable = (track) => track && track.uri && /^spotify:(track|episode|local):/.test(track.uri);

// The mix being played, to know when it is over.
let mix = null; // { uris: Set, last }
const MAX_TRACKS = 10000;

async function playMixed(uris) {
  const order = shuffle([...new Set(uris)]).slice(0, MAX_TRACKS);
  if (order.length < 2) {
    toast(t("Not enough songs to shuffle.", "Pas assez de titres à mélanger."));
    return;
  }
  // Spotify's own shuffle would mix the list again.
  await spacetify.player.setShuffle(false);
  mix = { uris: new Set(order), last: order[order.length - 1] };
  await spacetify.player.playTracks(order);
  toast(t(`${order.length} songs, in a truly random order.`, `${order.length} titres, dans un ordre vraiment aléatoire.`));
}

// What comes after the song playing in the album or playlist playing now.
async function upcoming() {
  const queue = await spacetify.player.queue();
  const list = [queue.current, ...queue.queued, ...queue.next].filter(playable);
  return list.map((track) => track.uri);
}

const waitFor = async (test, ms) => {
  for (let waited = 0; waited < ms; waited += 150) {
    if (test()) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
};

// Playlists and Liked Songs: every track, read from Spotify's library.
// Albums and artists: what Spotify lines up after playing them.
async function shuffleContext(uri) {
  toast(t("Shuffling…", "Mélange…"));
  if (/^spotify:(playlist:|collection|user:[^:]+:collection)/.test(uri)) {
    const tracks = await spacetify.library.tracks(uri);
    await playMixed(tracks.map((track) => track.uri));
    return;
  }
  await spacetify.player.setShuffle(false);
  await spacetify.player.playUri(uri);
  const started = await waitFor(() => {
    const now = spacetify.player.state();
    return !!(now && now.context && now.context.uri === uri && now.track);
  }, 6000);
  if (!started) {
    toast(t("Spotify did not start it: try again.", "Spotify ne l'a pas lancé : réessaie."));
    return;
  }
  // Spotify fills the list of what comes next a moment after starting.
  await new Promise((resolve) => setTimeout(resolve, 600));
  await playMixed(await upcoming());
}

async function shuffleNow() {
  const now = spacetify.player.state();
  if (!now || !now.track) {
    toast(t("Nothing is playing.", "Rien ne joue."));
    return;
  }
  // A mix playing already: mix the same songs again.
  if (mix && mix.uris.has(now.track.uri)) {
    await playMixed([...mix.uris]);
    return;
  }
  const context = now.context && now.context.uri;
  if (context && /^spotify:(playlist:|collection|user:[^:]+:collection)/.test(context)) {
    const tracks = await spacetify.library.tracks(context);
    await playMixed(tracks.map((track) => track.uri));
    return;
  }
  await playMixed(await upcoming());
}

function failed(error) {
  spacetify.log.warn("shuffle failed", error);
  toast(
    spacetify.player.available
      ? t("The shuffle did not work.", "Le mélange n'a pas marché.")
      : t("Spotify's queue is not reachable right now.", "La file d'attente de Spotify n'est pas accessible pour l'instant."),
  );
}

// Spotify sets its language a moment after starting: labels follow it.
const onLanguage = (draw) => {
  draw();
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
};

const shuffleButton = spacetify.ui.playbarButton({
  label: "True Shuffle",
  icon: ICON,
  onClick: () => shuffleNow().catch(failed),
});
let menuItem = null;
onLanguage(() => {
  shuffleButton.setLabel(t("True Shuffle: mix what is playing", "True Shuffle : mélanger ce qui joue"));
  if (menuItem) menuItem.remove();
  menuItem = spacetify.ui.contextMenuItem({
    label: t("Play with True Shuffle", "Lire avec True Shuffle"),
    icon: ICON,
    when: (target) => CONTEXT_TYPES.includes(target.type) || (target.type === "track" && target.uris.length > 1),
    onClick: (target) => {
      if (target.type === "track") playMixed(target.uris).catch(failed);
      else shuffleContext(target.uri).catch(failed);
    },
  });
});

// When the last mixed song is over, stop (unless the settings say go on).
spacetify.player.ready().then(() => {
  let previous = null;
  spacetify.player.onTrackChange((track) => {
    if (mix && previous === mix.last && track && !mix.uris.has(track.uri)) {
      mix = null;
      if (spacetify.settings.get("after") === "stop") {
        spacetify.player.pause();
        toast(t("The shuffled songs are over.", "Les titres mélangés sont finis."));
      }
    } else if (mix && track && !mix.uris.has(track.uri)) {
      // You played something else: the mix is forgotten.
      mix = null;
    }
    previous = track ? track.uri : null;
  });
});
