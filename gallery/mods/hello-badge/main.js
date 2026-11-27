// Hello badge: a small example of a spacetify extension.
//
// It waits for the player bar, then shows a badge just above it, coloured
// with the theme's accent. `spacetify` is this extension's own API; it is
// described in docs/extensions.md.
//
// spacetify runs this code inside a function, after the page has loaded.
// If it throws, the error is logged under this extension's name and
// Spotify keeps working.

const BADGE_ID = "hello-badge";
const PLAYER_BAR = '[data-testid="now-playing-bar"]';

spacetify.addStyle(`
  #${BADGE_ID} {
    position: fixed;
    z-index: 9999;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--essential-bright-accent);
    color: var(--background-base);
    font: 700 13px/1.2 sans-serif;
    pointer-events: none;
  }
  #${BADGE_ID}[data-side="left"] { left: 16px; }
  #${BADGE_ID}[data-side="right"] { right: 16px; }
`);

function render(playerBar) {
  let badge = document.getElementById(BADGE_ID);
  if (!badge) {
    badge = document.createElement("div");
    badge.id = BADGE_ID;
    document.body.appendChild(badge);
  }
  badge.textContent = spacetify.settings.get("text");
  badge.dataset.side = spacetify.settings.get("side");
  if (playerBar) {
    badge.style.bottom = `${playerBar.offsetHeight + 12}px`;
  }
}

spacetify
  .waitFor(PLAYER_BAR)
  .then((playerBar) => {
    render(playerBar);
    spacetify.log.info("badge shown");
  })
  .catch(() => {
    // The player bar never showed up: Spotify may have renamed it.
    // Show the badge anyway, at a fixed height.
    render(null);
    document.getElementById(BADGE_ID).style.bottom = "100px";
    spacetify.log.warn(`${PLAYER_BAR} not found, badge shown at a fixed position`);
  });

// Redraw when a setting changes (spacetify.settings.set() is called).
spacetify.settings.onChange(() => render(document.querySelector(PLAYER_BAR)));

// Log page changes, to show onNavigate.
spacetify.onNavigate((path) => spacetify.log.info("page changed:", path));
