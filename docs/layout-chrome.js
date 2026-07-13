/**
 * Desktop workspace chrome: map placement modes + drag-resize columns/map height.
 * Prefs persist in localStorage.
 */

const LAYOUT_KEY = "fta.layout.v1";

const DEFAULTS = {
  mapPos: "top", // top | bottom | side | hidden
  filtersW: 250,
  detailW: 380,
  mapH: 300,
  mapSideW: 420,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}

function pingMap() {
  document.dispatchEvent(new CustomEvent("fta:layout-changed"));
}

/**
 * @returns {{ prefs: object, apply: Function }}
 */
export function initLayoutChrome() {
  const workspace = document.getElementById("workspace");
  const layout = document.getElementById("mainLayout");
  const atlas = document.getElementById("atlasPanel");
  if (!workspace || !layout || !atlas) {
    return { prefs: { ...DEFAULTS }, apply() {} };
  }

  const prefs = loadPrefs();

  const apply = () => {
    workspace.dataset.mapPos = prefs.mapPos;
    workspace.style.setProperty("--filters-w", `${prefs.filtersW}px`);
    workspace.style.setProperty("--detail-w", `${prefs.detailW}px`);
    workspace.style.setProperty("--map-h", `${prefs.mapH}px`);
    workspace.style.setProperty("--map-side-w", `${prefs.mapSideW}px`);

    document.querySelectorAll("[data-map-pos]").forEach((btn) => {
      btn.classList.toggle("on", btn.getAttribute("data-map-pos") === prefs.mapPos);
    });

    // Move atlas DOM so keyboard/source order matches visual placement on mobile too
    const toolbar = document.getElementById("layoutToolbar");
    const mapResizer = document.getElementById("mapResizer");
    if (prefs.mapPos === "bottom") {
      workspace.appendChild(mapResizer);
      workspace.appendChild(atlas);
    } else if (prefs.mapPos === "hidden") {
      // keep in place; CSS hides
      if (toolbar && atlas.previousElementSibling !== toolbar) {
        toolbar.after(atlas);
        atlas.after(mapResizer);
      }
    } else {
      // top or side: atlas before main columns
      if (toolbar) {
        toolbar.after(atlas);
        atlas.after(mapResizer);
      }
    }

    savePrefs(prefs);
    queueMicrotask(pingMap);
    setTimeout(pingMap, 120);
  };

  document.querySelectorAll("[data-map-pos]").forEach((btn) => {
    btn.addEventListener("click", () => {
      prefs.mapPos = btn.getAttribute("data-map-pos");
      apply();
    });
  });

  document.getElementById("resetLayoutBtn")?.addEventListener("click", () => {
    Object.assign(prefs, DEFAULTS);
    apply();
  });

  // Vertical resize (map height) when map is top/bottom
  const mapResizer = document.getElementById("mapResizer");
  if (mapResizer) {
    mapResizer.addEventListener("pointerdown", (e) => {
      if (prefs.mapPos !== "top" && prefs.mapPos !== "bottom") return;
      e.preventDefault();
      mapResizer.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startH = prefs.mapH;
      const growingDown = prefs.mapPos === "top";

      const onMove = (ev) => {
        const dy = ev.clientY - startY;
        prefs.mapH = clamp(startH + (growingDown ? dy : -dy), 160, 640);
        workspace.style.setProperty("--map-h", `${prefs.mapH}px`);
        pingMap();
      };
      const onUp = () => {
        mapResizer.releasePointerCapture(e.pointerId);
        mapResizer.removeEventListener("pointermove", onMove);
        mapResizer.removeEventListener("pointerup", onUp);
        savePrefs(prefs);
        pingMap();
      };
      mapResizer.addEventListener("pointermove", onMove);
      mapResizer.addEventListener("pointerup", onUp);
    });
  }

  // Column resizers
  layout.querySelectorAll("[data-resize]").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const kind = handle.getAttribute("data-resize");
      const startX = e.clientX;
      const startFilters = prefs.filtersW;
      const startDetail = prefs.detailW;
      const startSide = prefs.mapSideW;
      document.body.classList.add("is-resizing");

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        if (kind === "filters") {
          prefs.filtersW = clamp(startFilters + dx, 180, 420);
          workspace.style.setProperty("--filters-w", `${prefs.filtersW}px`);
        } else if (kind === "detail") {
          prefs.detailW = clamp(startDetail - dx, 260, 560);
          workspace.style.setProperty("--detail-w", `${prefs.detailW}px`);
        } else if (kind === "map-side") {
          prefs.mapSideW = clamp(startSide - dx, 280, 640);
          workspace.style.setProperty("--map-side-w", `${prefs.mapSideW}px`);
          pingMap();
        }
      };
      const onUp = () => {
        document.body.classList.remove("is-resizing");
        handle.releasePointerCapture(e.pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        savePrefs(prefs);
        pingMap();
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  });

  // Side-map resizer lives on workspace
  document.getElementById("sideMapResizer")?.addEventListener("pointerdown", (e) => {
    if (prefs.mapPos !== "side") return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startSide = prefs.mapSideW;
    document.body.classList.add("is-resizing");
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      prefs.mapSideW = clamp(startSide - dx, 280, 640);
      workspace.style.setProperty("--map-side-w", `${prefs.mapSideW}px`);
      pingMap();
    };
    const onUp = () => {
      document.body.classList.remove("is-resizing");
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      savePrefs(prefs);
      pingMap();
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });

  apply();
  return { prefs, apply };
}
