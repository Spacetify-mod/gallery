// Precise Volume: the volume in %, the mouse wheel, and an exact value.
//
// It reads and moves Spotify's own volume slider, like a person would, so
// Spotify keeps doing the real work and remembers the volume as usual.
// Spotify's slider only stops every 10 %: its steps are made free, so it
// can be set to any value (and dragged finely too).

const LABEL_ID = "stpv-label";
const VOLUME = '[data-testid="volume-bar"]';
const SLIDER = '[data-testid="volume-bar"] input[type="range"]';

const t = (en, fr) => (String(document.documentElement.lang || "").toLowerCase().startsWith("fr") ? fr : en);

spacetify.addStyle(`
  #${LABEL_ID} { min-width: 44px; height: 28px; padding: 0 6px; margin-left: 4px; border: 0; border-radius: 4px;
    background: transparent; color: var(--text-subdued); font: inherit; font-size: 12px; font-weight: 700;
    font-variant-numeric: tabular-nums; cursor: pointer; flex-shrink: 0; text-align: center; }
  #${LABEL_ID}:hover { color: var(--text-base); background: var(--background-tinted-base); }
  input#${LABEL_ID} { width: 52px; cursor: text; color: var(--text-base); background: var(--background-tinted-highlight);
    outline: 1px solid var(--essential-bright-accent); appearance: textfield; }
`);

const slider = () => {
  const input = document.querySelector(SLIDER);
  if (input && input.step !== "any") input.step = "any";
  return input;
};

// Sets Spotify's slider like a person dragging it.
function setVolume(percent) {
  const input = slider();
  if (!input) return;
  const value = Math.max(0, Math.min(100, Math.round(percent))) / 100;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  refresh();
}

const current = () => {
  const input = slider();
  return input ? Math.round(Number(input.value) * 100) : 0;
};

function refresh() {
  const label = document.getElementById(LABEL_ID);
  if (label && label.tagName === "BUTTON") label.textContent = `${current()} %`;
}

function makeLabel() {
  const label = document.createElement("button");
  label.id = LABEL_ID;
  label.type = "button";
  label.title = t("Click to type an exact volume", "Clique pour taper un volume exact");
  label.setAttribute("aria-label", t("Volume in percent", "Volume en pourcentage"));
  label.addEventListener("click", () => edit(label));
  label.addEventListener("wheel", onWheel, { passive: false });
  return label;
}

// The label becomes a field to type a value in.
function edit(label) {
  const field = document.createElement("input");
  field.id = LABEL_ID;
  field.type = "number";
  field.min = "0";
  field.max = "100";
  field.value = String(current());
  field.setAttribute("aria-label", t("Volume in percent", "Volume en pourcentage"));
  let done = false;
  const finish = (keep) => {
    if (done) return;
    done = true;
    if (keep && field.value !== "") setVolume(Number(field.value));
    const back = makeLabel();
    field.replaceWith(back);
    refresh();
  };
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter") finish(true);
    if (event.key === "Escape") finish(false);
    event.stopPropagation();
  });
  field.addEventListener("blur", () => finish(true));
  label.replaceWith(field);
  field.focus();
  field.select();
}

function onWheel(event) {
  if (!spacetify.settings.get("wheel")) return;
  event.preventDefault();
  event.stopPropagation();
  const step = Math.max(1, Math.min(50, Number(spacetify.settings.get("step")) || 5));
  setVolume(current() + (event.deltaY < 0 ? step : -step));
}

spacetify.observe(VOLUME, (volume) => {
  volume.addEventListener("wheel", onWheel, { passive: false });
  if (!document.getElementById(LABEL_ID)) {
    volume.after(makeLabel());
  }
  const input = slider();
  if (input) input.addEventListener("input", refresh);
  refresh();
});

// Spotify also changes the volume by itself (keys, other devices).
setInterval(refresh, 1000);
