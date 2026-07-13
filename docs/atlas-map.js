/**
 * Real-world atlas map via Leaflet + OpenStreetMap / Carto tiles.
 * Vendored from https://github.com/Leaflet/Leaflet (BSD-2-Clause).
 * No Google API key required.
 */

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

/** Keyword → [lat, lon] — longer keys win via sort at lookup */
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

function pinColor(op) {
  if (op.open_to_non_hk_residents === false || op.status === "closed_to_you") return "#8b2e2e";
  if (op.status === "verify_annually") return "#9a6b1f";
  if (op.funding_level === "fully_funded" || op.funding_level === "mostly_funded") return "#0f6b5c";
  return "#c45c26";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureLeaflet() {
  if (typeof window === "undefined" || !window.L) {
    throw new Error("Leaflet failed to load — check docs/vendor/leaflet/");
  }
  const L = window.L;
  // Point default icons at vendored assets (path relative to site root /docs)
  L.Icon.Default.mergeOptions({
    iconUrl: "./vendor/leaflet/images/marker-icon.png",
    iconRetinaUrl: "./vendor/leaflet/images/marker-icon-2x.png",
    shadowUrl: "./vendor/leaflet/images/marker-shadow.png",
  });
  return L;
}

function makeDivIcon(L, op, active) {
  const color = pinColor(op);
  return L.divIcon({
    className: `fta-pin${active ? " is-active" : ""}`,
    html: `<span class="fta-pin-dot" style="--pin:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function ensureMap(stage) {
  const L = ensureLeaflet();
  if (stage._ftaMap) return stage._ftaMap;

  stage.innerHTML = "";
  const map = L.map(stage, {
    worldCopyJump: true,
    minZoom: 1,
    maxZoom: 12,
    zoomControl: true,
    attributionControl: true,
  }).setView([28, 55], 2);

  // Warm, readable basemap (Carto Voyager) with OSM fallback attribution
  const voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 12,
  });
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 12,
  });

  // Prefer Voyager; if tiles error heavily, OSM is available via layers control
  voyager.addTo(map);
  L.control.layers(
    { "Atlas (Carto)": voyager, "OpenStreetMap": osm },
    {},
    { position: "topright", collapsed: true },
  ).addTo(map);

  const cluster = L.markerClusterGroup
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 42,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 7,
      })
    : L.layerGroup();
  map.addLayer(cluster);

  const state = {
    map,
    cluster,
    markersById: {},
    listSig: "",
    onSelect: null,
  };
  stage._ftaMap = state;

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(stage);
    stage._ftaRo = ro;
  }

  // After gift overlay closes, layout often changes — refresh tiles
  document.addEventListener("fta:gift-closed", () => {
    setTimeout(() => map.invalidateSize({ animate: false }), 80);
  });
  document.addEventListener("fta:layout-changed", () => {
    setTimeout(() => map.invalidateSize({ animate: false }), 40);
  });

  return state;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.root
 * @param {object[]} opts.list
 * @param {string|null} opts.selectedId
 * @param {(op: object) => string[]} opts.regionsFor
 * @param {(id: string) => void} opts.onSelect
 */
export function renderAtlasMap({ root, list, selectedId, regionsFor, onSelect }) {
  if (!root) return;

  const countEl = root.querySelector("[data-map-count]");
  if (countEl) countEl.textContent = String(list.length);

  const stage = root.querySelector("[data-map-stage]");
  if (!stage) return;

  let state;
  try {
    state = ensureMap(stage);
  } catch (err) {
    stage.innerHTML = `<p class="atlas-fallback">${escapeHtml(err.message)}</p>`;
    return;
  }

  const L = window.L;
  state.onSelect = onSelect;

  // Rebuild markers when the filtered set changes
  const listSig = list.map((o) => o.id).sort().join("|");
  const selectionChanged = state.selectedId !== selectedId;
  state.selectedId = selectedId;

  if (listSig !== state.listSig) {
    state.listSig = listSig;
    state.cluster.clearLayers();
    state.markersById = {};

    const bounds = [];
    for (const op of list) {
      const { lat, lon, label } = coordsForOpportunity(op, regionsFor);
      const active = op.id === selectedId;
      const marker = L.marker([lat, lon], {
        icon: makeDivIcon(L, op, active),
        title: op.name,
        riseOnHover: true,
      });
      const dest = (op.destinations || []).slice(0, 3).join(" · ") || label;
      marker.bindPopup(
        `<div class="fta-popup">
          <strong>${escapeHtml(op.name)}</strong>
          <span>${escapeHtml(dest)}</span>
          <button type="button" class="fta-popup-open" data-id="${escapeHtml(op.id)}">Open briefing</button>
        </div>`,
        { closeButton: true, maxWidth: 240 },
      );
      marker.on("click", () => {
        if (typeof state.onSelect === "function") state.onSelect(op.id);
      });
      marker.on("popupopen", () => {
        const btn = [...document.querySelectorAll(".fta-popup-open")]
          .find((el) => el.getAttribute("data-id") === op.id);
        btn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof state.onSelect === "function") state.onSelect(op.id);
        }, { once: true });
      });
      state.cluster.addLayer(marker);
      state.markersById[op.id] = marker;
      bounds.push([lat, lon]);
    }

    if (bounds.length) {
      try {
        state.map.fitBounds(bounds, { padding: [28, 28], maxZoom: 4, animate: false });
      } catch {
        state.map.setView([28, 55], 2);
      }
    } else {
      state.map.setView([28, 55], 2);
    }
  } else if (selectionChanged) {
    // Refresh active pin styling without rebuilding clusters
    for (const [id, marker] of Object.entries(state.markersById)) {
      const op = list.find((o) => o.id === id);
      if (!op) continue;
      marker.setIcon(makeDivIcon(L, op, id === selectedId));
    }
  }

  queueMicrotask(() => state.map.invalidateSize({ animate: false }));

  if (selectedId && state.markersById[selectedId]) {
    const marker = state.markersById[selectedId];
    // Zoom into cluster if needed, then open popup
    if (state.cluster.zoomToShowLayer) {
      state.cluster.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    } else {
      state.map.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }
}
