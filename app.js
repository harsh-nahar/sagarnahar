(() => {
  "use strict";
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.dataset.theme || (systemTheme.matches ? "dark" : "light");
  function updateThemeLabel() {
    if (!toggle) return;
    const next = currentTheme() === "dark" ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-label", `Use ${next.toLowerCase()}`);
    toggle.title = next;
  }
  updateThemeLabel();
  systemTheme.addEventListener("change", updateThemeLabel);
  toggle?.addEventListener("click", () => {
    const current = currentTheme();
    root.dataset.theme = current === "dark" ? "light" : "dark";
    root.classList.toggle("dark", root.dataset.theme === "dark");
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* Optional. */ }
    updateThemeLabel();
  });

  document.addEventListener("click", event => {
    const button = event.target.closest(".load-embed");
    if (!button) return;
    const source = new URL(button.dataset.embedSrc);
    const allowed = {
      "www.youtube-nocookie.com": /^\/embed\/[A-Za-z0-9_-]{11}$/,
      "player.vimeo.com": /^\/video\/\d+$/,
      "w.soundcloud.com": /^\/player\/$/,
      "archive.org": /^\/embed\/[A-Za-z0-9_.-]+$/
    };
    if (source.protocol !== "https:" || !allowed[source.hostname]?.test(source.pathname)) return;
    const iframe = document.createElement("iframe");
    iframe.src = source.href;
    iframe.title = button.dataset.embedTitle;
    iframe.allow = "encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups");
    const placeholder = button.closest(".embed-placeholder");
    const fallback = placeholder.querySelector("a");
    placeholder.replaceWith(iframe);
    if (fallback) iframe.after(fallback);
  });

  if (document.querySelector("#ascii-landscape")) {
    import("./ascii-scene.js").catch(() => {
      document.querySelector(".ascii-scene").classList.add("animation-unavailable");
    });
  }

  const query = document.querySelector("#query");
  if (!query) return;
  const blog = document.querySelector("#blog-filter");
  const year = document.querySelector("#year-filter");
  const results = document.querySelector("#search-results");
  const status = document.querySelector("#search-status");
  const more = document.querySelector("#more-results");
  let indexPromise, matches = [], visible = 30, revision = 0, timer;
  const normalize = value => value.normalize("NFC").toLocaleLowerCase();
  const append = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  };
  async function loadIndex() {
    if ("DecompressionStream" in globalThis) {
      try {
        const response = await fetch("search-index.bin");
        if (!response.ok) throw new Error("Compressed index unavailable");
        return await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
      } catch { /* Older hosts can fall back to the plain JSON index. */ }
    }
    const response = await fetch("search-index.json");
    if (!response.ok) throw new Error("Index unavailable");
    return response.json();
  }
  function render() {
    results.replaceChildren();
    for (const item of matches.slice(0, visible)) {
      const article = append(results, "article", "", "post-card");
      append(article, "p", `${item.blogTitle} · ${item.date}`, "eyebrow");
      const heading = append(article, "h3");
      const link = append(heading, "a", item.title);
      link.href = item.url;
      append(article, "p", item.text.slice(0, 180) + (item.text.length > 180 ? "…" : ""));
      append(article, "div", item.author, "card-foot");
    }
    status.textContent = `${matches.length.toLocaleString()} matching entries · showing ${Math.min(visible, matches.length).toLocaleString()}`;
    more.hidden = visible >= matches.length;
  }
  async function search() {
    const version = ++revision;
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    if (!words.length && !blog.value && !year.value) {
      results.replaceChildren();
      status.textContent = "Search the full text in Hindi or English. The index loads only when needed.";
      more.hidden = true;
      return;
    }
    status.textContent = "Loading the reading index…";
    try {
      if (!indexPromise) {
        indexPromise = loadIndex().then(entries => entries.map(item => ({
          ...item, searchable: normalize([item.title, item.author, ...item.tags, item.text].join(" "))
        }))).catch(error => { indexPromise = undefined; throw error; });
      }
      const entries = await indexPromise;
      if (version !== revision) return;
      matches = entries.filter(item => (!blog.value || item.blog === blog.value)
        && (!year.value || item.year === year.value)
        && words.every(word => item.searchable.includes(word)));
      visible = 30;
      render();
    } catch {
      if (version !== revision) return;
      status.textContent = "Search could not load. Use the collection and year pages, or retry your search. Local previews need an HTTP server.";
    }
  }
  query.addEventListener("input", () => {
    ++revision;
    clearTimeout(timer);
    timer = setTimeout(search, 180);
  });
  blog.addEventListener("change", search);
  year.addEventListener("change", search);
  more.addEventListener("click", () => { visible += 30; render(); });
})();
