const state = {
  data: null,
  status: null,
  view: "cards",
  selectedId: null,
  presets: {
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

async function loadAll() {
  const cacheBust = `?t=${Date.now()}`;
  const [opsRes, statusRes] = await Promise.all([
    fetch(`./data/opportunities.json${cacheBust}`),
    fetch(`./data/status.json${cacheBust}`).catch(() => null),
  ]);
  if (!opsRes.ok) throw new Error("Failed to load opportunities.json");
  state.data = await opsRes.json();
  if (statusRes && statusRes.ok) {
    state.status = await statusRes.json();
  } else {
    state.status = null;
  }
  renderMeta();
  populateCategorySelect();
  render();
}

function renderMeta() {
  const gen = state.data?.meta?.generated_at;
  const checked = state.status?.checked_at;
  const genLabel = gen ? new Date(gen).toLocaleString() : "unknown";
  const checkLabel = checked ? new Date(checked).toLocaleString() : "not yet";
  $("#lastUpdated").textContent = `Data: ${genLabel}`;
  const summary = state.status?.summary;
  if (summary) {
    $("#healthPill").textContent = `Links: ${summary.ok} ok · ${summary.fail} fail · ${summary.redirect || 0} redirect`;
  } else {
    $("#healthPill").textContent = `Last check: ${checkLabel}`;
  }
}

function populateCategorySelect() {
  const cats = [...new Set(state.data.opportunities.map((o) => o.category))].sort();
  const sel = $("#category");
  const current = sel.value;
  sel.innerHTML = `<option value="">All categories</option>` +
    cats.map((c) => `<option value="${c}">${labelize(c)}</option>`).join("");
  sel.value = current;
}

function labelize(s) {
  return String(s || "").replaceAll("_", " ");
}

function statusFor(op) {
  const link = state.status?.results?.find((r) => r.id === op.id);
  return link || null;
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
  return tags.some((t) => t.includes("kz") || t.includes("diaspora") || t.includes("sco") || t.includes("otandastar"))
    || /kazakh|kazakhstan|otandastar|bolashak|huayu|sco/i.test(`${op.name} ${op.notes} ${op.eligibility_summary}`);
}

function deadlineSoon(op) {
  const hint = (op.next_deadline_hint || "").toLowerCase();
  if (!hint || hint.includes("n/a") || hint.includes("ineligible") || hint.includes("rolling") || hint.includes("never")) {
    return false;
  }
  const now = new Date();
  const month = Object.keys(MONTH_MAP).find((m) => hint.includes(m));
  if (!month) {
    // if it mentions a concrete upcoming year and current/next months vaguely
    return /2026|2027|feb|mar|apr|may|jun|aug|sep|nov|dec|jan/i.test(hint);
  }
  const m = MONTH_MAP[month];
  // treat as soon if within next ~4 months (wrap-aware)
  const cur = now.getMonth() + 1;
  const ahead = (m - cur + 12) % 12;
  return ahead <= 4;
}

function filtered() {
  const q = $("#q").value.trim().toLowerCase();
  const category = $("#category").value;
  const funding = $("#funding").value;
  const difficulty = $("#difficulty").value;
  const year = $("#year").value;
  const { presets } = state;

  let list = [...state.data.opportunities];

  if (!presets.showTraps) {
    list = list.filter((o) => o.status !== "closed_to_you");
  }
  if (presets.nonHk) {
    list = list.filter((o) => o.open_to_non_hk_residents !== false);
  }
  if (presets.fit) {
    list = list.filter((o) => (o.priority ?? 9) <= 3 && o.status !== "closed_to_you");
  }
  if (presets.kz) {
    list = list.filter(isKzUnlock);
  }
  if (presets.full) {
    list = list.filter((o) => ["fully_funded", "mostly_funded"].includes(o.funding_level));
  }
  if (presets.soon) {
    list = list.filter(deadlineSoon);
  }
  if (category) list = list.filter((o) => o.category === category);
  if (funding) list = list.filter((o) => o.funding_level === funding);
  if (difficulty) list = list.filter((o) => o.difficulty === difficulty);
  if (year) list = list.filter((o) => matchesYear(o, year));
  if (q) {
    list = list.filter((o) => {
      const hay = [
        o.name, o.funder, o.what_you_get, o.eligibility_summary, o.notes,
        o.creative_angle, o.destinations?.join(" "), o.tags?.join(" "),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const sort = $("#sort").value;
  list.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "funding") return (FUNDING_RANK[b.funding_level] || 0) - (FUNDING_RANK[a.funding_level] || 0);
    if (sort === "deadline") return String(a.next_deadline_hint || "").localeCompare(String(b.next_deadline_hint || ""));
    // priority (lower is better)
    return (a.priority ?? 9) - (b.priority ?? 9) || a.name.localeCompare(b.name);
  });
  return list;
}

function renderStats(list) {
  const all = state.data.opportunities;
  const counts = state.data.meta.counts;
  $("#stats").innerHTML = `
    <div class="stat"><strong>${list.length}</strong><span>Showing now</span></div>
    <div class="stat"><strong>${counts.open}</strong><span>Open to non-HKPR</span></div>
    <div class="stat"><strong>${counts.fully_or_mostly}</strong><span>Fully / mostly funded</span></div>
    <div class="stat"><strong>${counts.closed_to_you}</strong><span>Residency traps</span></div>
    <div class="stat"><strong>${all.length}</strong><span>Total curated</span></div>
  `;
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
      <h3>${escapeHtml(op.name)}</h3>
      <div class="badges">${badges}</div>
      <p>${escapeHtml(op.what_you_get)}</p>
      <div class="meta-line">${escapeHtml(op.next_deadline_hint || op.apply_window || "Window TBD")} · ${escapeHtml((op.destinations || []).slice(0, 2).join(", ") || "Various")}</div>
    </article>
  `;
}

function tableHtml(list) {
  const rows = list.map((op) => `
    <tr class="${state.selectedId === op.id ? "active" : ""}" data-id="${op.id}">
      <td><strong>${escapeHtml(op.name)}</strong><div class="meta-line">${escapeHtml(labelize(op.category))}</div></td>
      <td>${escapeHtml(labelize(op.funding_level))}</td>
      <td>${escapeHtml(op.next_deadline_hint || "—")}</td>
      <td>${op.open_to_non_hk_residents === false ? "No" : op.open_to_non_hk_residents == null ? "Verify" : "Yes"}</td>
      <td>${op.priority ?? "—"}</td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Opportunity</th><th>Funding</th><th>Deadline</th><th>Non-HKPR</th><th>Fit</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function calendarHtml(list) {
  const buckets = {};
  for (const op of list) {
    const hint = (op.next_deadline_hint || op.apply_window || "Rolling / TBD").trim();
    const monthKey = Object.keys(MONTH_MAP).find((m) => hint.toLowerCase().includes(m));
    const key = monthKey ? monthKey[0].toUpperCase() + monthKey.slice(1) : (hint.toLowerCase().includes("rolling") ? "Rolling" : "Other / TBD");
    (buckets[key] ||= []).push(op);
  }
  const order = ["January","February","March","April","May","June","July","August","September","October","November","December","Rolling","Other / TBD"];
  // normalize keys that are short month names
  const normalized = {};
  for (const [k, v] of Object.entries(buckets)) {
    const full = Object.entries(MONTH_MAP).find(([name]) => name === k.toLowerCase());
    const label = full
      ? Object.keys(MONTH_MAP).find((n) => MONTH_MAP[n] === full[1] && n.length > 3)?.replace(/^\w/, (c) => c.toUpperCase()) || k
      : k;
    // Better: map number back
    let label2 = k;
    const num = MONTH_MAP[k.toLowerCase()];
    if (num) {
      label2 = ["","January","February","March","April","May","June","July","August","September","October","November","December"][num];
    }
    (normalized[label2] ||= []).push(...v);
  }
  return `<div class="calendar">${order.filter((m) => normalized[m]?.length).map((m) => `
    <div class="month">
      <h3>${m}</h3>
      ${normalized[m].map((op) => `
        <div class="month-item" data-id="${op.id}">
          <span>${escapeHtml(op.name)}</span>
          <span class="meta-line">${escapeHtml(op.next_deadline_hint || "")}</span>
        </div>
      `).join("")}
    </div>
  `).join("")}</div>`;
}

function renderDetail(op) {
  const panel = $("#detail");
  if (!op) {
    panel.classList.add("empty");
    panel.innerHTML = `<p class="detail-placeholder">Click any opportunity for the full briefing, eligibility traps, and creative angle.</p>`;
    return;
  }
  panel.classList.remove("empty");
  const link = statusFor(op);
  const trap = op.open_to_non_hk_residents === false
    || op.status === "closed_to_you"
    || (op.tags || []).some((t) => /trap|local_only|ineligible|scam/i.test(t));

  panel.innerHTML = `
    <div class="badges" style="margin-bottom:0.75rem">
      <span class="badge fund-${op.funding_level}">${labelize(op.funding_level)}</span>
      <span class="badge">${labelize(op.category)}</span>
      <span class="badge status-${op.status}">${labelize(op.status)}</span>
      <span class="badge priority">Fit rank ${op.priority}</span>
    </div>
    <h2>${escapeHtml(op.name)}</h2>
    <p class="lead">${escapeHtml(op.what_you_get)}</p>
    <dl>
      <div><dt>Funder</dt><dd>${escapeHtml(op.funder || "—")}</dd></div>
      <div><dt>Destinations</dt><dd>${escapeHtml((op.destinations || []).join(" · ") || "—")}</dd></div>
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
}

function render() {
  const list = filtered();
  renderStats(list);
  $("#resultsCount").textContent = `${list.length} opportunit${list.length === 1 ? "y" : "ies"}`;
  const root = $("#results");
  if (state.view === "table") root.innerHTML = tableHtml(list);
  else if (state.view === "calendar") root.innerHTML = calendarHtml(list);
  else root.innerHTML = `<div class="card-grid">${list.map(cardHtml).join("")}</div>`;

  root.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedId = el.getAttribute("data-id");
      const op = state.data.opportunities.find((o) => o.id === state.selectedId);
      renderDetail(op);
      render();
    });
  });

  if (state.selectedId) {
    const op = state.data.opportunities.find((o) => o.id === state.selectedId);
    if (op && list.some((o) => o.id === op.id)) renderDetail(op);
    else {
      state.selectedId = null;
      renderDetail(null);
    }
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

function bind() {
  ["q", "category", "funding", "difficulty", "year", "sort"].forEach((id) => {
    $(`#${id}`).addEventListener("input", render);
    $(`#${id}`).addEventListener("change", render);
  });

  $$(".profile-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.preset;
      state.presets[key] = !state.presets[key];
      chip.classList.toggle("on", state.presets[key]);
      // mutual nuance: showing traps turns off nonHk hide if needed
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
      render();
    });
  });

  $("#refreshBtn").addEventListener("click", () => {
    $("#refreshBtn").textContent = "Refreshing…";
    loadAll().finally(() => {
      $("#refreshBtn").textContent = "Refresh";
    });
  });
}

bind();
loadAll().catch((err) => {
  $("#results").innerHTML = `<p class="trap">Could not load data: ${escapeHtml(err.message)}</p>`;
});

// Auto-refresh every 6 hours while the tab stays open
setInterval(() => {
  loadAll().catch(() => {});
}, 6 * 60 * 60 * 1000);
