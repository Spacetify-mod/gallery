// Trash Bin: songs and artists you never want to hear again.
//
// A button next to the volume opens a small menu: throw away the song
// playing, or one of its artists, and see what is in the trash. When
// something from the trash starts, Spotify's own "next" button is clicked.
// Songs are known by their album and title, artists by their Spotify link,
// as shown in the player bar. The trash is kept in Spotify, on this computer.

const BUTTON_ID = "sttb-open";
const MENU_ID = "sttb-menu";
const TOAST_ID = "sttb-toast";
const STORE = "spacetify:trash-bin";
const SEL = {
  volume: '[data-testid="volume-bar"]',
  widget: '[data-testid="now-playing-widget-v2"]',
  byline: '[data-testid="now-playing-widget-v2-byline"]',
  title: '[data-testid="context-item-link"]',
  next: '[data-testid="control-button-skip-forward"]',
};

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

const ICON_TRASH =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 1h4a1 1 0 0 1 1 1v1h3.25a.75.75 0 0 1 0 1.5h-.6l-.72 9.06A1.5 1.5 0 0 1 11.44 15H4.56a1.5 1.5 0 0 1-1.49-1.44L2.35 4.5h-.6a.75.75 0 0 1 0-1.5H5V2a1 1 0 0 1 1-1zm3.5 2V2.5h-3V3h3zM3.86 4.5l.7 9h6.88l.7-9H3.86zM6.25 6c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5c0-.41.34-.75.75-.75zm3.5 0c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5c0-.41.34-.75.75-.75z"/></svg>';

spacetify.addStyle(`
  #${BUTTON_ID} { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; color: var(--text-subdued); cursor: pointer; flex-shrink: 0; border-radius: 50%; position: relative; }
  #${BUTTON_ID}:hover { color: var(--text-base); transform: scale(1.06); }
  #${BUTTON_ID}[data-trashed="true"] { color: var(--text-negative); }
  #${MENU_ID} { position: fixed; z-index: 2147481500; width: 300px; max-height: 60vh; overflow: auto; padding: 6px;
    border-radius: 8px; background: var(--background-elevated-base); color: var(--text-base);
    box-shadow: 0 16px 40px rgba(0,0,0,.5); font-size: 14px; }
  #${MENU_ID} .sttb-head { padding: 10px 12px 6px; color: var(--text-subdued); font-size: 12px; font-weight: 700; }
  #${MENU_ID} button.sttb-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0;
    background: transparent; color: inherit; text-align: left; border-radius: 4px; cursor: pointer; font: inherit; }
  #${MENU_ID} button.sttb-item:hover { background: var(--background-elevated-highlight); }
  #${MENU_ID} .sttb-sep { height: 1px; margin: 6px 4px; background: var(--decorative-subdued); }
  #${MENU_ID} .sttb-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; }
  #${MENU_ID} .sttb-row span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MENU_ID} .sttb-row small { color: var(--text-subdued); }
  #${MENU_ID} .sttb-row button { border: 1px solid var(--essential-subdued); background: transparent; color: var(--text-base);
    border-radius: 999px; padding: 3px 10px; font: inherit; font-size: 12px; cursor: pointer; }
  #${MENU_ID} .sttb-empty { padding: 8px 12px 12px; color: var(--text-subdued); }
  #${TOAST_ID} { position: fixed; z-index: 2147481500; left: 50%; bottom: 110px; transform: translateX(-50%);
    padding: 10px 16px; border-radius: 8px; background: var(--background-elevated-highlight); color: var(--text-base);
    box-shadow: 0 8px 24px rgba(0,0,0,.4); font-size: 14px; pointer-events: none; }
`);

// ------------------------------------------------------------ the trash

const load = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "{}");
    return {
      songs: Array.isArray(data.songs) ? data.songs.filter((s) => s && typeof s.key === "string") : [],
      artists: Array.isArray(data.artists) ? data.artists.filter((a) => a && typeof a.id === "string") : [],
    };
  } catch {
    return { songs: [], artists: [] };
  }
};
const save = (trash) => localStorage.setItem(STORE, JSON.stringify(trash));

// The song in the player bar: its album and title, and its artists.
function playing() {
  const title = document.querySelector(SEL.title);
  if (!title) return null;
  const album = /\/album\/([A-Za-z0-9]+)/.exec(title.getAttribute("href") || "");
  const name = title.textContent.trim();
  const byline = document.querySelector(SEL.byline);
  const artists = [...(byline ? byline.querySelectorAll('a[href*="/artist/"]') : [])]
    .map((a) => ({ id: (/\/artist\/([A-Za-z0-9]+)/.exec(a.getAttribute("href")) || [])[1], name: a.textContent.trim() }))
    .filter((a) => a.id);
  return { key: `${album ? album[1] : "?"}|${name.toLowerCase()}`, name, artists };
}

function inTrash(song, trash) {
  if (!song) return null;
  if (trash.songs.some((s) => s.key === song.key)) return t("this song", "ce titre");
  const artist = song.artists.find((a) => trash.artists.some((x) => x.id === a.id));
  return artist ? artist.name : null;
}

// ------------------------------------------------------------- the menu

let menu = null;

function closeMenu() {
  if (menu) menu.remove();
  menu = null;
}

function item(text, onClick) {
  const button = document.createElement("button");
  button.className = "sttb-item";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function openMenu(anchor) {
  closeMenu();
  const trash = load();
  const song = playing();
  menu = element("div");
  menu.id = MENU_ID;
  menu.setAttribute("role", "menu");

  if (song && song.name) {
    menu.append(element("div", "sttb-head", t("Throw away", "Jeter à la corbeille")));
    if (!trash.songs.some((s) => s.key === song.key)) {
      menu.append(
        item(`${t("The song", "Le titre")} « ${song.name} »`, () => {
          const now = load();
          now.songs.push({ key: song.key, name: song.name, artists: song.artists.map((a) => a.name).join(", ") });
          save(now);
          closeMenu();
          check(true);
        }),
      );
    }
    for (const artist of song.artists) {
      if (trash.artists.some((a) => a.id === artist.id)) continue;
      menu.append(
        item(`${t("The artist", "L'artiste")} ${artist.name}`, () => {
          const now = load();
          now.artists.push(artist);
          save(now);
          closeMenu();
          check(true);
        }),
      );
    }
    menu.append(element("div", "sttb-sep"));
  }

  menu.append(element("div", "sttb-head", `${t("In the trash", "Dans la corbeille")} (${trash.songs.length + trash.artists.length})`));
  if (!trash.songs.length && !trash.artists.length) {
    menu.append(element("div", "sttb-empty", t("Nothing yet.", "Rien pour l'instant.")));
  }
  const row = (label, detail, onRestore) => {
    const line = element("div", "sttb-row");
    const text = element("span", "", label);
    if (detail) {
      text.append(" ");
      text.append(element("small", "", detail));
    }
    const restore = element("button", "", t("Restore", "Restaurer"));
    restore.addEventListener("click", () => {
      onRestore();
      openMenu(anchor);
    });
    line.append(text, restore);
    return line;
  };
  for (const artist of trash.artists) {
    menu.append(
      row(artist.name, t("artist", "artiste"), () => {
        const now = load();
        now.artists = now.artists.filter((a) => a.id !== artist.id);
        save(now);
      }),
    );
  }
  for (const saved of trash.songs) {
    menu.append(
      row(saved.name, saved.artists, () => {
        const now = load();
        now.songs = now.songs.filter((s) => s.key !== saved.key);
        save(now);
      }),
    );
  }

  document.body.appendChild(menu);
  const box = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  menu.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, box.right - width))}px`;
  menu.style.bottom = `${window.innerHeight - box.top + 8}px`;
}

document.addEventListener(
  "mousedown",
  (event) => {
    if (menu && !menu.contains(event.target) && event.target.closest(`#${BUTTON_ID}`) === null) closeMenu();
  },
  true,
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

// ------------------------------------------------------------- skipping

let lastSkipped = "";
let lastSkipAt = 0;
let toastTimer = null;

function toast(text) {
  let box = document.getElementById(TOAST_ID);
  if (!box) {
    box = element("div");
    box.id = TOAST_ID;
    box.setAttribute("role", "status");
    document.body.appendChild(box);
  }
  box.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.remove(), 3500);
}

function check(force) {
  const song = playing();
  const why = inTrash(song, load());
  const button = document.getElementById(BUTTON_ID);
  if (button) button.dataset.trashed = String(!!why);
  if (!why || !spacetify.settings.get("skip")) return;
  // Once per song, and never twice in a row too fast.
  const now = Date.now();
  if (!force && song.key === lastSkipped && now - lastSkipAt < 15000) return;
  if (now - lastSkipAt < 1200) return;
  const next = document.querySelector(SEL.next);
  if (!next || next.disabled) return;
  lastSkipped = song.key;
  lastSkipAt = now;
  next.click();
  spacetify.log.info("skipped", song.name, "because of", why);
  if (spacetify.settings.get("notify")) {
    toast(t(`Skipped « ${song.name} »: ${why} is in your trash`, `« ${song.name} » passé : ${why} est dans ta corbeille`));
  }
}

// ------------------------------------------------------------- the button

spacetify.observe(SEL.volume, (volume) => {
  if (document.getElementById(BUTTON_ID)) return;
  const button = element("button");
  button.id = BUTTON_ID;
  button.type = "button";
  const drawing = element("span");
  drawing.style.display = "inline-flex";
  drawing.innerHTML = ICON_TRASH; // constant drawing of this file
  button.append(drawing);
  button.setAttribute("aria-label", t("Trash bin", "Corbeille"));
  button.addEventListener("mouseenter", () => {
    button.title = t("Trash bin", "Corbeille");
  });
  button.addEventListener("click", () => (menu ? closeMenu() : openMenu(button)));
  volume.before(button);
  check(false);
});

// The player bar changes when a song starts: look again then, and every
// second in case Spotify redraws it without a change we can see.
spacetify.observe(SEL.title, () => check(false));
setInterval(() => check(false), 1000);
