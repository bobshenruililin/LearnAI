import { renderAtlasMap } from "./atlas-map.js";
import { initLayoutChrome } from "./layout-chrome.js";

const STORAGE_KEY = "fta.v1";
const GIFT_OPENED_KEY = "fta.gift.opened.v2";
const GIFT_EXPLORER_KEY = "fta.gift.explorer";
const SHORTLIST_STATUSES = ["Interested", "Drafting", "Applied", "Outcome"];
const REGIONS = [
  "Hong Kong",
  "Mainland China",
  "East Asia",
  "Southeast Asia",
  "Europe",
  "North America",
  "Middle East",
  "Central Asia",
  "Global / Other",
];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MEREY_NOTES = [
  "Merey: Berlin is closer than it looks once Laidlaw is on the wall.",
  "Merey Yeskara — every pin here is a passport page waiting to happen.",
  "The envy list was a map of someone else’s yeses. This atlas is yours.",
  "Mandarin can wait until after coffee. The application window might not.",
  "Gansu, Valencia, London — pick a stamp, then reverse-engineer the funding.",
  "Smart enough to learn the languages. Stubborn enough to ship the apps.",
  "Click a route. Leave a note for future Merey. She’ll thank you.",
];

const state = {
  data: null,
  status: null,
  view: "cards",
  selectedId: null,
  activeTags: [],
  activeRegion: null,
  shortlist: {},
  compareIds: [],
  showShortlist: false,
  secretStampFound: false,
  firstPinToasted: false,
  noteIndex: 0,
  presets: {
    forMerey: true,
    fit: true,
    nonHk: true,
    kz: false,
    full: false,
    soon: false,
    showTraps: false,
  },
};

const FUNDING_RANK = {
  fully_funded: 5,
  mostly_funded: 4,
  partial: 3,
  prize: 2,
  unpaid_but_free: 1,
};

const MONTH_MAP = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.shortlist = parsed.shortlist || {};
    state.compareIds = Array.isArray(parsed.compareIds) ? parsed.compareIds.slice(0, 3) : [];
  } catch {
    /* ignore corrupt storage */
  }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    shortlist: state.shortlist,
    compareIds: state.compareIds,
  }));
}

function parseWindow(op) {
  const text = `${op.apply_window || ""} ${op.next_deadline_hint || ""}`.toLowerCase();
  const rolling = /rolling|year-round|throughout|anytime|n\/a|ineligible|never/.test(text);
  const months = [];
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (text.includes(name)) months.push(num);
  }
  const unique = [...new Set(months)].sort((a, b) => a - b);
  let startMonth = null;
  let endMonth = null;
  let deadlineMonth = null;

  // Range like Nov–Feb or Nov-Feb
  const range2 = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[–\-—/]\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
  if (range2) {
    const a = Object.keys(MONTH_MAP).find((k) => range2[1].toLowerCase().startsWith(k.slice(0, 3)));
    const b = Object.keys(MONTH_MAP).find((k) => range2[2].toLowerCase().startsWith(k.slice(0, 3)));
    startMonth = a ? MONTH_MAP[a] : null;
    endMonth = b ? MONTH_MAP[b] : null;
  }

  if (startMonth == null && unique.length) {
    startMonth = unique[0];
    endMonth = unique.length > 1 ? unique[unique.length - 1] : unique[0];
  }
  if (unique.length) deadlineMonth = unique[unique.length - 1];
  if (op.next_deadline_hint) {
    const hint = op.next_deadline_hint.toLowerCase();
    const dm = Object.keys(MONTH_MAP).find((m) => hint.includes(m));
    if (dm) deadlineMonth = MONTH_MAP[dm];
  }

  return { startMonth, endMonth, deadlineMonth, rolling: rolling && !startMonth };
}

function normalizeRegion(dest) {
  const s = String(dest || "").toLowerCase();
  if (!s || s === "n/a" || s.includes("various")) return "Global / Other";
  if (s.includes("hong kong") || /\(hkust\)|\(cuhk\)/.test(s)) return "Hong Kong";
  if (s.includes("taiwan") || s.includes("japan") || s.includes("korea") || s.includes("tokyo") || s.includes("seoul") || s.includes("okinawa") || s.includes("sendai") || s.includes("kyoto") || s.includes("tsukuba")) return "East Asia";
  if (s.includes("singapore") || s.includes("malaysia") || s.includes("vietnam") || s.includes("thailand") || s.includes("indonesia") || s.includes("hcmc") || s.includes("ho chi minh") || s.includes("kuala lumpur") || s.includes("asean") || s.includes("manila")) return "Southeast Asia";
  if (s.includes("mainland") || s.includes("gansu") || s.includes("guangxi") || s.includes("dunhuang") || s.includes("xi'an") || s.includes("beijing") || s.includes("shanghai") || s.includes("shenzhen") || s.includes("gba") || s.includes("qinghai") || (s.includes("china") && !s.includes("hong kong"))) return "Mainland China";
  if (s.includes("uk") || s.includes("europe") || s.includes("switzerland") || s.includes("france") || s.includes("germany") || s.includes("denmark") || s.includes("spain") || s.includes("italy") || s.includes("lausanne") || s.includes("geneva") || s.includes("berlin") || s.includes("paris") || s.includes("london") || s.includes("heidelberg") || s.includes("cheltenham") || s.includes("mallorca")) return "Europe";
  if (s.includes("canada") || s.includes("usa") || s.includes("united states") || s.includes("america") || s.includes("pasadena") || s.includes("virginia") || s.includes("boston")) return "North America";
  if (s.includes("saudi") || s.includes("israel") || s.includes("kaust") || s.includes("middle east") || s.includes("rehovot")) return "Middle East";
  if (s.includes("kazakhstan") || s.includes("astana") || s.includes("burabai") || s.includes("kyrgyz") || s.includes("uzbekistan") || s.includes("azerbaijan") || s.includes("türkiye") || s.includes("turkey") || s.includes("central asia") || s.includes("turkic") || s.includes("hungary")) return "Central Asia";
  if (s.includes("global") || s.includes("worldwide") || s.includes("partner") || s.includes("rotates") || s.includes("rotating") || s.includes("congress") || s.includes("meeting city") || s.includes("host city") || s.includes("outside hong kong") || s.includes("activity-dependent") || s.includes("project country") || s.includes("national hub") || s.includes("local lab")) return "Global / Other";
  return "Global / Other";
}

function regionsFor(op) {
  const dests = op.destinations || [];
  if (!dests.length) return ["Global / Other"];
  return [...new Set(dests.map(normalizeRegion))];
}

function labelize(s) {
  return String(s || "").replaceAll("_", " ");
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

function statusFor(op) {
  return state.status?.results?.find((r) => r.id === op.id) || null;
}

function matchesYear(op, yearKey) {
  if (!yearKey) return true;
  const text = `${op.year_of_study || ""} ${op.eligibility_summary || ""}`.toLowerCase();
  const map = {
    Y1: ["y1", "year 1", "1st", "first year"],
    Y2: ["y2", "year 2", "2nd", "second year", "y1–y2", "y1-y2"],
    Y3: ["y3", "year 3", "3rd", "third", "non-final", "y2–y3", "y2-y3", "y3+"],
    Y4: ["y4", "final", "senior", "penultimate", "y3–y4", "y3-y4"],
  };
  return map[yearKey].some((k) => text.includes(k)) || text.includes("any");
}

function isKzUnlock(op) {
  const tags = (op.tags || []).map((t) => t.toLowerCase());
  return tags.some((t) => t.includes("kz") || t.includes("diaspora") || t.includes("sco") || t.includes("otandastar") || t.includes("turkic"))
    || /kazakh|kazakhstan|otandastar|bolashak|huayu|sco|türksoy|turksoy|jenesys/i.test(`${op.name} ${op.notes} ${op.eligibility_summary} ${op.tags?.join(" ")}`);
}

function deadlineSoon(op) {
  const parsed = parseWindow(op);
  if (parsed.rolling || !parsed.deadlineMonth) {
    const hint = (op.next_deadline_hint || "").toLowerCase();
    if (!hint || /n\/a|ineligible|rolling|never/.test(hint)) return false;
    return /2026|2027|feb|mar|apr|may|jun|aug|sep|nov|dec|jan/.test(hint);
  }
  const cur = new Date().getMonth() + 1;
  const ahead = (parsed.deadlineMonth - cur + 12) % 12;
  return ahead <= 4;
}

function baseFiltered() {
  const q = $("#q").value.trim().toLowerCase();
  const category = $("#category").value;
  const funding = $("#funding").value;
  const difficulty = $("#difficulty").value;
  const year = $("#year").value;
  const { presets } = state;

  let list = [...state.data.opportunities];

  if (!presets.showTraps) list = list.filter((o) => o.status !== "closed_to_you");
  if (presets.nonHk) list = list.filter((o) => o.open_to_non_hk_residents !== false);
  if (presets.fit) list = list.filter((o) => (o.priority ?? 9) <= 3 && o.status !== "closed_to_you");
  if (presets.kz) list = list.filter(isKzUnlock);
  if (presets.full) list = list.filter((o) => ["fully_funded", "mostly_funded"].includes(o.funding_level));
  if (presets.soon) list = list.filter(deadlineSoon);
  if (category) list = list.filter((o) => o.category === category);
  if (funding) list = list.filter((o) => o.funding_level === funding);
  if (difficulty) list = list.filter((o) => o.difficulty === difficulty);
  if (year) list = list.filter((o) => matchesYear(o, year));
  if (q) {
    list = list.filter((o) => {
      const hay = [o.name, o.funder, o.what_you_get, o.eligibility_summary, o.notes, o.creative_angle, o.destinations?.join(" "), o.tags?.join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

function filtered() {
  let list = baseFiltered();
  if (state.activeTags.length) {
    list = list.filter((o) => {
      const tags = (o.tags || []).map((t) => t.toLowerCase());
      return state.activeTags.every((t) => tags.includes(t.toLowerCase()));
    });
  }
  if (state.activeRegion) {
    list = list.filter((o) => regionsFor(o).includes(state.activeRegion));
  }

  const sort = $("#sort").value;
  list.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "funding") return (FUNDING_RANK[b.funding_level] || 0) - (FUNDING_RANK[a.funding_level] || 0);
    if (sort === "deadline") return String(a.next_deadline_hint || "").localeCompare(String(b.next_deadline_hint || ""));
    return (a.priority ?? 9) - (b.priority ?? 9) || a.name.localeCompare(b.name);
  });
  return list;
}

async function loadAll() {
  const cacheBust = `?t=${Date.now()}`;
  const [opsRes, statusRes] = await Promise.all([
    fetch(`./data/opportunities.json${cacheBust}`),
    fetch(`./data/status.json${cacheBust}`).catch(() => null),
  ]);
  if (!opsRes.ok) throw new Error("Failed to load opportunities.json");
  state.data = await opsRes.json();
  // Drop orphan shortlist/compare ids
  const ids = new Set(state.data.opportunities.map((o) => o.id));
  for (const id of Object.keys(state.shortlist)) {
    if (!ids.has(id)) delete state.shortlist[id];
  }
  state.compareIds = state.compareIds.filter((id) => ids.has(id));
  saveStorage();

  if (statusRes && statusRes.ok) state.status = await statusRes.json();
  else state.status = null;

  renderMeta();
  populateCategorySelect();
  render();
}

function renderMeta() {
  const gen = state.data?.meta?.generated_at;
  const checked = state.status?.checked_at;
  $("#lastUpdated").textContent = `Data: ${gen ? new Date(gen).toLocaleString() : "unknown"}`;
  const summary = state.status?.summary;
  if (summary) {
    $("#healthPill").textContent = `Links: ${summary.ok} ok · ${summary.fail} fail · ${summary.redirect || 0} redirect`;
  } else {
    $("#healthPill").textContent = `Last check: ${checked ? new Date(checked).toLocaleString() : "not yet"}`;
  }
  $("#shortlistToggle").textContent = `Notebook · ${Object.keys(state.shortlist).length}`;
  const stamp = $("#explorerStamp");
  if (stamp) {
    const show = localStorage.getItem(GIFT_EXPLORER_KEY) === "1" || state.view === "timeline";
    stamp.hidden = !show;
    if (state.view === "timeline") localStorage.setItem(GIFT_EXPLORER_KEY, "1");
  }
  const dedication = $("#mereyDedication");
  if (dedication) dedication.hidden = !state.presets.forMerey;
}

function showToast(message) {
  const el = $("#giftToast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.classList.remove("show");
    el.hidden = true;
  }, 3200);
}

function burstStamps() {
  const root = $("#stampBurst");
  if (!root) return;
  root.innerHTML = "";
  root.classList.add("on");
  const marks = ["M", "Y", "MY", "HK", "KZ", "★"];
  for (let i = 0; i < 10; i++) {
    const s = document.createElement("span");
    s.className = "burst-stamp";
    s.textContent = marks[i % marks.length];
    s.style.setProperty("--dx", `${(Math.random() * 220 - 110).toFixed(0)}px`);
    s.style.setProperty("--dy", `${(Math.random() * -160 - 40).toFixed(0)}px`);
    s.style.setProperty("--rot", `${(Math.random() * 50 - 25).toFixed(0)}deg`);
    s.style.animationDelay = `${(i * 0.04).toFixed(2)}s`;
    root.appendChild(s);
  }
  clearTimeout(burstStamps._t);
  burstStamps._t = setTimeout(() => {
    root.classList.remove("on");
    root.innerHTML = "";
  }, 1400);
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function openGiftOverlay(force = false) {
  const overlay = $("#giftOverlay");
  if (!overlay) return;
  if (!force && storageGet(GIFT_OPENED_KEY) === "1") {
    overlay.hidden = true;
    overlay.classList.remove("is-open");
    document.body.classList.remove("gift-locked");
    document.body.style.overflow = "";
    return;
  }
  if (typeof window.__openGift === "function") {
    window.__openGift();
  } else {
    overlay.hidden = false;
    overlay.classList.add("is-open");
    document.body.classList.add("gift-locked");
  }
  queueMicrotask(() => $("#openGiftBtn")?.focus?.());
}

function closeGiftOverlay() {
  if (typeof window.__dismissGift === "function") {
    window.__dismissGift();
    return;
  }
  const overlay = $("#giftOverlay");
  if (overlay) {
    overlay.hidden = true;
    overlay.classList.remove("is-open");
  }
  document.body.classList.remove("gift-locked");
  document.body.style.overflow = "";
  storageSet(GIFT_OPENED_KEY, "1");
}

function wireGiftButtons() {
  const dismiss = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    closeGiftOverlay();
    burstStamps();
    showToast("Welcome aboard, Merey. The map is open.");
  };
  $("#openGiftBtn")?.addEventListener("click", dismiss);
  $("#skipGiftBtn")?.addEventListener("click", dismiss);
  $("#giftOverlay")?.addEventListener("click", (e) => {
    if (e.target === $("#giftOverlay")) dismiss(e);
  });
}

function rotatingMereyNote() {
  // Stable for a few minutes so filters don't thrash the dedication
  const slot = Math.floor(Date.now() / 180000) % MEREY_NOTES.length;
  return MEREY_NOTES[slot];
}

function checkSearchEasterEgg(value) {
  const q = value.trim().toLowerCase();
  if (!/(merey|yeskara|surprise)/.test(q)) return;
  if (state.secretStampFound && q.length < 3) return;
  state.secretStampFound = true;
  burstStamps();
  showToast("Secret stamp unlocked for Merey Yeskara.");
  const panel = $("#detail");
  if (panel) {
    panel.classList.remove("empty");
    panel.innerHTML = `
      <div class="gift-secret">
        <p class="gift-seal">Secret stamp</p>
        <h2>You found it, Merey</h2>
        <p class="lead">Typing your name on your own atlas counts as claiming the first stamp. The rest are out there — Laidlaw, Mitacs, Horizons, and every route we hid in plain sight.</p>
        <div class="angle"><strong>Creative angle:</strong> Keep searching for funding the way you searched for this note. The map rewards the curious.</div>
      </div>
    `;
  }
}

function populateCategorySelect() {
  const cats = [...new Set(state.data.opportunities.map((o) => o.category))].sort();
  const sel = $("#category");
  const current = sel.value;
  sel.innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option value="${c}">${labelize(c)}</option>`).join("");
  sel.value = current;
}

function renderStats(list) {
  const all = state.data.opportunities;
  const counts = state.data.meta.counts;
  const forMerey = state.presets.forMerey;
  $("#stats").innerHTML = `
    <div class="stat"><strong>${list.length}</strong><span>${forMerey ? "Routes for Merey" : "Showing now"}</span></div>
    <div class="stat"><strong>${counts.open}</strong><span>Open to non-HKPR</span></div>
    <div class="stat"><strong>${counts.fully_or_mostly}</strong><span>Fully / mostly funded</span></div>
    <div class="stat"><strong>${counts.closed_to_you}</strong><span>Residency traps</span></div>
    <div class="stat"><strong>${all.length}</strong><span>${forMerey ? "Stamps in the atlas" : "Total curated"}</span></div>
  `;
}

function renderActiveLenses() {
  const el = $("#activeLenses");
  const parts = [];
  if (state.activeRegion) {
    parts.push(`<button type="button" class="lens" data-clear-region="1">${escapeHtml(state.activeRegion)} <span>×</span></button>`);
  }
  for (const tag of state.activeTags) {
    parts.push(`<button type="button" class="lens" data-clear-tag="${escapeAttr(tag)}">${escapeHtml(tag)} <span>×</span></button>`);
  }
  if (!parts.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = `<span class="lens-label">Active lenses</span>${parts.join("")}<button type="button" class="lens clear-all" data-clear-all="1">Clear all</button>`;
  el.querySelectorAll(".lens").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.clearAll) {
        state.activeTags = [];
        state.activeRegion = null;
      } else if (btn.dataset.clearRegion) {
        state.activeRegion = null;
      } else if (btn.dataset.clearTag) {
        state.activeTags = state.activeTags.filter((t) => t !== btn.dataset.clearTag);
      }
      render();
    });
  });
}

function renderRegionStrip(listForCounts) {
  const counts = Object.fromEntries(REGIONS.map((r) => [r, 0]));
  for (const op of listForCounts) {
    for (const r of regionsFor(op)) counts[r] = (counts[r] || 0) + 1;
  }
  $("#regionStrip").innerHTML = REGIONS.map((r) => `
    <button type="button" class="region-chip ${state.activeRegion === r ? "on" : ""}" data-region="${escapeAttr(r)}">
      <span>${escapeHtml(r)}</span>
      <em>${counts[r] || 0}</em>
    </button>
  `).join("");
  $$("#regionStrip .region-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const r = chip.dataset.region;
      state.activeRegion = state.activeRegion === r ? null : r;
      render();
    });
  });
}

function renderTagFacets(listForCounts) {
  const counter = {};
  for (const op of listForCounts) {
    for (const t of op.tags || []) {
      const key = t.trim();
      if (!key) continue;
      counter[key] = (counter[key] || 0) + 1;
    }
  }
  const top = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 14);
  $("#tagFacets").innerHTML = top.map(([tag, n]) => `
    <button type="button" class="tag-chip ${state.activeTags.includes(tag) ? "on" : ""}" data-tag="${escapeAttr(tag)}">
      ${escapeHtml(tag)} <em>${n}</em>
    </button>
  `).join("") || `<span class="meta-line">No tags in current filter</span>`;
  $$("#tagFacets .tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => toggleTag(chip.dataset.tag));
  });
}

function toggleTag(tag) {
  if (state.activeTags.includes(tag)) {
    state.activeTags = state.activeTags.filter((t) => t !== tag);
  } else {
    state.activeTags = [...state.activeTags, tag];
  }
  render();
}

function isPinned(id) {
  return Boolean(state.shortlist[id]);
}

function togglePin(id, e) {
  e?.stopPropagation?.();
  const wasPinned = Boolean(state.shortlist[id]);
  if (wasPinned) delete state.shortlist[id];
  else {
    state.shortlist[id] = { status: "Interested", note: "", updated: new Date().toISOString() };
    if (!state.firstPinToasted) {
      state.firstPinToasted = true;
      showToast("Pinned for Merey — one step closer to the stamp collection.");
    }
  }
  saveStorage();
  render();
}

function toggleCompare(id, e) {
  e?.stopPropagation?.();
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((x) => x !== id);
  } else {
    if (state.compareIds.length >= 3) {
      state.compareIds = [...state.compareIds.slice(1), id];
    } else {
      state.compareIds = [...state.compareIds, id];
    }
  }
  saveStorage();
  render();
}

function tagButtons(op) {
  return (op.tags || []).slice(0, 6).map((t) =>
    `<button type="button" class="tag-chip mini ${state.activeTags.includes(t) ? "on" : ""}" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`
  ).join("");
}

function cardHtml(op, idx) {
  const badges = [
    `<span class="badge fund-${op.funding_level}">${labelize(op.funding_level)}</span>`,
    `<span class="badge">${labelize(op.category)}</span>`,
    op.priority <= 2 ? `<span class="badge priority">Priority ${op.priority}</span>` : "",
    op.status !== "open" ? `<span class="badge status-${op.status}">${labelize(op.status)}</span>` : "",
  ].filter(Boolean).join("");
  return `
    <article class="card ${state.selectedId === op.id ? "active" : ""}" data-id="${op.id}" style="animation-delay:${Math.min(idx, 12) * 0.03}s">
      <div class="card-top">
        <h3>${escapeHtml(op.name)}</h3>
        <div class="card-actions">
          <button type="button" class="icon-btn ${isPinned(op.id) ? "on" : ""}" data-pin="${op.id}" title="Pin to shortlist">${isPinned(op.id) ? "★" : "☆"}</button>
          <button type="button" class="icon-btn ${state.compareIds.includes(op.id) ? "on" : ""}" data-compare="${op.id}" title="Add to compare">⇄</button>
        </div>
      </div>
      <div class="badges">${badges}</div>
      <p>${escapeHtml(op.what_you_get)}</p>
      <div class="tag-row">${tagButtons(op)}</div>
      <div class="meta-line">${escapeHtml(op.next_deadline_hint || op.apply_window || "Window TBD")} · ${escapeHtml((op.destinations || []).slice(0, 2).join(", ") || "Various")}</div>
    </article>
  `;
}

function tableHtml(list) {
  const rows = list.map((op) => `
    <tr class="${state.selectedId === op.id ? "active" : ""}" data-id="${op.id}">
      <td>
        <strong>${escapeHtml(op.name)}</strong>
        <div class="meta-line">${escapeHtml(labelize(op.category))}</div>
      </td>
      <td>${escapeHtml(labelize(op.funding_level))}</td>
      <td>${escapeHtml(op.next_deadline_hint || "—")}</td>
      <td>${op.open_to_non_hk_residents === false ? "No" : op.open_to_non_hk_residents == null ? "Verify" : "Yes"}</td>
      <td>
        <button type="button" class="icon-btn ${isPinned(op.id) ? "on" : ""}" data-pin="${op.id}">${isPinned(op.id) ? "★" : "☆"}</button>
        <button type="button" class="icon-btn ${state.compareIds.includes(op.id) ? "on" : ""}" data-compare="${op.id}">⇄</button>
      </td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Opportunity</th><th>Funding</th><th>Deadline</th><th>Non-HKPR</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function agendaHtml(list) {
  const buckets = {};
  for (const op of list) {
    const parsed = parseWindow(op);
    let key = "Rolling / TBD";
    if (parsed.deadlineMonth) key = MONTH_LABELS[parsed.deadlineMonth - 1];
    else if (parsed.startMonth) key = MONTH_LABELS[parsed.startMonth - 1];
    else if (parsed.rolling) key = "Rolling";
    (buckets[key] ||= []).push(op);
  }
  const order = [...MONTH_LABELS, "Rolling", "Rolling / TBD"];
  return `<div class="calendar">${order.filter((m) => buckets[m]?.length).map((m) => `
    <div class="month">
      <h3>${m}</h3>
      ${buckets[m].map((op) => `
        <div class="month-item" data-id="${op.id}">
          <span>${escapeHtml(op.name)}</span>
          <span class="meta-line">${escapeHtml(op.next_deadline_hint || "")}</span>
        </div>
      `).join("")}
    </div>
  `).join("")}</div>`;
}

function barSegments(parsed) {
  if (parsed.rolling || parsed.startMonth == null) {
    return [{ start: 1, end: 12, dashed: true }];
  }
  let start = parsed.startMonth;
  let end = parsed.endMonth ?? parsed.startMonth;
  if (end < start) {
    // wrap: Nov–Feb => two segments
    return [
      { start, end: 12, dashed: false },
      { start: 1, end, dashed: false },
    ];
  }
  return [{ start, end, dashed: false }];
}

function timelineHtml(list) {
  const nowMonth = new Date().getMonth() + 1;
  const rows = list.slice(0, 60).map((op) => {
    const parsed = parseWindow(op);
    const segs = barSegments(parsed);
    const bars = segs.map((seg) => {
      const left = ((seg.start - 1) / 12) * 100;
      const width = ((seg.end - seg.start + 1) / 12) * 100;
      return `<div class="tl-bar fund-${op.funding_level} ${seg.dashed ? "dashed" : ""}" style="left:${left}%;width:${width}%"></div>`;
    }).join("");
    const tick = parsed.deadlineMonth
      ? `<div class="tl-tick" style="left:${((parsed.deadlineMonth - 0.5) / 12) * 100}%"></div>`
      : "";
    return `
      <div class="tl-row ${state.selectedId === op.id ? "active" : ""}" data-id="${op.id}">
        <div class="tl-name" title="${escapeAttr(op.name)}">${escapeHtml(op.name)}</div>
        <div class="tl-track">
          ${bars}${tick}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="timeline">
      <div class="tl-head">
        <div class="tl-name">Opportunity</div>
        <div class="tl-months">
          ${MONTH_LABELS.map((m, i) => `<span class="${i + 1 === nowMonth ? "now" : ""}">${m}</span>`).join("")}
          <div class="tl-now" style="left:${((nowMonth - 0.5) / 12) * 100}%"></div>
        </div>
      </div>
      <div class="tl-body">${rows || `<p class="meta-line">No opportunities in current filter.</p>`}</div>
      <p class="tl-legend"><span class="swatch fully"></span> Fully/mostly <span class="swatch partial"></span> Partial/prize <span class="tick-swatch"></span> Deadline month · dashed = rolling</p>
    </div>
  `;
}

function renderDetail(op) {
  const panel = $("#detail");
  if (!op) {
    panel.classList.add("empty");
    panel.innerHTML = `<p class="detail-placeholder merey-note">${escapeHtml(rotatingMereyNote())}</p>
      <p class="meta-line">Click any opportunity for the full briefing, eligibility traps, and creative angle.</p>`;
    return;
  }
  panel.classList.remove("empty");
  const link = statusFor(op);
  const trap = op.open_to_non_hk_residents === false
    || op.status === "closed_to_you"
    || (op.tags || []).some((t) => /trap|local_only|ineligible|scam|closed/i.test(t));

  panel.innerHTML = `
    <div class="detail-actions">
      <button type="button" class="btn small ${isPinned(op.id) ? "on-solid" : ""}" data-pin="${op.id}">${isPinned(op.id) ? "★ Pinned" : "☆ Pin"}</button>
      <button type="button" class="btn small ${state.compareIds.includes(op.id) ? "on-solid" : ""}" data-compare="${op.id}">${state.compareIds.includes(op.id) ? "In compare" : "Compare"}</button>
    </div>
    <div class="badges" style="margin-bottom:0.75rem">
      <span class="badge fund-${op.funding_level}">${labelize(op.funding_level)}</span>
      <span class="badge">${labelize(op.category)}</span>
      <span class="badge status-${op.status}">${labelize(op.status)}</span>
      <span class="badge priority">Fit rank ${op.priority}</span>
    </div>
    <h2>${escapeHtml(op.name)}</h2>
    <p class="lead">${escapeHtml(op.what_you_get)}</p>
    <div class="tag-row detail-tags">${tagButtons(op)}</div>
    <dl>
      <div><dt>Funder</dt><dd>${escapeHtml(op.funder || "—")}</dd></div>
      <div><dt>Destinations</dt><dd>${escapeHtml((op.destinations || []).join(" · ") || "—")}</dd></div>
      <div><dt>Regions</dt><dd>${escapeHtml(regionsFor(op).join(" · "))}</dd></div>
      <div><dt>Eligibility</dt><dd>${escapeHtml(op.eligibility_summary || "—")}</dd></div>
      <div><dt>Open to non-HK residents?</dt><dd>${op.open_to_non_hk_residents === false ? "No" : op.open_to_non_hk_residents == null ? "Verify each call" : "Yes"}</dd></div>
      <div><dt>Language</dt><dd>${escapeHtml(op.language_req || "—")}</dd></div>
      <div><dt>GPA hint</dt><dd>${escapeHtml(op.gpa_hint || "—")}</dd></div>
      <div><dt>Year of study</dt><dd>${escapeHtml(op.year_of_study || "—")}</dd></div>
      <div><dt>Apply window</dt><dd>${escapeHtml(op.apply_window || "—")}</dd></div>
      <div><dt>Deadline hint</dt><dd>${escapeHtml(op.next_deadline_hint || "—")}</dd></div>
      <div><dt>Difficulty</dt><dd>${escapeHtml(labelize(op.difficulty))}</dd></div>
      <div><dt>Notes</dt><dd>${escapeHtml(op.notes || "—")}</dd></div>
      <div><dt>Official link</dt><dd>${op.official_url ? `<a href="${escapeAttr(op.official_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(op.official_url)}</a>` : "—"}</dd></div>
    </dl>
    ${trap ? `<div class="trap"><strong>Watch out:</strong> ${escapeHtml(op.notes || "This may be closed to non-HK permanent residents or otherwise mismatched.")}</div>` : ""}
    ${op.creative_angle ? `<div class="angle"><strong>Creative angle:</strong> ${escapeHtml(op.creative_angle)}</div>` : ""}
    <div class="link-health">
      Link check: ${link
        ? `${link.ok ? "reachable" : "failed"} · HTTP ${link.status ?? "—"} · ${link.checked_at ? new Date(link.checked_at).toLocaleString() : ""}`
        : "awaiting next GitHub Actions run"}
    </div>
  `;
  bindActionButtons(panel);
  panel.querySelectorAll("[data-tag]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTag(btn.dataset.tag);
    });
  });
}

function bindActionButtons(root = document) {
  root.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", (e) => togglePin(btn.dataset.pin, e));
  });
  root.querySelectorAll("[data-compare]").forEach((btn) => {
    btn.addEventListener("click", (e) => toggleCompare(btn.dataset.compare, e));
  });
}

function renderShortlist() {
  const panel = $("#shortlistPanel");
  panel.hidden = !state.showShortlist;
  const ids = Object.keys(state.shortlist);
  if (!ids.length) {
    $("#shortlistBody").innerHTML = `<p class="merey-note">Merey — this notebook is blank on purpose. Pin the first route and start your stamp collection.</p>
      <p class="meta-line">Use ★ on any card to add it here.</p>`;
    return;
  }
  $("#shortlistBody").innerHTML = ids.map((id) => {
    const op = state.data.opportunities.find((o) => o.id === id);
    if (!op) return "";
    const item = state.shortlist[id];
    return `
      <div class="shortlist-item">
        <div>
          <button type="button" class="linkish" data-id="${id}"><strong>${escapeHtml(op.name)}</strong></button>
          <div class="meta-line">${escapeHtml(labelize(op.funding_level))} · ${escapeHtml(op.next_deadline_hint || "—")}</div>
          <div class="status-cycle">
            ${SHORTLIST_STATUSES.map((s) => `<button type="button" class="status-btn ${item.status === s ? "on" : ""}" data-status-id="${id}" data-status="${s}">${s}</button>`).join("")}
          </div>
          <input class="note-input" data-note-id="${id}" value="${escapeAttr(item.note || "")}" placeholder="One-line note (essay reminder…)" />
        </div>
        <div class="shortlist-item-actions">
          <button type="button" class="icon-btn ${state.compareIds.includes(id) ? "on" : ""}" data-compare="${id}">⇄</button>
          <button type="button" class="icon-btn on" data-pin="${id}">★</button>
        </div>
      </div>
    `;
  }).join("");

  $("#shortlistBody").querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedId = btn.getAttribute("data-id");
      const op = state.data.opportunities.find((o) => o.id === state.selectedId);
      renderDetail(op);
    });
  });
  $("#shortlistBody").querySelectorAll("[data-status-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.statusId;
      if (state.shortlist[id]) {
        state.shortlist[id].status = btn.dataset.status;
        state.shortlist[id].updated = new Date().toISOString();
        saveStorage();
        renderShortlist();
      }
    });
  });
  $("#shortlistBody").querySelectorAll("[data-note-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.noteId;
      if (state.shortlist[id]) {
        state.shortlist[id].note = input.value;
        state.shortlist[id].updated = new Date().toISOString();
        saveStorage();
      }
    });
  });
  bindActionButtons($("#shortlistBody"));
}

function renderCompareTray() {
  const tray = $("#compareTray");
  const ids = state.compareIds;
  tray.hidden = ids.length === 0;
  $("#compareCount").textContent = `${ids.length} / 3`;
  $("#compareChips").innerHTML = ids.map((id) => {
    const op = state.data.opportunities.find((o) => o.id === id);
    return `<span class="compare-chip">${escapeHtml(op?.name || id)} <button type="button" data-compare="${id}">×</button></span>`;
  }).join("");
  $("#compareChips").querySelectorAll("[data-compare]").forEach((btn) => {
    btn.addEventListener("click", (e) => toggleCompare(btn.dataset.compare, e));
  });
}

function renderCompareMatrix() {
  const ids = state.compareIds;
  const ops = ids.map((id) => state.data.opportunities.find((o) => o.id === id)).filter(Boolean);
  const fields = [
    ["Funding", (o) => labelize(o.funding_level)],
    ["Difficulty", (o) => labelize(o.difficulty)],
    ["Year", (o) => o.year_of_study || "—"],
    ["Deadline", (o) => o.next_deadline_hint || "—"],
    ["Destinations", (o) => (o.destinations || []).join(", ") || "—"],
    ["Non-HKPR", (o) => (o.open_to_non_hk_residents === false ? "No" : o.open_to_non_hk_residents == null ? "Verify" : "Yes")],
    ["Language", (o) => o.language_req || "—"],
    ["GPA", (o) => o.gpa_hint || "—"],
    ["Creative angle", (o) => o.creative_angle || "—"],
  ];
  if (!ops.length) {
    $("#compareMatrix").innerHTML = `<p class="meta-line">Select up to 3 opportunities to compare.</p>`;
    return;
  }
  $("#compareMatrix").innerHTML = `
    <table>
      <thead>
        <tr><th>Field</th>${ops.map((o) => `<th>${escapeHtml(o.name)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${fields.map(([label, fn]) => {
          const values = ops.map(fn);
          const diverge = new Set(values.map((v) => String(v))).size > 1;
          return `<tr class="${diverge ? "diverge" : ""}"><th>${escapeHtml(label)}</th>${values.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function wireResultsClicks(root) {
  root.querySelectorAll("[data-id]").forEach((el) => {
    if (el.matches("button.icon-btn, button.tag-chip, button[data-pin], button[data-compare]")) return;
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-pin], [data-compare], [data-tag]")) return;
      state.selectedId = el.getAttribute("data-id");
      const op = state.data.opportunities.find((o) => o.id === state.selectedId);
      renderDetail(op);
      // re-highlight without full recursive loop issues
      $$(".card, .tl-row, tr").forEach((node) => {
        node.classList.toggle("active", node.getAttribute("data-id") === state.selectedId);
      });
    });
  });
  root.querySelectorAll("[data-tag]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTag(btn.dataset.tag);
    });
  });
  bindActionButtons(root);
}

function render() {
  if (!state.data) return;
  const forFacets = baseFiltered();
  const list = filtered();
  renderStats(list);
  renderActiveLenses();
  renderRegionStrip(forFacets);
  renderTagFacets(forFacets);
  renderMeta();
  renderShortlist();
  renderCompareTray();

  $("#resultsCount").textContent = `${list.length} opportunit${list.length === 1 ? "y" : "ies"}`;
  const root = $("#results");
  if (state.view === "table") root.innerHTML = tableHtml(list);
  else if (state.view === "timeline") root.innerHTML = timelineHtml(list);
  else if (state.view === "agenda") root.innerHTML = agendaHtml(list);
  else root.innerHTML = `<div class="card-grid">${list.map(cardHtml).join("")}</div>`;

  wireResultsClicks(root);

  renderAtlasMap({
    root: $("#atlasPanel"),
    list,
    selectedId: state.selectedId,
    regionsFor,
    onSelect: (id) => {
      state.selectedId = id;
      render();
      $("#detail")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    },
  });

  if (state.selectedId) {
    const op = state.data.opportunities.find((o) => o.id === state.selectedId);
    if (op) renderDetail(op);
    else {
      state.selectedId = null;
      renderDetail(null);
    }
  } else if (!state.secretStampFound) {
    renderDetail(null);
  }
}

function bind() {
  ["q", "category", "funding", "difficulty", "year", "sort"].forEach((id) => {
    $(`#${id}`).addEventListener("input", () => {
      if (id === "q") checkSearchEasterEgg($("#q").value);
      render();
    });
    $(`#${id}`).addEventListener("change", render);
  });

  $$(".profile-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.preset;
      state.presets[key] = !state.presets[key];
      chip.classList.toggle("on", state.presets[key]);
      if (key === "showTraps" && state.presets.showTraps) {
        state.presets.nonHk = false;
        $$('.profile-chip[data-preset="nonHk"]').forEach((c) => c.classList.toggle("on", false));
      }
      render();
    });
  });

  $$(".view-toggle .btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.view;
      $$(".view-toggle .btn").forEach((b) => b.classList.toggle("on", b === btn));
      if (state.view === "timeline") {
        localStorage.setItem(GIFT_EXPLORER_KEY, "1");
        showToast("Explorer stamp earned — Merey · timeline scout.");
      }
      render();
    });
  });

  $("#refreshBtn").addEventListener("click", () => {
    $("#refreshBtn").textContent = "Refreshing…";
    loadAll().finally(() => { $("#refreshBtn").textContent = "Refresh"; });
  });

  $("#shortlistToggle").addEventListener("click", () => {
    state.showShortlist = !state.showShortlist;
    renderShortlist();
    if (state.showShortlist) $("#shortlistPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#closeShortlist").addEventListener("click", () => {
    state.showShortlist = false;
    renderShortlist();
  });
  $("#clearShortlist").addEventListener("click", () => {
    state.shortlist = {};
    saveStorage();
    render();
  });
  $("#exportShortlist").addEventListener("click", () => {
    const payload = Object.entries(state.shortlist).map(([id, meta]) => {
      const op = state.data.opportunities.find((o) => o.id === id);
      return { id, name: op?.name, ...meta, official_url: op?.official_url, for: "Merey Yeskara" };
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "merey-travel-atlas-shortlist.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#clearCompare").addEventListener("click", () => {
    state.compareIds = [];
    saveStorage();
    render();
  });
  $("#openCompare").addEventListener("click", () => {
    $("#compareModal").hidden = false;
    $("#compareModal").classList.add("is-open");
    renderCompareMatrix();
  });
  $("#closeCompare").addEventListener("click", () => {
    $("#compareModal").hidden = true;
    $("#compareModal").classList.remove("is-open");
  });
  $("#compareModal").addEventListener("click", (e) => {
    if (e.target === $("#compareModal")) {
      $("#compareModal").hidden = true;
      $("#compareModal").classList.remove("is-open");
    }
  });

  wireGiftButtons();
  $("#replayGift")?.addEventListener("click", () => openGiftOverlay(true));
  $("#headerGiftBtn")?.addEventListener("click", () => openGiftOverlay(true));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#giftOverlay") && !$("#giftOverlay").hidden) {
      closeGiftOverlay();
      return;
    }
    const modal = $("#compareModal");
    if (modal && !modal.hidden) {
      modal.hidden = true;
      modal.classList.remove("is-open");
    }
  });
}

loadStorage();
initLayoutChrome();
bind();
openGiftOverlay(false);
loadAll().then(() => {
  if (!state.selectedId) renderDetail(null);
}).catch((err) => {
  $("#results").innerHTML = `<p class="trap">Could not load data: ${escapeHtml(err.message)}</p>`;
});

setInterval(() => { loadAll().catch(() => {}); }, 6 * 60 * 60 * 1000);
