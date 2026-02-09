import { labs } from "../app/registry";

export function renderHome(container: HTMLElement): void {
  const grid = document.createElement("div");
  grid.className = "card-grid";

  for (const lab of labs) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${lab.title}</h2><p>${lab.description}</p>`;
    card.addEventListener("click", () => {
      location.hash = lab.path.replace(/^#/, "");
    });
    grid.appendChild(card);
  }

  container.appendChild(grid);
}
