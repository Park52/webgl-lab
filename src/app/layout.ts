export function createLayout(): { root: HTMLElement; outlet: HTMLElement } {
  const root = document.createElement("div");
  root.id = "app-root";

  // ── Header ──
  const header = document.createElement("header");

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = "WebGL Lab";

  const homeLink = document.createElement("a");
  homeLink.className = "home-link";
  homeLink.href = "#/";
  homeLink.textContent = "← Home";

  header.append(title, homeLink);

  // ── Main ──
  const main = document.createElement("main");
  main.id = "outlet";

  root.append(header, main);

  return { root, outlet: main };
}
