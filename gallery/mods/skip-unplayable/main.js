// Skip Unplayable: never stay stuck on something that cannot play.
//
// Spotify sometimes stops on a song or a video it cannot play here (not
// allowed in this country, removed, a broken local file). When a new track
// starts and is still at its very beginning a few seconds later, while you
// did not pause it, this goes on to the next one. It stops after a few skips
// in a row, so a lost connection never empties a whole playlist.

const TOAST_ID = "stsu-toast";
const PLAY = '[data-testid="control-button-playpause"]';
const STARTED_MS = 1500; // a track past this point did start
const MAX_IN_A_ROW = 3;

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

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

let watched = null; // { uri, name, touched }
let timer = null;
let inARow = 0;

// A pause or play asked by you means the track is not stuck.
const touched = () => {
  if (watched) watched.touched = true;
};
document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target && event.target.closest && event.target.closest(PLAY)) touched();
  },
  true,
);
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === " " || event.key === "MediaPlayPause") touched();
  },
  true,
);

function delayMs() {
  const seconds = Number(spacetify.settings.get("delay"));
  return Math.max(3, Math.min(30, Number.isFinite(seconds) ? seconds : 6)) * 1000;
}

// Next, or a pause when nothing comes after (a song played on its own).
async function skipOrPause() {
  try {
    await spacetify.player.next();
  } catch {
    // Spotify may already have moved on by itself: nothing more to do.
    await spacetify.player.pause().catch(() => {});
  }
}

async function check() {
  const now = spacetify.player.state();
  const was = watched;
  if (!was || !now || !now.track || now.track.uri !== was.uri || was.touched) return;
  if (now.position > STARTED_MS) {
    inARow = 0;
    return;
  }
  // Without internet nothing plays: not the track's fault.
  if (navigator.onLine === false) return;
  if (inARow >= MAX_IN_A_ROW) {
    if (inARow === MAX_IN_A_ROW) {
      inARow++;
      toast(t("Several tracks in a row could not play: stopped skipping.", "Plusieurs titres d'affilée ne passent pas : je ne saute plus."));
    }
    return;
  }
  inARow++;
  spacetify.log.info("stuck at the start, skipping", was.name);
  await skipOrPause();
  if (spacetify.settings.get("notify")) {
    toast(t(`« ${was.name} » could not play: skipped.`, `« ${was.name} » ne pouvait pas être lu : passé.`));
  }
}

spacetify.player.ready().then(() => {
  spacetify.player.onTrackChange((track) => {
    clearTimeout(timer);
    watched = track ? { uri: track.uri, name: track.name, touched: false } : null;
    if (watched) timer = setTimeout(check, delayMs());
  });
  // A track that plays normally resets the count.
  spacetify.player.onChange((state) => {
    if (state && state.position > STARTED_MS && state.isPlaying) inARow = 0;
  });
});
