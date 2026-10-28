(() => {
  const root = document.documentElement;
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  function savedTheme() {
    try { return localStorage.getItem("theme") || localStorage.getItem("archive-theme"); }
    catch { return null; }
  }
  function applyTheme() {
    const saved = savedTheme();
    const theme = saved === "light" || saved === "dark" ? saved : systemTheme.matches ? "dark" : "light";
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
  }
  applyTheme();
  systemTheme.addEventListener("change", applyTheme);
})();
