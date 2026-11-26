// No Podcasts: only music on the home page.
//
// A card is a podcast, an episode or an audiobook when it links to one
// (`/show/`, `/episode/`, `/audiobook/`), whatever the language. Such cards
// are hidden; a row left with no card at all is hidden too, so no empty
// titles are left behind. Nothing is removed: turning the extension off or
// changing a setting shows everything again.

const HIDDEN = "stnp-hidden";
const CARD = '[data-encore-id="card"]';
const HOME = '[data-testid="home-page"]';

// A row of cards is the closest section around a card (the home page is a
// section too, but it holds every row).
function shelfOf(card) {
  const section = card.closest("section");
  return section && !section.matches(HOME) ? section : null;
}

spacetify.addStyle(`.${HIDDEN} { display: none !important; }`);

function pattern() {
  const kinds = [];
  if (spacetify.settings.get("podcasts")) kinds.push("show", "episode");
  if (spacetify.settings.get("audiobooks")) kinds.push("audiobook");
  return kinds.length ? new RegExp(`/(?:${kinds.join("|")})/`) : null;
}

// Hiding applies on the home page, or everywhere if asked.
const applies = (el) => spacetify.settings.get("everywhere") || !!el.closest(HOME);

function isUnwanted(card, re) {
  if (!re) return false;
  return [...card.querySelectorAll("a[href]")].some((a) => re.test(a.getAttribute("href")));
}

function tidyShelf(shelf) {
  if (!shelf) return;
  const cards = [...shelf.querySelectorAll(CARD)];
  const empty = cards.length > 0 && cards.every((card) => card.classList.contains(HIDDEN));
  shelf.classList.toggle(HIDDEN, empty);
}

function checkCard(card, re = pattern()) {
  const hide = applies(card) && isUnwanted(card, re);
  card.classList.toggle(HIDDEN, hide);
  tidyShelf(shelfOf(card));
}

// Some podcasts are not in cards, such as a large banner for one episode
// at the top of a row of playlists. For each such link, the largest block
// around it that holds no link to music is hidden: the banner goes, the
// playlists next to it stay. A row with no music at all goes as a whole.
const MUSIC = /\/(?:album|playlist|artist|track|collection)\//;
const hasMusic = (el) => [...el.querySelectorAll("a[href]")].some((a) => MUSIC.test(a.getAttribute("href")));

function checkRow(section, re = pattern()) {
  if (section.matches(HOME) || !applies(section)) return;
  if (!re) return tidyShelf(section);
  const unwanted = [...section.querySelectorAll("a[href]")].filter((a) => re.test(a.getAttribute("href")));
  if (!unwanted.length) return tidyShelf(section);
  if (!hasMusic(section)) {
    section.classList.add(HIDDEN);
    return;
  }
  for (const link of unwanted) {
    if (link.closest(`.${HIDDEN}`)) continue;
    let block = link;
    while (block.parentElement && block.parentElement !== section && !hasMusic(block.parentElement)) {
      block = block.parentElement;
    }
    block.classList.add(HIDDEN);
  }
  tidyShelf(section);
}

// Cards and rows appear as the page loads and scrolls: each one is looked
// at once, then again a moment later, when its links are filled in.
spacetify.observe(CARD, (card) => {
  checkCard(card);
  setTimeout(() => checkCard(card), 800);
});
spacetify.observe(`${HOME} section`, (section) => {
  checkRow(section);
  setTimeout(() => checkRow(section), 800);
  setTimeout(() => checkRow(section), 2500);
});

// A setting changed: look at everything again.
spacetify.settings.onChange(() => {
  const re = pattern();
  for (const section of document.querySelectorAll(`.${HIDDEN}`)) section.classList.remove(HIDDEN);
  for (const card of document.querySelectorAll(CARD)) checkCard(card, re);
  for (const section of document.querySelectorAll(`${HOME} section`)) checkRow(section, re);
});
