/** Interactive equirectangular atlas for Merey's Free Travel Atlas */

const REGION_COORDS = {
  "Hong Kong": [22.3, 114.2],
  "Mainland China": [35.0, 105.0],
  "East Asia": [36.0, 138.0],
  "Southeast Asia": [1.35, 103.8],
  "Europe": [50.0, 10.0],
  "North America": [40.0, -95.0],
  "Middle East": [24.5, 46.5],
  "Central Asia": [48.0, 68.0],
  "Global / Other": [8.0, -20.0],
};

/** Keyword → [lat, lon] — first match wins (more specific keys first via length sort at lookup) */
const PLACE_COORDS = {
  "hong kong": [22.3, 114.2],
  hkust: [22.34, 114.26],
  hku: [22.28, 114.14],
  cuhk: [22.42, 114.21],
  beijing: [39.9, 116.4],
  shanghai: [31.2, 121.5],
  shenzhen: [22.55, 114.05],
  tsinghua: [40.0, 116.3],
  "xi'an": [34.3, 108.9],
  xian: [34.3, 108.9],
  dunhuang: [40.1, 94.7],
  gansu: [36.0, 103.8],
  guangxi: [23.0, 108.3],
  qingdao: [36.07, 120.38],
  "xiong'an": [39.0, 116.1],
  "macha village": [35.5, 105.0],
  gba: [22.8, 113.5],
  mainland: [35.0, 105.0],
  china: [35.0, 105.0],
  taiwan: [23.7, 121.0],
  tokyo: [35.68, 139.69],
  kyoto: [35.01, 135.77],
  okinawa: [26.21, 127.68],
  sendai: [38.27, 140.87],
  tsukuba: [36.08, 140.08],
  japan: [36.2, 138.25],
  seoul: [37.57, 126.98],
  busan: [35.18, 129.08],
  korea: [36.5, 127.9],
  singapore: [1.35, 103.82],
  nus: [1.3, 103.78],
  "kuala lumpur": [3.14, 101.69],
  malaysia: [4.2, 101.98],
  "ho chi minh": [10.82, 106.63],
  vietnam: [14.0, 108.0],
  thailand: [15.0, 101.0],
  manila: [14.6, 121.0],
  asean: [4.0, 110.0],
  indonesia: [-2.0, 118.0],
  laos: [19.9, 102.5],
  nepal: [28.4, 84.1],
  india: [22.0, 79.0],
  australia: [-25.0, 134.0],
  lausanne: [46.52, 6.63],
  geneva: [46.2, 6.15],
  zurich: [47.38, 8.54],
  switzerland: [46.8, 8.2],
  berlin: [52.52, 13.4],
  heidelberg: [49.4, 8.67],
  munich: [48.14, 11.58],
  tum: [48.15, 11.57],
  germany: [51.2, 10.4],
  paris: [48.86, 2.35],
  france: [46.6, 2.4],
  spain: [40.4, -3.7],
  italy: [42.5, 12.5],
  denmark: [56.0, 10.0],
  dtu: [55.79, 12.52],
  hungary: [47.16, 19.5],
  morocco: [31.8, -7.1],
  london: [51.5, -0.12],
  leeds: [53.8, -1.55],
  cheltenham: [51.9, -2.08],
  ashridge: [51.8, -0.57],
  oxbridge: [51.75, -1.25],
  imperial: [51.5, -0.18],
  ucl: [51.52, -0.13],
  uk: [53.0, -1.5],
  "united kingdom": [53.0, -1.5],
  europe: [50.0, 10.0],
  eu: [50.0, 10.0],
  canada: [56.0, -96.0],
  queen: [44.23, -76.5],
  pasadena: [34.15, -118.14],
  boston: [42.36, -71.06],
  virginia: [37.5, -78.5],
  "new york": [40.71, -74.0],
  "san francisco": [37.77, -122.42],
  "united states": [39.8, -98.5],
  usa: [39.8, -98.5],
  us: [39.8, -98.5],
  america: [39.8, -98.5],
  uiuc: [40.1, -88.23],
  thuwal: [22.3, 39.1],
  kaust: [22.3, 39.1],
  saudi: [23.9, 45.1],
  rehovot: [31.89, 34.81],
  israel: [31.5, 34.75],
  astana: [51.17, 71.45],
  burabai: [53.08, 70.28],
  kazakhstan: [48.0, 67.0],
  uzbekistan: [41.4, 64.6],
  kyrgyz: [41.2, 74.8],
  azerbaijan: [40.1, 47.6],
  türkiye: [39.0, 35.0],
  turkey: [39.0, 35.0],
  "cape town": [-33.92, 18.42],
  "belt & road": [35.0, 80.0],
  worldwide: [12.0, 20.0],
  global: [12.0, 20.0],
  overseas: [15.0, 30.0],
  rotating: [10.0, 0.0],
  congress: [15.0, 25.0],
  "host city": [15.0, 25.0],
  "meeting city": [15.0, 25.0],
  "world final": [20.0, 0.0],
  championship: [20.0, 0.0],
  remote: [25.0, -40.0],
};

const VIEW_W = 1000;
const VIEW_H = 500;

export function project(lat, lon) {
  const x = ((Number(lon) + 180) / 360) * VIEW_W;
  const y = ((90 - Number(lat)) / 180) * VIEW_H;
  return [x, y];
}

function coordsFromText(text) {
  const s = String(text || "").toLowerCase();
  if (!s || s === "n/a" || s.includes("award for past")) return null;
  const keys = Object.keys(PLACE_COORDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (s.includes(key)) return PLACE_COORDS[key];
  }
  return null;
}

export function coordsForOpportunity(op, regionsForFn) {
  const dests = op.destinations || [];
  for (const d of dests) {
    const c = coordsFromText(d);
    if (c) return { lat: c[0], lon: c[1], label: d };
  }
  const regions = regionsForFn(op);
  const region = regions[0] || "Global / Other";
  const fallback = REGION_COORDS[region] || REGION_COORDS["Global / Other"];
  return { lat: fallback[0], lon: fallback[1], label: region };
}

function jitter(id, i, n) {
  // Stable small spread so stacked pins remain clickable
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
  const angle = ((h % 360) + i * (360 / Math.max(n, 1))) * (Math.PI / 180);
  const r = 6 + (n > 1 ? 10 : 0) + (Math.abs(h) % 5);
  return [Math.cos(angle) * r, Math.sin(angle) * r * 0.7];
}

const LAND_PATHS = `
  <path class="land" d="M185 118c22-18 48-28 78-26 18 1 34 10 48 22 12 10 28 14 44 10 20-5 38 4 48 20 8 14 4 32-6 44-14 16-36 22-56 18-22-4-40 6-48 26-6 14-20 22-36 20-24-2-40-22-38-46 2-18-8-34-24-42-16-8-26-26-10-40z"/>
  <path class="land" d="M268 210c28-8 56-4 80 12 18 12 40 14 60 6 22-8 46-2 58 16 10 16 6 38-8 50-20 18-48 20-72 10-16-6-34-2-46 10-14 14-36 16-52 4-18-14-22-40-10-58 8-12 4-28-10-34-12-6-14-22 0-30 8-4 16-2 20 4z"/>
  <path class="land" d="M470 95c40-20 90-24 132-8 28 10 58 8 84-4 22-10 48-6 64 10 18 18 14 48-6 62-24 16-54 12-78-2-16-10-36-8-50 4-18 16-46 18-66 4-12-8-28-8-40 0-20 12-46 8-60-10-12-16-8-40 6-52 4-4 10-6 14-4z"/>
  <path class="land" d="M520 175c36-6 70 8 90 36 14 20 40 28 64 22 26-6 52 8 58 34 4 20-8 40-26 48-28 12-60 4-82-14-14-12-34-14-50-4-22 12-50 8-66-12-12-16-10-40 4-54 8-8 6-22-2-30-10-10-4-28 10-26z"/>
  <path class="land" d="M620 250c24-14 54-10 74 8 16 14 40 16 58 4 20-12 46-6 56 14 8 18-2 38-18 46-22 12-48 6-66-8-12-10-30-10-42 0-18 14-44 12-58-4-10-12-8-32 4-42 6-6 4-18-2-24-8-8-2-22 12-18 6 2 14 2 18 4z"/>
  <path class="land" d="M700 150c30-16 68-18 100 0 22 12 50 10 70-4 16-12 40-10 52 6 14 18 6 44-12 56-24 16-56 12-78-4-14-10-34-8-46 6-16 18-46 20-64 2-10-10-26-12-38-2-16 12-40 6-46-14-4-16 6-34 22-40 8-4 18-2 24 4 6 6 16 4 16-4z"/>
  <path class="land" d="M780 220c22-10 48-6 64 10 12 12 32 14 46 4 18-12 42-6 50 14 6 16-4 34-20 40-20 8-42 0-54-14-8-10-22-12-34-4-16 10-38 8-48-8-8-12-4-30 8-38 6-4 12-2 16 2 4 4 12 2 12-4z"/>
  <path class="land" d="M160 280c18-22 48-30 76-20 20 8 44 4 58-12 12-14 34-16 50-4 14 10 34 8 44-6 12-16 36-18 50-2 10 12 28 14 40 4 16-12 40-8 48 10 6 14-2 30-16 36-20 10-44 2-56-14-8-10-22-12-34-4-18 12-42 10-56-4-8-8-22-8-30 0-14 12-36 10-46-4-6-8-18-10-28-2-16 12-40 8-50-8-6-10-2-26 10-30 4-2 8 0 10 4z"/>
  <path class="land" d="M480 320c28-18 66-16 92 6 18 14 44 16 64 2 16-10 38-8 48 8 8 14-2 32-16 38-22 10-48 2-62-14-10-10-26-10-36 0-16 14-42 12-54-4-8-10-22-12-32-2-14 12-36 8-42-8-4-12 4-26 16-30 6-2 14 0 22 4z"/>
  <path class="land" d="M820 340c20-14 48-12 66 4 12 12 32 12 44 0 14-12 36-8 42 8 4 14-6 28-20 32-18 6-38-2-48-16-6-8-18-10-28-2-12 8-30 6-36-8-4-10 2-24 12-28 4-2 10 0 14 4 4 4 10 2 10-4z"/>
  <path class="land" d="M250 360c16-10 38-8 50 6 10 12 28 12 38 0 12-12 32-10 40 4 6 12-2 26-14 30-16 6-34-2-42-16-4-8-14-10-22-2-10 8-26 6-30-6-2-8 4-18 12-20 4-2 8 0 12 4 4 4 10 2 10-4z"/>
`;

function fundingClass(level) {
  if (level === "fully_funded" || level === "mostly_funded") return "fund-strong";
  if (level === "partial" || level === "prize") return "fund-mid";
  return "fund-soft";
}

function statusClass(op) {
  if (op.open_to_non_hk_residents === false || op.status === "closed_to_you") return "pin-trap";
  if (op.status === "verify_annually") return "pin-verify";
  return "pin-open";
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root
 * @param {object[]} opts.list filtered opportunities
 * @param {string|null} opts.selectedId
 * @param {(op: object) => string[]} opts.regionsFor
 * @param {(id: string) => void} opts.onSelect
 */
export function renderAtlasMap({ root, list, selectedId, regionsFor, onSelect }) {
  if (!root) return;

  const groups = new Map();
  for (const op of list) {
    const { lat, lon, label } = coordsForOpportunity(op, regionsFor);
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, { lat, lon, label, ops: [] });
    groups.get(key).ops.push(op);
  }

  const pins = [...groups.values()];
  const countEl = root.querySelector("[data-map-count]");
  if (countEl) countEl.textContent = String(list.length);

  const stage = root.querySelector("[data-map-stage]");
  if (!stage) return;

  stage.innerHTML = `
    <svg class="atlas-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="World map of funded travel opportunities">
      <defs>
        <radialGradient id="oceanGlow" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="rgba(15,107,92,0.18)"/>
          <stop offset="100%" stop-color="rgba(26,34,24,0.04)"/>
        </radialGradient>
        <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect class="ocean" width="${VIEW_W}" height="${VIEW_H}" fill="url(#oceanGlow)"/>
      <g class="graticule" aria-hidden="true">
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const x = (i / 6) * VIEW_W;
          return `<line x1="${x}" y1="0" x2="${x}" y2="${VIEW_H}"/>`;
        }).join("")}
        ${[0, 1, 2, 3, 4].map((i) => {
          const y = (i / 4) * VIEW_H;
          return `<line x1="0" y1="${y}" x2="${VIEW_W}" y2="${y}"/>`;
        }).join("")}
      </g>
      <g class="continents" aria-hidden="true">${LAND_PATHS}</g>
      <g class="pins">
        ${pins.map((group) => {
          const [bx, by] = project(group.lat, group.lon);
          return group.ops.map((op, i) => {
            const [dx, dy] = jitter(op.id, i, group.ops.length);
            const x = bx + dx;
            const y = by + dy;
            const active = op.id === selectedId ? "is-active" : "";
            const title = escapeAttr(op.name);
            return `<g class="pin ${statusClass(op)} ${fundingClass(op.funding_level)} ${active}" data-id="${escapeAttr(op.id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="button" aria-label="${title}">
              <title>${title} — ${escapeAttr(group.label)}</title>
              <circle class="pin-halo" r="10"/>
              <circle class="pin-dot" r="4.5" filter="url(#pinShadow)"/>
              ${group.ops.length > 1 && i === 0 ? `<text class="pin-count" y="-12" text-anchor="middle">${group.ops.length}</text>` : ""}
            </g>`;
          }).join("");
        }).join("")}
      </g>
    </svg>
    <div class="atlas-tooltip" data-map-tooltip hidden></div>
    <div class="atlas-stack" data-map-stack hidden></div>
  `;

  const tooltip = stage.querySelector("[data-map-tooltip]");
  const stack = stage.querySelector("[data-map-stack]");

  const showTip = (el, op) => {
    if (!tooltip || !op) return;
    const dest = (op.destinations || []).slice(0, 2).join(" · ") || "Various";
    tooltip.hidden = false;
    tooltip.innerHTML = `<strong>${escapeHtml(op.name)}</strong><span>${escapeHtml(dest)}</span>`;
    const rect = stage.getBoundingClientRect();
    const pinRect = el.getBoundingClientRect();
    const left = Math.min(rect.width - 180, Math.max(8, pinRect.left - rect.left - 60));
    const top = Math.max(8, pinRect.top - rect.top - 52);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const hideTip = () => {
    if (tooltip) tooltip.hidden = true;
  };

  stage.querySelectorAll(".pin").forEach((el) => {
    const id = el.getAttribute("data-id");
    const op = list.find((o) => o.id === id);
    el.addEventListener("mouseenter", () => showTip(el, op));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", () => showTip(el, op));
    el.addEventListener("blur", hideTip);
    el.addEventListener("click", (e) => {
      e.preventDefault();
      hideTip();
      // If several pins share nearly the same spot, offer a mini list
      const group = pins.find((g) => g.ops.some((o) => o.id === id));
      if (group && group.ops.length > 1 && stack) {
        stack.hidden = false;
        stack.innerHTML = `
          <p class="atlas-stack-label">${escapeHtml(group.label)} · ${group.ops.length} routes</p>
          <ul>
            ${group.ops.map((o) => `
              <li><button type="button" data-pick="${escapeAttr(o.id)}" class="${o.id === selectedId ? "on" : ""}">${escapeHtml(o.name)}</button></li>
            `).join("")}
          </ul>
          <button type="button" class="linkish" data-stack-close>Close</button>
        `;
        stack.querySelectorAll("[data-pick]").forEach((btn) => {
          btn.addEventListener("click", () => {
            stack.hidden = true;
            onSelect(btn.getAttribute("data-pick"));
          });
        });
        stack.querySelector("[data-stack-close]")?.addEventListener("click", () => {
          stack.hidden = true;
        });
        return;
      }
      onSelect(id);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  // Pan selected pin into view psychologically via scrollIntoView on SVG group
  const active = stage.querySelector(".pin.is-active");
  if (active && typeof active.scrollIntoView === "function") {
    try { active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } catch { /* ignore */ }
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}
