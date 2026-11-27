// WebNowPlaying: the song playing, for Rainmeter and other desktop widgets.
//
// WebNowPlaying apps (the Rainmeter plugin, for one) listen on this computer
// only, at ws://127.0.0.1:8974. This sends them the title, artists, album,
// cover, position, volume, shuffle and repeat, and does what they ask:
// play, pause, next, previous, seek, volume, shuffle and repeat. Nothing
// leaves the computer. When no app listens, it tries again quietly.

const RETRY_MS = 5000;
const SEND_MS = 500;
const REPEAT_CODE = { off: 0, track: 1, context: 2 };
const REPEAT_NEXT = { off: "context", context: "track", track: "off" };

let socket = null;
let retry = null;
let sender = null;
const sent = new Map();
let volume = null;

const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
};

function port() {
  const value = Math.round(Number(spacetify.settings.get("port")));
  return value >= 1 && value <= 65535 ? value : 8974;
}

// Sends a field only when it changed, as the apps expect.
function put(field, value) {
  const text = String(value);
  if (sent.get(field) === text) return;
  sent.set(field, text);
  socket.send(`${field}:${text}`);
}

function report() {
  if (!socket || socket.readyState !== 1) return;
  const now = spacetify.player.state();
  const track = now && now.track;
  put("STATE", !track ? 0 : now.isPlaying ? 1 : 2);
  put("TITLE", track ? track.name : "");
  put("ARTIST", track ? track.artists.map((a) => a.name).join(", ") : "");
  put("ALBUM", track && track.album ? track.album.name : "");
  put("COVER", track && track.image && /^https:/.test(track.image) ? track.image : "");
  put("DURATION", clock(now ? now.duration : 0));
  put("POSITION", clock(now ? now.position : 0));
  if (volume !== null) put("VOLUME", Math.round(volume * 100));
  put("RATING", 0);
  put("REPEAT", now ? REPEAT_CODE[now.repeat] : 0);
  put("SHUFFLE", now && now.shuffle ? 1 : 0);
}

// "PlayPause", "SetPosition 34:12.5" (seconds, then percent), "SetVolume 50"…
async function obey(message) {
  const [command, argument = ""] = String(message).trim().split(/\s+/, 2);
  const player = spacetify.player;
  const now = player.state();
  switch (command.toLowerCase()) {
    case "playpause":
      return player.togglePlay();
    case "next":
      return player.next();
    case "previous":
      return player.previous();
    case "setposition": {
      const seconds = parseFloat(argument.split(":")[0]);
      if (Number.isFinite(seconds)) await player.seek(Math.max(0, seconds * 1000));
      return;
    }
    case "setprogress": {
      const fraction = parseFloat(argument);
      if (now && Number.isFinite(fraction)) await player.seek(Math.round(now.duration * Math.max(0, Math.min(1, fraction))));
      return;
    }
    case "setvolume": {
      const level = parseFloat(argument);
      if (Number.isFinite(level)) await player.setVolume(Math.max(0, Math.min(100, level)) / 100);
      return;
    }
    case "repeat":
      if (now) await player.setRepeat(REPEAT_NEXT[now.repeat] || "off");
      return;
    case "shuffle":
      if (now) await player.setShuffle(!now.shuffle);
      return;
    default:
      spacetify.log.info("command not handled", message);
  }
}

function connect() {
  clearTimeout(retry);
  let ws;
  try {
    ws = new WebSocket(`ws://127.0.0.1:${port()}/`);
  } catch (error) {
    spacetify.log.warn("cannot open the connection", error);
    retry = setTimeout(connect, RETRY_MS);
    return;
  }
  socket = ws;
  ws.addEventListener("open", () => {
    sent.clear();
    ws.send("PLAYER:Spotify");
    report();
    clearInterval(sender);
    sender = setInterval(report, SEND_MS);
  });
  ws.addEventListener("message", (event) => {
    Promise.resolve(obey(event.data)).catch((error) => spacetify.log.warn("command failed", event.data, error));
  });
  ws.addEventListener("close", () => {
    clearInterval(sender);
    if (socket === ws) {
      socket = null;
      retry = setTimeout(connect, RETRY_MS);
    }
  });
  // An error is followed by "close": nothing more to do here.
  ws.addEventListener("error", () => {});
}

spacetify.player.ready().then(() => {
  spacetify.player.getVolume().then((v) => (volume = v), () => {});
  spacetify.player.onVolumeChange((v) => (volume = v));
  connect();
});

spacetify.settings.onChange((name) => {
  if (name !== "port" || !socket) return;
  const old = socket;
  socket = null;
  old.close();
  connect();
});
