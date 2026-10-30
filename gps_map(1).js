const R = 6371000;
const COLORS = { grid: "#55556a", text: "#a0a0b5", you: "#4facfe", robot: "#ff8a57", ink: "#ffffff" };
const cv = document.getElementById("plot");
const $ = id => document.getElementById(id);
let me = null, robot = null, manual = false, geoNote = "", watchId = null;

function offsets(a, b) {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const north = dLat * R;
  const east = dLon * R * Math.cos(a.lat * Math.PI / 180);
  return { east, north, dist: Math.hypot(east, north),
           bearing: (Math.atan2(east, north) * 180 / Math.PI + 360) % 360 };
}

const fmt = d => d < 1000 ? d.toFixed(d < 10 ? 1 : 0) + " m" : (d / 1000).toFixed(2) + " km";
const compass = b => ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(b / 45) % 8];

function niceRange(d) {
  const r = Math.max(d * 1.25, 10), p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function draw(o) {
  const css = cv.clientWidth, dpr = window.devicePixelRatio || 1;
  if (!css) return;
  if (cv.width !== Math.round(css * dpr)) { cv.width = cv.height = Math.round(css * dpr); }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, css, css);
  const c = css / 2, rad = c - 30, range = niceRange(o ? o.dist : 0), k = rad / range;
  ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
  ctx.strokeStyle = COLORS.grid; ctx.fillStyle = COLORS.text; ctx.lineWidth = 1;
  [0.5, 1].forEach(f => {
    ctx.beginPath(); ctx.arc(c, c, rad * f, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillText(fmt(range * f), c + 4, c - rad * f + 14);
  });
  ctx.beginPath();
  ctx.moveTo(c, c - rad); ctx.lineTo(c, c + rad);
  ctx.moveTo(c - rad, c); ctx.lineTo(c + rad, c);
  ctx.stroke();
  ctx.fillStyle = COLORS.ink; ctx.textAlign = "center"; ctx.fillText("N", c, 16); ctx.textAlign = "start";
  ctx.fillStyle = COLORS.you; ctx.beginPath(); ctx.arc(c, c, 6, 0, 2 * Math.PI); ctx.fill();
  ctx.fillText("You", c + 10, c + 16);
  if (o) {
    const x = c + o.east * k, y = c - o.north * k;
    ctx.strokeStyle = COLORS.robot; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(x, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.robot; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText("Robot", x + 12, y + 4);
  }
}

function render() {
  const live = robot && robot.fix && me;
  const o = live ? offsets(me, robot) : null;
  if (!me) {
    $("readout").textContent = "Set your position";
    $("sub").textContent = geoNote || "Waiting for this device's location.";
  } else if (!robot || !robot.fix) {
    $("readout").textContent = "Waiting for the robot's GPS";
    $("sub").textContent = robot ? "No satellite fix yet. Try a spot with a clear view of the sky." : "Can't reach the robot.";
  } else {
    $("readout").textContent = fmt(o.dist) + " from you";
    $("sub").textContent = Math.abs(o.east).toFixed(0) + " m " + (o.east >= 0 ? "east" : "west") + ", " +
      Math.abs(o.north).toFixed(0) + " m " + (o.north >= 0 ? "north" : "south") +
      ". The robot is to your " + compass(o.bearing) + " (bearing " + o.bearing.toFixed(0) + "\u00b0).";
  }
  $("robotStatus").textContent = !robot ? "Can't reach the robot" :
    (robot.fix ? "Fix, " + robot.sats + " satellites, updated " + robot.age + " s ago"
               : "No fix, " + robot.sats + " satellites seen") +
    (robot.simulated ? " (simulated data)" : "");
  $("meStatus").textContent = !me ? "Not set" : me.source + (me.acc ? ", accuracy about " + Math.round(me.acc) + " m" : "");
  $("warn").textContent = (o && me.acc && me.acc > o.dist)
    ? "Your location accuracy is larger than this distance, so treat the reading as approximate." : "";
  $("chip").textContent = o ? fmt(o.dist) : "";
  draw(o);
}

function startGeo() {
  manual = false;
  if (!window.isSecureContext) {
    geoNote = "Browsers block device location on plain http pages. Set your position below instead.";
    render(); return;
  }
  if (!navigator.geolocation) { geoNote = "This browser can't share its location."; render(); return; }
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(p => {
    if (manual) return;
    me = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, source: "This device's location" };
    render();
  }, e => {
    geoNote = "Location was not shared (" + e.message + "). Set your position below.";
    render();
  }, { enableHighAccuracy: true, maximumAge: 5000 });
}

$("useDevice").onclick = startGeo;
$("useRobot").onclick = () => {
  if (robot && robot.fix) {
    manual = true;
    me = { lat: robot.lat, lon: robot.lon, acc: 0, source: "Robot's position when you tapped" };
    render();
  }
};
$("setManual").onclick = () => {
  const lat = parseFloat($("latIn").value), lon = parseFloat($("lonIn").value);
  if (isFinite(lat) && isFinite(lon)) { manual = true; me = { lat, lon, acc: 0, source: "Set by you" }; render(); }
};

async function poll() {
  try { robot = await (await fetch("/gps", { cache: "no-store" })).json(); }
  catch (e) { robot = null; }
  render();
}

const modal = $("gpsModal");
const openGps = () => { modal.hidden = false; render(); };
const closeGps = () => { modal.hidden = true; };
$("openGps").onclick = openGps;
$("closeGps").onclick = closeGps;
modal.addEventListener("click", e => { if (e.target === modal) closeGps(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeGps(); });

window.addEventListener("resize", render);
startGeo();
poll();
setInterval(poll, 1000);
