// Bookmarks: moments of songs, one click away.
//
// A button next to the volume opens the list. "Keep this moment" keeps the
// song playing and the second it is at. Opening a bookmark does what a
// person would do: it opens the song's album with a spotify: link (the kind
// Spotify follows in its own descriptions), presses the play button of the
// song's row, then moves the progress bar to the moment.
// Bookmarks are kept in Spotify, on this computer.

const BUTTON_ID = "stbm-open";
const MENU_ID = "stbm-menu";
const STORE = "spacetify:bookmarks";
const SEL = {
  volume: '[data-testid="volume-bar"]',
  byline: '[data-testid="now-playing-widget-v2-byline"]',
  title: '[data-testid="context-item-link"]',
  progress: '[data-testid="playback-progressbar"] input[type="range"]',
  playPause: '[data-testid="control-button-playpause"]',
  position: '[data-testid="playback-position"]',
  row: 'main [role="row"]',
};

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ICON_BOOKMARK =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3.5 2.5A1.5 1.5 0 0 1 5 1h6a1.5 1.5 0 0 1 1.5 1.5v12.04a.5.5 0 0 1-.8.4L8 12.2l-3.7 2.74a.5.5 0 0 1-.8-.4V2.5zM5 2.5v10.55l2.55-1.9a.75.75 0 0 1 .9 0L11 13.05V2.5H5z"/></svg>';

spacetify.addStyle(`
  #${BUTTON_ID} { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; color: var(--text-subdued); cursor: pointer; flex-shrink: 0; border-radius: 50%; }
  #${BUTTON_ID}:hover { color: var(--text-base); transform: scale(1.06); }
  #${MENU_ID} { position: fixed; z-index: 2147481500; width: 340px; max-height: 65vh; overflow: auto; padding: 6px;
    border-radius: 8px; background: var(--background-elevated-base); color: var(--text-base);
    box-shadow: 0 16px 40px rgba(0,0,0,.5); font-size: 14px; }
  #${MENU_ID} .stbm-keep { display: block; width: calc(100% - 12px); margin: 6px; padding: 9px 12px; border: 0; border-radius: 999px;
    cursor: pointer; background: var(--essential-bright-accent); color: var(--background-base); font: inherit; font-size: 13px; font-weight: 700; }
  #${MENU_ID} .stbm-keep:disabled { opacity: .4; cursor: default; }
  #${MENU_ID} .stbm-head { padding: 10px 12px 6px; color: var(--text-subdued); font-size: 12px; font-weight: 700; }
  #${MENU_ID} .stbm-row { display: flex; align-items: center; gap: 6px; border-radius: 4px; }
  #${MENU_ID} .stbm-row:hover { background: var(--background-elevated-highlight); }
  #${MENU_ID} .stbm-go { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 0;
    background: transparent; color: inherit; text-align: left; cursor: pointer; font: inherit; }
  #${MENU_ID} .stbm-go span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MENU_ID} .stbm-go small { color: var(--text-subdued); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MENU_ID} .stbm-del { width: 28px; height: 28px; margin-right: 6px; border: 0; border-radius: 50%; background: transparent;
    color: var(--text-subdued); cursor: pointer; font-size: 16px; line-height: 1; }
  #${MENU_ID} .stbm-del:hover { color: var(--text-base); background: var(--background-tinted-highlight); }
  #${MENU_ID} .stbm-empty { padding: 8px 12px 12px; color: var(--text-subdued); }
  #${MENU_ID} .stbm-note { padding: 4px 12px 10px; color: var(--text-negative); font-size: 12px; }
`);

// ------------------------------------------------------------ storage

const load = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(list)
      ? list.filter((b) => b && typeof b.album === "string" && /^[A-Za-z0-9]+$/.test(b.album) && typeof b.name === "string")
      : [];
  } catch {
    return [];
  }
};
const save = (list) => {
  const max = Math.max(1, Math.min(500, Number(spacetify.settings.get("max")) || 50));
  localStorage.setItem(STORE, JSON.stringify(list.slice(0, max)));
};

const time = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// The song playing and where it is.
function thisMoment() {
  const title = document.querySelector(SEL.title);
  const album = title && /\/album\/([A-Za-z0-9]+)/.exec(title.getAttribute("href") || "");
  if (!album) return null;
  const progress = document.querySelector(SEL.progress);
  const byline = document.querySelector(SEL.byline);
  return {
    album: album[1],
    name: title.textContent.trim(),
    artists: byline ? byline.textContent.trim() : "",
    at: progress ? Math.round(Number(progress.value)) : 0,
  };
}

// ------------------------------------------------------------ opening

async function until(test, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const found = test();
    if (found) return found;
    await wait(200);
  }
  return null;
}

// The title of a song row, in its second column.
const rowTitle = (row) => {
  const cell = row.querySelector('[aria-colindex="2"]');
  const text = cell && cell.querySelector('[data-encore-id="text"]');
  return text ? text.textContent.trim() : "";
};

let note = "";

async function open(bookmark) {
  closeMenu();
  note = "";
  // Spotify follows spotify: links in its own pages.
  const link = document.createElement("a");
  link.href = `spotify:album:${bookmark.album}`;
  link.style.display = "none";
  (document.querySelector("main") || document.body).appendChild(link);
  link.click();
  link.remove();
  await wait(600); // let the album page replace the page shown

  const row = await until(() => [...document.querySelectorAll(SEL.row)].find((r) => rowTitle(r) === bookmark.name), 8000);
  if (!row) {
    note = t(`“${bookmark.name}” was not found on its album.`, `« ${bookmark.name} » est introuvable sur son album.`);
    spacetify.log.warn("song not found on its album page:", bookmark.name);
    return;
  }
  const isThisSong = () => {
    const current = thisMoment();
    return !!current && current.album === bookmark.album && current.name === bookmark.name;
  };
  // The time shown next to the progress bar moves every second while a
  // song plays (the slider itself only moves every few seconds).
  const shownTime = () => (document.querySelector(SEL.position) || {}).textContent || "";
  const playingNow = async () => {
    const before = shownTime();
    await wait(1300);
    return shownTime() !== before;
  };

  if (isThisSong()) {
    // Already the song in the player: just make sure it plays.
    if (!(await playingNow())) document.querySelector(SEL.playPause)?.click();
  } else {
    // The play button of the row, the one shown when the row is pointed at.
    const play = row.querySelector('[aria-colindex="1"] button');
    if (play) play.click();
    else row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
  }

  // Wait until this song really plays (its time moves), then go to the moment.
  let last = null;
  const started = await until(() => {
    if (!isThisSong()) return false;
    const now = shownTime();
    const moving = last !== null && now !== last;
    last = now;
    return moving;
  }, 8000);
  const slider = document.querySelector(SEL.progress);
  if (started && slider && bookmark.at > 0) {
    await wait(300);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(slider, String(bookmark.at));
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// --------------------------------------------------------------- menu

let menu = null;

function closeMenu() {
  if (menu) menu.remove();
  menu = null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function openMenu(anchor) {
  closeMenu();
  menu = el("div");
  menu.id = MENU_ID;
  menu.setAttribute("role", "menu");

  const moment = thisMoment();
  const keep = el(
    "button",
    "stbm-keep",
    moment ? `${t("Keep this moment", "Garder ce moment")} · ${time(moment.at)}` : t("Keep this moment", "Garder ce moment"),
  );
  keep.disabled = !moment;
  keep.addEventListener("click", () => {
    const list = load().filter((b) => !(b.album === moment.album && b.name === moment.name && b.at === moment.at));
    list.unshift({ ...moment, added: Date.now() });
    save(list);
    openMenu(anchor);
  });
  menu.append(keep);
  if (note) menu.append(el("div", "stbm-note", note));

  const list = load();
  menu.append(el("div", "stbm-head", `${t("Bookmarks", "Favoris")} (${list.length})`));
  if (!list.length) {
    menu.append(el("div", "stbm-empty", t("Nothing kept yet. Play a song, then keep the moment you like.", "Rien de gardé pour l'instant. Lance un titre, puis garde le moment qui te plaît.")));
  }
  for (const bookmark of list) {
    const row = el("div", "stbm-row");
    const go = el("button", "stbm-go");
    go.append(el("span", "", `${bookmark.name} · ${time(bookmark.at)}`));
    if (bookmark.artists) go.append(el("small", "", bookmark.artists));
    go.addEventListener("click", () => open(bookmark));
    const del = el("button", "stbm-del", "×");
    del.setAttribute("aria-label", t("Remove", "Retirer"));
    del.addEventListener("click", () => {
      save(load().filter((b) => b.added !== bookmark.added));
      openMenu(anchor);
    });
    row.append(go, del);
    menu.append(row);
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

spacetify.observe(SEL.volume, (volume) => {
  if (document.getElementById(BUTTON_ID)) return;
  const button = el("button");
  button.id = BUTTON_ID;
  button.type = "button";
  const drawing = el("span");
  drawing.style.display = "inline-flex";
  drawing.innerHTML = ICON_BOOKMARK; // constant drawing of this file
  button.append(drawing);
  button.setAttribute("aria-label", t("Bookmarks", "Favoris"));
  button.addEventListener("mouseenter", () => {
    button.title = t("Bookmarks", "Favoris");
  });
  button.addEventListener("click", () => (menu ? closeMenu() : openMenu(button)));
  volume.before(button);
});
