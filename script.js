(function () {
  "use strict";

  const HUB_VERSION = "0.2.1";
  const LS_THEME = "ma_theme";
  const LS_FAVS = "ma_favorites";
  const LS_ORDER = "ma_order";
  const LS_SORT = "ma_sort";
  const OFFLINE_TIMEOUT_MS = 4500;

  const PLACEHOLDER_ICONS = ["🦖", "🛸", "🍕", "🎲", "🧦", "👻", "🤖", "🪐", "🐙", "🧃", "🎩", "🦑"];

  let apps = [];
  let favorites = loadJSON(LS_FAVS, []);
  let customOrder = loadJSON(LS_ORDER, null);
  let sortMode = localStorage.getItem(LS_SORT) || "alpha";
  const reachability = {}; // id -> true | false | undefined (unknown/pending)

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function placeholderFor(id) {
    return PLACEHOLDER_ICONS[hashString(id) % PLACEHOLDER_ICONS.length];
  }

  function versionBadge(app) {
    if (reachability[app.id] === false) return { label: "Offline", cls: "offline" };
    if (!app.version) return null;
    const parts = app.version.split(".").map((n) => parseInt(n, 10));
    const [major, minor] = parts;
    if (major === 0) {
      return minor === 0 ? { label: "Alpha", cls: "alpha" } : { label: "Beta", cls: "beta" };
    }
    return null;
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("darkModeLabel").textContent =
      theme === "dark" ? "Light mode" : "Dark mode";
  }
  function initTheme() {
    const saved = localStorage.getItem(LS_THEME);
    applyTheme(saved === "light" ? "light" : "dark");
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(LS_THEME, next);
  }

  /* ---------- Data loading ---------- */
  async function loadApps() {
    const res = await fetch("/apps.json");
    apps = await res.json();
    if (!customOrder) {
      customOrder = apps.map((a) => a.id);
      saveJSON(LS_ORDER, customOrder);
    } else {
      // include any apps added later that aren't in the saved order yet
      const known = new Set(customOrder);
      apps.forEach((a) => {
        if (!known.has(a.id)) customOrder.push(a.id);
      });
    }
    checkReachability();
    render();
  }

  function checkReachability() {
    apps.forEach((app) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OFFLINE_TIMEOUT_MS);
      fetch(app.url, { mode: "no-cors", signal: controller.signal })
        .then(() => {
          reachability[app.id] = true;
        })
        .catch(() => {
          reachability[app.id] = false;
        })
        .finally(() => {
          clearTimeout(timer);
          updateBadge(app.id);
        });
    });
  }

  function updateBadge(id) {
    document.querySelectorAll(`[data-app-id="${id}"] .badge`).forEach((el) => {
      const app = apps.find((a) => a.id === id);
      const badge = versionBadge(app);
      if (badge) {
        el.hidden = false;
        el.textContent = badge.label;
        el.className = "badge " + badge.cls;
      } else {
        el.hidden = true;
      }
    });
  }

  /* ---------- Rendering ---------- */
  function sortedApps(list) {
    if (sortMode === "custom") {
      return [...list].sort((a, b) => customOrder.indexOf(a.id) - customOrder.indexOf(b.id));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  function matchesSearch(app, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      app.name.toLowerCase().includes(q) ||
      app.subtitle.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
    );
  }

  function buildCard(app) {
    const tpl = document.getElementById("cardTemplate");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.appId = app.id;

    const link = node.querySelector(".card-link");
    link.href = app.url;

    const img = node.querySelector(".card-icon");
    const fallback = node.querySelector(".card-icon-fallback");
    img.src = app.url.replace(/\/$/, "") + "/icon-192.png";
    img.onerror = () => {
      img.hidden = true;
      fallback.hidden = false;
      fallback.textContent = placeholderFor(app.id);
    };

    node.querySelector(".card-title").textContent = app.name;
    node.querySelector(".card-subtitle").textContent = app.subtitle;
    node.querySelector(".card-description").textContent = app.description;

    const badgeEl = node.querySelector(".badge");
    const badge = versionBadge(app);
    if (badge) {
      badgeEl.hidden = false;
      badgeEl.textContent = badge.label;
      badgeEl.className = "badge " + badge.cls;
    }

    const favBtn = node.querySelector(".fav-btn");
    if (favorites.includes(app.id)) favBtn.classList.add("is-fav");
    favBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleFavorite(app.id);
    });

    if (sortMode === "custom") {
      node.classList.add("custom-sort");
      node.draggable = true;
      attachDragHandlers(node);
    }

    return node;
  }

  function render() {
    const query = document.getElementById("searchInput").value.trim();
    const favSection = document.getElementById("favoritesSection");
    const favGrid = document.getElementById("favoritesGrid");
    const allGrid = document.getElementById("allGrid");
    const allTitle = document.getElementById("allSectionTitle");
    const dragHint = document.getElementById("dragHint");
    const emptyState = document.getElementById("emptyState");

    favGrid.innerHTML = "";
    allGrid.innerHTML = "";

    const favApps = apps.filter((a) => favorites.includes(a.id));
    if (!query && favApps.length) {
      favSection.hidden = false;
      sortedApps(favApps).forEach((a) => favGrid.appendChild(buildCard(a)));
    } else {
      favSection.hidden = true;
    }

    const visible = sortedApps(apps.filter((a) => matchesSearch(a, query)));
    allTitle.textContent = query ? "Results" : "All Apps";
    dragHint.hidden = !(sortMode === "custom" && !query);

    if (!visible.length) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      visible.forEach((a) => allGrid.appendChild(buildCard(a)));
    }
  }

  function toggleFavorite(id) {
    if (favorites.includes(id)) {
      favorites = favorites.filter((f) => f !== id);
    } else {
      favorites = [...favorites, id];
    }
    saveJSON(LS_FAVS, favorites);
    render();
  }

  /* ---------- Drag & drop reorder ---------- */
  let dragSourceId = null;

  function attachDragHandlers(node) {
    node.addEventListener("dragstart", (e) => {
      dragSourceId = node.dataset.appId;
      node.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    node.addEventListener("dragend", () => {
      node.classList.remove("dragging");
      document.querySelectorAll(".card.drag-over").forEach((n) => n.classList.remove("drag-over"));
    });
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (node.dataset.appId !== dragSourceId) node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", () => node.classList.remove("drag-over"));
    node.addEventListener("drop", (e) => {
      e.preventDefault();
      node.classList.remove("drag-over");
      const targetId = node.dataset.appId;
      if (!dragSourceId || dragSourceId === targetId) return;
      const from = customOrder.indexOf(dragSourceId);
      const to = customOrder.indexOf(targetId);
      customOrder.splice(from, 1);
      customOrder.splice(to, 0, dragSourceId);
      saveJSON(LS_ORDER, customOrder);
      render();
    });
  }

  /* ---------- UI wiring ---------- */
  function initHeader() {
    document.querySelector(".brand").addEventListener("click", () => location.reload());
    document.querySelector(".brand").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") location.reload();
    });

    document.getElementById("fullscreenBtn").addEventListener("click", () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    const menuBtn = document.getElementById("menuBtn");
    const dropdown = document.getElementById("dropdownMenu");
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = dropdown.hidden;
      dropdown.hidden = !isHidden;
      menuBtn.setAttribute("aria-expanded", String(isHidden));
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.hidden = true;
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.getElementById("darkModeToggle").addEventListener("click", () => {
      toggleTheme();
      dropdown.hidden = true;
    });

    document.getElementById("settingsBtn").addEventListener("click", () => {
      dropdown.hidden = true;
      document.getElementById("settingsModal").hidden = false;
    });
    document.getElementById("closeSettings").addEventListener("click", () => {
      document.getElementById("settingsModal").hidden = true;
    });
    document.getElementById("resetBtn").addEventListener("click", () => {
      favorites = [];
      customOrder = apps.map((a) => a.id);
      saveJSON(LS_FAVS, favorites);
      saveJSON(LS_ORDER, customOrder);
      document.getElementById("settingsModal").hidden = true;
      render();
    });

    document.getElementById("aboutBtn").addEventListener("click", () => {
      dropdown.hidden = true;
      document.getElementById("hubVersion").textContent = HUB_VERSION;
      document.getElementById("aboutModal").hidden = false;
    });
    document.getElementById("closeAbout").addEventListener("click", () => {
      document.getElementById("aboutModal").hidden = true;
    });

    [document.getElementById("settingsModal"), document.getElementById("aboutModal")].forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.hidden = true;
      });
    });
  }

  function initToolbar() {
    document.getElementById("searchInput").addEventListener("input", render);
    const sortSelect = document.getElementById("sortSelect");
    sortSelect.value = sortMode;
    sortSelect.addEventListener("change", () => {
      sortMode = sortSelect.value;
      localStorage.setItem(LS_SORT, sortMode);
      render();
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initHeader();
    initToolbar();
    loadApps();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
